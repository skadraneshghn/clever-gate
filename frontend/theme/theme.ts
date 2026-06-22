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
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  headings: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontWeight: "700",
  },
  defaultRadius: "md",
  components: {
    Button: {
      defaultProps: { fw: 600 },
    },
    Card: {
      defaultProps: { withBorder: true, shadow: "xs" },
    },
    Table: {
      defaultProps: { highlightOnHover: true, verticalSpacing: "sm" },
    },
    NavLink: {
      styles: (_theme: MantineTheme) => ({
        root: {
          borderRadius: "8px",
        },
      }),
    },
  },
});
