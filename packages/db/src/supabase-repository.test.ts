import type { SupabaseClient } from "@supabase/supabase-js";
import type { QueueItemAskInput } from "@utsikt/domain";
import { describe, expect, it, vi } from "vitest";

import { PersistenceError } from "./repository";
import {
  createPersistenceRepositoryFromGateway,
  createSupabasePersistenceGateway,
  createSupabasePersistenceRepository,
  mapPersistenceError
} from "./supabase-repository";
import type {
  PersistenceGateway,
  PersistenceGatewayResult
} from "./supabase-repository";
import type { CoreDatabase } from "./rows";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const itemId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";
const jobId = "44444444-4444-4444-8444-444444444444";
const revisionId = "55555555-5555-4555-8555-555555555555";
const nextRevisionId = "66666666-6666-4666-8666-666666666666";
const now = "2026-08-31T08:00:00.000Z";

const jobRow = {
  id: jobId,
  workspace_id: workspaceId,
  item_id: itemId,
  requested_by_user_id: userId,
  instruction: "Move this to next week",
  origin: "inline_ask",
  priority: 50,
  status: "queued",
  queued_for: "2026-08-31T09:00:00.000Z",
  result_summary: null,
  result_payload: {},
  attempt_count: 0,
  created_at: now,
  started_at: null,
  completed_at: null
};

function emptyResult(): Promise<PersistenceGatewayResult> {
  return Promise.resolve({ data: null, error: null });
}

function createGateway(overrides: Partial<PersistenceGateway> = {}): PersistenceGateway {
  return {
    appendItemRevision: emptyResult,
    queueItemAsk: emptyResult,
    queueGlobalAsk: emptyResult,
    cancelAiJob: emptyResult,
    listSourceHealth: emptyResult,
    ...overrides
  };
}

