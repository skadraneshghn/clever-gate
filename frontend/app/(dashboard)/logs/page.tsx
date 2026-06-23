"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Stack,
  Group,
  Text,
  Badge,
  TextInput,
  Button,
  SegmentedControl,
  ScrollArea,
  Box,
  ThemeIcon,
  Chip,
  Tooltip,
  ActionIcon,
  Code,
} from "@mantine/core";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiActivity,
  FiSearch,
  FiDownload,
  FiPause,
  FiPlay,
  FiTerminal,
  FiZap,
  FiChevronDown,
} from "react-icons/fi";
import { PageHeader, FadeIn } from "../../../components/anim";
import { api, getAccessToken, getApiBase } from "../../../lib";
import type { SystemLog, Paginated } from "../../../lib/types";

const MAX_LIVE_LOGS = 500;

const LEVEL_COLORS: Record<string, string> = {
  DEBUG: "gray",
  INFO: "blue",
  WARNING: "yellow",
  ERROR: "red",
  CRITICAL: "grape",
};

const LEVELS = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] as const;

function wsUrlFromHttp(httpBase: string, path: string, params: Record<string, string>): string {
  const wsBase = httpBase.replace(/^http/, "ws");
  const search = new URLSearchParams(params).toString();
  return `${wsBase}${path}?${search}`;
}

