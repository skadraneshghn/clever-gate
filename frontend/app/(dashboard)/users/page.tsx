"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Stack, Group, Button, Badge, ActionIcon, TextInput, PasswordInput, Switch, Text,
} from "@mantine/core";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import { FiUsers, FiUserCheck, FiUserX, FiShield } from "react-icons/fi";
import {
  CgTable, CgDrawer, useCgConfirm, useToast, type CgColumn,
} from "../../../components/cg";
import { LoadingState } from "../../../components/States";
import { PageHeader, MotionSection, MotionItem, FadeIn } from "../../../components/anim";
import { api } from "../../../lib";
import type { Paginated, User } from "../../../lib/types";

export default function UsersPage() {
  const { toast } = useToast();
  const confirm = useCgConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Paginated<User>>("/api/admin/users?page=1&page_size=200");
      setUsers(res.items);
    } catch (e) { toast(e instanceof Error ? e.message : "Load failed", "error"); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const columns: CgColumn<User>[] = [
    { key: "username", label: "Username", render: (u) => <Text fw={600}>{u.username}</Text> },
    { key: "email", label: "Email" },
    {
      key: "roles", label: "Roles",
      render: (u) => (
        <Group gap="xs">
          {u.is_admin && <Badge variant="light" color="grape" size="xs" leftSection={<FiShield size={10} />}>admin</Badge>}
          <Badge variant="light" color={u.is_active ? "green" : "gray"} size="xs" leftSection={u.is_active ? <FiUserCheck size={10} /> : <FiUserX size={10} />}>
            {u.is_active ? "active" : "disabled"}
          </Badge>
        </Group>
      ),
    },
    { key: "last_login_at", label: "Last Login", render: (u) => u.last_login_at ?? "—" },
    {
      key: "actions", label: "",
      render: (u) => (
        <Group gap="xs">
          <ActionIcon variant="subtle" onClick={() => { setEditing(u); setDrawerOpen(true); }}>
            <IconEdit size={16} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="red" onClick={() => confirm({
            title: "Delete user",
            message: "This will permanently delete the user.",
            confirmLabel: "Delete", danger: true,
            onConfirm: async () => {
              try { await api.delete(`/api/admin/users/${u.id}`); toast("User deleted", "success"); await load(); }
              catch (e) { toast(e instanceof Error ? e.message : "Delete failed", "error"); }
            },
          })}>
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      ),
    },
  ];

  return (
    <Stack gap="lg">
      <PageHeader
        icon={<FiUsers size={22} />}
        iconColor="#db2777"
        title="Users & Teams"
        description="Manage admin users, roles, and access"
        actions={
          <FadeIn delay={0.1}>
            <Button leftSection={<IconPlus size={16} />} onClick={() => { setEditing(null); setDrawerOpen(true); }} variant="gradient" gradient={{ from: "brand", to: "pink", deg: 90 }}>
              Add User
            </Button>
          </FadeIn>
        }
      />
      {loading ? <LoadingState /> : (
        <MotionSection>
          <MotionItem>
            <CgTable columns={columns} rows={users} rowKey={(u) => u.id} emptyMessage="No users yet." />
          </MotionItem>
        </MotionSection>
      )}
      <UserDrawer opened={drawerOpen} onClose={() => setDrawerOpen(false)} editing={editing}
        onSaved={async () => { setDrawerOpen(false); await load(); }} />
    </Stack>
  );
}

function UserDrawer({ opened, onClose, editing, onSaved }: {
  opened: boolean; onClose: () => void; editing: User | null; onSaved: () => void;
}) {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (opened) {
      setUsername(editing?.username ?? ""); setEmail(editing?.email ?? ""); setPassword("");
      setFirstName(editing?.first_name ?? ""); setLastName(editing?.last_name ?? "");
      setIsAdmin(editing?.is_admin ?? false); setIsActive(editing?.is_active ?? true);
    }
  }, [opened, editing]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/api/admin/users/${editing.id}`, {
          first_name: firstName || null, last_name: lastName || null, is_admin: isAdmin, is_active: isActive,
        });
      } else {
        await api.post("/api/admin/users", {
          username, email, password, first_name: firstName || null, last_name: lastName || null,
          is_admin: isAdmin, is_active: isActive,
        });
      }
      toast("User saved", "success"); onSaved();
    } catch (e) { toast(e instanceof Error ? e.message : "Save failed", "error"); }
    finally { setSaving(false); }
  };

  return (
    <CgDrawer opened={opened} onClose={onClose} title={editing ? "Edit User" : "Add User"} icon={<FiUsers size={16} />} iconColor="grape">
      <TextInput label="Username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={!!editing} required />
      <TextInput label="Email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!!editing} required />
      {!editing && <PasswordInput label="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />}
      <TextInput label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
      <TextInput label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
      <Switch label="Admin" checked={isAdmin} onChange={(e) => setIsAdmin(e.currentTarget.checked)} />
      <Switch label="Active" checked={isActive} onChange={(e) => setIsActive(e.currentTarget.checked)} />
      <Button onClick={handleSave} loading={saving} fullWidth variant="gradient" gradient={{ from: "brand", to: "grape", deg: 90 }}>Save</Button>
    </CgDrawer>
  );
}
