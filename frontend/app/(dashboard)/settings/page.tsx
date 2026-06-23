"use client";

import { useEffect, useState, useCallback } from "react";
import { Stack, Button, Text, Textarea, Group, UnstyledButton, ThemeIcon, SimpleGrid, Box } from "@mantine/core";
import { motion } from "framer-motion";
import {
  AnimatedSettings,
  AnimatedSave,
  AnimatedSun,
  AnimatedMoon,
  AnimatedSliders,
  AnimatedKey,
  AnimatedDatabase,
  AnimatedActivity,
} from "../../../components/cg/AnimatedIcons";
import { CgCard, useToast } from "../../../components/cg";
import { LoadingState } from "../../../components/States";
import { PageHeader, MotionSection, MotionItem } from "../../../components/anim";
import { useColorScheme } from "../../../theme/ThemeRegistry";
import { api } from "../../../lib";
import type { Setting } from "../../../lib/types";

interface ThemeMeta {
  key: string;
  label: string;
  lightBg: string;
  lightPrimary: string;
  darkBg: string;
  darkPrimary: string;
}

const THEMES: ThemeMeta[] = [
  { key: "ocean", label: "Ocean Indigo", lightBg: "#F9F7F7", lightPrimary: "#3F72AF", darkBg: "#112D4E", darkPrimary: "#3F72AF" },
  { key: "forest", label: "Forest Mint", lightBg: "#FFF4E1", lightPrimary: "#428475", darkBg: "#1A312C", darkPrimary: "#428475" },
  { key: "warm", label: "Warm Coffee", lightBg: "#FFF8F0", lightPrimary: "#8C5A3C", darkBg: "#4B2E2B", darkPrimary: "#C08552" },
  { key: "sage", label: "Sage Garden", lightBg: "#F2F5EE", lightPrimary: "#2B5748", darkBg: "#273338", darkPrimary: "#618764" },
  { key: "lavender", label: "Lavender Fields", lightBg: "#eef2ff", lightPrimary: "#6366f1", darkBg: "#1e1b4b", darkPrimary: "#818cf8" },
  { key: "teal", label: "Teal Peach", lightBg: "#fff3e0", lightPrimary: "#00897b", darkBg: "#1c2d2d", darkPrimary: "#26a69a" },
  { key: "sunset", label: "Sunset Gold", lightBg: "#fffdd0", lightPrimary: "#f57c00", darkBg: "#2e1c1a", darkPrimary: "#ffb74d" },
  { key: "olive", label: "Olive Rust", lightBg: "#fefae0", lightPrimary: "#606c38", darkBg: "#3c1a1a", darkPrimary: "#dda15e" },
  { key: "cyberpunk", label: "Cyberpunk Neon", lightBg: "#fff9c4", lightPrimary: "#e91e63", darkBg: "#2a0835", darkPrimary: "#ec407a" },
  { key: "earth", label: "Vintage Earth", lightBg: "#f4f1de", lightPrimary: "#81b29a", darkBg: "#1b1c28", darkPrimary: "#e07a5f" },
  { key: "cherry", label: "Crimson Sunset", lightBg: "#ffeb3b", lightPrimary: "#c62828", darkBg: "#2c0510", darkPrimary: "#ff7043" },
  { key: "mint", label: "Mint Slate", lightBg: "#fff9f0", lightPrimary: "#00bfa5", darkBg: "#081210", darkPrimary: "#1de9b6" },
  { key: "vibrant", label: "Vibrant Primary", lightBg: "#ffeb3b", lightPrimary: "#e91e63", darkBg: "#0d0f2a", darkPrimary: "#2979ff" },
  { key: "noir", label: "Noir Ruby", lightBg: "#f5f5f5", lightPrimary: "#424242", darkBg: "#000000", darkPrimary: "#c2185b" },
  { key: "aqua", label: "Tropical Aqua", lightBg: "#ffe082", lightPrimary: "#008080", darkBg: "#000000", darkPrimary: "#80f1d3" },
];

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

  function getSettingIcon(key: string) {
    const k = key.toLowerCase();
    if (k.includes("key") || k.includes("auth") || k.includes("token") || k.includes("secret")) {
      return <AnimatedKey size={16} style={{ color: "var(--cg-primary)" }} />;
    }
    if (k.includes("db") || k.includes("cache") || k.includes("redis")) {
      return <AnimatedDatabase size={16} style={{ color: "var(--cg-primary)" }} />;
    }
    if (k.includes("log") || k.includes("audit") || k.includes("monitor") || k.includes("observability")) {
      return <AnimatedActivity size={16} style={{ color: "var(--cg-primary)" }} />;
    }
    return <AnimatedSliders size={16} style={{ color: "var(--cg-primary)" }} />;
  }

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
              <Stack gap="lg">
                <Box>
                  <Text fw={750} size="md" style={{ letterSpacing: -0.1 }}>
                    Theme Preferences
                  </Text>
                  <Text size="xs" c="dimmed" fw={500}>
                    Customize your visual interface color palettes and scheme modes
                  </Text>
                </Box>
                
                {/* Visual Appearance Mode Selection */}
                <Stack gap="xs">
                  <Text fw={650} size="sm">Appearance Mode</Text>
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    {/* Light Mode Card */}
                    <motion.div
                      whileHover={{ y: -2, scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <UnstyledButton
                        onClick={() => colorScheme !== "light" && toggleColorScheme()}
                        style={{
                          width: "100%",
                          padding: "16px",
                          borderRadius: "12px",
                          backgroundColor: colorScheme === "light" 
                            ? "var(--cg-hover-glow)" 
                            : "rgba(255, 255, 255, 0.01)",
                          border: colorScheme === "light"
                            ? "2px solid var(--cg-primary)"
                            : "1px solid var(--cg-border)",
                          boxShadow: colorScheme === "light"
                            ? "0 8px 24px var(--cg-hover-glow)"
                            : "none",
                          transition: "all 0.2s ease",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px"
                        }}
                      >
                        <ThemeIcon size="md" radius="md" color="yellow" variant="light">
                          <AnimatedSun size={18} />
                        </ThemeIcon>
                        <Stack gap={2}>
                          <Text fw={700} size="sm" c={colorScheme === "light" ? "var(--cg-primary)" : "inherit"}>Light Mode</Text>
                          <Text size="xs" c="dimmed">Soft warm-white interface</Text>
                        </Stack>
                      </UnstyledButton>
                    </motion.div>

                    {/* Dark Mode Card */}
                    <motion.div
                      whileHover={{ y: -2, scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <UnstyledButton
                        onClick={() => colorScheme !== "dark" && toggleColorScheme()}
                        style={{
                          width: "100%",
                          padding: "16px",
                          borderRadius: "12px",
                          backgroundColor: colorScheme === "dark"
                            ? "var(--cg-hover-glow)"
                            : "rgba(255, 255, 255, 0.01)",
                          border: colorScheme === "dark"
                            ? "2px solid var(--cg-primary)"
                            : "1px solid var(--cg-border)",
                          boxShadow: colorScheme === "dark"
                            ? "0 8px 24px var(--cg-hover-glow)"
                            : "none",
                          transition: "all 0.2s ease",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px"
                        }}
                      >
                        <ThemeIcon size="md" radius="md" color="indigo" variant="light">
                          <AnimatedMoon size={18} />
                        </ThemeIcon>
                        <Stack gap={2}>
                          <Text fw={700} size="sm" c={colorScheme === "dark" ? "var(--cg-primary)" : "inherit"}>Dark Mode</Text>
                          <Text size="xs" c="dimmed">Rich high-contrast dark palette</Text>
                        </Stack>
                      </UnstyledButton>
                    </motion.div>
                  </SimpleGrid>
                </Stack>

                {/* Visual Color Palette Grid */}
                <Stack gap="xs">
                  <Text fw={650} size="sm">Color Palette</Text>
                  <SimpleGrid cols={{ base: 2, xs: 3, sm: 4, md: 5 }} spacing="md">
                    {THEMES.map((theme) => {
                      const isSelected = themeVariant === theme.key;
                      return (
                        <motion.div
                          key={theme.key}
                          whileHover={{ y: -3, scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <UnstyledButton
                            onClick={() => setThemeVariant(theme.key as any)}
                            style={{
                              width: "100%",
                              padding: "12px",
                              borderRadius: "12px",
                              backgroundColor: isSelected
                                ? "var(--cg-hover-glow)"
                                : "rgba(255, 255, 255, 0.01)",
                              border: isSelected
                                ? "2px solid var(--cg-primary)"
                                : "1px solid var(--cg-border)",
                              boxShadow: isSelected
                                ? "0 8px 24px var(--cg-hover-glow)"
                                : "none",
                              transition: "all 0.2s ease",
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                              alignItems: "center",
                              justifyContent: "center",
                              textAlign: "center"
                            }}
                          >
                            {/* Visual split color preview circle */}
                            <div style={{
                              display: "flex",
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              overflow: "hidden",
                              border: "1.5px solid rgba(0, 0, 0, 0.08)",
                              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)"
                            }}>
                              {/* Left half: Light Mode */}
                              <div style={{ flex: 1, backgroundColor: theme.lightBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: theme.lightPrimary }} />
                              </div>
                              {/* Right half: Dark Mode */}
                              <div style={{ flex: 1, backgroundColor: theme.darkBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: theme.darkPrimary }} />
                              </div>
                            </div>
                            
                            <Text fw={isSelected ? 750 : 600} size="xs" c={isSelected ? "var(--cg-primary)" : "inherit"}>
                              {theme.label}
                            </Text>
                          </UnstyledButton>
                        </motion.div>
                      );
                    })}
                  </SimpleGrid>
                </Stack>
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
                    <Stack gap="lg">
                      {settings.map((s) => (
                        <Box
                          key={s.key}
                          style={{
                            padding: "16px",
                            borderRadius: "12px",
                            border: "1px solid var(--cg-border)",
                            backgroundColor: "rgba(255, 255, 255, 0.015)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px"
                          }}
                        >
                          <Group gap="xs">
                            {getSettingIcon(s.key)}
                            <Text fw={700} size="sm">{s.key}</Text>
                          </Group>
                          {s.description && (
                            <Text size="xs" c="dimmed" fw={500}>
                              {s.description}
                            </Text>
                          )}
                          <Textarea
                            value={draft[s.key] ?? ""}
                            onChange={(e) => setDraft((p) => ({ ...p, [s.key]: e.target.value }))}
                            autosize
                            minRows={3}
                            ff="monospace"
                            styles={{
                              input: {
                                backgroundColor: "rgba(0, 0, 0, 0.15)",
                                border: "1px solid var(--cg-border)",
                                borderRadius: "8px",
                                padding: "12px",
                                fontSize: "13px",
                                lineHeight: "1.5"
                              }
                            }}
                          />
                        </Box>
                      ))}
                    </Stack>
                    <Group justify="flex-end" mt="md">
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
