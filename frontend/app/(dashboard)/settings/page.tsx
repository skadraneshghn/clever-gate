"use client";

import { useEffect, useState, useCallback } from "react";
import { Stack, Button, Text, Textarea, Group, Grid, Select } from "@mantine/core";
import { motion } from "framer-motion";
import { AnimatedSettings, AnimatedSave } from "../../../components/cg/AnimatedIcons";
import { CgCard, useToast } from "../../../components/cg";
import { LoadingState } from "../../../components/States";
import { PageHeader, MotionSection, MotionItem } from "../../../components/anim";
import { useColorScheme } from "../../../theme/ThemeRegistry";
import { api } from "../../../lib";
import type { Setting } from "../../../lib/types";

export default function SettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  
  const { colorScheme, toggleColorScheme, themeVariant, setThemeVariant } = useColorScheme();

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ settings: Setting[] }>("/api/admin/settings");
      setSettings(res.settings);
      const d: Record<string, string> = {};
      for (const s of res.settings) d[s.key] = JSON.stringify(s.value);
      setDraft(d);
    } catch (e) { toast(e instanceof Error ? e.message : "Load failed", "error"); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    try {
      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(draft)) {
        try { updates[key] = JSON.parse(value); } catch { updates[key] = value; }
      }
      await api.patch("/api/admin/settings", updates);
      toast("Settings saved", "success");
      await load();
    } catch (e) { toast(e instanceof Error ? e.message : "Save failed", "error"); }
  };

  if (loading) return <LoadingState message="Loading settings…" />;

  return (
    <Stack gap="lg">
      <PageHeader
        icon={<AnimatedSettings size={22} />}
        iconColor="#6b7280"
        title="Settings"
        description="Global gateway configuration"
      />

      <MotionSection>
        <Stack gap="lg">
          {/* Theme Preferences Card */}
          <MotionItem>
            <CgCard p="lg" radius="lg">
              <Stack gap="md">
                <Text fw={750} size="md" style={{ letterSpacing: -0.1 }}>
                  Theme Preferences
                </Text>
                <Text size="xs" c="dimmed" fw={500}>
                  Customize your visual interface color palettes and scheme modes
                </Text>
                
                <Grid gutter="md">
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Select
                      label="Color Palette"
                      description="Choose between the Classic Indigo / Navy theme or the Forest Mint / Sage theme"
                      value={themeVariant}
                      onChange={(v) => setThemeVariant(v as "ocean" | "forest")}
                      data={[
                        { value: "ocean", label: "Ocean Indigo (Indigo / Blue-Navy)" },
                        { value: "forest", label: "Forest Mint (Cream / Sage-Teal)" },
                      ]}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Select
                      label="Appearance Mode"
                      description="Select light or dark scheme mode settings"
                      value={colorScheme}
                      onChange={toggleColorScheme as any}
                      data={[
                        { value: "light", label: "Light Mode" },
                        { value: "dark", label: "Dark Mode" },
                      ]}
                    />
                  </Grid.Col>
                </Grid>
              </Stack>
            </CgCard>
          </MotionItem>

          {/* System Settings Card */}
          <MotionItem>
            <CgCard p="lg" radius="lg">
              <Stack gap="md">
                <Text fw={750} size="md" style={{ letterSpacing: -0.1 }}>
                  Global Gateway Settings
                </Text>
                {settings.length === 0 ? (
                  <Text c="dimmed" size="sm">No settings configured.</Text>
                ) : (
                  <>
                    {settings.map((s) => (
                      <Textarea
                        key={s.key}
                        label={s.key}
                        value={draft[s.key] ?? ""}
                        onChange={(e) => setDraft((p) => ({ ...p, [s.key]: e.target.value }))}
                        description={s.description ?? undefined}
                        autosize minRows={2}
                        ff="monospace"
                      />
                    ))}
                    <Group justify="flex-end">
                      <motion.div whileHover="hover" whileTap={{ scale: 0.98 }}>
                        <Button onClick={handleSave} leftSection={<AnimatedSave size={16} />} variant="gradient" gradient={{ from: "brand", to: "brand", deg: 90 }}>
                          Save Settings
                        </Button>
                      </motion.div>
                    </Group>
                  </>
                )}
              </Stack>
            </CgCard>
          </MotionItem>
        </Stack>
      </MotionSection>
    </Stack>
  );
}
