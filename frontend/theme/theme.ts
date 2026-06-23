"use client";

import { createTheme, type MantineColorsTuple, type MantineThemeOverride, type MantineTheme } from "@mantine/core";

const brandColors: MantineColorsTuple = [
  "#eef2ff",
  "#dae0ff",
  "#b3bcff",
  "#8a96ff",
  "#6a76fc",
  "#5360f8",
  "#4a52f7",
  "#3e42e0",
  "#3539c9",
  "#2a2db1",
];

export const theme: MantineThemeOverride = createTheme({
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
