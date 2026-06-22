"use client";

import { Card, Text, Group, Stack, ThemeIcon } from "@mantine/core";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface CgStatProps {
  title: string;
  value: ReactNode;
  subtitle?: string;
  icon?: ReactNode;
  color?: string;
}

const colorGlowMap: Record<string, string> = {
  brand: "rgba(106, 118, 252, 0.15)",
  grape: "rgba(190, 75, 219, 0.15)",
  orange: "rgba(253, 126, 20, 0.15)",
  green: "rgba(64, 192, 87, 0.15)",
  red: "rgba(250, 82, 82, 0.15)",
  teal: "rgba(18, 184, 134, 0.15)",
  cyan: "rgba(20, 184, 166, 0.15)",
};

export function CgStat({ title, value, subtitle, icon, color = "brand" }: CgStatProps) {
  const glowColor = colorGlowMap[color] || "rgba(106, 118, 252, 0.12)";

  return (
    <motion.div
      whileHover={{
        y: -4,
        scale: 1.015,
        boxShadow: `0 12px 24px ${glowColor}`,
      }}
      transition={{ type: "spring", stiffness: 350, damping: 22 }}
      style={{ display: "flex", flex: 1, width: "100%" }}
    >
      <Card
        p="lg"
        radius="md"
        withBorder
        style={{
          width: "100%",
          cursor: "pointer",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle decorative glow orb */}
        <div
          style={{
            position: "absolute",
            top: -20,
            right: -20,
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: glowColor,
            filter: "blur(20px)",
            pointerEvents: "none",
          }}
        />

        <Group justify="space-between" align="flex-start" style={{ position: "relative", zIndex: 1, width: "100%" }}>
          <Stack gap={4}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={800} style={{ letterSpacing: 0.6 }}>
              {title}
            </Text>
            <Text size="xl" fw={900} style={{ letterSpacing: -0.5, lineHeight: 1.2 }}>
              {value}
            </Text>
            {subtitle && (
              <Text size="xs" c="dimmed" fw={600}>
                {subtitle}
              </Text>
            )}
          </Stack>
          {icon && (
            <ThemeIcon
              size={36}
              radius="md"
              variant="light"
              color={color}
              style={{
                boxShadow: `0 4px 10px ${glowColor}`,
              }}
            >
              {icon}
            </ThemeIcon>
          )}
        </Group>
      </Card>
    </motion.div>
  );
}
