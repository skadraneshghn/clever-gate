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
  AnimatedGrid,
  AnimatedLayers,
  AnimatedGitMerge,
  AnimatedKey,
  AnimatedActivity,
  AnimatedTerminal,
  AnimatedDollarSign,
  AnimatedDatabase,
  AnimatedUsers,
  AnimatedSettings,
  AnimatedZap,
  AnimatedLogOut,
} from "../cg/AnimatedIcons";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth";

const groupedNav = [
  {
    title: "Gateway",
    items: [
      { href: "/", label: "Dashboard", icon: AnimatedGrid, color: "#3f72af" },
      { href: "/providers", label: "Providers", icon: AnimatedLayers, color: "#428475" },
      { href: "/models", label: "Models & Routing", icon: AnimatedGitMerge, color: "#ea580c" },
      { href: "/keys", label: "Virtual Keys", icon: AnimatedKey, color: "#d97706" },
    ],
  },
  {
    title: "Monitoring",
    items: [
      { href: "/monitoring", label: "Monitoring", icon: AnimatedActivity, color: "#0891b2" },
      { href: "/logs", label: "System Logs", icon: AnimatedTerminal, color: "#2563eb" },
    ],
  },
  {
    title: "Management",
    items: [
      { href: "/spend", label: "Spend & Cost", icon: AnimatedDollarSign, color: "#16a34a" },
      { href: "/cache", label: "Cache", icon: AnimatedDatabase, color: "#7c3aed" },
      { href: "/users", label: "Users & Teams", icon: AnimatedUsers, color: "#db2777" },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/settings", label: "Settings", icon: AnimatedSettings, color: "#6b7280" },
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
              gradient={{ from: "brand", to: "brand", deg: 45 }}
              style={{
                boxShadow: "0 4px 12px var(--cg-shadow-glow)",
                cursor: "pointer",
              }}
            >
              <AnimatedZap size={18} style={{ color: "#fff" }} />
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
                const IconComponent = item.icon;
                return (
                  <motion.div
                    key={item.href}
                    initial="rest"
                    whileHover="hover"
                    whileTap="tap"
                    variants={{
                      rest: { x: 0, scale: 1 },
                      hover: { x: 4, scale: 1.01 },
                      tap: { scale: 0.99 }
                    }}
                    transition={{ type: "spring", stiffness: 350, damping: 22 }}
                  >
                    <NavLink
                      component={Link}
                      href={item.href}
                      label={item.label}
                      leftSection={
                        <IconComponent
                          size={16}
                          color={active ? item.color : "var(--mantine-color-dimmed)"}
                          style={{ opacity: active ? 1 : 0.85 }}
                        />
                      }
                      active={active}
                      variant="light"
                      color="brand"
                      styles={() => ({
                        root: {
                          borderRadius: "10px",
                          height: 38,
                          fontWeight: active ? 700 : 550,
                          backgroundColor: active ? "var(--cg-hover-glow)" : "transparent",
                          color: active ? "var(--mantine-color-brand-filled)" : "inherit",
                          transition: "background-color 0.2s ease",
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
      <AppShell.Section p="md" style={{ borderTop: "1px solid var(--cg-border)" }}>
        <Group justify="space-between" align="center" wrap="nowrap">
          <Group gap="xs" wrap="nowrap" style={{ overflow: "hidden" }}>
            <Avatar
              size="sm"
              color="brand"
              radius="xl"
              style={{
                boxShadow: "0 2px 8px var(--cg-shadow-glow)",
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
              component={motion.button}
              whileHover={{ scale: 1.15, rotate: -10 }}
              whileTap={{ scale: 0.9 }}
            >
              <AnimatedLogOut size={15} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </AppShell.Section>
    </AppShell.Navbar>
  );
}
