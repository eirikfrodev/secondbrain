import type { Metadata } from "next";

import { TodayDashboard } from "@/components/today-dashboard";

export const metadata: Metadata = { title: "Today" };

export default function TodayPage() {
  return <TodayDashboard />;
}
