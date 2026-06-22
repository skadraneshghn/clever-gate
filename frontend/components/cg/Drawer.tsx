"use client";

import { Drawer, Title, Stack, ThemeIcon, Group, Text } from "@mantine/core";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface CgDrawerProps {
  opened: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: string | number;
  icon?: ReactNode;
  iconColor?: string;
}

export function CgDrawer({
  opened,
  onClose,
  title,
  children,
  size = "md",
  icon,
  iconColor = "brand",
}: CgDrawerProps) {
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size={size}
      padding="xl"
      title={
        <Group gap="sm">
          {icon && (
            <ThemeIcon size={32} radius="md" variant="light" color={iconColor}>
              {icon}
            </ThemeIcon>
          )}
          <Title order={5}>{title}</Title>
        </Group>
      }
      closeButtonProps={{ "aria-label": "Close" }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.3 }}
      >
        <Stack gap="md">{children}</Stack>
      </motion.div>
    </Drawer>
  );
}
