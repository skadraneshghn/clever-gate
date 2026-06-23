"use client";

import { useCallback } from "react";
import { notifications } from "@mantine/notifications";

export function useToast() {
  const toast = useCallback((message: string, type: "success" | "error" | "info" | "warning" = "info") => {
    const colorMap: Record<string, string> = {
      success: "green",
      error: "red",
      info: "blue",
      warning: "orange",
    };
    notifications.show({
      message,
      color: colorMap[type],
      autoClose: 4000,
      withBorder: true,
    });
  }, []);

  return { toast };
}

export { notifications };
