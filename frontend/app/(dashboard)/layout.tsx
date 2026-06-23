"use client";

import { AppShell } from "@mantine/core";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar, Topbar, PageTransition } from "../../components/layout";
import { useAuth } from "../../lib/auth";

const titleMap: Record<string, string> = {
  "/": "Dashboard",
  "/providers": "Providers Management",
  "/models": "Models & Routing",
  "/users": "Users & Teams",
  "/keys": "Virtual Keys",
  "/spend": "Spend & Cost",
  "/monitoring": "Monitoring / Audit",
  "/logs": "System Logs",
  "/cache": "Cache Management",
  "/settings": "Settings",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return null;
  }

  const title = titleMap[pathname] ?? "Clever Gateway";

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 260, breakpoint: "sm" }}
      padding="lg"
    >
      {/* Decorative floating orbs — pure CSS, GPU-accelerated, non-interactive */}
      <div className="cg-orb cg-orb-1" aria-hidden />
      <div className="cg-orb cg-orb-2" aria-hidden />

      <Topbar title={title} />
      <Sidebar />
      <AppShell.Main>
        <PageTransition>{children}</PageTransition>
      </AppShell.Main>
    </AppShell>
  );
}
