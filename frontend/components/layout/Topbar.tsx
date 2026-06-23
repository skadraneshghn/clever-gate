"use client";

import {
  AppShell,
  Group,
  Text,
  ActionIcon,
  Box,
  Burger,
  Indicator,
  Button,
  Kbd,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  AnimatedSun,
  AnimatedMoon,
  AnimatedSearch,
  AnimatedBell,
  AnimatedPlus,
  AnimatedBookmark,
  AnimatedZap,
} from "../cg/AnimatedIcons";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useColorScheme } from "../../theme/ThemeRegistry";

interface TopbarProps {
  title?: string;
}

const breadcrumbMap: Record<string, { category: string; page: string }> = {
  "/": { category: "Dashboards", page: "Default" },
  "/providers": { category: "Gateway", page: "Providers" },
  "/models": { category: "Gateway", page: "Models & Routing" },
  "/keys": { category: "Gateway", page: "Virtual Keys" },
  "/monitoring": { category: "Monitoring", page: "Metrics" },
  "/logs": { category: "Monitoring", page: "System Logs" },
  "/spend": { category: "Management", page: "Spend & Cost" },
  "/cache": { category: "Management", page: "Cache" },
  "/users": { category: "Management", page: "Users & Teams" },
  "/settings": { category: "System", page: "Settings" },
};

export function Topbar({ title }: TopbarProps) {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const pathname = usePathname();
  const [opened, { toggle }] = useDisclosure();

  const trail = breadcrumbMap[pathname] ?? { category: "Clever Gateway", page: title ?? "Dashboard" };

  return (
    <AppShell.Header>
      <Group h="100%" px="md" justify="space-between" wrap="nowrap">
        {/* Left section: Burger menu and Breadcrumbs */}
        <Group gap="sm" wrap="nowrap">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          
          <Group gap={6} visibleFrom="xs" style={{ userSelect: "none" }}>
            <Text size="xs" c="dimmed" fw={600}>
              {trail.category}
            </Text>
            <Text size="xs" c="dimmed" fw={500}>
              /
            </Text>
            <Text size="xs" fw={700} style={{ color: "var(--cg-primary)" }}>
              {trail.page}
            </Text>
          </Group>
        </Group>

        {/* Center section: Global Command Search mockup */}
        <Group
          gap="xs"
          px="sm"
          py={5}
          style={{
            borderRadius: "8px",
            border: "1px solid var(--cg-border)",
            backgroundColor: "rgba(0, 0, 0, 0.02)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            maxWidth: 280,
            width: "100%",
          }}
          visibleFrom="md"
        >
          <AnimatedSearch size={13} style={{ color: "var(--mantine-color-dimmed)" }} />
          <Text size="xs" c="dimmed" style={{ flexGrow: 1, userSelect: "none", fontWeight: 550 }}>
            Search or type a command
          </Text>
          <Group gap={2} wrap="nowrap">
            <Kbd size="xs" style={{ fontSize: 9, padding: "1px 4px" }}>⌘</Kbd>
            <Kbd size="xs" style={{ fontSize: 9, padding: "1px 4px" }}>K</Kbd>
          </Group>
        </Group>

        {/* Right section: System actions & Quick buttons */}
        <Group gap="xs" wrap="nowrap">
          {/* Quick Plus icon (Spins on hover) */}
          <ActionIcon
            variant="subtle"
            size="lg"
            radius="md"
            visibleFrom="xs"
            color="gray"
            component={motion.button}
            whileHover="hover"
            whileTap={{ scale: 0.9 }}
          >
            <AnimatedPlus size={17} />
          </ActionIcon>

          {/* Notifications Bell with unread badge (Shakes like a bell on hover) */}
          <Indicator color="red" size={6} offset={6} processing>
            <ActionIcon
              variant="subtle"
              size="lg"
              radius="md"
              color="gray"
              component={motion.button}
              whileHover="hover"
              whileTap={{ scale: 0.9 }}
            >
              <AnimatedBell size={17} />
            </ActionIcon>
          </Indicator>

          {/* Bookmark icon (Floats up on hover) */}
          <ActionIcon
            variant="subtle"
            size="lg"
            radius="md"
            visibleFrom="xs"
            color="gray"
            component={motion.button}
            whileHover="hover"
            whileTap={{ scale: 0.9 }}
          >
            <AnimatedBookmark size={17} />
          </ActionIcon>

          {/* Color scheme toggle (Sun/Moon rotates) */}
          <motion.div
            whileHover="hover"
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
          >
            <ActionIcon
              variant="subtle"
              onClick={toggleColorScheme}
              size="lg"
              radius="md"
              aria-label="Toggle color scheme"
            >
              {colorScheme === "dark" ? (
                <AnimatedSun size={17} style={{ color: "#eab308" }} />
              ) : (
                <AnimatedMoon size={17} style={{ color: "#3f72af" }} />
              )}
            </ActionIcon>
          </motion.div>

          {/* Premium Gradient Actions Button (Bounces on hover) */}
          <Button
            size="xs"
            radius="md"
            variant="gradient"
            gradient={{ from: "#3f72af", to: "#112d4e", deg: 45 }}
            style={{
              fontWeight: 750,
              fontSize: "12px",
              height: "30px",
              boxShadow: "0 4px 10px rgba(63, 114, 175, 0.2)",
            }}
            leftSection={<AnimatedZap size={12} />}
            visibleFrom="sm"
            component={motion.button}
            whileHover="hover"
            whileTap={{ scale: 0.96 }}
          >
            Actions
          </Button>
        </Group>
      </Group>
    </AppShell.Header>
  );
}
