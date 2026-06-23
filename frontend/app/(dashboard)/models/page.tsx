"use client";

import { useEffect, useState, useCallback } from "react";
import { Stack, Card, Text, Badge, Group, ThemeIcon } from "@mantine/core";
import { motion } from "framer-motion";
import {
  AnimatedGitMerge,
  AnimatedCpu,
  AnimatedZap,
  AnimatedCheckCircle,
  AnimatedXCircle,
} from "../../../components/cg/AnimatedIcons";
import { LoadingState } from "../../../components/States";
import { PageHeader, MotionSection, MotionItem, fadeUp } from "../../../components/anim";
import { api } from "../../../lib";
import type { Paginated, Deployment } from "../../../lib/types";

export default function ModelsPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Paginated<Deployment>>("/api/admin/deployments?page=1&page_size=200");
      setDeployments(res.items);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const aliases = new Map<string, Deployment[]>();
  for (const d of deployments) {
    const list = aliases.get(d.model_name) ?? [];
    list.push(d);
    aliases.set(d.model_name, list);
  }

  if (loading) return <LoadingState message="Loading models…" />;

  return (
    <Stack gap="md">
      <PageHeader
        icon={<AnimatedGitMerge size={22} />}
        iconColor="#ea580c"
        title="Models & Routing"
        description="Model aliases group multiple deployments under a single user-facing name"
      />

      {aliases.size === 0 ? (
        <Text c="dimmed">No model aliases defined yet.</Text>
      ) : (
        <MotionSection>
          <Stack gap="md">
            {Array.from(aliases.entries()).map(([alias, deps]) => (
              <MotionItem key={alias} variants={fadeUp}>
                <motion.div whileHover="hover" transition={{ type: "spring", stiffness: 350, damping: 25 }}>
                  <Card p="lg" radius="md" withBorder shadow="sm">
                    <Group justify="space-between" mb="sm">
                      <Group gap="sm">
                        <ThemeIcon size={36} radius="md" variant="light" color="orange">
                          <AnimatedCpu size={18} />
                        </ThemeIcon>
                        <Text fw={700} size="lg">{alias}</Text>
                      </Group>
                      <Badge variant="light" size="sm" color="orange" leftSection={<AnimatedZap size={12} />}>{deps.length} deployment(s)</Badge>
                    </Group>
                    <Stack gap="xs">
                      {deps.map((d) => (
                        <Group key={d.id} justify="space-between">
                          <Text size="sm" ff="monospace">{d.litellm_model}</Text>
                          <Group gap="xs">
                            <Badge variant="light" color={d.is_enabled ? "green" : "gray"} size="xs" leftSection={d.is_enabled ? <AnimatedCheckCircle size={10} /> : <AnimatedXCircle size={10} />}>
                              {d.is_enabled ? "enabled" : "disabled"}
                            </Badge>
                            {d.tpm && <Badge variant="outline" size="xs">{d.tpm} TPM</Badge>}
                            {d.rpm && <Badge variant="outline" size="xs">{d.rpm} RPM</Badge>}
                            {d.context_window && <Badge variant="outline" size="xs">{d.context_window} ctx</Badge>}
                          </Group>
                        </Group>
                      ))}
                    </Stack>
                  </Card>
                </motion.div>
              </MotionItem>
            ))}
          </Stack>
        </MotionSection>
      )}
    </Stack>
  );
}
