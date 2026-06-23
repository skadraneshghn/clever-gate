"use client";

import { Card, Text, Group, Stack, ThemeIcon, Badge, Box } from "@mantine/core";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar } from "recharts";

interface CgStatProps {
  title: string;
  value: ReactNode;
  subtitle?: string;
  icon?: ReactNode;
  color?: string;
  trendBadge?: string;
  trendType?: "up" | "down" | "neutral";
  sparklineData?: number[];
  sparklineColor?: string;
  sparklineType?: "line" | "bar";
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

export function CgStat({
  title,
  value,
  subtitle,
  icon,
  color = "brand",
  trendBadge,
  trendType = "neutral",
  sparklineData,
  sparklineColor,
  sparklineType = "line",
}: CgStatProps) {
  const glowColor = colorGlowMap[color] || "rgba(106, 118, 252, 0.12)";
  const badgeColor = trendType === "up" ? "green" : trendType === "down" ? "red" : "gray";
  
  const chartData = sparklineData?.map((v, i) => ({ id: i, value: v })) ?? [];

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
        p="md"
        radius="lg"
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

        <Group justify="space-between" align="center" style={{ position: "relative", zIndex: 1, width: "100%", wrap: "nowrap" }}>
          <Stack gap={2} style={{ flexGrow: 1, overflow: "hidden" }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={800} style={{ letterSpacing: 0.6 }}>
              {title}
            </Text>
            
            <Group gap="xs" align="baseline" wrap="nowrap">
              <Text size="xl" fw={900} style={{ letterSpacing: -0.5, lineHeight: 1.2 }}>
                {value}
              </Text>
              {subtitle && (
                <Text size="10px" c="dimmed" fw={600} truncate>
                  {subtitle}
                </Text>
              )}
            </Group>

            {trendBadge && (
              <Group gap={4} mt={2} wrap="nowrap">
                <Badge size="xs" variant="light" color={badgeColor} style={{ fontWeight: 750, textTransform: "none", padding: "1px 6px" }}>
                  {trendBadge}
                </Badge>
                <Text size="10px" c="dimmed" fw={500} visibleFrom="xs">
                  vs last month
                </Text>
              </Group>
            )}
          </Stack>

          {/* Render Sparkline or Icon */}
          {sparklineData && sparklineData.length > 0 ? (
            <Box style={{ width: 90, height: 38, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                {sparklineType === "bar" ? (
                  <BarChart data={chartData}>
                    <Bar dataKey="value" fill={sparklineColor || "#6a76fc"} radius={[2, 2, 0, 0]} />
                  </BarChart>
                ) : (
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id={`sparkGrad-${title}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={sparklineColor || "#6a76fc"} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={sparklineColor || "#6a76fc"} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={sparklineColor || "#6a76fc"}
                      fill={`url(#sparkGrad-${title})`}
                      strokeWidth={2}
                      dot={false}
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </Box>
          ) : (
            icon && (
              <ThemeIcon
                size={34}
                radius="md"
                variant="light"
                color={color}
                style={{
                  boxShadow: `0 4px 10px ${glowColor}`,
                  flexShrink: 0,
                }}
              >
                {icon}
              </ThemeIcon>
            )
          )}
        </Group>
      </Card>
    </motion.div>
  );
}
