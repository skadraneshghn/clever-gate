"use client";

import { useDisclosure } from "@mantine/hooks";
import { openConfirmModal } from "@mantine/modals";
import { Text } from "@mantine/core";
import type { ReactNode } from "react";

interface CgConfirmOptions {
  title: string;
  message: ReactNode;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export function useCgConfirm() {
  return (options: CgConfirmOptions) => {
    openConfirmModal({
      title: options.title,
      children: <Text size="sm">{options.message}</Text>,
      labels: {
        confirm: options.confirmLabel || "Confirm",
        cancel: options.cancelLabel || "Cancel",
      },
      confirmProps: options.danger ? { color: "red" } : undefined,
      onConfirm: options.onConfirm,
    });
  };
}
