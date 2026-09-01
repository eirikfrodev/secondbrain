import type { SupabaseClient } from "@supabase/supabase-js";
import type { CoreDatabase } from "@utsikt/db";
import { fixtureItems } from "@utsikt/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dependencies = vi.hoisted(() => ({
  getServerRuntimeConfig: vi.fn(),
  createReadOnlyServerSupabaseClient: vi.fn(),
  requireVerifiedSession: vi.fn()
}));

vi.mock("server-only", () => ({}));
vi.mock("../runtime-config.server", () => ({
  getServerRuntimeConfig: dependencies.getServerRuntimeConfig
}));
vi.mock("../supabase/server", () => ({
  createReadOnlyServerSupabaseClient:
    dependencies.createReadOnlyServerSupabaseClient
}));
vi.mock("../auth/session", () => ({
  requireVerifiedSession: dependencies.requireVerifiedSession
}));

import {
  getRequestPersistenceContext,
  getRequestPersistenceRepository
} from "./repository";

const mockUserId = "00000000-0000-4000-8000-000000000002";
const userId = "10000000-0000-4000-8000-000000000001";
const workspaceId = "10000000-0000-4000-8000-000000000002";
const jobId = "10000000-0000-4000-8000-000000000003";
const supabaseUrl = "https://project.supabase.co";

type WorkspaceQueryResult = {
  data: unknown;
  error: unknown;
};

function createLiveClient(result: WorkspaceQueryResult) {
  const limit = vi.fn().mockResolvedValue(result);
  const query = {
    eq: vi.fn(),
    limit
  };
  query.eq.mockReturnValue(query);

  const select = vi.fn().mockReturnValue(query);
  const from = vi.fn().mockReturnValue({ select });
  const single = vi.fn().mockResolvedValue({
    data: {
      id: jobId,
      workspace_id: workspaceId,
      item_id: null,
      requested_by_user_id: userId,
      instruction: "Summarize this workspace",
      origin: "global_ask",
      priority: 50,
      status: "queued",
      queued_for: "2026-09-01T08:05:00.000Z",
      result_summary: null,
      result_payload: {},
      attempt_count: 0,
      created_at: "2026-09-01T08:00:00.000Z",
      started_at: null,
      completed_at: null
    },
    error: null,
    status: 200
  });
  const rpc = vi.fn().mockReturnValue({ single });
  const auth = {};
  const client = { auth, from, rpc } as unknown as SupabaseClient<CoreDatabase>;

  return { client, auth, from, select, query, limit, rpc, single };
}

beforeEach(() => {
  dependencies.getServerRuntimeConfig.mockReset();
  dependencies.createReadOnlyServerSupabaseClient.mockReset();
  dependencies.requireVerifiedSession.mockReset();
});

