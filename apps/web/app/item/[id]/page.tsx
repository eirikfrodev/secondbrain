import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ItemDetail } from "@/components/item-detail";
import { LiveWorkspaceState } from "@/components/live-workspace-state";
import { requireProductPageAccess } from "@/lib/auth/product-access";
import { fixtureByShortName } from "@/lib/mock-dashboard";
import { fixtureItems } from "@utsikt/testing";

type ItemPageProps = { params: Promise<{ id: string }> };

function findFixture(id: string) {
  const shortFixture = fixtureByShortName[id as keyof typeof fixtureByShortName];
  return shortFixture ?? fixtureItems.find((fixture) => fixture.item.id === id);
}

export async function generateMetadata({ params }: ItemPageProps): Promise<Metadata> {
  const access = await requireProductPageAccess();

  if (access.mode === "supabase") {
    return { title: "Workspace item" };
  }

  const { id } = await params;
  const fixture = findFixture(id);
  return { title: fixture?.item.titleLead ?? "Item" };
}

export default async function ItemPage({ params }: ItemPageProps) {
  const access = await requireProductPageAccess();

  if (access.mode === "supabase") {
    return <LiveWorkspaceState viewLabel="Item" />;
  }

  const { id } = await params;
  const fixture = findFixture(id);
  if (!fixture) notFound();
  return <ItemDetail fixture={fixture} />;
}
