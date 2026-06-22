import type { Metadata } from "next";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/nprogress/styles.css";
import "./globals.css";
import { ColorSchemeScript } from "@mantine/core";
import { ThemeRegistry } from "../theme/ThemeRegistry";
import { AuthProvider } from "../lib/auth";

export const metadata: Metadata = {
  title: "Clever Gateway — Admin",
  description: "Pure middleware for load balancing and routing AI APIs",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
      </head>
      <body>
        <ThemeRegistry>
          <AuthProvider>{children}</AuthProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}

