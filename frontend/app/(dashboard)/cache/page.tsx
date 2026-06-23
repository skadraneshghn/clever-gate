"use client";

import { useEffect, useState, useCallback } from "react";
import { Stack, Group, Button, SimpleGrid, Text, Card, ThemeIcon } from "@mantine/core";
import { motion } from "framer-motion";
import {
  AnimatedDatabase,
  AnimatedTrash,
  AnimatedZap,
  AnimatedCheckCircle,
  AnimatedHardDrive,
} from "../../../components/cg/AnimatedIcons";
import { CgStat, useCgConfirm, useToast } from "../../../components/cg";
import { LoadingState } from "../../../components/States";
import { PageHeader, MotionSection, MotionItem, AnimatedNumber } from "../../../components/anim";
import { api } from "../../../lib";
import type { CacheStats } from "../../../lib/types";

export default function CachePage() {
  const { toast } = useToast();
  const confirm = useCgConfirm();
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setStats(await api.get<CacheStats>("/api/admin/cache/stats")); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleInvalidate = () => {
    confirm({
      title: "Invalidate all cache",
      message: "This will clear all cached responses.",
      confirmLabel: "Invalidate All", danger: true,
      onConfirm: async () => {
        try {
          const res = await api.post<{ invalidated: number }>("/api/admin/cache/invalidate", {});
          toast(`Invalidated ${res.invalidated} entries`, "success");
          await load();
        } catch (e) { toast(e instanceof Error ? e.message : "Failed", "error"); }
      },
    });
  };

  if (loading) return <LoadingState message="Loading cache stats…" />;

  return (
    <Stack gap="lg">
      <PageHeader
        icon={<AnimatedDatabase size={22} />}
        iconColor="#7c3aed"
        title="Cache Management"
        description="Manage the L1 exact-match response cache"
      />

      <MotionSection>
        <SimpleGrid cols={{ base: 2, md: 3 }}>
          <MotionItem>
            <CgStat
              title="Cache Entries"
              value={<AnimatedNumber value={stats?.total_entries ?? 0} />}
              icon={<AnimatedHardDrive size={18} />}
              color="brand"
            />
          </MotionItem>
          <MotionItem>
            <CgStat
              title="Total Hits"
              value={<AnimatedNumber value={stats?.total_hits ?? 0} />}
              icon={<AnimatedCheckCircle size={18} />}
              color="green"
            />
          </MotionItem>
          <MotionItem>
            <CgStat title="Status" value="Active" subtitle="L1 exact cache" icon={<AnimatedZap size={18} />} color="grape" />
          </MotionItem>
        </SimpleGrid>
      </MotionSection>

      <MotionSection delay={0.2}>
        <MotionItem>
          <Card p="lg" radius="md" withBorder shadow="sm">
            <Stack gap="md">
              <Group gap="sm">
                <ThemeIcon size={36} radius="md" variant="light" color="red">
                  <AnimatedTrash size={18} />
                </ThemeIcon>
                <Stack gap={0}>
                  <Text fw={700} size="sm">Cache Invalidation</Text>
                  <Text size="xs" c="dimmed">
                    Invalidate the L1 exact cache. Use selective invalidation by model, or clear all entries.
                  </Text>
                </Stack>
              </Group>
              <Group>
                <motion.div whileHover="hover" whileTap={{ scale: 0.98 }}>
                  <Button variant="light" color="red" leftSection={<AnimatedTrash size={16} />} onClick={handleInvalidate}>
                    Invalidate All
                  </Button>
                </motion.div>
              </Group>
            </Stack>
          </Card>
        </MotionItem>
      </MotionSection>
    </Stack>
  );
}
