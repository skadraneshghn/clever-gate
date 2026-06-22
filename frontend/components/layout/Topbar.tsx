"use client";

import { AppShell, Group, Text, ActionIcon, Menu, Avatar, Box, Burger } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { FiSun, FiMoon, FiLogOut, FiUser } from "react-icons/fi";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useColorScheme } from "../../theme/ThemeRegistry";
import { useAuth } from "../../lib/auth";

interface TopbarProps {
  title?: string;
}

export function Topbar({ title }: TopbarProps) {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [opened, { toggle }] = useDisclosure();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const initial = (user?.username?.[0] ?? "?").toUpperCase();

  return (
    <AppShell.Header>
      <Group h="100%" px="md" justify="space-between">
        <Group gap="sm">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Text fw={850} size="lg" style={{ letterSpacing: -0.3 }}>
            {title}
          </Text>
        </Group>
        <Group gap="xs">
          <motion.div
            whileHover={{ rotate: 180, scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
          >
            <ActionIcon
              variant="subtle"
              onClick={toggleColorScheme}
              size="lg"
              aria-label="Toggle color scheme"
            >
              {colorScheme === "dark" ? (
                <FiSun size={18} style={{ color: "#eab308" }} /> // Bright gold/amber
              ) : (
                <FiMoon size={18} style={{ color: "#6366f1" }} /> // Sleek indigo
              )}
            </ActionIcon>
          </motion.div>
          <Menu shadow="md" width={220} position="bottom-end">
            <Menu.Target>
              <Box style={{ cursor: "pointer" }}>
                <motion.div
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                >
                  <ActionIcon variant="subtle" size="lg" radius="xl">
                    <Avatar
                      size="sm"
                      color="brand"
                      radius="xl"
                      style={{
                        boxShadow: "0 2px 8px rgba(106, 118, 252, 0.2)",
                      }}
                    >
                      {initial}
                    </Avatar>
                  </ActionIcon>
                </motion.div>
              </Box>
            </Menu.Target>
            <Menu.Dropdown style={{ backdropFilter: "blur(12px)" }}>
              <Box px="sm" py="xs">
                <Text fw={750} size="sm">
                  {user?.username}
                </Text>
                <Text size="xs" c="dimmed">
                  {user?.email}
                </Text>
              </Box>
              <Menu.Divider />
              <Menu.Item
                leftSection={<FiUser size={14} style={{ color: "var(--mantine-color-brand-filled)" }} />}
                disabled
              >
                Profile
              </Menu.Item>
              <Menu.Item
                leftSection={<FiLogOut size={14} />}
                onClick={handleLogout}
                color="red"
                style={{ fontWeight: 600 }}
              >
                Logout
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>
    </AppShell.Header>
  );
}

