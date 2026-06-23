"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Stack, Group, Button, Badge, ActionIcon, TextInput, Select, Alert, Text, CopyButton,
} from "@mantine/core";
import {
  AnimatedPlus,
  AnimatedTrash,
  AnimatedCopy,
  AnimatedCheck,
  AnimatedKey,
  AnimatedCheckCircle,
  AnimatedXCircle,
} from "../../../components/cg/AnimatedIcons";
import {
  CgTable, CgDrawer, useCgConfirm, useToast, type CgColumn,
} from "../../../components/cg";
import { LoadingState } from "../../../components/States";
import { PageHeader, MotionSection, MotionItem, FadeIn } from "../../../components/anim";
import { api } from "../../../lib";
import { motion } from "framer-motion";
import type { Paginated, ApiKey, ApiKeyCreated, User } from "../../../lib/types";

export default function KeysPage() {
  const { toast } = useToast();
  const confirm = useCgConfirm();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [kr, ur] = await Promise.all([
        api.get<Paginated<ApiKey>>("/api/admin/api-keys?page=1&page_size=200"),
        api.get<Paginated<User>>("/api/admin/users?page=1&page_size=200"),
      ]);
      setKeys(kr.items); setUsers(ur.items);
    } catch (e) { toast(e instanceof Error ? e.message : "Load failed", "error"); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const userName = (id: string) => users.find((u) => u.id === id)?.username ?? id.slice(0, 8);

  const columns: CgColumn<ApiKey>[] = [
    { key: "name", label: "Name", render: (k) => k.name ?? "—" },
    { key: "key_prefix", label: "Prefix", render: (k) => <Text ff="monospace" size="xs">{k.key_prefix}…</Text> },
    { key: "user_id", label: "User", render: (k) => userName(k.user_id) },
    {
      key: "allowed_models", label: "Models",
      render: (k) => k.allowed_models?.length ? k.allowed_models.join(", ") : "all",
    },
    {
      key: "is_active", label: "Status",
      render: (k) => <Badge variant="light" color={k.is_active ? "green" : "gray"} size="xs" leftSection={k.is_active ? <AnimatedCheckCircle size={10} /> : <AnimatedXCircle size={10} />}>{k.is_active ? "active" : "revoked"}</Badge>,
    },
    { key: "last_used_at", label: "Last Used", render: (k) => k.last_used_at ?? "—" },
    {
      key: "actions", label: "",
      render: (k) => (
        <ActionIcon variant="subtle" color="red" onClick={() => confirm({
          title: "Revoke key", message: "This key will be permanently revoked.",
          confirmLabel: "Revoke", danger: true,
          onConfirm: async () => {
            try { await api.delete(`/api/admin/api-keys/${k.id}`); toast("Key revoked", "success"); await load(); }
            catch (e) { toast(e instanceof Error ? e.message : "Revoke failed", "error"); }
          },
        })} component={motion.button} whileHover="hover">
          <AnimatedTrash size={16} />
        </ActionIcon>
      ),
    },
  ];

  return (
    <Stack gap="lg">
      <PageHeader
        icon={<AnimatedKey size={22} />}
        iconColor="#d97706"
        title="Virtual Keys"
        description="Generate and manage API keys for users"
        actions={
          <FadeIn delay={0.1}>
            <Button leftSection={<AnimatedPlus size={16} />} onClick={() => setDrawerOpen(true)} variant="gradient" gradient={{ from: "brand", to: "orange", deg: 90 }}>Generate Key</Button>
          </FadeIn>
        }
      />

      {createdKey && (
        <FadeIn>
          <Alert icon={<AnimatedCheck size={16} />} color="orange" variant="light" withCloseButton onClose={() => setCreatedKey(null)}>
            <Group gap="sm">
              <Text size="sm">New key (shown once):</Text>
              <Text ff="monospace" size="xs">{createdKey}</Text>
              <CopyButton value={createdKey} timeout={2000}>
                {({ copied, copy }) => (
                  <Button size="xs" variant="subtle" onClick={copy} leftSection={copied ? <AnimatedCheck size={14} /> : <AnimatedCopy size={14} />}>
                    {copied ? "Copied" : "Copy"}
                  </Button>
                )}
              </CopyButton>
            </Group>
          </Alert>
        </FadeIn>
      )}

      {loading ? <LoadingState /> : (
        <MotionSection>
          <MotionItem>
            <CgTable columns={columns} rows={keys} rowKey={(k) => k.id} emptyMessage="No virtual keys yet." />
          </MotionItem>
        </MotionSection>
      )}

      <KeyDrawer opened={drawerOpen} onClose={() => setDrawerOpen(false)} users={users}
        onCreated={(full) => { setCreatedKey(full); setDrawerOpen(false); load(); }} />
    </Stack>
  );
}

function KeyDrawer({ opened, onClose, users, onCreated }: {
  opened: boolean; onClose: () => void; users: User[]; onCreated: (full: string) => void;
}) {
  const { toast } = useToast();
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [models, setModels] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (opened) { setUserId(users[0]?.id ?? ""); setName(""); setModels(""); }
  }, [opened, users]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const allowed = models ? models.split(",").map((m) => m.trim()).filter(Boolean) : null;
      const res = await api.post<ApiKeyCreated>("/api/admin/api-keys", { user_id: userId, name: name || null, allowed_models: allowed });
      toast("Key generated", "success"); onCreated(res.key);
    } catch (e) { toast(e instanceof Error ? e.message : "Save failed", "error"); }
    finally { setSaving(false); }
  };

  return (
    <CgDrawer opened={opened} onClose={onClose} title="Generate Virtual Key" icon={<AnimatedKey size={16} />} iconColor="orange">
      <Select label="User" value={userId} onChange={(v) => setUserId(v ?? "")} required
        data={users.map((u) => ({ value: u.id, label: `${u.username} (${u.email})` }))} />
      <TextInput label="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
      <TextInput label="Allowed Models (comma-separated)" value={models}
        onChange={(e) => setModels(e.target.value)} description="Leave empty to allow all models" />
      <Button onClick={handleSave} loading={saving} fullWidth variant="gradient" gradient={{ from: "brand", to: "orange", deg: 90 }}>Generate</Button>
    </CgDrawer>
  );
}
