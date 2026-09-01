import "server-only";

import {
  createMockPersistenceRepository,
  createSupabasePersistenceRepository,
  PersistenceError,
  WorkspaceAccessRowSchema
} from "@utsikt/db";
import type { PersistenceRepository } from "@utsikt/db";
import { fixtureItems } from "@utsikt/testing";

import { requireVerifiedSession } from "../auth/session";
import { getServerRuntimeConfig } from "../runtime-config.server";
import { createReadOnlyServerSupabaseClient } from "../supabase/server";

const MockUserId = "00000000-0000-4000-8000-000000000002";
const MockContextGlobalKey = "__utsiktMockPersistenceContext";
const WorkspaceColumns = "id,owner_user_id,kind";

export type RequestPersistenceContext = {
  mode: "mock" | "supabase";
  userId: string;
  workspaceId: string;
  repository: PersistenceRepository;
};

type UtsiktGlobal = typeof globalThis & {
  [MockContextGlobalKey]?: RequestPersistenceContext;
};

function forbiddenWorkspace(): PersistenceError {
  return new PersistenceError(
    "forbidden",
    "A personal workspace is required to access this resource."
  );
}

function createMockRequestPersistenceContext(): RequestPersistenceContext {
  const workspaceIds = new Set(
    fixtureItems.map((fixture) => fixture.item.workspaceId)
  );

  if (workspaceIds.size !== 1) {
    throw new PersistenceError(
      "invalid_input",
      "Mock fixtures must belong to exactly one workspace."
    );
  }

  const workspaceId = workspaceIds.values().next().value;

  if (workspaceId === undefined) {
    throw new PersistenceError(
      "invalid_input",
      "Mock fixtures must belong to exactly one workspace."
    );
  }

  const repository = createMockPersistenceRepository({
    workspaceId,
    userId: MockUserId,
    maxJobs: 256,
    items: fixtureItems.map((fixture) => ({
      id: fixture.item.id,
      workspaceId: fixture.item.workspaceId,
      version: fixture.item.version,
      currentRevisionId: fixture.item.currentRevisionId
    }))
  });

  return {
    mode: "mock",
    userId: MockUserId,
    workspaceId,
    repository
  };
}

function getMockRequestPersistenceContext(): RequestPersistenceContext {
  const sharedGlobal = globalThis as UtsiktGlobal;
  const existing = sharedGlobal[MockContextGlobalKey];

  if (existing !== undefined) {
    return existing;
  }

  const context = createMockRequestPersistenceContext();
  sharedGlobal[MockContextGlobalKey] = context;
  return context;
}

export async function getRequestPersistenceContext(): Promise<RequestPersistenceContext> {
  const config = getServerRuntimeConfig();

  if (config.mode === "mock") {
    return getMockRequestPersistenceContext();
  }

  const client = await createReadOnlyServerSupabaseClient();
  const session = await requireVerifiedSession(client.auth, config.supabaseUrl);
  const { data, error } = await client
    .from("workspaces")
    .select(WorkspaceColumns)
    .eq("owner_user_id", session.userId)
    .eq("kind", "personal")
    .limit(2);

  if (error !== null) {
    throw new PersistenceError(
      "unavailable",
      "The persistence service is unavailable.",
      error
    );
  }

  const workspaces = WorkspaceAccessRowSchema.array().safeParse(data);

  if (
    !workspaces.success ||
    workspaces.data.length !== 1 ||
    workspaces.data[0]?.kind !== "personal" ||
    workspaces.data[0].owner_user_id !== session.userId
  ) {
    throw forbiddenWorkspace();
  }

  return {
    mode: "supabase",
    userId: session.userId,
    workspaceId: workspaces.data[0].id,
    repository: createSupabasePersistenceRepository(client)
  };
}

export async function getRequestPersistenceRepository(): Promise<PersistenceRepository> {
  return (await getRequestPersistenceContext()).repository;
}
