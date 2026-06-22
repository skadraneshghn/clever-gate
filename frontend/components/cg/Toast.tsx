"use client";

import { notifications } from "@mantine/notifications";

export function useToast() {
  return {
    toast: (message: string, type: "success" | "error" | "info" | "warning" = "info") => {
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
    },
  };
}

export { notifications };
