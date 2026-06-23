"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Stack,
  Group,
  Button,
  Badge,
  ActionIcon,
  Tabs,
  Textarea,
  TextInput,
  NumberInput,
  Switch,
  Select,
  Text,
  Card,
  PasswordInput,
  SimpleGrid,
  ThemeIcon,
  Divider,
  Box,
  Table,
  Skeleton,
  Tooltip,
} from "@mantine/core";
import { motion } from "framer-motion";
import {
  AnimatedPlus,
  AnimatedEdit,
  AnimatedTrash,
  AnimatedFlask,
  AnimatedLayers,
  AnimatedServer,
  AnimatedGitBranch,
  AnimatedKey,
  AnimatedCheckCircle,
  AnimatedXCircle,
  AnimatedInfo,
  AnimatedActivity,
  AnimatedDollarSign,
  AnimatedCoins,
  AnimatedCpu,
} from "../../../components/cg/AnimatedIcons";
import {
  CgTable,
  CgDrawer,
  useCgConfirm,
  useToast,
  type CgColumn,
} from "../../../components/cg";
import { LoadingState, ErrorState } from "../../../components/States";
import { PageHeader, MotionSection, MotionItem, FadeIn } from "../../../components/anim";
import { api } from "../../../lib";
import type { Paginated, Provider, Deployment, ProviderKey, ProviderInfo } from "../../../lib/types";

type Tab = "providers" | "deployments" | "keys";

