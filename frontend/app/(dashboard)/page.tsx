"use client";

import { useEffect, useState, useRef } from "react";
import {
  Grid,
  SimpleGrid,
  Card,
  Text,
  Stack,
  Group,
  Badge,
  ThemeIcon,
  ScrollArea,
  Avatar,
  Box,
  ActionIcon,
} from "@mantine/core";
import {
  AnimatedRefreshCw,
  AnimatedSliders,
} from "../../components/cg/AnimatedIcons";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
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

// Mock data to emulate key connections card
const mockActiveKeys = [
  { label: "Production Gateway Key", user: "Mahmuda Ruma", role: "DevOps Eng", rate: "24 req/m", active: true },
  { label: "Staging Test Key", user: "Juwel Jaman", role: "QA Engineer", rate: "12 req/m", active: true },
  { label: "Personal Dev Key", user: "Elham", role: "Frontend Dev", rate: "0 req/m", active: false },
];

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
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
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

  // Calculate Health percentage for radial gauge
  const healthyCount = health.filter((h) => h.is_open).length;
  const totalCount = health.length || 1;
  const healthPercent = Math.round((healthyCount / totalCount) * 100);

  const pieData = [
    { name: "Healthy", value: healthyCount, color: "#3f72af" }, // Medium Blue
    { name: "Down", value: totalCount - healthyCount, color: "#dbe2ef" }, // Ice Gray-Blue
  ];

  // Model cost distribution mock data for bottom right chart
  const modelUsageData = [
    { name: "GPT-4o", requests: 3400, tokens: 4200 },
    { name: "Claude-3.5", requests: 5500, tokens: 6800 },
    { name: "Gemini-Pro", requests: 2707, tokens: 3500 },
  ];

  return (
    <Stack gap="lg">
      {/* 4 Stat Cards Row */}
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
              color="brand"
              trendBadge="↑ 19%"
              trendType="up"
              sparklineData={[12, 19, 15, 22, 18, 24, 22]}
              sparklineColor="#3f72af"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <CgStat
              title="Tokens"
              value={metrics?.total_tokens ?? 0}
              subtitle="total"
              color="brand"
              trendBadge="↑ 16%"
              trendType="up"
              sparklineData={[30, 45, 38, 55, 48, 62, 50]}
              sparklineColor="#72a2cf"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <CgStat
              title="Cost"
              value={`$${(metrics?.total_cost_usd ?? 0).toFixed(2)}`}
              subtitle="total spend"
              color="brand"
              trendBadge="↑ 12%"
              trendType="up"
              sparklineData={[10, 15, 12, 18, 14, 20, 19]}
              sparklineColor="#3f72af"
              sparklineType="bar"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <CgStat
              title="Cache Hit"
              value={`${((metrics?.cache_hit_rate ?? 0) * 100).toFixed(1)}%`}
              subtitle={`${metrics?.active_keys ?? 0} active keys`}
              color="brand"
              trendBadge="↓ 5%"
              trendType="down"
              sparklineData={[85, 82, 88, 84, 87, 85, 83]}
              sparklineColor="#dbe2ef"
              sparklineType="bar"
            />
          </motion.div>
        </SimpleGrid>
      </motion.div>

      {/* Charts Grid Row */}
      <Grid gutter="md">
        {/* Traffic Area Chart */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.15 }}
          >
            <Card p="lg" radius="lg" withBorder>
              <Group justify="space-between" mb="md">
                <Text fw={800} size="sm" style={{ letterSpacing: -0.1 }}>
                  Traffic Overview (live)
                </Text>
                <Group gap="xs">
                  <ActionIcon variant="subtle" size="sm" color="gray" component={motion.button} whileHover="hover">
                    <AnimatedRefreshCw size={13} />
                  </ActionIcon>
                  <ActionIcon variant="subtle" size="sm" color="gray" component={motion.button} whileHover="hover">
                    <AnimatedSliders size={13} />
                  </ActionIcon>
                  <Badge variant="dot" size="xs" color="brand" style={{ fontWeight: 700 }}>
                    STREAMING
                  </Badge>
                </Group>
              </Group>

              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="rpsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3f72af" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3f72af" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6b8ebb" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6b8ebb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.04)" />
                  <XAxis dataKey="time" fontSize={9} stroke="var(--mantine-color-dimmed)" tickLine={false} />
                  <YAxis fontSize={9} stroke="var(--mantine-color-dimmed)" tickLine={false} />
                  <RTooltip
                    contentStyle={{
                      background: "rgba(255, 255, 255, 0.8)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(0, 0, 0, 0.05)",
                      borderRadius: 10,
                      boxShadow: "0 8px 24px rgba(17,45,78,0.06)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="rps"
                    stroke="#3f72af"
                    fill="url(#rpsGrad)"
                    name="Requests / s"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="latency"
                    stroke="#6b8ebb"
                    fill="url(#latGrad)"
                    name="Latency (ms)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        </Grid.Col>

        {/* Site Traffic Gauge Style Node Health */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.2 }}
            style={{ height: "100%" }}
          >
            <Card p="lg" radius="lg" withBorder h="100%">
              <Text fw={800} size="sm" mb="md" style={{ letterSpacing: -0.1 }}>
                Site Traffic (Node Health)
              </Text>
              
              {/* Semi-circular radial gauge representation */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", height: 130 }}>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="80%"
                      startAngle={180}
                      endAngle={0}
                      innerRadius={62}
                      outerRadius={78}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: "absolute", bottom: 35, textAlign: "center" }}>
                  <Text size="xl" fw={900} lh={1} style={{ letterSpacing: -1 }}>
                    {healthPercent}%
                  </Text>
                  <Text size="10px" c="dimmed" fw={700} mt={2}>
                    ACTIVE NODES
                  </Text>
                </div>
              </div>

              {/* Legends */}
              <Group justify="space-around" mt="sm">
                <Group gap={6}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#3f72af" }} />
                  <Text size="xs" fw={600}>Healthy Uptime</Text>
                </Group>
                <Group gap={6}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#dbe2ef" }} />
                  <Text size="xs" fw={600}>Cooldown Rest</Text>
                </Group>
              </Group>
            </Card>
          </motion.div>
        </Grid.Col>
      </Grid>

      {/* Row 3: Active Connections & Analysis */}
      <Grid gutter="md">
        {/* Active Key / Connections Card */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.25 }}
          >
            <Card p="lg" radius="lg" withBorder>
              <Group justify="space-between" mb="sm">
                <Box>
                  <Text fw={800} size="sm" style={{ letterSpacing: -0.1 }}>
                    Connections
                  </Text>
                  <Text size="xs" c="dimmed" fw={500}>
                    Active gateway API tokens
                  </Text>
                </Box>
                <Badge size="xs" variant="light" color="brand" style={{ fontWeight: 700 }}>
                  LIVE MONITORS
                </Badge>
              </Group>

              <ScrollArea h={180} type="auto">
                <Stack gap="xs" pt="xs">
                  {mockActiveKeys.map((item, idx) => (
                    <Group key={idx} justify="space-between" p="xs" style={{ borderRadius: 8, background: "rgba(0, 0, 0, 0.02)" }}>
                      <Group gap="sm">
                        <Avatar size="sm" color="brand" radius="xl" style={{ fontWeight: 700 }}>
                          {item.user[0]}
                        </Avatar>
                        <Box>
                          <Text size="xs" fw={750}>{item.user}</Text>
                          <Text size="10px" c="dimmed" fw={500}>{item.label}</Text>
                        </Box>
                      </Group>
                      <Group gap="xs">
                        <Badge size="xs" variant="light" color={item.active ? "brand" : "gray"}>
                          {item.rate}
                        </Badge>
                        <Text size="10px" fw={600} c={item.active ? "brand" : "dimmed"}>
                          {item.active ? "online" : "idle"}
                        </Text>
                      </Group>
                    </Group>
                  ))}
                </Stack>
              </ScrollArea>
            </Card>
          </motion.div>
        </Grid.Col>

        {/* Model Analysis Stacked Bar Chart */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.3 }}
          >
            <Card p="lg" radius="lg" withBorder>
              <Group justify="space-between" mb="xs">
                <Box>
                  <Text fw={800} size="sm" style={{ letterSpacing: -0.1 }}>
                    Model Analysis
                  </Text>
                  <Text size="xs" c="dimmed" fw={500}>
                    Load distribution by target model
                  </Text>
                </Box>
                <Text size="xs" c="dimmed" fw={600}>
                  This Month
                </Text>
              </Group>

              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={modelUsageData} margin={{ top: 10, bottom: 5 }}>
                  <XAxis dataKey="name" fontSize={9} stroke="var(--mantine-color-dimmed)" tickLine={false} axisLine={false} />
                  <YAxis fontSize={9} stroke="var(--mantine-color-dimmed)" tickLine={false} axisLine={false} />
                  <RTooltip
                    contentStyle={{
                      background: "rgba(255, 255, 255, 0.8)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(0, 0, 0, 0.05)",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="requests" fill="#3f72af" radius={[4, 4, 0, 0]} barSize={16} name="Requests" />
                  <Bar dataKey="tokens" fill="#a2c4df" radius={[4, 4, 0, 0]} barSize={16} name="Tokens (k)" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
