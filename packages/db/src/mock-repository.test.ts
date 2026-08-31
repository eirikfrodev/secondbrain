import { describe, expect, it } from "vitest";

import { createMockPersistenceRepository } from "./mock-repository";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const otherWorkspaceId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";
const itemId = "44444444-4444-4444-8444-444444444444";
const revisionId = "55555555-5555-4555-8555-555555555555";
const firstGeneratedId = "66666666-6666-4666-8666-666666666666";
const secondGeneratedId = "77777777-7777-4777-8777-777777777777";
const now = new Date("2026-08-31T08:00:00.000Z");

function idSequence(...ids: string[]) {
  const remaining = [...ids];

  return () => {
    const next = remaining.shift();

    if (next === undefined) {
      throw new Error("Mock ID sequence exhausted");
    }

    return next;
  };
}

function createRepository(...ids: string[]) {
  return createMockPersistenceRepository({
    workspaceId,
    userId,
    now: () => new Date(now),
    nextId: idSequence(...ids),
    nextOperatorSync: (current) => new Date(current.getTime() + 60 * 60_000),
    items: [{
      id: itemId,
      workspaceId,
      version: 2,
      currentRevisionId: revisionId
    }],
    sourceHealth: [{
      id: "88888888-8888-4888-8888-888888888888",
      workspaceId,
      sourceKey: "utsikt_operator",
      label: "Utsikt operator",
      status: "healthy",
      message: null,
      lastSuccessAt: now.toISOString(),
      lastCheckedAt: now.toISOString(),
      nextExpectedAt: "2026-08-31T09:00:00.000Z",
      metadata: {}
    }]
  });
}

describe("mock persistence repository", () => {
  it("returns trusted queue fields and cancels by durable job ID", async () => {
    const repository = createRepository(firstGeneratedId);
    const queued = await repository.queueItemAsk({
      itemId,
      instruction: "  Move this to next week  "
    });

    expect(queued).toMatchObject({
      id: firstGeneratedId,
      workspaceId,
      requestedByUserId: userId,
      instruction: "Move this to next week",
      origin: "inline_ask",
      priority: 50,
      status: "queued",
      queuedFor: "2026-08-31T09:00:00.000Z"
    });

    const cancelled = await repository.cancelAiJob({ jobId: queued.id });
    expect(cancelled).toMatchObject({
      id: queued.id,
      status: "cancelled",
      completedAt: now.toISOString()
    });
    await expect(repository.cancelAiJob({ jobId: queued.id })).resolves.toEqual(cancelled);
  });

  it("keeps global Ask operations inside the repository workspace", async () => {
    const repository = createRepository(firstGeneratedId);

    await expect(repository.queueGlobalAsk({
      workspaceId: otherWorkspaceId,
      instruction: "Reassess the week"
    })).rejects.toMatchObject({ code: "forbidden" });

    await expect(repository.queueGlobalAsk({
      workspaceId,
      instruction: "Reassess the week"
    })).resolves.toMatchObject({
      id: firstGeneratedId,
      itemId: null,
      origin: "global_ask"
    });
  });

  it("rejects stale revision expectations after the first append", async () => {
    const repository = createRepository(firstGeneratedId, secondGeneratedId);
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
    })).resolves.toEqual({
      revisionId: firstGeneratedId,
      newVersion: 3
    });

    await expect(repository.appendItemRevision({
      itemId,
      expectedVersion: 2,
      expectedRevisionId: revisionId,
      document,
      sourceRefIds: []
    })).rejects.toMatchObject({ code: "stale_revision" });
  });

  it("rejects unknown items and stale expectations on the first request", async () => {
    const repository = createRepository(firstGeneratedId);
    const unknownItemId = "99999999-9999-4999-8999-999999999999";
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

    await expect(repository.queueItemAsk({
      itemId: unknownItemId,
      instruction: "Move this"
    })).rejects.toMatchObject({ code: "not_found" });
    await expect(repository.appendItemRevision({
      itemId,
      expectedVersion: 1,
      expectedRevisionId: revisionId,
      document,
      sourceRefIds: []
    })).rejects.toMatchObject({ code: "stale_revision" });
  });

  it("returns source health only for its configured workspace", async () => {
    const repository = createRepository();

    await expect(repository.listSourceHealth(workspaceId)).resolves.toMatchObject([
      { workspaceId, sourceKey: "utsikt_operator" }
    ]);
    await expect(repository.listSourceHealth(otherWorkspaceId)).resolves.toEqual([]);
  });

  it("rejects source-health fixtures from another workspace", () => {
    expect(() => createMockPersistenceRepository({
      workspaceId,
      userId,
      sourceHealth: [{
        id: "88888888-8888-4888-8888-888888888888",
        workspaceId: otherWorkspaceId,
        sourceKey: "utsikt_operator",
        label: "Utsikt operator",
        status: "healthy",
        message: null,
        lastSuccessAt: now.toISOString(),
        lastCheckedAt: now.toISOString(),
        nextExpectedAt: null,
        metadata: {}
      }]
    })).toThrow("Mock source health must belong to the configured workspace.");
  });
});