// ─── helpers ────────────────────────────────────────────────────────────────
function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtCost(n: number): string {
  if (n === 0) return "$0.00";
  if (n < 0.01) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(4)}`;
}

function costPer1M(perToken: number | null): string {
  if (perToken === null) return "—";
  return `$${(perToken * 1_000_000).toFixed(3)}`;
}

function SupportBadge({ val, label }: { val: boolean | null; label: string }) {
  if (val === null) return <Badge size="xs" variant="outline" color="gray">—</Badge>;
  return (
    <Badge
      size="xs"
      variant="light"
      color={val ? "teal" : "gray"}
      leftSection={val ? <AnimatedCheckCircle size={9} /> : <AnimatedXCircle size={9} />}
    >
      {label}
    </Badge>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function ProvidersPage() {
  const { toast } = useToast();
  const confirm = useCgConfirm();
  const [tab, setTab] = useState<Tab>("providers");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [keys, setKeys] = useState<ProviderKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Provider | Deployment | null>(null);
  const [infoTarget, setInfoTarget] = useState<Provider | null>(null);

  const loadProviders = useCallback(async () => {
    try {
      const res = await api.get<Paginated<Provider>>("/api/admin/providers?page=1&page_size=200");
      setProviders(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }, []);

  const loadDeployments = useCallback(async () => {
    try {
      const res = await api.get<Paginated<Deployment>>("/api/admin/deployments?page=1&page_size=200");
      setDeployments(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }, []);

  const loadKeys = useCallback(async () => {
    try {
      const res = await api.get<Paginated<ProviderKey>>(
        `/api/admin/provider-keys?provider_id=${providers[0]?.id ?? ""}&page=1&page_size=200`,
      );
      setKeys(res.items);
    } catch {
      /* ignore */
    }
  }, [providers]);

  useEffect(() => {
    setLoading(true);
    setError("");
    (async () => {
      if (tab === "providers") await loadProviders();
      else if (tab === "deployments") await loadDeployments();
      else await loadKeys();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleDelete = (type: Tab, id: string) => {
    confirm({
      title: "Confirm delete",
      message: "This action cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
      onConfirm: async () => {
        try {
          if (type === "providers") await api.delete(`/api/admin/providers/${id}`);
          else if (type === "deployments") await api.delete(`/api/admin/deployments/${id}`);
          else await api.delete(`/api/admin/provider-keys/${id}`);
          toast("Deleted", "success");
          if (type === "providers") await loadProviders();
          else if (type === "deployments") await loadDeployments();
          else await loadKeys();
        } catch (e) {
          toast(e instanceof Error ? e.message : "Delete failed", "error");
        }
      },
    });
  };

  const handleTest = async (id: string) => {
    try {
      const res = await api.post<{ healthy: boolean }>(`/api/admin/providers/${id}/test`);
      toast(res.healthy ? "Provider healthy" : "Health check failed", res.healthy ? "success" : "error");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Test failed", "error");
    }
  };

  const providerColumns: CgColumn<Provider>[] = [
    { key: "name", label: "Name", render: (p) => <Text fw={600}>{p.name}</Text> },
    { key: "adapter_type", label: "Adapter" },
    { key: "base_url", label: "Base URL", render: (p) => p.base_url || "—" },
    {
      key: "is_enabled",
      label: "Status",
      render: (p) => (
        <Badge variant="light" color={p.is_enabled ? "green" : "gray"} size="sm" leftSection={p.is_enabled ? <AnimatedCheckCircle size={12} /> : <AnimatedXCircle size={12} />}>
          {p.is_enabled ? "enabled" : "disabled"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (p) => (
        <Group gap="xs">
          <Tooltip label="Model info & usage" withArrow>
            <ActionIcon variant="subtle" color="blue" onClick={() => setInfoTarget(p)} component={motion.button} whileHover="hover">
              <AnimatedInfo size={16} />
            </ActionIcon>
          </Tooltip>
          <ActionIcon variant="subtle" onClick={() => { setEditing(p); setDrawerOpen(true); }} component={motion.button} whileHover="hover">
            <AnimatedEdit size={16} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="teal" onClick={() => handleTest(p.id)} component={motion.button} whileHover="hover">
            <AnimatedFlask size={16} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="red" onClick={() => handleDelete("providers", p.id)} component={motion.button} whileHover="hover">
            <AnimatedTrash size={16} />
          </ActionIcon>
        </Group>
      ),
    },
  ];

  const deploymentColumns: CgColumn<Deployment>[] = [
    { key: "model_name", label: "Model", render: (d) => <Text fw={600}>{d.model_name}</Text> },
    { key: "litellm_model", label: "LiteLLM Model", render: (d) => <Text size="xs" ff="monospace">{d.litellm_model}</Text> },
    { key: "tpm", label: "TPM/RPM", render: (d) => `${d.tpm ?? "—"} / ${d.rpm ?? "—"}` },
    { key: "context_window", label: "Context", render: (d) => d.context_window ?? "—" },
    {
      key: "is_enabled",
      label: "Status",
      render: (d) => (
        <Badge variant="light" color={d.is_enabled ? "green" : "gray"} size="sm" leftSection={d.is_enabled ? <AnimatedCheckCircle size={12} /> : <AnimatedXCircle size={12} />}>
          {d.is_enabled ? "enabled" : "disabled"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (d) => (
        <Group gap="xs">
          <ActionIcon variant="subtle" onClick={() => { setEditing(d); setDrawerOpen(true); }} component={motion.button} whileHover="hover">
            <AnimatedEdit size={16} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="red" onClick={() => handleDelete("deployments", d.id)} component={motion.button} whileHover="hover">
            <AnimatedTrash size={16} />
          </ActionIcon>
        </Group>
      ),
    },
  ];

  const keyColumns: CgColumn<ProviderKey>[] = [
    { key: "label", label: "Label", render: (k) => <Text fw={600}>{k.label}</Text> },
    { key: "key_prefix", label: "Prefix", render: (k) => <Text ff="monospace" size="xs">{k.key_prefix}</Text> },
    {
      key: "is_enabled",
      label: "Status",
      render: (k) => (
        <Badge variant="light" color={k.is_enabled ? "green" : "gray"} size="sm" leftSection={k.is_enabled ? <AnimatedCheckCircle size={12} /> : <AnimatedXCircle size={12} />}>
          {k.is_enabled ? "enabled" : "disabled"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (k) => (
        <ActionIcon variant="subtle" color="red" onClick={() => handleDelete("keys", k.id)} component={motion.button} whileHover="hover">
          <AnimatedTrash size={16} />
        </ActionIcon>
      ),
    },
  ];

  return (
    <Stack gap="lg">
      <PageHeader
        icon={<AnimatedLayers size={22} />}
        iconColor="#0d9488"
        title="Providers Management"
        description="Configure AI providers, deployments, and API keys"
        actions={
          <FadeIn delay={0.1}>
            <Button
              leftSection={<AnimatedPlus size={16} />}
              onClick={() => { setEditing(null); setDrawerOpen(true); }}
              variant="gradient"
              gradient={{ from: "brand", to: "teal", deg: 90 }}
            >
              Add {tab === "keys" ? "Key" : tab === "deployments" ? "Deployment" : "Provider"}
            </Button>
          </FadeIn>
        }
      />

      <Tabs value={tab} onChange={(v) => setTab(v as Tab)}>
        <Tabs.List>
          <Tabs.Tab value="providers" leftSection={<AnimatedServer size={16} style={{ color: "#0d9488" }} />}>Providers</Tabs.Tab>
          <Tabs.Tab value="deployments" leftSection={<AnimatedGitBranch size={16} style={{ color: "#ea580c" }} />}>Deployments</Tabs.Tab>
          <Tabs.Tab value="keys" leftSection={<AnimatedKey size={16} style={{ color: "#d97706" }} />}>Provider Keys</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="providers" pt="md">
          {error && <ErrorState message={error} />}
          {loading ? <LoadingState /> : (
            <MotionSection>
              <MotionItem>
                <CgTable columns={providerColumns} rows={providers} rowKey={(p) => p.id} emptyMessage="No providers yet." />
              </MotionItem>
            </MotionSection>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="deployments" pt="md">
          {loading ? <LoadingState /> : (
            <MotionSection>
              <MotionItem>
                <CgTable columns={deploymentColumns} rows={deployments} rowKey={(d) => d.id} emptyMessage="No deployments yet." />
              </MotionItem>
            </MotionSection>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="keys" pt="md">
          {loading ? <LoadingState /> : (
            <MotionSection>
              <MotionItem>
                <CgTable columns={keyColumns} rows={keys} rowKey={(k) => k.id} emptyMessage="No provider keys yet." />
              </MotionItem>
            </MotionSection>
          )}
        </Tabs.Panel>
      </Tabs>

      <ProviderDrawer
        opened={drawerOpen && tab === "providers"}
        onClose={() => setDrawerOpen(false)}
        editing={editing as Provider | null}
        onSaved={async () => { setDrawerOpen(false); await loadProviders(); }}
      />
      <DeploymentDrawer
        opened={drawerOpen && tab === "deployments"}
        onClose={() => setDrawerOpen(false)}
        editing={editing as Deployment | null}
        providers={providers}
        onSaved={async () => { setDrawerOpen(false); await loadDeployments(); }}
      />
      <ProviderKeyDrawer
        opened={drawerOpen && tab === "keys"}
        onClose={() => setDrawerOpen(false)}
        providers={providers}
        onSaved={async () => { setDrawerOpen(false); await loadKeys(); }}
      />

      {/* Provider info drawer */}
      <ProviderInfoDrawer
        provider={infoTarget}
        onClose={() => setInfoTarget(null)}
      />
    </Stack>
  );
}

// ─── Provider Info Drawer ─────────────────────────────────────────────────────
function ProviderInfoDrawer({ provider, onClose }: { provider: Provider | null; onClose: () => void }) {
  const [info, setInfo] = useState<ProviderInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!provider) { setInfo(null); return; }
    setLoading(true);
    setError("");
    api.get<ProviderInfo>(`/api/admin/providers/${provider.id}/info`)
      .then(setInfo)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load info"))
      .finally(() => setLoading(false));
  }, [provider]);

  const statCards = [
    {
      label: "Total Requests",
      value: info ? fmtNum(info.total_requests) : "—",
      icon: <AnimatedActivity size={16} />,
      color: "#3f72af",
      glow: "rgba(63,114,175,0.15)",
    },
    {
      label: "Total Tokens",
      value: info ? fmtNum(info.total_tokens) : "—",
      icon: <AnimatedCoins size={16} />,
      color: "#0d9488",
      glow: "rgba(13,148,136,0.15)",
    },
    {
      label: "Total Cost",
      value: info ? fmtCost(info.total_cost_usd) : "—",
      icon: <AnimatedDollarSign size={16} />,
      color: "#d97706",
      glow: "rgba(217,119,6,0.15)",
    },
  ];

  return (
    <CgDrawer
      opened={!!provider}
      onClose={onClose}
      title={provider ? `${provider.name} — Info` : "Provider Info"}
      icon={<AnimatedInfo size={16} />}
      iconColor="blue"
      size="xl"
    >
      {/* Error */}
      {error && (
        <Card p="sm" radius="md" withBorder style={{ borderColor: "var(--mantine-color-red-3)" }}>
          <Text size="sm" c="red">{error}</Text>
        </Card>
      )}

      {/* Summary Stat Cards */}
      <SimpleGrid cols={3} spacing="sm">
        {statCards.map((s) => (
          <motion.div
            key={s.label}
            whileHover={{ y: -3, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 350, damping: 22 }}
          >
            <Card
              p="sm"
              radius="lg"
              withBorder
              style={{ position: "relative", overflow: "hidden" }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -16,
                  right: -16,
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  background: s.glow,
                  filter: "blur(16px)",
                  pointerEvents: "none",
                }}
              />
              <Stack gap={4}>
                <Group gap={6}>
                  <ThemeIcon size={22} radius="md" variant="light" style={{ color: s.color, background: s.glow }}>
                    {s.icon}
                  </ThemeIcon>
                  <Text size="10px" c="dimmed" fw={800} tt="uppercase" style={{ letterSpacing: 0.5 }}>
                    {s.label}
                  </Text>
                </Group>
                {loading ? (
                  <Skeleton height={20} radius="sm" />
                ) : (
                  <Text size="lg" fw={900} style={{ color: s.color, letterSpacing: -0.5 }}>
                    {s.value}
                  </Text>
                )}
              </Stack>
            </Card>
          </motion.div>
        ))}
      </SimpleGrid>

      <Divider label="Deployments" labelPosition="left" mt="xs" />

      {/* Deployments Table */}
      {loading ? (
        <Stack gap="xs">
          {[...Array(2)].map((_, i) => <Skeleton key={i} height={56} radius="md" />)}
        </Stack>
      ) : info && info.deployments.length > 0 ? (
        <Box style={{ overflowX: "auto" }}>
          <Table highlightOnHover verticalSpacing="xs" fz="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Model</Table.Th>
                <Table.Th>Context</Table.Th>
                <Table.Th>Input / 1M</Table.Th>
                <Table.Th>Output / 1M</Table.Th>
                <Table.Th>Capabilities</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>Requests</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>Tokens</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>Cost</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {info.deployments.map((dep) => (
                <Table.Tr key={dep.deployment_id}>
                  <Table.Td>
                    <Stack gap={1}>
                      <Text fw={700} size="xs">{dep.model_name}</Text>
                      <Text size="10px" c="dimmed" ff="monospace">{dep.litellm_model}</Text>
                    </Stack>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" fw={600}>
                      {dep.max_input_tokens ? fmtNum(dep.max_input_tokens) : "—"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" fw={600} style={{ color: "#3f72af" }}>
                      {costPer1M(dep.input_cost_per_token)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" fw={600} style={{ color: "#d97706" }}>
                      {costPer1M(dep.output_cost_per_token)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} wrap="wrap">
                      <SupportBadge val={dep.supports_streaming} label="Stream" />
                      <SupportBadge val={dep.supports_function_calling} label="Fn Call" />
                      <SupportBadge val={dep.supports_vision} label="Vision" />
                    </Group>
                  </Table.Td>
                  <Table.Td style={{ textAlign: "right" }}>
                    <Text size="xs" fw={600}>{fmtNum(dep.requests)}</Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: "right" }}>
                    <Stack gap={0} align="flex-end">
                      <Text size="xs" fw={600}>{fmtNum(dep.prompt_tokens + dep.completion_tokens)}</Text>
                      <Text size="9px" c="dimmed">
                        {fmtNum(dep.prompt_tokens)}↑ {fmtNum(dep.completion_tokens)}↓
                      </Text>
                    </Stack>
                  </Table.Td>
                  <Table.Td style={{ textAlign: "right" }}>
                    <Text size="xs" fw={700} style={{ color: "#0d9488" }}>{fmtCost(dep.cost_usd)}</Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Box>
      ) : !loading && (
        <Card p="md" radius="md" withBorder>
          <Group gap="sm">
            <ThemeIcon size={28} radius="md" variant="light" color="gray">
              <AnimatedCpu size={14} />
            </ThemeIcon>
            <Stack gap={2}>
              <Text size="sm" fw={600}>No deployments configured</Text>
              <Text size="xs" c="dimmed">Add a deployment under the Deployments tab to see model details here.</Text>
            </Stack>
          </Group>
        </Card>
      )}

      {/* LiteLLM metadata note */}
      {info && info.deployments.some(d => d.max_input_tokens !== null) && (
        <Card p="xs" radius="md" withBorder style={{ borderStyle: "dashed" }}>
          <Group gap={6}>
            <AnimatedInfo size={12} style={{ color: "var(--mantine-color-dimmed)", flexShrink: 0 }} />
            <Text size="10px" c="dimmed">
              Context window and pricing data sourced from LiteLLM's built-in model cost map.
              Usage counts (requests, tokens, cost) reflect traffic routed through this gateway.
            </Text>
          </Group>
        </Card>
      )}
    </CgDrawer>
  );
}

// ─── Provider CRUD Drawer ─────────────────────────────────────────────────────
function ProviderDrawer({
  opened, onClose, editing, onSaved,
}: { opened: boolean; onClose: () => void; editing: Provider | null; onSaved: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [adapterType, setAdapterType] = useState("litellm");
  const [baseUrl, setBaseUrl] = useState("");
  const [config, setConfig] = useState("{}");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (opened) {
      setName(editing?.name ?? "");
      setAdapterType(editing?.adapter_type ?? "litellm");
      setBaseUrl(editing?.base_url ?? "");
      setConfig(editing ? JSON.stringify(editing.config, null, 2) : "{}");
      setEnabled(editing?.is_enabled ?? true);
    }
  }, [opened, editing]);

  const handleSave = async () => {
    setSaving(true);
    let parsed = {};
    try { parsed = JSON.parse(config); } catch { toast("Invalid JSON in config", "error"); setSaving(false); return; }
    try {
      if (editing) {
        await api.patch(`/api/admin/providers/${editing.id}`, { name, base_url: baseUrl || null, config: parsed, is_enabled: enabled });
      } else {
        await api.post("/api/admin/providers", { name, adapter_type: adapterType, base_url: baseUrl || null, config: parsed, is_enabled: enabled });
      }
      toast("Provider saved", "success");
      onSaved();
    } catch (e) { toast(e instanceof Error ? e.message : "Save failed", "error"); }
    finally { setSaving(false); }
  };

  return (
    <CgDrawer opened={opened} onClose={onClose} title={editing ? "Edit Provider" : "Add Provider"} icon={<AnimatedServer size={16} />} iconColor="teal">
      <TextInput label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
      {!editing && (
        <Select label="Adapter Type" value={adapterType} onChange={(v) => setAdapterType(v || "litellm")} data={[{ value: "litellm", label: "litellm" }]} />
      )}
      <TextInput label="Base URL" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" />
      <Textarea label="Config (JSON)" value={config} onChange={(e) => setConfig(e.target.value)} rows={5} ff="monospace"
        description='Tip: add {"api_key": "your-key"} here to authenticate with the provider.' />
      <Switch label="Enabled" checked={enabled} onChange={(e) => setEnabled(e.currentTarget.checked)} />
      <Button onClick={handleSave} loading={saving} fullWidth variant="gradient" gradient={{ from: "brand", to: "teal", deg: 90 }}>Save</Button>
    </CgDrawer>
  );
}

// ─── Deployment CRUD Drawer ───────────────────────────────────────────────────
function DeploymentDrawer({
  opened, onClose, editing, providers, onSaved,
}: { opened: boolean; onClose: () => void; editing: Deployment | null; providers: Provider[]; onSaved: () => void }) {
  const { toast } = useToast();
  const [providerId, setProviderId] = useState("");
  const [modelName, setModelName] = useState("");
  const [litellmModel, setLitellmModel] = useState("");
  const [params, setParams] = useState("{}");
  const [tpm, setTpm] = useState<number | "">("");
  const [rpm, setRpm] = useState<number | "">("");
  const [ctx, setCtx] = useState<number | "">("");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (opened) {
      setProviderId(editing?.provider_id ?? providers[0]?.id ?? "");
      setModelName(editing?.model_name ?? "");
      setLitellmModel(editing?.litellm_model ?? "");
      setParams(editing ? JSON.stringify(editing.litellm_params, null, 2) : "{}");
      setTpm(editing?.tpm ?? "");
      setRpm(editing?.rpm ?? "");
      setCtx(editing?.context_window ?? "");
      setEnabled(editing?.is_enabled ?? true);
    }
  }, [opened, editing, providers]);

  const handleSave = async () => {
    setSaving(true);
    let parsed = {};
    try { parsed = JSON.parse(params); } catch { toast("Invalid JSON", "error"); setSaving(false); return; }
    try {
      const body = {
        provider_id: providerId, model_name: modelName, litellm_model: litellmModel,
        litellm_params: parsed, tpm: tpm || null, rpm: rpm || null, context_window: ctx || null, is_enabled: enabled,
      };
      if (editing) await api.patch(`/api/admin/deployments/${editing.id}`, body);
      else await api.post("/api/admin/deployments", body);
      toast("Deployment saved", "success");
      onSaved();
    } catch (e) { toast(e instanceof Error ? e.message : "Save failed", "error"); }
    finally { setSaving(false); }
  };

  return (
    <CgDrawer opened={opened} onClose={onClose} title={editing ? "Edit Deployment" : "Add Deployment"} size="lg" icon={<AnimatedGitBranch size={16} />} iconColor="orange">
      <Select label="Provider" value={providerId} onChange={(v) => setProviderId(v ?? "")} disabled={!!editing}
        data={providers.map((p) => ({ value: p.id, label: p.name }))} />
      <TextInput label="Model Name (alias)" value={modelName} onChange={(e) => setModelName(e.target.value)} required />
      <TextInput label="LiteLLM Model" value={litellmModel} onChange={(e) => setLitellmModel(e.target.value)} required />
      <Textarea label="litellm_params (JSON)" value={params} onChange={(e) => setParams(e.target.value)} rows={4} ff="monospace" />
      <Group grow>
        <NumberInput label="TPM" value={tpm} onChange={(v) => setTpm(v as number)} />
        <NumberInput label="RPM" value={rpm} onChange={(v) => setRpm(v as number)} />
        <NumberInput label="Context" value={ctx} onChange={(v) => setCtx(v as number)} />
      </Group>
      <Switch label="Enabled" checked={enabled} onChange={(e) => setEnabled(e.currentTarget.checked)} />
      <Button onClick={handleSave} loading={saving} fullWidth variant="gradient" gradient={{ from: "brand", to: "orange", deg: 90 }}>Save</Button>
    </CgDrawer>
  );
}

// ─── Provider Key CRUD Drawer ─────────────────────────────────────────────────
function ProviderKeyDrawer({
  opened, onClose, providers, onSaved,
}: { opened: boolean; onClose: () => void; providers: Provider[]; onSaved: () => void }) {
  const { toast } = useToast();
  const [providerId, setProviderId] = useState("");
  const [label, setLabel] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (opened) { setProviderId(providers[0]?.id ?? ""); setLabel(""); setKeyValue(""); }
  }, [opened, providers]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post("/api/admin/provider-keys", { provider_id: providerId, label, key_value: keyValue });
      toast("Provider key saved", "success");
      onSaved();
    } catch (e) { toast(e instanceof Error ? e.message : "Save failed", "error"); }
    finally { setSaving(false); }
  };

  return (
    <CgDrawer opened={opened} onClose={onClose} title="Add Provider Key" icon={<AnimatedKey size={16} />} iconColor="orange">
      <Select label="Provider" value={providerId} onChange={(v) => setProviderId(v ?? "")}
        data={providers.map((p) => ({ value: p.id, label: p.name }))} />
      <TextInput label="Label" value={label} onChange={(e) => setLabel(e.target.value)} required />
      <PasswordInput label="API Key Value" value={keyValue} onChange={(e) => setKeyValue(e.target.value)} required
        description="Encrypted at rest; never shown again." />
      <Button onClick={handleSave} loading={saving} fullWidth variant="gradient" gradient={{ from: "brand", to: "grape", deg: 90 }}>Save Key</Button>
    </CgDrawer>
  );
}
