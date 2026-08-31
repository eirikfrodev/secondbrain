import "server-only";

import {
  createMockPersistenceRepository,
  createSupabasePersistenceRepository
} from "@utsikt/db";
import type { PersistenceRepository } from "@utsikt/db";

import { requireVerifiedSession } from "../auth/session";
import { getServerRuntimeConfig } from "../runtime-config.server";
import { createReadOnlyServerSupabaseClient } from "../supabase/server";

const mockRepository = createMockPersistenceRepository();

export async function getRequestPersistenceRepository(): Promise<PersistenceRepository> {
  const config = getServerRuntimeConfig();

  if (config.mode === "mock") {
    return mockRepository;
  }

  const client = await createReadOnlyServerSupabaseClient();
  await requireVerifiedSession(client.auth, config.supabaseUrl);
  return createSupabasePersistenceRepository(client);
}