describe("request persistence context", () => {
  it("shares one fixture-seeded mock repository without constructing a remote client", async () => {
    dependencies.getServerRuntimeConfig.mockReturnValue({ mode: "mock" });

    const first = await getRequestPersistenceContext();
    const second = await getRequestPersistenceContext();
    const repository = await getRequestPersistenceRepository();

    expect(second).toBe(first);
    expect(repository).toBe(first.repository);
    expect(first).toMatchObject({
      mode: "mock",
      userId: mockUserId,
      workspaceId: fixtureItems[0]?.item.workspaceId
    });
    expect(new Set(fixtureItems.map((fixture) => fixture.item.workspaceId))).toHaveLength(1);
    expect(dependencies.createReadOnlyServerSupabaseClient).not.toHaveBeenCalled();
    expect(dependencies.requireVerifiedSession).not.toHaveBeenCalled();

    const jobs = await Promise.all(
      fixtureItems.map((fixture) => first.repository.queueItemAsk({
        workspaceId: first.workspaceId,
        itemId: fixture.item.id,
        instruction: `Review ${fixture.item.id}`
      }))
    );
    const firstJob = jobs[0];

    expect(jobs).toHaveLength(fixtureItems.length);
    expect(jobs.every((job) => job.requestedByUserId === mockUserId)).toBe(true);
    expect(firstJob).toBeDefined();
    await expect(repository.cancelAiJob({
      workspaceId: first.workspaceId,
      jobId: firstJob?.id ?? ""
    })).resolves.toMatchObject({
      id: firstJob?.id,
      status: "cancelled"
    });
  });

  it("uses one live client for verified access, workspace lookup, and the repository", async () => {
    dependencies.getServerRuntimeConfig.mockReturnValue({
      mode: "supabase",
      supabaseUrl,
      publishableKey: "sb_publishable_test"
    });
    const live = createLiveClient({
      data: [{ id: workspaceId, owner_user_id: userId, kind: "personal" }],
      error: null
    });
    dependencies.createReadOnlyServerSupabaseClient.mockResolvedValue(live.client);
    dependencies.requireVerifiedSession.mockResolvedValue({ userId });

    const context = await getRequestPersistenceContext();
    const job = await context.repository.queueGlobalAsk({
      workspaceId,
      instruction: "Summarize this workspace"
    });

    expect(context).toMatchObject({ mode: "supabase", userId, workspaceId });
    expect(job).toMatchObject({ id: jobId, workspaceId, requestedByUserId: userId });
    expect(dependencies.createReadOnlyServerSupabaseClient).toHaveBeenCalledTimes(1);
    expect(dependencies.requireVerifiedSession).toHaveBeenCalledWith(
      live.auth,
      supabaseUrl
    );
    expect(live.from).toHaveBeenCalledWith("workspaces");
    expect(live.select).toHaveBeenCalledWith("id,owner_user_id,kind");
    expect(live.query.eq).toHaveBeenNthCalledWith(1, "owner_user_id", userId);
    expect(live.query.eq).toHaveBeenNthCalledWith(2, "kind", "personal");
    expect(live.limit).toHaveBeenCalledWith(2);
    expect(live.rpc).toHaveBeenCalledWith("queue_global_ask", {
      target_workspace_id: workspaceId,
      job_instruction: "Summarize this workspace"
    });
  });

  it("maps workspace database failures to an unavailable persistence error", async () => {
    dependencies.getServerRuntimeConfig.mockReturnValue({
      mode: "supabase",
      supabaseUrl,
      publishableKey: "sb_publishable_test"
    });
    const live = createLiveClient({ data: null, error: { code: "XX000" } });
    dependencies.createReadOnlyServerSupabaseClient.mockResolvedValue(live.client);
    dependencies.requireVerifiedSession.mockResolvedValue({ userId });

    await expect(getRequestPersistenceContext()).rejects.toMatchObject({
      code: "unavailable",
      message: "The persistence service is unavailable."
    });
  });

  it.each([
    null,
    [],
    [
      { id: workspaceId, owner_user_id: userId, kind: "personal" },
      {
        id: "10000000-0000-4000-8000-000000000004",
        owner_user_id: userId,
        kind: "personal"
      }
    ],
    [{ id: workspaceId, owner_user_id: userId, kind: "work" }],
    [{ id: workspaceId, owner_user_id: mockUserId, kind: "personal" }],
    [{ id: "not-a-uuid", owner_user_id: userId, kind: "personal" }]
  ])("rejects any live workspace result other than one exact personal owner", async (data) => {
    dependencies.getServerRuntimeConfig.mockReturnValue({
      mode: "supabase",
      supabaseUrl,
      publishableKey: "sb_publishable_test"
    });
    const live = createLiveClient({ data, error: null });
    dependencies.createReadOnlyServerSupabaseClient.mockResolvedValue(live.client);
    dependencies.requireVerifiedSession.mockResolvedValue({ userId });

    await expect(getRequestPersistenceContext()).rejects.toMatchObject({
      code: "forbidden"
    });
  });
});
