import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ItemDetail } from "@/components/item-detail";
import { fixtureByShortName } from "@/lib/mock-dashboard";
import { fixtureItems } from "@utsikt/testing";

type ItemPageProps = { params: Promise<{ id: string }> };

function findFixture(id: string) {
  const shortFixture = fixtureByShortName[id as keyof typeof fixtureByShortName];
  return shortFixture ?? fixtureItems.find((fixture) => fixture.item.id === id);
}

export async function generateMetadata({ params }: ItemPageProps): Promise<Metadata> {
  const { id } = await params;
  const fixture = findFixture(id);
  return { title: fixture?.item.titleLead ?? "Item" };
}

export default async function ItemPage({ params }: ItemPageProps) {
  const { id } = await params;
  const fixture = findFixture(id);
  if (!fixture) notFound();
  return <ItemDetail fixture={fixture} />;
}
