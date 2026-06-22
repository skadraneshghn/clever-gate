"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { NavigationProgress } from "@mantine/nprogress";
import { theme } from "./theme";

type ColorScheme = "light" | "dark";

interface ColorSchemeContextValue {
  colorScheme: ColorScheme;
  toggleColorScheme: () => void;
}

const ColorSchemeContext = createContext<ColorSchemeContextValue>({
  colorScheme: "dark",
  toggleColorScheme: () => {},
});

export function useColorScheme() {
  return useContext(ColorSchemeContext);
}

const STORAGE_KEY = "cg-color-scheme";

function getStoredScheme(): ColorScheme {
  if (typeof window === "undefined") return "dark";
  return (localStorage.getItem(STORAGE_KEY) as ColorScheme) || "dark";
}

export function ThemeRegistry({ children }: { children: ReactNode }) {
  const [colorScheme, setColorScheme] = useState<ColorScheme>("dark");

  useEffect(() => {
    setColorScheme(getStoredScheme());
  }, []);

  const toggleColorScheme = useCallback(() => {
    setColorScheme((prev) => {
      const next: ColorScheme = prev === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return (
    <>
      <ColorSchemeContext.Provider value={{ colorScheme, toggleColorScheme }}>
        <MantineProvider theme={theme} defaultColorScheme={colorScheme} forceColorScheme={colorScheme}>
          <NavigationProgress />
          <Notifications position="bottom-right" />
          <ModalsProvider>{children}</ModalsProvider>
        </MantineProvider>
      </ColorSchemeContext.Provider>
    </>
  );
}
