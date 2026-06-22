"use client";

import { Card } from "@mantine/core";
import { motion } from "framer-motion";
import type { CardProps } from "@mantine/core";

export function CgCard({ children, ...props }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      whileHover={{ y: -2 }}
      style={{ width: "100%" }}
    >
      <Card {...props}>{children}</Card>
    </motion.div>
  );
}
