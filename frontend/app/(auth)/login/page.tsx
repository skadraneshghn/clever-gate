"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Stack,
  ThemeIcon,
  Alert,
  Center,
  Box,
  Group,
  ActionIcon,
} from "@mantine/core";
import { motion } from "framer-motion";
import { FiZap, FiAlertCircle, FiUser, FiLock, FiShield, FiLogIn, FiSun, FiMoon } from "react-icons/fi";
import { useAuth } from "../../../lib/auth";
import { useColorScheme } from "../../../theme/ThemeRegistry";

const containerVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1] as const,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password, totp || undefined);
      router.push("/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Center mih="100vh" p="md" style={{ position: "relative", overflow: "hidden" }}>
      {/* Floating Theme Toggle */}
      <Box style={{ position: "absolute", top: 20, right: 20, zIndex: 10 }}>
        <motion.div
          whileHover={{ rotate: 180, scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 200, damping: 10 }}
        >
          <ActionIcon
            onClick={toggleColorScheme}
            variant="subtle"
            size="lg"
            radius="md"
            aria-label="Toggle color scheme"
          >
            {colorScheme === "dark" ? (
              <FiSun size={20} style={{ color: "#eab308" }} />
            ) : (
              <FiMoon size={20} style={{ color: "#6366f1" }} />
            )}
          </ActionIcon>
        </motion.div>
      </Box>
      {/* Decorative Floating Glowing Backdrops */}
      <motion.div
        animate={{
          scale: [1, 1.25, 1],
          x: [0, 50, 0],
          y: [0, -30, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          position: "absolute",
          width: 350,
          height: 350,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(106, 118, 252, 0.25) 0%, rgba(106, 118, 252, 0) 70%)",
          filter: "blur(50px)",
          top: "10%",
          left: "15%",
          zIndex: -1,
        }}
      />
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          x: [0, -40, 0],
          y: [0, 60, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(230, 73, 128, 0.2) 0%, rgba(230, 73, 128, 0) 70%)",
          filter: "blur(60px)",
          bottom: "10%",
          right: "15%",
          zIndex: -1,
        }}
      />
      {/* Third ambient orb — subtle teal accent */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 30, 0],
          y: [0, -40, 0],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          position: "absolute",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(13, 148, 136, 0.12) 0%, rgba(13, 148, 136, 0) 70%)",
          filter: "blur(50px)",
          top: "40%",
          right: "30%",
          zIndex: -1,
        }}
      />

      <Container size={420} style={{ position: "relative", zIndex: 1 }}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <Stack align="center" mb="xl">
            <motion.div
              variants={itemVariants}
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
            >
              <ThemeIcon
                size={64}
                radius="xl"
                variant="gradient"
                gradient={{ from: "brand", to: "grape", deg: 45 }}
                style={{
                  boxShadow: "0 8px 28px rgba(106, 118, 252, 0.4)",
                }}
              >
                <FiZap size={32} style={{ color: "#fff" }} />
              </ThemeIcon>
            </motion.div>
            <Stack gap={4} align="center">
              <motion.div variants={itemVariants}>
                <Title order={2} fw={900} className="cg-gradient-text" style={{ letterSpacing: -0.5 }}>
                  Clever Gateway
                </Title>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Text size="sm" c="dimmed" fw={500}>
                  Sign in to the admin panel
                </Text>
              </motion.div>
            </Stack>
          </Stack>

          <motion.div variants={itemVariants}>
            <Paper
              radius="lg"
              p="xl"
              withBorder
              style={{
                boxShadow: "0 12px 40px rgba(0, 0, 0, 0.08)",
                backgroundColor: colorScheme === "dark" ? "rgba(20, 24, 38, 0.35)" : "rgba(255, 255, 255, 0.35)",
                backdropFilter: "blur(16px)",
                border: colorScheme === "dark" ? "1px solid rgba(255, 255, 255, 0.04)" : "1px solid rgba(0, 0, 0, 0.06)",
              }}
            >
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.3 }}
                >
                  <Alert
                    icon={<FiAlertCircle size={16} />}
                    color="red"
                    variant="light"
                    mb="md"
                    radius="md"
                  >
                    {error}
                  </Alert>
                </motion.div>
              )}

              <Box component="form" onSubmit={handleSubmit}>
                <Stack gap="md">
                  <TextInput
                    label="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoFocus
                    size="md"
                    leftSection={<FiUser size={18} style={{ color: "var(--mantine-color-brand-filled)" }} />}
                  />
                  <PasswordInput
                    label="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    size="md"
                    leftSection={<FiLock size={18} style={{ color: "var(--mantine-color-brand-filled)" }} />}
                  />
                  <TextInput
                    label="TOTP Code (optional)"
                    value={totp}
                    onChange={(e) => setTotp(e.target.value)}
                    placeholder="2FA code"
                    size="md"
                    leftSection={<FiShield size={18} style={{ color: "var(--mantine-color-brand-filled)" }} />}
                  />
                  <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}>
                    <Button
                      type="submit"
                      size="md"
                      fullWidth
                      loading={loading}
                      variant="gradient"
                      gradient={{ from: "brand", to: "grape", deg: 90 }}
                      leftSection={<FiLogIn size={18} />}
                      style={{
                        height: 46,
                        fontWeight: 600,
                        boxShadow: "0 4px 16px rgba(106, 118, 252, 0.3)",
                      }}
                    >
                      Sign In
                    </Button>
                  </motion.div>
                </Stack>
              </Box>
            </Paper>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Group justify="center" mt="xl" gap="xs">
              <FiShield size={14} style={{ color: "var(--mantine-color-dimmed)" }} />
              <Text ta="center" size="xs" c="dimmed" fw={500}>
                Secured with JWT · OpenAI-compatible AI gateway
              </Text>
            </Group>
          </motion.div>
        </motion.div>
      </Container>
    </Center>
  );
}