describe("Supabase persistence repository", () => {
  it("validates and trims an inline Ask before mapping its receipt", async () => {
    const queueItemAsk = vi.fn(async () => ({ data: jobRow, error: null }));
    const repository = createPersistenceRepositoryFromGateway(createGateway({ queueItemAsk }));

    const job = await repository.queueItemAsk({
      itemId,
      instruction: "  Move this to next week  "
    });

    expect(queueItemAsk).toHaveBeenCalledWith({
      target_item_id: itemId,
      job_instruction: "Move this to next week"
    });
    expect(job).toMatchObject({
      id: jobId,
      workspaceId,
      requestedByUserId: userId,
      status: "queued"
    });
  });

  it("rejects malformed input before invoking the gateway", async () => {
    const queueItemAsk = vi.fn(emptyResult);
    const repository = createPersistenceRepositoryFromGateway(createGateway({ queueItemAsk }));
    const invalidInput = {
      itemId: "not-a-uuid",
      instruction: "Do something"
    } as unknown as QueueItemAskInput;

    await expect(repository.queueItemAsk(invalidInput)).rejects.toMatchObject({
      code: "invalid_input"
    });
    expect(queueItemAsk).not.toHaveBeenCalled();
  });

  it("treats malformed database output as an unavailable boundary", async () => {
    const repository = createPersistenceRepositoryFromGateway(createGateway({
      queueItemAsk: async () => ({
        data: { ...jobRow, id: "not-a-uuid" },
        error: null
      })
    }));

    await expect(repository.queueItemAsk({
      itemId,
      instruction: "Move this"
    })).rejects.toMatchObject({ code: "unavailable" });
  });

  it("passes a JSON-safe revision document and concurrency expectations", async () => {
    const appendItemRevision = vi.fn(async () => ({
      data: { revision_id: nextRevisionId, new_version: 3 },
      error: null
    }));
    const repository = createPersistenceRepositoryFromGateway(createGateway({
      appendItemRevision
    }));
    const document = {
      schemaVersion: 1 as const,
      spine: {
        titleLead: "Passport renewal",
        situation: "The renewal window is open.",
        recommendation: null,
        stateLabel: "Needs you",
        sourceLabel: null,
        sourceTime: null
      },
      blocks: [],
      actionIds: [],
      ask: { enabled: true as const }
    };

    await expect(repository.appendItemRevision({
      itemId,
      expectedVersion: 2,
      expectedRevisionId: revisionId,
      document,
      sourceRefIds: []
    })).resolves.toEqual({ revisionId: nextRevisionId, newVersion: 3 });
    expect(appendItemRevision).toHaveBeenCalledWith({
      target_item_id: itemId,
      expected_version: 2,
      expected_revision_id: revisionId,
      next_document: document,
      source_ref_ids: []
    });
  });

  it("maps and orders source-health projections through the domain schema", async () => {
    const listSourceHealth = vi.fn(async () => ({
      data: [{
        id: "77777777-7777-4777-8777-777777777777",
        workspace_id: workspaceId,
        source_key: "utsikt_operator",
        label: "Utsikt operator",
        status: "healthy",
        message: null,
        last_success_at: now,
        last_checked_at: now,
        next_expected_at: "2026-08-31T09:00:00.000Z",
        metadata: {}
      }],
      error: null
    }));
    const repository = createPersistenceRepositoryFromGateway(createGateway({
      listSourceHealth
    }));

    await expect(repository.listSourceHealth(workspaceId)).resolves.toMatchObject([
      { workspaceId, sourceKey: "utsikt_operator", status: "healthy" }
    ]);
    expect(listSourceHealth).toHaveBeenCalledWith(workspaceId);
  });

  it.each([
    ["P0002", undefined, "not_found"],
    ["40001", 500, "stale_revision"],
    ["55000", 500, "invalid_state"],
    ["22023", 400, "invalid_input"],
    ["23503", 409, "invalid_input"],
    ["42501", 403, "forbidden"],
    ["42501", 401, "not_authenticated"],
    ["PGRST301", 500, "not_authenticated"],
    ["PGRST116", 406, "unavailable"],
    ["08006", 500, "unavailable"]
  ] as const)("maps backend code %s to %s", (code, status, expected) => {
    expect(mapPersistenceError({ code, status, message: "raw backend detail" })).toMatchObject({
      code: expected
    });
  });

  it("does not expose raw backend details in its stable error message", async () => {
    const repository = createPersistenceRepositoryFromGateway(createGateway({
      cancelAiJob: async () => ({
        data: null,
        error: { code: "55000", message: "sensitive raw detail" }
      })
    }));

    const error = await repository.cancelAiJob({ jobId }).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(PersistenceError);
    expect((error as PersistenceError).message).toBe(
      "The operation is not valid in the current state."
    );
    expect((error as PersistenceError).message).not.toContain("sensitive");
    expect(JSON.stringify(error)).not.toContain("sensitive");
  });

  it("normalizes transport failures to unavailable", async () => {
    const repository = createPersistenceRepositoryFromGateway(createGateway({
      queueGlobalAsk: async () => {
        throw new Error("network unavailable");
      }
    }));

    await expect(repository.queueGlobalAsk({
      workspaceId,
      instruction: "Reassess the week"
    })).rejects.toMatchObject({ code: "unavailable" });
  });

  it("uses singular RPC receipts at the Supabase transport seam", async () => {
    const single = vi.fn(async () => ({ data: jobRow, error: null, status: 200 }));
    const rpc = vi.fn(() => ({ single }));
    const client = { rpc } as unknown as SupabaseClient<CoreDatabase>;
    const gateway = createSupabasePersistenceGateway(client);

    await expect(gateway.queueItemAsk({
      target_item_id: itemId,
      job_instruction: "Move this"
    })).resolves.toEqual({ data: jobRow, error: null, status: 200 });
    expect(rpc).toHaveBeenCalledWith("queue_item_ask", {
      target_item_id: itemId,
      job_instruction: "Move this"
    });
    expect(single).toHaveBeenCalledOnce();
  });

  it("selects only the source-health presentation fields in stable order", async () => {
    const secondOrder = vi.fn(async () => ({ data: [], error: null, status: 200 }));
    const firstOrder = vi.fn(() => ({ order: secondOrder }));
    const eq = vi.fn(() => ({ order: firstOrder }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const client = { from } as unknown as SupabaseClient<CoreDatabase>;
    const gateway = createSupabasePersistenceGateway(client);

    await expect(gateway.listSourceHealth(workspaceId)).resolves.toEqual({
      data: [],
      error: null,
      status: 200
    });
    expect(from).toHaveBeenCalledWith("source_health");
    expect(select).toHaveBeenCalledWith(
      "id,workspace_id,source_key,label,status,message,last_success_at,last_checked_at,next_expected_at,metadata"
    );
    expect(eq).toHaveBeenCalledWith("workspace_id", workspaceId);
    expect(firstOrder).toHaveBeenCalledWith("label", { ascending: true });
    expect(secondOrder).toHaveBeenCalledWith("source_key", { ascending: true });
  });

  it("carries the HTTP status into authentication error mapping", async () => {
    const single = vi.fn(async () => ({
      data: null,
      error: { code: "42501", message: "permission denied" },
      status: 401
    }));
    const rpc = vi.fn(() => ({ single }));
    const client = { rpc } as unknown as SupabaseClient<CoreDatabase>;
    const repository = createSupabasePersistenceRepository(client);

    await expect(repository.queueItemAsk({
      itemId,
      instruction: "Move this"
    })).rejects.toMatchObject({ code: "not_authenticated" });
  });
});
