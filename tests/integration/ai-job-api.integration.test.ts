import { describe, expect, it } from "vitest";

import { createMockPersistenceRepository } from "@utsikt/db";

import {
  handleCancelAiJob,
  handleGlobalAsk,
  handleItemAsk
} from "../../apps/web/lib/api/ai-jobs";

const appOrigin = "https://utsikt.example";
const workspaceId = "11111111-1111-4111-8111-111111111111";
const userId = "33333333-3333-4333-8333-333333333333";
const itemId = "44444444-4444-4444-8444-444444444444";
const revisionId = "55555555-5555-4555-8555-555555555555";
const inlineJobId = "66666666-6666-4666-8666-666666666666";
const globalJobId = "77777777-7777-4777-8777-777777777777";
const unknownId = "99999999-9999-4999-8999-999999999999";
const now = new Date("2026-09-01T09:00:00.000Z");

function nextIdSequence(...ids: string[]) {
  const remaining = [...ids];

  return () => {
    const next = remaining.shift();
    if (next === undefined) {
      throw new Error("Integration ID sequence exhausted.");
    }
    return next;
  };
}

function mutationRequest(pathname: string, body?: unknown): Request {
  const hasBody = body !== undefined;

  return new Request(`${appOrigin}${pathname}`, {
    method: "POST",
    headers: {
      Origin: appOrigin,
      "Sec-Fetch-Site": "same-origin",
      ...(hasBody ? { "Content-Type": "application/json" } : {})
    },
    body: hasBody ? JSON.stringify(body) : undefined
  });
}

describe("AI job HTTP lifecycle over the mock repository", () => {
  it("queues inline/global Ask jobs and cancels them idempotently", async () => {
    const repository = createMockPersistenceRepository({
      workspaceId,
      userId,
      now: () => new Date(now),
      nextId: nextIdSequence(inlineJobId, globalJobId),
      nextOperatorSync: (current) => new Date(current.getTime() + 5 * 60_000),
      items: [{
        id: itemId,
        workspaceId,
        version: 1,
        currentRevisionId: revisionId
      }]
    });
    const dependencies = {
      appOrigin,
      async getContext() {
        return { mode: "mock" as const, userId, workspaceId, repository };
      }
    };

    const inline = await handleItemAsk(
      mutationRequest(`/api/items/${itemId}/ask`, {
        instruction: "  Reassess this next week  "
      }),
      itemId,
      dependencies
    );
    expect(inline.status).toBe(201);
    await expect(inline.json()).resolves.toEqual({
      job: {
        id: inlineJobId,
        itemId,
        instruction: "Reassess this next week",
        origin: "inline_ask",
        status: "queued",
        queuedFor: "2026-09-01T09:05:00.000Z",
        createdAt: now.toISOString(),
        completedAt: null
      }
    });

    const cancelPath = `/api/ai-jobs/${inlineJobId}/cancel`;
    const cancelled = await handleCancelAiJob(
      mutationRequest(cancelPath),
      inlineJobId,
      dependencies
    );
    const repeated = await handleCancelAiJob(
      mutationRequest(cancelPath),
      inlineJobId,
      dependencies
    );
    expect(cancelled.status).toBe(200);
    expect(repeated.status).toBe(200);
    await expect(repeated.json()).resolves.toMatchObject({
      job: {
        id: inlineJobId,
        status: "cancelled",
        completedAt: now.toISOString()
      }
    });

    const global = await handleGlobalAsk(
      mutationRequest("/api/ask", { instruction: "Reassess the week" }),
      dependencies
    );
    expect(global.status).toBe(201);
    await expect(global.json()).resolves.toMatchObject({
      job: {
        id: globalJobId,
        itemId: null,
        origin: "global_ask",
        status: "queued"
      }
    });

    const cancelledGlobal = await handleCancelAiJob(
      mutationRequest(`/api/ai-jobs/${globalJobId}/cancel`),
      globalJobId,
      dependencies
    );
    expect(cancelledGlobal.status).toBe(200);

    const unknownItem = await handleItemAsk(
      mutationRequest(`/api/items/${unknownId}/ask`, { instruction: "Unknown" }),
      unknownId,
      dependencies
    );
    const unknownJob = await handleCancelAiJob(
      mutationRequest(`/api/ai-jobs/${unknownId}/cancel`),
      unknownId,
      dependencies
    );
    expect(unknownItem.status).toBe(404);
    await expect(unknownItem.json()).resolves.toMatchObject({
      error: { code: "item_not_found" }
    });
    expect(unknownJob.status).toBe(404);
    await expect(unknownJob.json()).resolves.toMatchObject({
      error: { code: "job_not_found" }
    });
  });
});
