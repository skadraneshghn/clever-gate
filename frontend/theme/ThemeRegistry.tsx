"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { NavigationProgress } from "@mantine/nprogress";
import { getTheme } from "./theme";

type ColorScheme = "light" | "dark";
type ThemeVariant = "ocean" | "forest";

interface ColorSchemeContextValue {
  colorScheme: ColorScheme;
  toggleColorScheme: () => void;
  themeVariant: ThemeVariant;
  setThemeVariant: (variant: ThemeVariant) => void;
}

const ColorSchemeContext = createContext<ColorSchemeContextValue>({
  colorScheme: "dark",
  toggleColorScheme: () => {},
  themeVariant: "ocean",
  setThemeVariant: () => {},
});

export function useColorScheme() {
  return useContext(ColorSchemeContext);
}

const SCHEME_KEY = "cg-color-scheme";
const VARIANT_KEY = "cg-theme-variant";

function getStoredScheme(): ColorScheme {
  if (typeof window === "undefined") return "dark";
  return (localStorage.getItem(SCHEME_KEY) as ColorScheme) || "dark";
}

function getStoredVariant(): ThemeVariant {
  if (typeof window === "undefined") return "ocean";
  return (localStorage.getItem(VARIANT_KEY) as ThemeVariant) || "ocean";
}

export function ThemeRegistry({ children }: { children: ReactNode }) {
  const [colorScheme, setColorScheme] = useState<ColorScheme>("dark");
  const [themeVariant, setThemeVariantState] = useState<ThemeVariant>("ocean");

  useEffect(() => {
    setColorScheme(getStoredScheme());
    setThemeVariantState(getStoredVariant());
  }, []);

  const toggleColorScheme = useCallback(() => {
    setColorScheme((prev) => {
      const next: ColorScheme = prev === "dark" ? "light" : "dark";
      localStorage.setItem(SCHEME_KEY, next);
      return next;
    });
  }, []);

  const setThemeVariant = useCallback((variant: ThemeVariant) => {
    setThemeVariantState(variant);
    localStorage.setItem(VARIANT_KEY, variant);
  }, []);

  // Update HTML data attribute dynamically for CSS matching
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme-variant", themeVariant);
    }
  }, [themeVariant]);

  const activeTheme = getTheme(themeVariant);

  return (
    <ColorSchemeContext.Provider value={{ colorScheme, toggleColorScheme, themeVariant, setThemeVariant }}>
      <MantineProvider theme={activeTheme} defaultColorScheme={colorScheme} forceColorScheme={colorScheme}>
        <NavigationProgress />
        <Notifications position="bottom-right" />
        <ModalsProvider>{children}</ModalsProvider>
      </MantineProvider>
    </ColorSchemeContext.Provider>
  );
}
