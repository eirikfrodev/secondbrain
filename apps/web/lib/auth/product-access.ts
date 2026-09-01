import "server-only";

import type { CoreDatabase } from "@utsikt/db";
import { PersistenceError } from "@utsikt/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getServerRuntimeConfig } from "../runtime-config.server";
import { createReadOnlyServerSupabaseClient } from "../supabase/server";
import {
  evaluateProductPageAccess,
  isProductAccessRedirectError
} from "./product-access-policy";
import type { ProductPageAccess } from "./product-access-policy";
import { requireVerifiedSession } from "./session";

async function findPersonalWorkspace(
  client: SupabaseClient<CoreDatabase>,
  userId: string
): Promise<unknown> {
  const { data, error } = await client
    .from("workspaces")
    .select("id,owner_user_id,kind")
    .eq("owner_user_id", userId)
    .eq("kind", "personal")
    .limit(1)
    .maybeSingle();

  if (error !== null) {
    throw new PersistenceError(
      "unavailable",
      "Product access could not be verified.",
      error
    );
  }

  return data;
}

const resolveProductPageAccess = cache(async (): Promise<ProductPageAccess> => {
  const config = getServerRuntimeConfig();

  if (config.mode === "mock") {
    return { mode: "mock", liveAuthenticated: false };
  }

  let clientPromise: Promise<SupabaseClient<CoreDatabase>> | undefined;

  function getClient(): Promise<SupabaseClient<CoreDatabase>> {
    clientPromise ??= createReadOnlyServerSupabaseClient();
    return clientPromise;
  }

  return evaluateProductPageAccess(config, {
    async requireSession() {
      const client = await getClient();
      return requireVerifiedSession(client.auth, config.supabaseUrl);
    },
    async findPersonalWorkspace(userId) {
      return findPersonalWorkspace(await getClient(), userId);
    }
  });
});

export async function requireProductPageAccess(): Promise<ProductPageAccess> {
  try {
    return await resolveProductPageAccess();
  } catch (error) {
    if (isProductAccessRedirectError(error)) {
      redirect("/sign-in");
    }

    throw error;
  }
}
