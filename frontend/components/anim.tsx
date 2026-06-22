"use client";

import { motion, animate } from "framer-motion";
import type { Variants, Transition } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ThemeIcon, Text, Group, Stack } from "@mantine/core";

/* ---------------------------------------------------------------------------
 * Shared animation variants
 *
 * Only `opacity` and `transform` are animated — these are compositor-friendly
 * properties that won't trigger layout / paint and keep things 60fps.
 * ------------------------------------------------------------------------- */

const springSoft: Transition = { type: "spring", stiffness: 320, damping: 30 };
const springSnappy: Transition = { type: "spring", stiffness: 380, damping: 26 };

/** Container that staggers its children into view. */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

/** A slower stagger for larger grids. */
export const staggerContainerSlow: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

/** Fade + slide up — the workhorse entrance. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: springSoft },
};

/** Fade + scale in — good for cards / icons. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: springSnappy },
};

/** Pure fade. */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

/** Slide in from the left. */
export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: springSoft },
};

/* ---------------------------------------------------------------------------
 * Helper components
 * ------------------------------------------------------------------------- */

/** Wraps children in a stagger container — use around lists / grids. */
export function MotionSection({
  children,
  delay = 0,
  slow = false,
}: {
  children: ReactNode;
  delay?: number;
  slow?: boolean;
}) {
  return (
    <motion.div
      variants={slow ? staggerContainerSlow : staggerContainer}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

/** A single staggered item — place inside <MotionSection>. */
export function MotionItem({
  children,
  variants = fadeUp,
  style,
}: {
  children: ReactNode;
  variants?: Variants;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div variants={variants} style={style}>
      {children}
    </motion.div>
  );
}

/** Standalone fade-up entrance for a single block (not inside a stagger). */
export function FadeIn({
  children,
  delay = 0,
  y = 18,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springSoft, delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Animated count-up for numeric stat values.
 * Uses framer-motion's `animate()` (no extra dependency) and rAF under the hood.
 */
export function AnimatedNumber({
  value,
  duration = 0.9,
  format,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
}) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    const controls = animate(prev.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, duration]);

  const formatted = format ? format(display) : Math.round(display).toLocaleString();
  return <>{formatted}</>;
}

/* ---------------------------------------------------------------------------
 * PageHeader — consistent animated header for every dashboard page.
 * Combines a colourful gradient icon, title, and optional description.
 * ------------------------------------------------------------------------- */

export function PageHeader({
  icon,
  iconColor,
  title,
  description,
  actions,
}: {
  icon: ReactNode;
  iconColor: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <FadeIn>
      <Group justify="space-between" align="center" wrap="nowrap" mb="sm">
        <Group gap="sm" align="center">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.05 }}
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <ThemeIcon
              size={44}
              radius="lg"
              variant="gradient"
              gradient={{ from: iconColor, to: iconColor, deg: 45 }}
              style={{
                boxShadow: `0 6px 18px ${iconColor}40`,
              }}
            >
              {icon}
            </ThemeIcon>
          </motion.div>
          <Stack gap={2}>
            <Text fw={800} size="lg" style={{ letterSpacing: -0.3 }}>
              {title}
            </Text>
            {description && (
              <Text size="xs" c="dimmed" fw={500}>
                {description}
              </Text>
            )}
          </Stack>
        </Group>
        {actions && <Group gap="sm">{actions}</Group>}
      </Group>
    </FadeIn>
  );
}
