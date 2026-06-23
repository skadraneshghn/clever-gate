"use client";

import { AppShell, NavLink, Text, Group, ThemeIcon, ScrollArea, Box } from "@mantine/core";
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
} from "react-icons/fi";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard", icon: <FiGrid size={18} />, color: "#5360f8" },     // Indigo-blue
  { href: "/providers", label: "Providers", icon: <FiLayers size={18} />, color: "#0d9488" }, // Teal
  { href: "/models", label: "Models & Routing", icon: <FiGitMerge size={18} />, color: "#ea580c" }, // Orange
  { href: "/users", label: "Users & Teams", icon: <FiUsers size={18} />, color: "#db2777" },  // Pink
  { href: "/keys", label: "Virtual Keys", icon: <FiKey size={18} />, color: "#d97706" },     // Amber
  { href: "/spend", label: "Spend & Cost", icon: <FiDollarSign size={18} />, color: "#16a34a" }, // Green
  { href: "/monitoring", label: "Monitoring", icon: <FiActivity size={18} />, color: "#0891b2" }, // Cyan
  { href: "/logs", label: "System Logs", icon: <FiTerminal size={18} />, color: "#2563eb" }, // Blue
  { href: "/cache", label: "Cache", icon: <FiDatabase size={18} />, color: "#7c3aed" },       // Violet
  { href: "/settings", label: "Settings", icon: <FiSettings size={18} />, color: "#6b7280" },   // Gray
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <AppShell.Navbar>
      <Box p="md">
        <Group gap="sm" mb="lg" px="sm">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 15 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <ThemeIcon
              size={38}
              radius="md"
              variant="gradient"
              gradient={{ from: "brand", to: "grape", deg: 45 }}
              style={{
                boxShadow: "0 4px 12px rgba(106, 118, 252, 0.25)",
                cursor: "pointer",
              }}
            >
              <FiZap size={20} style={{ color: "#fff" }} />
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
      <AppShell.Section grow component={ScrollArea}>
        <Box p="xs">
          <Stack gap={4}>
            {navItems.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <motion.div
                  key={item.href}
                  whileHover={{ x: 6, scale: 1.01 }}
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
                        borderRadius: "8px",
                        height: 40,
                        fontWeight: active ? 700 : 500,
                        backgroundColor: active ? "rgba(106, 118, 252, 0.12)" : "transparent",
                        transition: "background-color 0.2s ease",
                      },
                    })}
                  />
                </motion.div>
              );
            })}
          </Stack>
        </Box>
      </AppShell.Section>
    </AppShell.Navbar>
  );
}

// Helper block to support Stack layout inside sidebar
import { Stack } from "@mantine/core";

