"use client";

import { useEffect, useState, useCallback } from "react";
import { Stack, Group, TextInput, Badge } from "@mantine/core";
import { AnimatedActivity, AnimatedSearch } from "../../../components/cg/AnimatedIcons";
import { CgTable, type CgColumn } from "../../../components/cg";
import { LoadingState } from "../../../components/States";
import { PageHeader, MotionSection, MotionItem, FadeIn } from "../../../components/anim";
import { api } from "../../../lib";
import type { Paginated, RequestLog } from "../../../lib/types";

export default function MonitoringPage() {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [modelFilter, setModelFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let path = `/api/admin/request-logs?page=${page}&page_size=${pageSize}`;
      if (modelFilter) path += `&model=${encodeURIComponent(modelFilter)}`;
      const res = await api.get<Paginated<RequestLog>>(path);
      setLogs(res.items); setTotal(res.pagination.total);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [page, pageSize, modelFilter]);

  useEffect(() => { load(); }, [load]);

  const columns: CgColumn<RequestLog>[] = [
    { key: "created_at", label: "Time", render: (l) => l.created_at ?? "—" },
    { key: "model", label: "Model", render: (l) => l.model ?? "—" },
    {
      key: "status_code", label: "Status",
      render: (l) => (
        <Badge variant="light" size="xs"
          color={l.status_code && l.status_code < 400 ? "green" : l.status_code && l.status_code < 500 ? "orange" : "red"}>
          {l.status_code ?? "—"}
        </Badge>
      ),
    },
    {
      key: "tokens", label: "Tokens",
      render: (l) => l.total_tokens != null ? `${l.prompt_tokens ?? 0} + ${l.completion_tokens ?? 0}` : "—",
    },
    { key: "cost_usd", label: "Cost", render: (l) => l.cost_usd != null ? `$${l.cost_usd.toFixed(6)}` : "—" },
    { key: "latency_ms", label: "Latency", render: (l) => l.latency_ms != null ? `${l.latency_ms} ms` : "—" },
    {
      key: "cache_hit", label: "Cache",
      render: (l) => <Badge variant="light" size="xs" color={l.cache_hit ? "green" : "gray"}>{l.cache_hit ? "hit" : "miss"}</Badge>,
    },
    { key: "error_class", label: "Error", render: (l) => l.error_class ?? "—" },
  ];

  return (
    <Stack gap="lg">
      <PageHeader
        icon={<AnimatedActivity size={22} />}
        iconColor="#0891b2"
        title="Monitoring / Audit"
        description="Real-time request logs and audit trail"
      />

      <FadeIn delay={0.1}>
        <Group>
          <TextInput
            size="sm"
            placeholder="Filter by model…"
            value={modelFilter}
            onChange={(e) => { setModelFilter(e.target.value); setPage(1); }}
            w={250}
            leftSection={<AnimatedSearch size={16} style={{ color: "var(--mantine-color-dimmed)" }} />}
          />
        </Group>
      </FadeIn>

      <MotionSection delay={0.15}>
        <MotionItem>
          <CgTable columns={columns} rows={logs} rowKey={(l) => l.id}
            loading={loading} page={page} pageSize={pageSize} total={total}
            onPageChange={setPage} emptyMessage="No request logs." />
        </MotionItem>
      </MotionSection>
    </Stack>
  );
}
