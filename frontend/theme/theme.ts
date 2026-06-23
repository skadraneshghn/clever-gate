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

export const warmBrand: MantineColorsTuple = [
  "#fff8f0", // Cream (index 0)
  "#f7eadf",
  "#e8cca7", // Highlight border (index 2)
  "#d3b18f",
  "#c08552", // Caramel / Accent (index 4)
  "#a66f47",
  "#8c5a3c", // Primary (Medium brown / Clay) (index 6)
  "#73482e",
  "#5d3a25",
  "#4b2e2b", // Espresso / Dark Chocolate (index 9)
];

export const sageBrand: MantineColorsTuple = [
  "#f2f5ee", // Lightest (index 0)
  "#e2e9da",
  "#c5d3b6", // Highlight border (index 2)
  "#9cb080", // Sage (index 3)
  "#7d9770",
  "#618764", // Medium Muted Green (index 5)
  "#497052",
  "#2b5748", // Primary Forest (index 7)
  "#1c372e",
  "#273338", // Dark slate green/grey (index 9)
];

export const lavenderBrand: MantineColorsTuple = [
  "#eef2ff",
  "#e0e7ff",
  "#c7d2fe",
  "#a5b4fc",
  "#818cf8",
  "#6366f1",
  "#4f46e5",
  "#4338ca",
  "#3730a3",
  "#1e1b4b",
];

export const tealBrand: MantineColorsTuple = [
  "#fff3e0",
  "#ffe0b2",
  "#ffcc80",
  "#80cbc4",
  "#4db6ac",
  "#26a69a",
  "#00897b",
  "#00695c",
  "#004d40",
  "#1c2d2d",
];

export const sunsetBrand: MantineColorsTuple = [
  "#fffdd0",
  "#ffe082",
  "#ffb74d",
  "#ffa726",
  "#f57c00",
  "#e65100",
  "#80d8ff",
  "#40c4ff",
  "#00b0ff",
  "#2e1c1a",
];

export const oliveBrand: MantineColorsTuple = [
  "#fefae0",
  "#f6eed0",
  "#dda15e",
  "#bc6c25",
  "#8a5a22",
  "#606c38",
  "#4f5d2f",
  "#3e4a24",
  "#283618",
  "#3c1a1a",
];

export const cyberpunkBrand: MantineColorsTuple = [
  "#fff9c4",
  "#f8bbd0",
  "#f48fb1",
  "#f06292",
  "#ec407a",
  "#e91e63",
  "#d81b60",
  "#c2185b",
  "#8e24aa",
  "#2a0835",
];

export const earthBrand: MantineColorsTuple = [
  "#f4f1de",
  "#f2ebd9",
  "#e07a5f",
  "#c46a52",
  "#81b29a",
  "#6ea58a",
  "#588b72",
  "#3d405b",
  "#2c2e43",
  "#1b1c28",
];

export const cherryBrand: MantineColorsTuple = [
  "#ffeb3b",
  "#ffd54f",
  "#ff7043",
  "#ff5252",
  "#e53935",
  "#c62828",
  "#b71c1c",
  "#880e4f",
  "#610b24",
  "#2c0510",
];

export const mintBrand: MantineColorsTuple = [
  "#fff9f0",
  "#e8f5e9",
  "#a7ffeb",
  "#64ffda",
  "#1de9b6",
  "#00bfa5",
  "#1b3b36",
  "#142d29",
  "#0e201d",
  "#081210",
];

export const vibrantBrand: MantineColorsTuple = [
  "#ffeb3b",
  "#00e676",
  "#2979ff",
  "#2962ff",
  "#e91e63",
  "#d81b60",
  "#c2185b",
  "#880e4f",
  "#1a237e",
  "#0d0f2a",
];

export const noirBrand: MantineColorsTuple = [
  "#f5f5f5",
  "#e0e0e0",
  "#c2185b",
  "#9e9e9e",
  "#757575",
  "#616161",
  "#424242",
  "#212121",
  "#111111",
  "#000000",
];

export const aquaBrand: MantineColorsTuple = [
  "#ffe082",
  "#80f1d3",
  "#40e0d0",
  "#008080",
  "#00695c",
  "#004d40",
  "#0b171e",
  "#071015",
  "#030608",
  "#000000",
];

export function getTheme(
  variant:
    | "ocean"
    | "forest"
    | "warm"
    | "sage"
    | "lavender"
    | "teal"
    | "sunset"
    | "olive"
    | "cyberpunk"
    | "earth"
    | "cherry"
    | "mint"
    | "vibrant"
    | "noir"
    | "aqua"
): MantineThemeOverride {
  const brandColors =
    variant === "ocean"
      ? oceanBrand
      : variant === "forest"
      ? forestBrand
      : variant === "warm"
      ? warmBrand
      : variant === "sage"
      ? sageBrand
      : variant === "lavender"
      ? lavenderBrand
      : variant === "teal"
      ? tealBrand
      : variant === "sunset"
      ? sunsetBrand
      : variant === "olive"
      ? oliveBrand
      : variant === "cyberpunk"
      ? cyberpunkBrand
      : variant === "earth"
      ? earthBrand
      : variant === "cherry"
      ? cherryBrand
      : variant === "mint"
      ? mintBrand
      : variant === "vibrant"
      ? vibrantBrand
      : variant === "noir"
      ? noirBrand
      : aquaBrand;
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
