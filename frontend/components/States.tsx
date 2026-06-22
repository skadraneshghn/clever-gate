"use client";

import { Center, Text, Stack, ThemeIcon } from "@mantine/core";
import { motion } from "framer-motion";
import { FiLoader, FiAlertTriangle } from "react-icons/fi";

export function LoadingState({ message = "Loading…" }: { message?: string }) {
  return (
    <Center py="xl">
      <Stack align="center" gap="sm">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        >
          <ThemeIcon
            size={48}
            radius="xl"
            variant="light"
            color="brand"
            style={{ boxShadow: "0 4px 14px rgba(106, 118, 252, 0.2)" }}
          >
            <FiLoader size={22} />
          </ThemeIcon>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <Text c="dimmed" size="sm" fw={500}>
            {message}
          </Text>
        </motion.div>
      </Stack>
    </Center>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <Center py="xl">
      <Stack align="center" gap="sm">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
        >
          <ThemeIcon size={44} radius="xl" variant="light" color="red">
            <FiAlertTriangle size={22} />
          </ThemeIcon>
        </motion.div>
        <Text c="red" size="sm" fw={500} ta="center">
          {message}
        </Text>
      </Stack>
    </Center>
  );
}

export function EmptyState({ message }: { message?: string }) {
  return (
    <Center py="xl">
      <Text c="dimmed" size="sm">
        {message ?? "No data"}
      </Text>
    </Center>
  );
}