export default function LogsPage() {
  const [mode, setMode] = useState<"live" | "history">("live");
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [activeLevels, setActiveLevels] = useState<Set<string>>(new Set(LEVELS));
  const [search, setSearch] = useState("");
  const [semanticMode, setSemanticMode] = useState(false);
  const [live, setLive] = useState(true);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const autoScrollRef = useRef(true);
  const bufferRef = useRef<SystemLog[]>([]);

  // ── Live WebSocket streaming ────────────────────────────────────────── //
  useEffect(() => {
    if (mode !== "live") return;

    const token = getAccessToken();
    if (!token) return;

    const url = wsUrlFromHttp(getApiBase(), "/api/admin/ws/logs", { token });
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      setTimeout(() => {
        if (mode === "live" && live) {
          setConnected(false);
        }
      }, 1000);
    };
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === "heartbeat") return;
        const batch: string[] = Array.isArray(data) ? data : [data];
        const newLogs: SystemLog[] = batch.map((raw) => {
          const e = typeof raw === "string" ? JSON.parse(raw) : raw;
          return {
            id: crypto.randomUUID(),
            timestamp: e.timestamp,
            level: e.level,
            logger_name: e.logger_name,
            message: e.message,
            context: e.context || {},
          };
        });
        bufferRef.current = [...bufferRef.current, ...newLogs].slice(-MAX_LIVE_LOGS);
        if (live) {
          setLogs([...bufferRef.current]);
        }
      } catch {
        // ignore parse errors
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [mode, live]);

  // ── Auto-scroll ─────────────────────────────────────────────────────── //
  useEffect(() => {
    if (autoScrollRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 50;
  }, []);

  // ── Historical query ────────────────────────────────────────────────── //
  const runQuery = useCallback(async () => {
    setLoading(true);
    try {
      if (semanticMode && search.trim()) {
        const res = await api.get<{ items: SystemLog[] }>(
          `/api/admin/logs/search?q=${encodeURIComponent(search)}`,
        );
        setLogs(res.items);
      } else {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        params.set("page", "1");
        params.set("page_size", "200");
        const res = await api.get<Paginated<SystemLog>>(
          `/api/admin/logs?${params.toString()}`,
        );
        setLogs(res.items);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [search, semanticMode]);

  useEffect(() => {
    if (mode === "history") {
      runQuery();
    }
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Export ───────────────────────────────────────────────────────────── //
  const handleExport = useCallback(async () => {
    const token = getAccessToken();
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const base = getApiBase();
    const res = await fetch(`${base}/api/admin/logs/export?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clever-gateway-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [search]);

  // ── Filtering ────────────────────────────────────────────────────────── //
  const filteredLogs = logs.filter((l) => activeLevels.has(l.level));

  const toggleLevel = (level: string) => {
    setActiveLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  };

  return (
    <Stack gap="md" h="100%" style={{ minHeight: "calc(100vh - 120px)" }}>
      <PageHeader
        icon={<FiTerminal size={22} />}
        iconColor="#0891b2"
        title="System Logs"
        description="Real-time observability — internal events and third-party library logs"
        actions={
          <Group gap="sm">
            <FadeIn delay={0.1}>
              <SegmentedControl
                size="xs"
                value={mode}
                onChange={(v) => setMode(v as "live" | "history")}
                data={[
                  { label: "Live", value: "live" },
                  { label: "History", value: "history" },
                ]}
              />
            </FadeIn>
            <FadeIn delay={0.15}>
              <Tooltip label="Export as .txt">
                <ActionIcon variant="light" color="cyan" size="lg" onClick={handleExport}>
                  <FiDownload size={18} />
                </ActionIcon>
              </Tooltip>
            </FadeIn>
          </Group>
        }
      />

      {/* Filter bar */}
      <FadeIn delay={0.1}>
        <Group gap="sm" wrap="wrap">
          <TextInput
            size="xs"
            placeholder={semanticMode ? "Semantic search…" : "Search logs…"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftSection={<FiSearch size={14} />}
            w={280}
            onKeyDown={(e) => {
              if (e.key === "Enter" && mode === "history") runQuery();
            }}
          />
          <Tooltip label="Toggle semantic (vector) search">
            <Chip
              size="xs"
              checked={semanticMode}
              onChange={() => setSemanticMode(!semanticMode)}
              variant="light"
              color="grape"
            >
              <FiZap size={12} style={{ display: "inline", marginRight: 4 }} />
              Semantic
            </Chip>
          </Tooltip>
          <Group gap={4}>
            {LEVELS.map((lvl) => (
              <Chip
                key={lvl}
                size="xs"
                checked={activeLevels.has(lvl)}
                onChange={() => toggleLevel(lvl)}
                variant="light"
                color={LEVEL_COLORS[lvl]}
              >
                {lvl}
              </Chip>
            ))}
          </Group>
          {mode === "live" && (
            <Group gap="xs">
              <Badge
                size="xs"
                variant="dot"
                color={connected ? "green" : "gray"}
                style={{ textTransform: "none" }}
              >
                {connected ? "Connected" : "Disconnected"}
              </Badge>
              <Button
                size="xs"
                variant={live ? "filled" : "light"}
                color={live ? "green" : "gray"}
                leftSection={live ? <FiPause size={12} /> : <FiPlay size={12} />}
                onClick={() => {
                  setLive(!live);
                  if (!live) {
                    setLogs([...bufferRef.current]);
                  }
                }}
              >
                {live ? "Streaming" : "Paused"}
              </Button>
            </Group>
          )}
          {mode === "history" && (
            <Button size="xs" variant="light" onClick={runQuery} loading={loading}>
              Refresh
            </Button>
          )}
        </Group>
      </FadeIn>

      {/* Log list */}
      <Box
        style={{
          flex: 1,
          minHeight: 0,
          borderRadius: 8,
          border: "1px solid var(--mantine-color-default-border)",
          overflow: "hidden",
          backgroundColor: "rgba(0, 0, 0, 0.15)",
        }}
      >
        <ScrollArea.Autosize mah="100%" viewportRef={scrollRef} onScroll={handleScroll}>
          <Stack gap={0}>
            <AnimatePresence initial={false}>
              {filteredLogs.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Box p="xl" ta="center">
                    <ThemeIcon size={40} radius="xl" variant="light" color="gray" mx="auto" mb="sm">
                      <FiActivity size={20} />
                    </ThemeIcon>
                    <Text c="dimmed" size="sm">
                      {mode === "live" ? "Waiting for log events…" : "No logs found."}
                    </Text>
                  </Box>
                </motion.div>
              )}
              {filteredLogs.map((log, i) => (
                <motion.div
                  key={log.id}
                  layout
                  initial={mode === "live" && i === 0 ? { opacity: 0, y: -10 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <LogRow
                    log={log}
                    expanded={expandedId === log.id}
                    onToggle={() =>
                      setExpandedId(expandedId === log.id ? null : log.id)
                    }
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </Stack>
        </ScrollArea.Autosize>
      </Box>

      <Group justify="space-between">
        <Text size="xs" c="dimmed">
          {filteredLogs.length} log{filteredLogs.length !== 1 ? "s" : ""}
          {mode === "live" && live ? " · streaming" : ""}
        </Text>
        {autoScrollRef.current && mode === "live" && (
          <Button
            size="xs"
            variant="subtle"
            color="dimmed"
            leftSection={<FiChevronDown size={12} />}
            onClick={() => {
              if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              }
            }}
          >
            Bottom
          </Button>
        )}
      </Group>
    </Stack>
  );
}

function LogRow({
  log,
  expanded,
  onToggle,
}: {
  log: SystemLog;
  expanded: boolean;
  onToggle: () => void;
}) {
  const color = LEVEL_COLORS[log.level] || "gray";
  const ts = log.timestamp.replace("T", " ").replace(/\.\d+Z?$/, "");

  const ctxEntries = Object.entries(log.context || {});
  const hasContext = ctxEntries.length > 0;

  return (
    <Box
      onClick={onToggle}
      style={{
        cursor: hasContext ? "pointer" : "default",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        padding: "6px 12px",
        fontFamily: "monospace",
        fontSize: 12,
        lineHeight: 1.6,
      }}
    >
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <Text size="xs" c="dimmed" style={{ flexShrink: 0, whiteSpace: "nowrap" }}>
          {ts}
        </Text>
        <Badge
          size="xs"
          variant="light"
          color={color}
          style={{ flexShrink: 0, minWidth: 70, justifyContent: "center" }}
        >
          {log.level}
        </Badge>
        <Text size="xs" c="dimmed" style={{ flexShrink: 0, whiteSpace: "nowrap" }} title={log.logger_name}>
          {log.logger_name.length > 30 ? log.logger_name.slice(0, 27) + "…" : log.logger_name}
        </Text>
        <Text
          size="xs"
          style={{
            flex: 1,
            whiteSpace: expanded ? "pre-wrap" : "nowrap",
            overflow: expanded ? "visible" : "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {log.message}
        </Text>
      </Group>
      <AnimatePresence>
        {expanded && hasContext && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <Box pl={120} pt={4} pb={4}>
              <Stack gap={2}>
                {ctxEntries.map(([k, v]) => (
                  <Group key={k} gap="xs" wrap="nowrap">
                    <Text size="xs" c="dimmed" fw={600} style={{ flexShrink: 0 }}>
                      {k}:
                    </Text>
                    <Code style={{ wordBreak: "break-all", fontSize: 11 }}>
                      {typeof v === "object" ? JSON.stringify(v) : String(v)}
                    </Code>
                  </Group>
                ))}
              </Stack>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
}
