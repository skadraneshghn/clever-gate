"use client";

import { Center, Text, Stack, ThemeIcon, Card } from "@mantine/core";
import { motion } from "framer-motion";
import { AnimatedAlertTriangle, AnimatedZap, AnimatedInbox } from "./cg/AnimatedIcons";

export function LoadingState({ message = "Connecting to system logs…" }: { message?: string }) {
  return (
    <Center style={{ minHeight: "280px", width: "100%" }}>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <Card
          p="xl"
          radius="lg"
          withBorder
          style={{
            maxWidth: 300,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: "rgba(255, 255, 255, 0.45)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 10px 30px rgba(17, 45, 78, 0.05)",
          }}
        >
          <Stack align="center" gap="md">
            {/* Concentric gateway signal wave pulses & spin loader */}
            <div style={{ position: "relative", width: 80, height: 80, display: "flex", justifyContent: "center", alignItems: "center" }}>
              {/* Ping Ring 2 */}
              <motion.div
                style={{
                  position: "absolute",
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  border: "2px solid var(--cg-primary)",
                  opacity: 0,
                }}
                animate={{ scale: [0.5, 1.25], opacity: [0.35, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut", delay: 0.7 }}
              />
              {/* Ping Ring 1 */}
              <motion.div
                style={{
                  position: "absolute",
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  border: "2px solid var(--cg-primary)",
                  opacity: 0,
                }}
                animate={{ scale: [0.5, 1.15], opacity: [0.45, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
              />
              {/* Spinner loader ring */}
              <motion.div
                style={{
                  position: "absolute",
                  width: 50,
                  height: 50,
                  borderRadius: "50%",
                  border: "3px solid rgba(63, 114, 175, 0.1)",
                  borderTop: "3px solid var(--cg-primary)",
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
              />
              {/* Center icon representing gateway */}
              <ThemeIcon size={34} radius="xl" variant="filled" color="brand" style={{ boxShadow: "0 4px 12px rgba(63, 114, 175, 0.25)" }}>
                <AnimatedZap size={14} style={{ color: "#fff" }} />
              </ThemeIcon>
            </div>
            
            <Stack gap={2} align="center">
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              >
                <Text size="sm" fw={800} style={{ color: "var(--cg-primary)", letterSpacing: -0.1 }} ta="center">
                  Clever Gateway
                </Text>
              </motion.div>
              <Text c="dimmed" size="xs" fw={600} ta="center">
                {message}
              </Text>
            </Stack>
          </Stack>
        </Card>
      </motion.div>
    </Center>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <Center style={{ minHeight: "200px", width: "100%" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
      >
        <Card
          p="lg"
          radius="lg"
          withBorder
          style={{
            maxWidth: 350,
            border: "1px solid rgba(250, 82, 82, 0.2)",
            background: "rgba(250, 82, 82, 0.03)",
          }}
        >
          <Stack align="center" gap="sm">
            <ThemeIcon size={36} radius="xl" variant="light" color="red">
              <AnimatedAlertTriangle size={18} />
            </ThemeIcon>
            <Text c="red" size="xs" fw={650} ta="center">
              {message}
            </Text>
          </Stack>
        </Card>
      </motion.div>
    </Center>
  );
}

export function EmptyState({ message = "No records found" }: { message?: string }) {
  return (
    <Center style={{ minHeight: "180px", width: "100%" }}>
      <Stack align="center" gap="xs">
        <ThemeIcon size={36} radius="xl" variant="light" color="gray">
          <AnimatedInbox size={18} />
        </ThemeIcon>
        <Text c="dimmed" size="xs" fw={600} ta="center">
          {message}
        </Text>
      </Stack>
    </Center>
  );
}
