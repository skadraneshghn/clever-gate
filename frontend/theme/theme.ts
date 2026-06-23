"use client";

import { createTheme, type MantineColorsTuple, type MantineThemeOverride, type MantineTheme } from "@mantine/core";

export const oceanBrand: MantineColorsTuple = [
  "#f3f7fb",
  "#e1ecf7",
  "#dbe2ef", // DBE2EF at index 2
  "#a2c4df",
  "#72a2cf",
  "#4d83be",
  "#3f72af", // Primary index 6
  "#315b8f",
  "#224269",
  "#112d4e", // index 9
];

export const forestBrand: MantineColorsTuple = [
  "#f1f8f6",
  "#e1f1ec",
  "#89d7b7", // 89D7B7 at index 2
  "#94cdc0",
  "#6bbfa0",
  "#4ea58b",
  "#428475", // Primary index 6
  "#366b5f",
  "#285046",
  "#1a312c", // index 9
];

export function getTheme(variant: "ocean" | "forest"): MantineThemeOverride {
  const brandColors = variant === "ocean" ? oceanBrand : forestBrand;
  return createTheme({
    primaryColor: "brand",
    colors: {
      brand: brandColors,
    },
    fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    headings: {
      fontFamily: "var(--font-outfit), var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontWeight: "800",
    },
    defaultRadius: "lg",
    components: {
      Button: {
        defaultProps: { fw: 700, radius: "md" },
      },
      Card: {
        defaultProps: { withBorder: true, shadow: "sm", radius: "lg" },
      },
      Table: {
        defaultProps: { highlightOnHover: true, verticalSpacing: "md" },
      },
      NavLink: {
        styles: (_theme: MantineTheme) => ({
          root: {
            borderRadius: "10px",
          },
        }),
      },
    },
  });
}

// Fallback theme export for static references
export const theme = getTheme("ocean");
