"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
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
  CopyButton,
  SimpleGrid,
  Switch,
  Divider,
} from "@mantine/core";
import { motion, AnimatePresence } from "framer-motion";
import {
  AnimatedActivity,
  AnimatedSearch,
  AnimatedDownload,
  AnimatedPause,
  AnimatedPlay,
  AnimatedTerminal,
  AnimatedZap,
  AnimatedChevronDown,
  AnimatedTrash,
  AnimatedCopy,
  AnimatedCheck,
  AnimatedEye,
  AnimatedInfo,
  AnimatedAlertTriangle,
  AnimatedXCircle,
  AnimatedCornerDownRight,
} from "../../../components/cg/AnimatedIcons";
import { PageHeader, FadeIn, AnimatedNumber, MotionSection, MotionItem } from "../../../components/anim";
import { api, getAccessToken, getApiBase, getRefreshToken, setTokens } from "../../../lib";
import { CgDrawer } from "../../../components/cg";
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
  
  // Drawer & detail inspection state
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
  const [metaSearch, setMetaSearch] = useState("");
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const autoScrollRef = useRef(true);
  const bufferRef = useRef<SystemLog[]>([]);
  const liveRef = useRef(live);

  useEffect(() => {
    liveRef.current = live;
  }, [live]);

  // ── Live WebSocket streaming with auto-reconnect ────────────────────── //
  useEffect(() => {
    if (mode !== "live") return;

    let ws: WebSocket | null = null;
    let retryCount = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const refreshToken = async (): Promise<string | null> => {
      const refresh = getRefreshToken();
      if (!refresh) return null;
      try {
        const res = await fetch(`${getApiBase()}/api/admin/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refresh }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        setTokens(data.access_token, data.refresh_token);
        return data.access_token as string;
      } catch {
        return null;
      }
    };

    const connect = () => {
      if (cancelled) return;
      const token = getAccessToken();
      if (!token) return;

      const url = wsUrlFromHttp(getApiBase(), "/api/admin/ws/logs", { token });
      ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        retryCount = 0;
      };

      ws.onclose = async (ev) => {
        setConnected(false);
        wsRef.current = null;
        if (cancelled || mode !== "live") return;

        // Auth rejection (expired token) — try refreshing before reconnecting
        if (ev.code === 1008) {
          const newToken = await refreshToken();
          if (cancelled) return;
          if (!newToken) return; // Can't refresh — user must log in again
          retryCount = 0;
        }

        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        retryCount++;
        reconnectTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        setConnected(false);
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
          if (liveRef.current) {
            setLogs([...bufferRef.current]);
          }
        } catch {
          // ignore parse errors
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
      wsRef.current = null;
    };
  }, [mode]);

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

  // ── Local console clear ──────────────────────────────────────────────── //
  const handleClear = useCallback(() => {
    setLogs([]);
    bufferRef.current = [];
  }, []);

  // ── Stats calculation ────────────────────────────────────────────────── //
  const stats = useMemo(() => {
    let total = logs.length;
    let debug = 0;
    let info = 0;
    let warning = 0;
    let error = 0;
    
    logs.forEach((l) => {
      if (l.level === "DEBUG") debug++;
      else if (l.level === "INFO") info++;
      else if (l.level === "WARNING") warning++;
      else if (l.level === "ERROR" || l.level === "CRITICAL") error++;
    });

    return { total, debug, info, warning, error };
  }, [logs]);

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

  const toggleLevelGroup = (group: "ALL" | "INFO" | "WARNING" | "ERROR") => {
    setActiveLevels((prev) => {
      const next = new Set(prev);
      if (group === "ALL") {
        if (next.size === LEVELS.length) {
          next.clear();
        } else {
          LEVELS.forEach((l) => next.add(l));
        }
      } else if (group === "INFO") {
        if (next.has("INFO")) next.delete("INFO");
        else next.add("INFO");
      } else if (group === "WARNING") {
        if (next.has("WARNING")) next.delete("WARNING");
        else next.add("WARNING");
      } else if (group === "ERROR") {
        const hasError = next.has("ERROR") || next.has("CRITICAL");
        if (hasError) {
          next.delete("ERROR");
          next.delete("CRITICAL");
        } else {
          next.add("ERROR");
          next.add("CRITICAL");
        }
      }
      return next;
    });
  };

  // ── Drawer Context Filtering ─────────────────────────────────────────── //
  const filteredContextEntries = useMemo(() => {
    if (!selectedLog || !selectedLog.context) return [];
    const entries = Object.entries(selectedLog.context);
    if (!metaSearch.trim()) return entries;
    const query = metaSearch.toLowerCase();
    return entries.filter(
      ([k, v]) =>
        k.toLowerCase().includes(query) ||
        JSON.stringify(v).toLowerCase().includes(query)
    );
  }, [selectedLog, metaSearch]);

  const isAllActive = activeLevels.size === LEVELS.length;
  const isInfoActive = activeLevels.has("INFO");
  const isWarningActive = activeLevels.has("WARNING");
  const isErrorActive = activeLevels.has("ERROR") || activeLevels.has("CRITICAL");

  return (
    <Stack gap="md" h="100%" style={{ minHeight: "calc(100vh - 120px)" }}>
      <PageHeader
        icon={<AnimatedTerminal size={22} />}
        iconColor="#0891b2"
        title="System Logs"
        description="Real-time observability stream — internal system events & routing logs"
        actions={
          <Group gap="sm">
            <FadeIn delay={0.05}>
              <SegmentedControl
                size="xs"
                value={mode}
                onChange={(v) => {
                  setMode(v as "live" | "history");
                  if (v === "live") {
                    setLogs([...bufferRef.current]);
                  }
                }}
                data={[
                  { label: "Live Stream", value: "live" },
                  { label: "History Lookup", value: "history" },
                ]}
                style={{
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              />
            </FadeIn>
            <FadeIn delay={0.1}>
              <Tooltip label="Export active buffer">
                <ActionIcon variant="light" color="cyan" size="lg" onClick={handleExport} component={motion.button} whileHover="hover">
                  <AnimatedDownload size={18} />
                </ActionIcon>
              </Tooltip>
            </FadeIn>
          </Group>
        }
      />

      {/* Dynamic Summary/Filtering Cards */}
      <MotionSection delay={0.05}>
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
          {/* Card: Total */}
          <Box
            onClick={() => toggleLevelGroup("ALL")}
            style={{
              cursor: "pointer",
              borderRadius: "12px",
              padding: "16px",
              border: isAllActive
                ? "1px solid var(--mantine-color-brand-5)"
                : "1px solid rgba(255, 255, 255, 0.05)",
              boxShadow: isAllActive
                ? "0 4px 20px rgba(106, 118, 252, 0.15)"
                : "none",
              backgroundColor: isAllActive
                ? "rgba(106, 118, 252, 0.06)"
                : "rgba(255, 255, 255, 0.01)",
              opacity: isAllActive ? 1 : 0.6,
              transition: "all 0.25s ease-out",
            }}
          >
            <Group justify="space-between" align="center">
              <Stack gap={2}>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">Total logs</Text>
                <Text size="xl" fw={900} style={{ letterSpacing: -0.5 }}>
                  <AnimatedNumber value={stats.total} />
                </Text>
              </Stack>
              <ThemeIcon variant="light" color="brand" radius="md" size="lg">
                <AnimatedTerminal size={18} />
              </ThemeIcon>
            </Group>
          </Box>

          {/* Card: Info */}
          <Box
            onClick={() => toggleLevelGroup("INFO")}
            style={{
              cursor: "pointer",
              borderRadius: "12px",
              padding: "16px",
              border: isInfoActive
                ? "1px solid var(--mantine-color-blue-5)"
                : "1px solid rgba(255, 255, 255, 0.05)",
              boxShadow: isInfoActive
                ? "0 4px 20px rgba(34, 139, 230, 0.15)"
                : "none",
              backgroundColor: isInfoActive
                ? "rgba(34, 139, 230, 0.06)"
                : "rgba(255, 255, 255, 0.01)",
              opacity: isInfoActive ? 1 : 0.6,
              transition: "all 0.25s ease-out",
            }}
          >
            <Group justify="space-between" align="center">
              <Stack gap={2}>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">Info logs</Text>
                <Text size="xl" fw={900} style={{ letterSpacing: -0.5 }}>
                  <AnimatedNumber value={stats.info} />
                </Text>
              </Stack>
              <ThemeIcon variant="light" color="blue" radius="md" size="lg">
                <AnimatedInfo size={18} />
              </ThemeIcon>
            </Group>
          </Box>

          {/* Card: Warnings */}
          <Box
            onClick={() => toggleLevelGroup("WARNING")}
            style={{
              cursor: "pointer",
              borderRadius: "12px",
              padding: "16px",
              border: isWarningActive
                ? "1px solid var(--mantine-color-yellow-5)"
                : "1px solid rgba(255, 255, 255, 0.05)",
              boxShadow: isWarningActive
                ? "0 4px 20px rgba(250, 176, 5, 0.15)"
                : "none",
              backgroundColor: isWarningActive
                ? "rgba(250, 176, 5, 0.06)"
                : "rgba(255, 255, 255, 0.01)",
              opacity: isWarningActive ? 1 : 0.6,
              transition: "all 0.25s ease-out",
            }}
          >
            <Group justify="space-between" align="center">
              <Stack gap={2}>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">Warnings</Text>
                <Text size="xl" fw={900} style={{ letterSpacing: -0.5 }}>
                  <AnimatedNumber value={stats.warning} />
                </Text>
              </Stack>
              <ThemeIcon variant="light" color="yellow" radius="md" size="lg">
                <AnimatedAlertTriangle size={18} />
              </ThemeIcon>
            </Group>
          </Box>

          {/* Card: Errors */}
          <Box
            onClick={() => toggleLevelGroup("ERROR")}
            style={{
              cursor: "pointer",
              borderRadius: "12px",
              padding: "16px",
              border: isErrorActive
                ? "1px solid var(--mantine-color-red-5)"
                : "1px solid rgba(255, 255, 255, 0.05)",
              boxShadow: isErrorActive
                ? "0 4px 20px rgba(250, 82, 82, 0.15)"
                : "none",
              backgroundColor: isErrorActive
                ? "rgba(250, 82, 82, 0.06)"
                : "rgba(255, 255, 255, 0.01)",
              opacity: isErrorActive ? 1 : 0.6,
              transition: "all 0.25s ease-out",
            }}
          >
            <Group justify="space-between" align="center">
              <Stack gap={2}>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">Errors</Text>
                <Text size="xl" fw={900} style={{ letterSpacing: -0.5 }}>
                  <AnimatedNumber value={stats.error} />
                </Text>
              </Stack>
              <ThemeIcon variant="light" color="red" radius="md" size="lg">
                <AnimatedXCircle size={18} />
              </ThemeIcon>
            </Group>
          </Box>
        </SimpleGrid>
      </MotionSection>

      {/* Control / Toolbar Panel */}
      <FadeIn delay={0.1}>
        <Group justify="space-between" gap="sm" wrap="wrap">
          <Group gap="xs" style={{ flexGrow: 1 }}>
            <TextInput
              size="xs"
              placeholder={semanticMode ? "Semantic vector search..." : "Filter logs message..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftSection={<AnimatedSearch size={14} />}
              style={{ flexGrow: 1, maxWidth: 360 }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && mode === "history") runQuery();
              }}
            />
            <Tooltip label="Toggle semantic (vector) query search. (Requires history mode)">
              <Chip
                size="xs"
                checked={semanticMode}
                onChange={() => {
                  setSemanticMode(!semanticMode);
                  if (mode === "live") {
                    setMode("history");
                  }
                }}
                variant="light"
                color="grape"
              >
                <AnimatedZap size={12} style={{ display: "inline-block", marginRight: 4, verticalAlign: "middle" }} />
                Semantic
              </Chip>
            </Tooltip>
            {mode === "history" && (
              <Button size="xs" variant="light" color="brand" onClick={runQuery} loading={loading}>
                Apply
              </Button>
            )}
          </Group>

          <Group gap="sm" wrap="nowrap">
            {/* Level Quick Chips */}
            <Group gap={4} visibleFrom="sm">
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
              <Group gap="xs" wrap="nowrap">
                {/* Auto Scroll / Follow Logs */}
                <Switch
                  size="xs"
                  label="Follow logs"
                  checked={autoScrollRef.current}
                  onChange={(e) => {
                    autoScrollRef.current = e.currentTarget.checked;
                    if (autoScrollRef.current && scrollRef.current) {
                      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                    }
                  }}
                  styles={{
                    label: { fontSize: "11px", fontWeight: 600, paddingLeft: "6px" }
                  }}
                />

                {/* Connection status badge */}
                <Tooltip label={connected ? "Connected to log pipeline" : "Disconnected from log pipeline"}>
                  <Badge
                    size="xs"
                    variant="dot"
                    color={connected ? "green" : "gray"}
                    style={{ textTransform: "none", height: 24 }}
                  >
                    {connected ? "Live" : "Offline"}
                  </Badge>
                </Tooltip>

                {/* Pause/Resume stream */}
                <Button
                  size="xs"
                  variant={live ? "filled" : "light"}
                  color={live ? "green" : "gray"}
                  leftSection={live ? <AnimatedPause size={12} /> : <AnimatedPlay size={12} />}
                  onClick={() => {
                    setLive(!live);
                    if (!live) {
                      setLogs([...bufferRef.current]);
                    }
                  }}
                  style={{ height: 26 }}
                >
                  {live ? "Stream" : "Paused"}
                </Button>
              </Group>
            )}

            {/* Clear button */}
            <Tooltip label="Clear terminal view buffer">
              <ActionIcon variant="light" color="gray" size="md" onClick={handleClear} style={{ height: 26, width: 26 }} component={motion.button} whileHover="hover">
                <AnimatedTrash size={13} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </FadeIn>

      {/* Terminal Emulator Log View */}
      <Box
        style={{
          flex: 1,
          minHeight: 300,
          borderRadius: 12,
          border: "1px solid rgba(255, 255, 255, 0.08)",
          overflow: "hidden",
          backgroundColor: "#0a0b10",
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Terminal Header Tab bar */}
        <Group
          justify="space-between"
          px="md"
          py="xs"
          style={{
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
            backgroundColor: "rgba(255,255,255,0.015)",
            flexShrink: 0,
          }}
        >
          {/* macOS window dots */}
          <Group gap="6px" style={{ flexShrink: 0 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#ff5f56" }}></span>
            <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#ffbd2e" }}></span>
            <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#27c93f" }}></span>
          </Group>
          {/* Title */}
          <Text
            size="xs"
            c="dimmed"
            style={{
              fontFamily: "var(--mantine-font-family-monospace)",
              fontSize: "11px",
              letterSpacing: 0.5,
            }}
          >
            clever-gateway ~ system-logs
          </Text>
          {/* Live indicator pulsing */}
          <Group gap="xs" align="center">
            {mode === "live" && connected && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: "#22c55e",
                  boxShadow: "0 0 8px #22c55e",
                  display: "inline-block",
                  animation: "pulse-green 1.5s infinite"
                }}
              />
            )}
            <Text
              size="xs"
              c="dimmed"
              style={{
                fontFamily: "var(--mantine-font-family-monospace)",
                fontSize: "10px",
              }}
            >
              {mode === "live" ? "WS_STREAM" : "DB_QUERY"}
            </Text>
          </Group>
        </Group>

        {/* Console logs body */}
        <Box style={{ flex: 1, minHeight: 0, position: "relative" }}>
          <ScrollArea.Autosize mah="100%" viewportRef={scrollRef} onScroll={handleScroll} style={{ height: "100%" }}>
            <Stack gap={0} style={{ paddingBottom: 16 }}>
              <AnimatePresence initial={false}>
                {filteredLogs.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Box py="xl" my="xl" ta="center">
                      <ThemeIcon size={44} radius="xl" variant="light" color="gray" mx="auto" mb="sm">
                        <AnimatedTerminal size={22} />
                      </ThemeIcon>
                      <Text c="dimmed" size="sm" style={{ fontFamily: "var(--mantine-font-family-monospace)" }}>
                        {mode === "live" ? "Waiting for log pipeline events..." : "No matching historical logs found."}
                      </Text>
                    </Box>
                  </motion.div>
                )}
                {filteredLogs.map((log, index) => (
                  <motion.div
                    key={log.id}
                    layout={mode === "live" ? "position" : false}
                    initial={mode === "live" && index === 0 ? { opacity: 0, x: -10 } : false}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.12 }}
                  >
                    <LogRow
                      log={log}
                      onClick={() => {
                        setSelectedLog(log);
                        setMetaSearch("");
                      }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </Stack>
          </ScrollArea.Autosize>
        </Box>
      </Box>

      {/* Footer Info line */}
      <Group justify="space-between" px="xs" style={{ flexShrink: 0 }}>
        <Text size="xs" c="dimmed" style={{ fontFamily: "var(--mantine-font-family-monospace)" }}>
          Loaded: {filteredLogs.length} logs {mode === "live" && live ? "(Streaming active)" : ""}
        </Text>
        {mode === "live" && !autoScrollRef.current && (
          <Button
            size="xs"
            variant="subtle"
            color="dimmed"
            leftSection={<AnimatedChevronDown size={12} />}
            onClick={() => {
              autoScrollRef.current = true;
              if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              }
            }}
            styles={{
              root: { height: 24, padding: "0 8px" },
              label: { fontSize: 10 }
            }}
          >
            Snap to bottom
          </Button>
        )}
      </Group>

      {/* Log Detailed Drawer */}
      <CgDrawer
        opened={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Log Entry Inspector"
        icon={<AnimatedTerminal size={18} />}
        size="lg"
      >
        {selectedLog && (
          <Stack gap="md">
            {/* Drawer Header Detail Card */}
            <Box
              style={{
                borderRadius: 8,
                padding: "14px",
                border: "1px solid rgba(255,255,255,0.06)",
                backgroundColor: "rgba(255,255,255,0.015)"
              }}
            >
              <Group justify="space-between" mb="xs">
                <Badge
                  color={LEVEL_COLORS[selectedLog.level] || "gray"}
                  variant="light"
                  size="md"
                >
                  {selectedLog.level}
                </Badge>
                <Text size="xs" c="dimmed" style={{ fontFamily: "var(--mantine-font-family-monospace)" }}>
                  {selectedLog.timestamp.replace("T", " ").replace(/\.\d+Z?$/, "")}
                </Text>
              </Group>
              <Group gap="xs" wrap="nowrap" align="center">
                <Text size="xs" fw={700} c="dimmed">LOGGER:</Text>
                <Code color="blue.9" style={{ fontSize: "11px", wordBreak: "break-all" }}>
                  {selectedLog.logger_name}
                </Code>
              </Group>
            </Box>

            {/* Log Message */}
            <Stack gap={4}>
              <Group justify="space-between" align="center">
                <Text size="xs" fw={700} c="dimmed">LOG MESSAGE</Text>
                <CopyButton value={selectedLog.message}>
                  {({ copied, copy }) => (
                    <Button
                      size="xs"
                      variant="subtle"
                      color={copied ? "green" : "gray"}
                      leftSection={copied ? <AnimatedCheck size={12} /> : <AnimatedCopy size={12} />}
                      onClick={copy}
                      styles={{ root: { height: 24, padding: "0 8px" }, label: { fontSize: 10 } }}
                    >
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  )}
                </CopyButton>
              </Group>
              <Code
                block
                style={{
                  fontFamily: "var(--mantine-font-family-monospace)",
                  fontSize: 12,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  backgroundColor: "#0d0e15",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 6,
                  padding: "10px 12px",
                  color: "#f8f9fa",
                }}
              >
                {selectedLog.message}
              </Code>
            </Stack>

            <Divider style={{ borderColor: "rgba(255,255,255,0.05)" }} />

            {/* Context/Metadata Explorer */}
            <Stack gap="xs">
              <Group justify="space-between" align="center">
                <Text size="xs" fw={700} c="dimmed">CONTEXT METADATA</Text>
                {Object.keys(selectedLog.context || {}).length > 0 && (
                  <CopyButton value={JSON.stringify(selectedLog.context, null, 2)}>
                    {({ copied, copy }) => (
                      <Button
                        size="xs"
                        variant="subtle"
                        color={copied ? "green" : "gray"}
                        leftSection={copied ? <AnimatedCheck size={12} /> : <AnimatedCopy size={12} />}
                        onClick={copy}
                        styles={{ root: { height: 24, padding: "0 8px" }, label: { fontSize: 10 } }}
                      >
                        {copied ? "Copied JSON" : "Copy JSON"}
                      </Button>
                    )}
                  </CopyButton>
                )}
              </Group>

              {Object.keys(selectedLog.context || {}).length === 0 ? (
                <Text size="xs" c="dimmed" fs="italic">No metadata context attached to this log entry.</Text>
              ) : (
                <Stack gap="xs">
                  {/* Context search */}
                  <TextInput
                    size="xs"
                    placeholder="Search metadata keys/values..."
                    value={metaSearch}
                    onChange={(e) => setMetaSearch(e.target.value)}
                    leftSection={<AnimatedSearch size={12} />}
                  />

                  {filteredContextEntries.length === 0 ? (
                    <Text size="xs" c="dimmed" ta="center" py="xs">No matching metadata keys or values.</Text>
                  ) : (
                    <Stack gap="xs" style={{ maxHeight: 300, overflowY: "auto", paddingRight: 4 }}>
                      {filteredContextEntries.map(([k, v]) => (
                        <Box
                          key={k}
                          style={{
                            borderRadius: 6,
                            padding: "8px 10px",
                            backgroundColor: "rgba(255,255,255,0.01)",
                            border: "1px solid rgba(255,255,255,0.04)"
                          }}
                        >
                          <Group gap="xs" justify="space-between" wrap="nowrap" align="flex-start" mb={4}>
                            <Text size="xs" fw={700} color="cyan.6" style={{ fontFamily: "var(--mantine-font-family-monospace)" }}>
                              {k}
                            </Text>
                            <CopyButton value={typeof v === "object" ? JSON.stringify(v, null, 2) : String(v)}>
                              {({ copied, copy }) => (
                                <ActionIcon
                                  size="xs"
                                  variant="subtle"
                                  color={copied ? "green" : "gray"}
                                  onClick={copy}
                                >
                                  {copied ? <AnimatedCheck size={10} /> : <AnimatedCopy size={10} />}
                                </ActionIcon>
                              )}
                            </CopyButton>
                          </Group>
                          <Code block style={{ fontSize: 11, padding: 6, backgroundColor: "#0b0c11", color: "#ced4da" }}>
                            {typeof v === "object" ? JSON.stringify(v, null, 2) : String(v)}
                          </Code>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Stack>
              )}
            </Stack>
          </Stack>
        )}
      </CgDrawer>
      
      {/* Dynamic pulse CSS injection */}
      <style jsx global>{`
        @keyframes pulse-green {
          0% { transform: scale(0.9); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0.6; }
        }
      `}</style>
    </Stack>
  );
}

function LogRow({ log, onClick }: { log: SystemLog; onClick: () => void }) {
  const levelColor = LEVEL_COLORS[log.level] || "gray";
  const formattedTime = useMemo(() => {
    // Show local time cleanly: HH:mm:ss.SSS
    const match = log.timestamp.match(/T(\d{2}:\d{2}:\d{2}\.\d{3})/);
    return match ? match[1] : log.timestamp.slice(11, 23);
  }, [log.timestamp]);

  const hasContext = log.context && Object.keys(log.context).length > 0;

  return (
    <Box
      onClick={onClick}
      style={{
        cursor: "pointer",
        padding: "6px 12px",
        borderBottom: "1px solid rgba(255, 255, 255, 0.02)",
        // Severity left border indicator
        borderLeft: `4px solid var(--mantine-color-${levelColor}-6)`,
        backgroundColor: "transparent",
        transition: "background-color 0.15s ease",
        fontFamily: "var(--mantine-font-family-monospace)",
        fontSize: "11px",
        lineHeight: 1.5,
      }}
      className="cg-log-row"
    >
      <Group gap="sm" wrap="nowrap" align="flex-start">
        {/* Time column */}
        <Text
          size="xs"
          c="dimmed"
          style={{
            fontFamily: "inherit",
            fontSize: "inherit",
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          {formattedTime}
        </Text>

        {/* Level Badges */}
        <Badge
          size="xs"
          variant="light"
          color={levelColor}
          style={{
            flexShrink: 0,
            minWidth: 64,
            justifyContent: "center",
            fontFamily: "inherit",
            fontSize: "9px",
            height: "16px",
            lineHeight: "14px",
            border: `1px solid var(--mantine-color-${levelColor}-9)30`,
          }}
        >
          {log.level}
        </Badge>

        {/* Logger Name */}
        <Text
          size="xs"
          color="cyan.7"
          style={{
            fontFamily: "inherit",
            fontSize: "inherit",
            flexShrink: 0,
            whiteSpace: "nowrap",
            fontWeight: 600,
          }}
          title={log.logger_name}
        >
          {`[${log.logger_name.length > 20 ? log.logger_name.slice(0, 18) + ".." : log.logger_name}]`}
        </Text>

        {/* Message */}
        <Text
          size="xs"
          style={{
            fontFamily: "inherit",
            fontSize: "inherit",
            flexGrow: 1,
            color: "#e4e6eb",
            wordBreak: "break-all",
            whiteSpace: "pre-wrap",
          }}
        >
          {log.message}
        </Text>

        {/* Context metadata tag icon */}
        {hasContext && (
          <Tooltip label="Has JSON Metadata">
            <Group gap={2} style={{ flexShrink: 0, color: "var(--mantine-color-grape-6)" }}>
              <AnimatedCornerDownRight size={10} style={{ display: "inline" }} />
              <span style={{ fontSize: "9px", fontWeight: 700, fontFamily: "inherit" }}>JSON</span>
            </Group>
          </Tooltip>
        )}
      </Group>
      
      {/* Hover row visual treatment */}
      <style jsx>{`
        :global(.cg-log-row:hover) {
          background-color: rgba(255, 255, 255, 0.035) !important;
        }
      `}</style>
    </Box>
  );
}
