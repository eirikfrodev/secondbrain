import "server-only";

import { PersistenceError } from "@utsikt/db";

import type { ClaimsProvider, VerifiedSession } from "./claims";
import { readVerifiedSession } from "./claims";

export async function requireVerifiedSession(
  provider: ClaimsProvider,
  supabaseUrl: string
): Promise<VerifiedSession> {
  const session = await readVerifiedSession(provider, supabaseUrl);

  if (session === null) {
    throw new PersistenceError("not_authenticated", "Authentication is required.");
  }

  return session;
}
