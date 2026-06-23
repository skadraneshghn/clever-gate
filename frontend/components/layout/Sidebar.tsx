"use client";

import {
  AppShell,
  NavLink,
  Text,
  Group,
  ThemeIcon,
  ScrollArea,
  Box,
  Stack,
  Avatar,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import {
  FiGrid,
  FiLayers,
  FiGitMerge,
  FiUsers,
  FiKey,
  FiDollarSign,
  FiActivity,
  FiDatabase,
  FiSettings,
  FiZap,
  FiTerminal,
  FiLogOut,
} from "react-icons/fi";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth";

const groupedNav = [
  {
    title: "Gateway",
    items: [
      { href: "/", label: "Dashboard", icon: <FiGrid size={16} />, color: "#5360f8" },     // Indigo-blue
      { href: "/providers", label: "Providers", icon: <FiLayers size={16} />, color: "#0d9488" }, // Teal
      { href: "/models", label: "Models & Routing", icon: <FiGitMerge size={16} />, color: "#ea580c" }, // Orange
      { href: "/keys", label: "Virtual Keys", icon: <FiKey size={16} />, color: "#d97706" },     // Amber
    ],
  },
  {
    title: "Monitoring",
    items: [
      { href: "/monitoring", label: "Monitoring", icon: <FiActivity size={16} />, color: "#0891b2" }, // Cyan
      { href: "/logs", label: "System Logs", icon: <FiTerminal size={16} />, color: "#2563eb" }, // Blue
    ],
  },
  {
    title: "Management",
    items: [
      { href: "/spend", label: "Spend & Cost", icon: <FiDollarSign size={16} />, color: "#16a34a" }, // Green
      { href: "/cache", label: "Cache", icon: <FiDatabase size={16} />, color: "#7c3aed" },       // Violet
      { href: "/users", label: "Users & Teams", icon: <FiUsers size={16} />, color: "#db2777" },  // Pink
    ],
  },
  {
    title: "System",
    items: [
      { href: "/settings", label: "Settings", icon: <FiSettings size={16} />, color: "#6b7280" },   // Gray
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const initial = (user?.username?.[0] ?? "A").toUpperCase();

  return (
    <AppShell.Navbar>
      {/* Header section with MacOS dots and App title */}
      <Box p="md">
        {/* macOS style titlebar controls */}
        <Group gap="xs" mb="md" px="sm" className="cg-mac-dots" style={{ height: 18 }}>
          <div className="cg-mac-dot red" />
          <div className="cg-mac-dot yellow" />
          <div className="cg-mac-dot green" />
        </Group>

        <Group gap="sm" mb="xs" px="sm">
          <motion.div
            whileHover={{ scale: 1.08, rotate: 15 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <ThemeIcon
              size={36}
              radius="md"
              variant="gradient"
              gradient={{ from: "brand", to: "grape", deg: 45 }}
              style={{
                boxShadow: "0 4px 12px rgba(106, 118, 252, 0.25)",
                cursor: "pointer",
              }}
            >
              <FiZap size={18} style={{ color: "#fff" }} />
            </ThemeIcon>
          </motion.div>
          <Box>
            <Text fw={850} size="sm" lh={1.1} style={{ letterSpacing: -0.2 }}>
              Clever Gateway
            </Text>
            <Text size="xs" c="dimmed" fw={600} style={{ letterSpacing: 0.4 }}>
              ADMIN PANEL
            </Text>
          </Box>
        </Group>
      </Box>

      {/* Main navigation list */}
      <AppShell.Section grow component={ScrollArea} px="sm" pb="md">
        {groupedNav.map((group) => (
          <Box key={group.title} mb="lg">
            <Text
              size="10px"
              fw={800}
              c="dimmed"
              tt="uppercase"
              pl="sm"
              mb={8}
              style={{ letterSpacing: 1 }}
            >
              {group.title}
            </Text>
            <Stack gap={4}>
              {group.items.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <motion.div
                    key={item.href}
                    whileHover={{ x: 4, scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    transition={{ type: "spring", stiffness: 350, damping: 22 }}
                  >
                    <NavLink
                      component={Link}
                      href={item.href}
                      label={item.label}
                      leftSection={
                        active ? (
                          <motion.div
                            animate={{ scale: [1, 1.15, 1] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            style={{ color: item.color }}
                          >
                            {item.icon}
                          </motion.div>
                        ) : (
                          <div style={{ color: "var(--mantine-color-dimmed)", opacity: 0.85 }}>
                            {item.icon}
                          </div>
                        )
                      }
                      active={active}
                      variant="light"
                      color="brand"
                      styles={() => ({
                        root: {
                          borderRadius: "10px",
                          height: 38,
                          fontWeight: active ? 700 : 550,
                          backgroundColor: active ? "rgba(106, 118, 252, 0.08)" : "transparent",
                          color: active ? "var(--mantine-color-brand-filled)" : "inherit",
                          transition: "all 0.2s ease",
                        },
                      })}
                    />
                  </motion.div>
                );
              })}
            </Stack>
          </Box>
        ))}
      </AppShell.Section>

      {/* Bottom user profile card */}
      <AppShell.Section p="md" style={{ borderTop: "1px solid rgba(0, 0, 0, 0.05)" }}>
        <Group justify="space-between" align="center" wrap="nowrap">
          <Group gap="xs" wrap="nowrap" style={{ overflow: "hidden" }}>
            <Avatar
              size="sm"
              color="brand"
              radius="xl"
              style={{
                boxShadow: "0 2px 8px rgba(106, 118, 252, 0.15)",
              }}
            >
              {initial}
            </Avatar>
            <Box style={{ overflow: "hidden" }}>
              <Text size="xs" fw={750} truncate style={{ maxWidth: 110 }}>
                {user?.username ?? "Salman JB"}
              </Text>
              <Text size="10px" c="dimmed" fw={500} truncate style={{ maxWidth: 110 }}>
                {user?.email ?? "salman@clever.local"}
              </Text>
            </Box>
          </Group>
          <Tooltip label="Logout" position="top" withArrow>
            <ActionIcon
              variant="subtle"
              color="red"
              size="md"
              radius="md"
              onClick={handleLogout}
            >
              <FiLogOut size={15} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </AppShell.Section>
    </AppShell.Navbar>
  );
}
