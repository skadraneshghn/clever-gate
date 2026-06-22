"use client";

import { useEffect, useState, useRef } from "react";
import { Grid, SimpleGrid, Card, Text, Stack, Group, Badge, ThemeIcon, ScrollArea } from "@mantine/core";
import { FiActivity, FiCpu, FiDollarSign, FiZap, FiCheckCircle } from "react-icons/fi";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
} from "recharts";
import { CgStat } from "../../components/cg";
import { LoadingState } from "../../components/States";
import { api, createPollingClient } from "../../lib";
import type { DashboardMetrics, ProviderHealthItem } from "../../lib/types";

interface MetricPoint {
  time: string;
  rps: number;
  latency: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 350, damping: 25 },
  },
};

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [health, setHealth] = useState<ProviderHealthItem[]>([]);
  const [history, setHistory] = useState<MetricPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const historyRef = useRef<MetricPoint[]>([]);

  useEffect(() => {
    let mounted = true;

    const fetchMetrics = async () => {
      try {
        const m = await api.get<DashboardMetrics>("/api/admin/dashboard/metrics");
        if (!mounted) return;
        setMetrics(m);
        setLoading(false);
        const point: MetricPoint = {
          time: new Date().toLocaleTimeString(),
          rps: Math.round(m.rps * 100) / 100,
          latency: Math.round(m.avg_latency_ms),
        };
        const next = [...historyRef.current, point].slice(-30);
        historyRef.current = next;
        setHistory(next);
      } catch {
        /* ignore */
      }
    };

    const fetchHealth = async () => {
      try {
        const h = await api.get<{ providers: ProviderHealthItem[] }>(
          "/api/admin/provider-health",
        );
        if (mounted) setHealth(h.providers);
      } catch {
        /* ignore */
      }
    };

    fetchMetrics().then(fetchHealth);
    const m = createPollingClient(fetchMetrics, () => {}, 2000);
    const h = createPollingClient(fetchHealth, () => {}, 5000);

    return () => {
      mounted = false;
      m.stop();
      h.stop();
    };
  }, []);

  if (loading) return <LoadingState message="Loading dashboard…" />;

  return (
    <Stack gap="lg">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
          <motion.div variants={itemVariants}>
            <CgStat
              title="Requests"
              value={metrics?.total_requests ?? 0}
              subtitle={`${(metrics?.rps ?? 0).toFixed(1)} req/s`}
              icon={<FiActivity size={18} />}
              color="brand"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <CgStat
              title="Tokens"
              value={metrics?.total_tokens ?? 0}
              subtitle="total"
              icon={<FiCpu size={18} />}
              color="grape"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <CgStat
              title="Cost"
              value={`$${(metrics?.total_cost_usd ?? 0).toFixed(2)}`}
              subtitle="total spend"
              icon={<FiDollarSign size={18} />}
              color="orange"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <CgStat
              title="Cache Hit"
              value={`${((metrics?.cache_hit_rate ?? 0) * 100).toFixed(1)}%`}
              subtitle={`${metrics?.active_keys ?? 0} active keys`}
              icon={<FiCheckCircle size={18} />}
              color="green"
            />
          </motion.div>
        </SimpleGrid>
      </motion.div>

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.15 }}
          >
            <Card p="lg" radius="md" withBorder>
              <Text fw={750} size="sm" mb="md" style={{ letterSpacing: -0.1 }}>
                Traffic & Latency (live)
              </Text>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="rpsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6a76fc" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6a76fc" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e64980" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#e64980" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                  <XAxis dataKey="time" fontSize={10} stroke="var(--mantine-color-dimmed)" />
                  <YAxis fontSize={10} stroke="var(--mantine-color-dimmed)" />
                  <RTooltip
                    contentStyle={{
                      background: "var(--mantine-color-body)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: 8,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="rps"
                    stroke="#6a76fc"
                    fill="url(#rpsGrad)"
                    name="RPS"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="latency"
                    stroke="#e64980"
                    fill="url(#latGrad)"
                    name="Latency (ms)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.2 }}
            style={{ height: "100%" }}
          >
            <Card p="lg" radius="md" withBorder h="100%">
              <Text fw={750} size="sm" mb="md" style={{ letterSpacing: -0.1 }}>
                Provider Health
              </Text>
              {health.length === 0 ? (
                <Text size="sm" c="dimmed">
                  No deployments configured.
                </Text>
              ) : (
                <ScrollArea h={250} type="auto">
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <Stack gap="xs">
                      {health.map((h) => (
                        <motion.div key={h.deployment_id} variants={itemVariants}>
                          <Group justify="space-between" p="xs" style={{ borderRadius: 6, background: "rgba(255, 255, 255, 0.03)" }}>
                            <Group gap="sm">
                              <ThemeIcon
                                size={28}
                                radius="sm"
                                variant="light"
                                color={h.is_open ? "green" : "red"}
                              >
                                <FiZap size={14} />
                              </ThemeIcon>
                              <Stack gap={0}>
                                <Text size="sm" fw={600}>
                                  {h.model_name}
                                </Text>
                                <Text size="xs" c="dimmed" fw={500}>
                                  {h.is_open ? `${h.fails} fails` : `cooldown ${h.cooldown_remaining}s`}
                                </Text>
                              </Stack>
                            </Group>
                            <Badge size="xs" variant="light" color={h.is_open ? "green" : "red"} style={{ fontWeight: 700 }}>
                              {h.is_open ? "healthy" : "down"}
                            </Badge>
                          </Group>
                        </motion.div>
                      ))}
                    </Stack>
                  </motion.div>
                </ScrollArea>
              )}
            </Card>
          </motion.div>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

