import type { Metadata } from "next";

import { LiveWorkspaceState } from "@/components/live-workspace-state";
import { TodayDashboard } from "@/components/today-dashboard";
import { requireProductPageAccess } from "@/lib/auth/product-access";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage() {
  const access = await requireProductPageAccess();

  if (access.mode === "supabase") {
    return <LiveWorkspaceState active="today" viewLabel="Today" />;
  }

  return <TodayDashboard />;
}
