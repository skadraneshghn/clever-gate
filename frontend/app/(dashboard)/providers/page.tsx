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
} from "@mantine/core";
import { IconPlus, IconEdit, IconTrash, IconFlask } from "@tabler/icons-react";
import { FiLayers, FiServer, FiGitBranch, FiKey, FiCheckCircle, FiXCircle } from "react-icons/fi";
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
import type { Paginated, Provider, Deployment, ProviderKey } from "../../../lib/types";

type Tab = "providers" | "deployments" | "keys";

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
        <Badge variant="light" color={p.is_enabled ? "green" : "gray"} size="sm" leftSection={p.is_enabled ? <FiCheckCircle size={12} /> : <FiXCircle size={12} />}>
          {p.is_enabled ? "enabled" : "disabled"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (p) => (
        <Group gap="xs">
          <ActionIcon variant="subtle" onClick={() => { setEditing(p); setDrawerOpen(true); }}>
            <IconEdit size={16} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="teal" onClick={() => handleTest(p.id)}>
            <IconFlask size={16} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="red" onClick={() => handleDelete("providers", p.id)}>
            <IconTrash size={16} />
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
        <Badge variant="light" color={d.is_enabled ? "green" : "gray"} size="sm" leftSection={d.is_enabled ? <FiCheckCircle size={12} /> : <FiXCircle size={12} />}>
          {d.is_enabled ? "enabled" : "disabled"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (d) => (
        <Group gap="xs">
          <ActionIcon variant="subtle" onClick={() => { setEditing(d); setDrawerOpen(true); }}>
            <IconEdit size={16} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="red" onClick={() => handleDelete("deployments", d.id)}>
            <IconTrash size={16} />
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
        <Badge variant="light" color={k.is_enabled ? "green" : "gray"} size="sm" leftSection={k.is_enabled ? <FiCheckCircle size={12} /> : <FiXCircle size={12} />}>
          {k.is_enabled ? "enabled" : "disabled"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (k) => (
        <ActionIcon variant="subtle" color="red" onClick={() => handleDelete("keys", k.id)}>
          <IconTrash size={16} />
        </ActionIcon>
      ),
    },
  ];

  return (
    <Stack gap="lg">
      <PageHeader
        icon={<FiLayers size={22} />}
        iconColor="#0d9488"
        title="Providers Management"
        description="Configure AI providers, deployments, and API keys"
        actions={
          <FadeIn delay={0.1}>
            <Button
              leftSection={<IconPlus size={16} />}
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
          <Tabs.Tab value="providers" leftSection={<FiServer size={16} style={{ color: "#0d9488" }} />}>Providers</Tabs.Tab>
          <Tabs.Tab value="deployments" leftSection={<FiGitBranch size={16} style={{ color: "#ea580c" }} />}>Deployments</Tabs.Tab>
          <Tabs.Tab value="keys" leftSection={<FiKey size={16} style={{ color: "#d97706" }} />}>Provider Keys</Tabs.Tab>
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
    </Stack>
  );
}

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
    <CgDrawer opened={opened} onClose={onClose} title={editing ? "Edit Provider" : "Add Provider"} icon={<FiServer size={16} />} iconColor="teal">
      <TextInput label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
      {!editing && (
        <Select label="Adapter Type" value={adapterType} onChange={(v) => setAdapterType(v || "litellm")} data={[{ value: "litellm", label: "litellm" }]} />
      )}
      <TextInput label="Base URL" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" />
      <Textarea label="Config (JSON)" value={config} onChange={(e) => setConfig(e.target.value)} rows={5} ff="monospace" />
      <Switch label="Enabled" checked={enabled} onChange={(e) => setEnabled(e.currentTarget.checked)} />
      <Button onClick={handleSave} loading={saving} fullWidth variant="gradient" gradient={{ from: "brand", to: "teal", deg: 90 }}>Save</Button>
    </CgDrawer>
  );
}

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
    <CgDrawer opened={opened} onClose={onClose} title={editing ? "Edit Deployment" : "Add Deployment"} size="lg" icon={<FiGitBranch size={16} />} iconColor="orange">
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
    <CgDrawer opened={opened} onClose={onClose} title="Add Provider Key" icon={<FiKey size={16} />} iconColor="orange">
      <Select label="Provider" value={providerId} onChange={(v) => setProviderId(v ?? "")}
        data={providers.map((p) => ({ value: p.id, label: p.name }))} />
      <TextInput label="Label" value={label} onChange={(e) => setLabel(e.target.value)} required />
      <PasswordInput label="API Key Value" value={keyValue} onChange={(e) => setKeyValue(e.target.value)} required
        description="Encrypted at rest; never shown again." />
      <Button onClick={handleSave} loading={saving} fullWidth variant="gradient" gradient={{ from: "brand", to: "grape", deg: 90 }}>Save Key</Button>
    </CgDrawer>
  );
}
