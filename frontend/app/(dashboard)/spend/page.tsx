"use client";

import { useEffect, useState, useCallback } from "react";
import { Stack, SimpleGrid } from "@mantine/core";
import {
  AnimatedCoins,
  AnimatedBrain,
  AnimatedActivity,
  AnimatedRefreshCw,
  AnimatedDollarSign,
} from "../../../components/cg/AnimatedIcons";
import { CgStat, CgTable, type CgColumn } from "../../../components/cg";
import { LoadingState } from "../../../components/States";
import { PageHeader, MotionSection, MotionItem, AnimatedNumber } from "../../../components/anim";
import { api } from "../../../lib";
import type { Paginated, SpendRecord, DashboardMetrics } from "../../../lib/types";

export default function SpendPage() {
  const [records, setRecords] = useState<SpendRecord[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [sr, mr] = await Promise.all([
        api.get<Paginated<SpendRecord>>("/api/admin/spend?page=1&page_size=50"),
        api.get<DashboardMetrics>("/api/admin/dashboard/metrics"),
      ]);
      setRecords(sr.items); setMetrics(mr);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const columns: CgColumn<SpendRecord>[] = [
    { key: "model", label: "Model", render: (r) => r.model ?? "—" },
    { key: "prompt_tokens", label: "Prompt", render: (r) => r.prompt_tokens?.toLocaleString() ?? "—" },
    { key: "completion_tokens", label: "Completion", render: (r) => r.completion_tokens?.toLocaleString() ?? "—" },
    { key: "cost_usd", label: "Cost", render: (r) => r.cost_usd != null ? `$${r.cost_usd.toFixed(6)}` : "—" },
    { key: "created_at", label: "Time", render: (r) => r.created_at ?? "—" },
  ];

  if (loading) return <LoadingState message="Loading spend data…" />;

  return (
    <Stack gap="lg">
      <PageHeader
        icon={<AnimatedDollarSign size={22} />}
        iconColor="#16a34a"
        title="Spend & Cost"
        description="Track token usage and cost across all providers"
      />

      <MotionSection>
        <SimpleGrid cols={{ base: 2, md: 4 }}>
          <MotionItem>
            <CgStat title="Total Spend" value={`$${(metrics?.total_cost_usd ?? 0).toFixed(2)}`} icon={<AnimatedCoins size={20} />} color="orange" />
          </MotionItem>
          <MotionItem>
            <CgStat
              title="Total Tokens"
              value={<AnimatedNumber value={metrics?.total_tokens ?? 0} />}
              icon={<AnimatedBrain size={20} />}
              color="brand"
            />
          </MotionItem>
          <MotionItem>
            <CgStat title="Error Rate" value={`${((metrics?.error_rate ?? 0) * 100).toFixed(1)}%`} icon={<AnimatedActivity size={20} />} color="red" />
          </MotionItem>
          <MotionItem>
            <CgStat title="Avg Latency" value={`${Math.round(metrics?.avg_latency_ms ?? 0)} ms`} icon={<AnimatedRefreshCw size={20} />} color="grape" />
          </MotionItem>
        </SimpleGrid>
      </MotionSection>

      <MotionSection delay={0.15}>
        <MotionItem>
          <CgTable columns={columns} rows={records} rowKey={(r) => r.id} emptyMessage="No spend records yet." />
        </MotionItem>
      </MotionSection>
    </Stack>
  );
}
