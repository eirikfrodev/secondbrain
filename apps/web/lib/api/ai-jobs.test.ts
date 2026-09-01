import { PersistenceError } from "@utsikt/db";
import type { PersistenceErrorCode, PersistenceRepository } from "@utsikt/db";
import { AiJobSchema } from "@utsikt/domain";
import type { AiJob } from "@utsikt/domain";
import { describe, expect, it, vi } from "vitest";

import {
  handleCancelAiJob,
  handleGlobalAsk,
  handleItemAsk
} from "./ai-jobs";
import type { AiJobApiDependencies, AiJobMutationContext } from "./ai-jobs";

const appOrigin = "https://utsikt.example";
const userId = "11111111-1111-4111-8111-111111111111";
const otherUserId = "11111111-1111-4111-8111-111111111112";
const workspaceId = "22222222-2222-4222-8222-222222222222";
const otherWorkspaceId = "22222222-2222-4222-8222-222222222223";
const itemId = "33333333-3333-4333-8333-333333333333";
const otherItemId = "33333333-3333-4333-8333-333333333334";
const jobId = "44444444-4444-4444-8444-444444444444";
const otherJobId = "44444444-4444-4444-8444-444444444445";
const queuedFor = "2026-09-01T12:05:00.000Z";
const createdAt = "2026-09-01T12:00:00.000Z";
const completedAt = "2026-09-01T12:01:00.000Z";

function createJob(overrides: Partial<AiJob> = {}): AiJob {
  return AiJobSchema.parse({
    id: jobId,
    workspaceId,
    itemId: null,
    requestedByUserId: userId,
    instruction: "Review the next decision",
    origin: "global_ask",
    priority: 50,
    status: "queued",
    queuedFor,
    resultSummary: null,
    resultPayload: {},
    attemptCount: 0,
    createdAt,
    startedAt: null,
    completedAt: null,
    ...overrides
  });
}

function unusedOperation(): never {
  throw new Error("Unexpected repository operation in test.");
}

function createRepository(
  overrides: Partial<PersistenceRepository> = {}
): PersistenceRepository {
  return {
    async appendItemRevision() {
      return unusedOperation();
    },
    async queueItemAsk() {
      return unusedOperation();
    },
    async queueGlobalAsk() {
      return unusedOperation();
    },
    async cancelAiJob() {
      return unusedOperation();
    },
    async listSourceHealth() {
      return [];
    },
    ...overrides
  };
}

function createDependencies(
  repository: PersistenceRepository,
  contextOverrides: Partial<AiJobMutationContext> = {}
): {
  dependencies: AiJobApiDependencies;
  getContext: ReturnType<typeof vi.fn<() => Promise<AiJobMutationContext>>>;
} {
  const getContext = vi.fn(async (): Promise<AiJobMutationContext> => ({
    mode: "mock",
    userId,
    workspaceId,
    repository,
    ...contextOverrides
  }));

  return {
    dependencies: { appOrigin, getContext },
    getContext
  };
}

function mutationHeaders(includeJson = true): Headers {
  const headers = new Headers({
    Origin: appOrigin,
    "Sec-Fetch-Site": "same-origin"
  });

  if (includeJson) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

function jsonRequest(path: string, body: unknown): Request {
  return new Request(`${appOrigin}${path}`, {
    method: "POST",
    headers: mutationHeaders(),
    body: JSON.stringify(body)
  });
}

function emptyRequest(path: string): Request {
  return new Request(`${appOrigin}${path}`, {
    method: "POST",
    headers: mutationHeaders(false)
  });
}

function persistenceFailure(code: PersistenceErrorCode): PersistenceError {
  return new PersistenceError(
    code,
    "sensitive database detail",
    { token: "service-role-secret" }
  );
}

async function expectError(
  response: Response,
  status: number,
  code: string,
  message: string
): Promise<void> {
  expect(response.status).toBe(status);
  const body = await response.json();
  expect(body).toEqual({ error: { code, message } });
  expect(JSON.stringify(body)).not.toContain("sensitive");
  expect(JSON.stringify(body)).not.toContain("service-role-secret");
}

describe("AI job API boundary", () => {
  it("rejects origin and path boundary failures before resolving context", async () => {
    const { dependencies, getContext } = createDependencies(createRepository());
    const crossOrigin = jsonRequest("/api/ask", { instruction: "Review this" });
    crossOrigin.headers.set("Origin", "https://attacker.example");

    await expectError(
      await handleGlobalAsk(crossOrigin, dependencies),
      400,
      "invalid_request",
      "Invalid request."
    );
    await expectError(
      await handleItemAsk(
        jsonRequest("/api/items/not-a-uuid/ask", { instruction: "Review this" }),
        "not-a-uuid",
        dependencies
      ),
      400,
      "invalid_request",
      "Invalid request."
    );
    await expectError(
      await handleCancelAiJob(
        emptyRequest("/api/ai-jobs/not-a-uuid/cancel"),
        "not-a-uuid",
        dependencies
      ),
      400,
      "invalid_request",
      "Invalid request."
    );

    expect(getContext).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { instruction: "" },
    { instruction: "   " },
    { instruction: "a".repeat(2_001) },
    { instruction: 42 },
    { instruction: "Review this", workspaceId },
    { instruction: "Review this", itemId },
    { instruction: "Review this", jobId },
    { instruction: "Review this", requestedByUserId: userId },
    { instruction: "Review this", origin: "operator" },
    { instruction: "Review this", status: "completed" },
    { instruction: "Review this", resultPayload: { execute: true } }
  ])("rejects invalid or authority-bearing Ask bodies before resolving context", async (body) => {
    const { dependencies, getContext } = createDependencies(createRepository());

    await expectError(
      await handleGlobalAsk(jsonRequest("/api/ask", body), dependencies),
      400,
      "invalid_request",
      "Invalid request."
    );
    expect(getContext).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON and a cancellation body before resolving context", async () => {
    const { dependencies, getContext } = createDependencies(createRepository());
    const malformed = new Request(`${appOrigin}/api/ask`, {
      method: "POST",
      headers: mutationHeaders(),
      body: "{"
    });
    const cancellationWithBody = new Request(
      `${appOrigin}/api/ai-jobs/${jobId}/cancel`,
      {
        method: "POST",
        headers: mutationHeaders(false),
        body: "trusted=false"
      }
    );
    cancellationWithBody.headers.delete("content-type");

    await expectError(
      await handleGlobalAsk(malformed, dependencies),
      400,
      "invalid_request",
      "Invalid request."
    );
    await expectError(
      await handleCancelAiJob(cancellationWithBody, jobId, dependencies),
      400,
      "invalid_request",
      "Invalid request."
    );
    expect(getContext).not.toHaveBeenCalled();
  });
});

describe("AI job API successes", () => {
  it("queues a global Ask with only server-owned workspace context", async () => {
    const queueGlobalAsk = vi.fn(async () => createJob({
      instruction: "Review the next decision"
    }));
    const { dependencies } = createDependencies(createRepository({ queueGlobalAsk }));

    const response = await handleGlobalAsk(
      jsonRequest("/api/ask", { instruction: "  Review the next decision  " }),
      dependencies
    );

    expect(response.status).toBe(201);
    expect(queueGlobalAsk).toHaveBeenCalledExactlyOnceWith({
      workspaceId,
      instruction: "Review the next decision"
    });
    expect(await response.json()).toEqual({
      job: {
        id: jobId,
        itemId: null,
        instruction: "Review the next decision",
        origin: "global_ask",
        status: "queued",
        queuedFor,
        createdAt,
        completedAt: null
      }
    });
  });

  it("queues an item Ask and excludes all trusted and internal job fields", async () => {
    const queueItemAsk = vi.fn(async () => createJob({
      itemId,
      instruction: "Find another slot",
      origin: "inline_ask"
    }));
    const { dependencies } = createDependencies(createRepository({ queueItemAsk }));

    const response = await handleItemAsk(
      jsonRequest(`/api/items/${itemId}/ask`, { instruction: "Find another slot" }),
      itemId,
      dependencies
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(queueItemAsk).toHaveBeenCalledExactlyOnceWith({
      workspaceId,
      itemId,
      instruction: "Find another slot"
    });
    expect(body).toEqual({
      job: {
        id: jobId,
        itemId,
        instruction: "Find another slot",
        origin: "inline_ask",
        status: "queued",
        queuedFor,
        createdAt,
        completedAt: null
      }
    });
    expect(body.job).not.toHaveProperty("workspaceId");
    expect(body.job).not.toHaveProperty("requestedByUserId");
    expect(body.job).not.toHaveProperty("priority");
    expect(body.job).not.toHaveProperty("resultPayload");
    expect(body.job).not.toHaveProperty("attemptCount");
  });

  it("returns the same reduced receipt for an idempotent cancellation", async () => {
    const cancelled = createJob({ status: "cancelled", completedAt });
    const cancelAiJob = vi.fn(async () => cancelled);
    const { dependencies } = createDependencies(createRepository({ cancelAiJob }));

    const first = await handleCancelAiJob(
      emptyRequest(`/api/ai-jobs/${jobId}/cancel`),
      jobId,
      dependencies
    );
    const second = await handleCancelAiJob(
      emptyRequest(`/api/ai-jobs/${jobId}/cancel`),
      jobId,
      dependencies
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await first.json()).toEqual(await second.json());
    expect(cancelAiJob).toHaveBeenCalledTimes(2);
    expect(cancelAiJob).toHaveBeenNthCalledWith(1, { workspaceId, jobId });
    expect(cancelAiJob).toHaveBeenNthCalledWith(2, { workspaceId, jobId });
  });
});

describe("AI job API failure mapping", () => {
  it.each([
    {
      code: "not_authenticated" as const,
      status: 401,
      apiCode: "not_authenticated",
      message: "Authentication is required."
    },
    {
      code: "forbidden" as const,
      status: 403,
      apiCode: "forbidden",
      message: "This operation is not allowed."
    },
    {
      code: "invalid_input" as const,
      status: 400,
      apiCode: "invalid_request",
      message: "Invalid request."
    },
    {
      code: "invalid_state" as const,
      status: 409,
      apiCode: "operator_schedule_unavailable",
      message: "The operator schedule is unavailable."
    },
    {
      code: "unavailable" as const,
      status: 503,
      apiCode: "temporarily_unavailable",
      message: "The service is temporarily unavailable."
    },
    {
      code: "not_found" as const,
      status: 500,
      apiCode: "internal_error",
      message: "The request could not be completed."
    },
    {
      code: "stale_revision" as const,
      status: 500,
      apiCode: "internal_error",
      message: "The request could not be completed."
    }
  ])("maps and redacts global Ask $code failures", async ({
    code,
    status,
    apiCode,
    message
  }) => {
    const queueGlobalAsk = vi.fn(async () => {
      throw persistenceFailure(code);
    });
    const { dependencies } = createDependencies(createRepository({ queueGlobalAsk }));

    await expectError(
      await handleGlobalAsk(
        jsonRequest("/api/ask", { instruction: "Review this" }),
        dependencies
      ),
      status,
      apiCode,
      message
    );
  });

  it.each(["forbidden", "not_found"] as const)(
    "collapses targeted item %s failures to item_not_found",
    async (code) => {
      const queueItemAsk = vi.fn(async () => {
        throw persistenceFailure(code);
      });
      const { dependencies } = createDependencies(createRepository({ queueItemAsk }));

      await expectError(
        await handleItemAsk(
          jsonRequest(`/api/items/${itemId}/ask`, { instruction: "Review this" }),
          itemId,
          dependencies
        ),
        404,
        "item_not_found",
        "The item was not found."
      );
    }
  );

  it.each(["forbidden", "not_found"] as const)(
    "collapses targeted cancellation %s failures to job_not_found",
    async (code) => {
      const cancelAiJob = vi.fn(async () => {
        throw persistenceFailure(code);
      });
      const { dependencies } = createDependencies(createRepository({ cancelAiJob }));

      await expectError(
        await handleCancelAiJob(
          emptyRequest(`/api/ai-jobs/${jobId}/cancel`),
          jobId,
          dependencies
        ),
        404,
        "job_not_found",
        "The AI job was not found."
      );
    }
  );

  it("maps cancellation invalid_state without exposing persistence detail", async () => {
    const cancelAiJob = vi.fn(async () => {
      throw persistenceFailure("invalid_state");
    });
    const { dependencies } = createDependencies(createRepository({ cancelAiJob }));

    await expectError(
      await handleCancelAiJob(
        emptyRequest(`/api/ai-jobs/${jobId}/cancel`),
        jobId,
        dependencies
      ),
      409,
      "job_not_cancellable",
      "The AI job cannot be cancelled."
    );
  });

  it("maps authentication-context and unexpected failures without reflection", async () => {
    const authDependencies: AiJobApiDependencies = {
      appOrigin,
      getContext: vi.fn(async () => {
        throw persistenceFailure("not_authenticated");
      })
    };
    const unexpectedDependencies: AiJobApiDependencies = {
      appOrigin,
      getContext: vi.fn(async () => {
        throw new Error("sensitive runtime detail");
      })
    };

    await expectError(
      await handleGlobalAsk(
        jsonRequest("/api/ask", { instruction: "Review this" }),
        authDependencies
      ),
      401,
      "not_authenticated",
      "Authentication is required."
    );
    const unexpected = await handleGlobalAsk(
      jsonRequest("/api/ask", { instruction: "Review this" }),
      unexpectedDependencies
    );
    expect(unexpected.status).toBe(500);
    const body = await unexpected.json();
    expect(body).toEqual({
      error: {
        code: "internal_error",
        message: "The request could not be completed."
      }
    });
    expect(JSON.stringify(body)).not.toContain("sensitive runtime detail");
  });
});

describe("AI job API repository-output validation", () => {
  it.each([
    createJob({ workspaceId: otherWorkspaceId }),
    createJob({ requestedByUserId: otherUserId }),
    createJob({ itemId }),
    createJob({ instruction: "Different instruction" }),
    createJob({ origin: "inline_ask" }),
    createJob({ status: "working" }),
    createJob({ completedAt })
  ])("fails closed on a global Ask invariant mismatch", async (invalidJob) => {
    const repository = createRepository({
      queueGlobalAsk: vi.fn(async () => invalidJob)
    });
    const { dependencies } = createDependencies(repository);

    await expectError(
      await handleGlobalAsk(
        jsonRequest("/api/ask", { instruction: "Review the next decision" }),
        dependencies
      ),
      503,
      "temporarily_unavailable",
      "The service is temporarily unavailable."
    );
  });

  it.each([
    createJob({ itemId: otherItemId, origin: "inline_ask" }),
    createJob({ itemId, origin: "global_ask" })
  ])("fails closed on an item Ask invariant mismatch", async (invalidJob) => {
    const repository = createRepository({
      queueItemAsk: vi.fn(async () => invalidJob)
    });
    const { dependencies } = createDependencies(repository);

    await expectError(
      await handleItemAsk(
        jsonRequest(`/api/items/${itemId}/ask`, {
          instruction: "Review the next decision"
        }),
        itemId,
        dependencies
      ),
      503,
      "temporarily_unavailable",
      "The service is temporarily unavailable."
    );
  });

  it.each([
    createJob({ id: otherJobId, status: "cancelled", completedAt }),
    createJob({ workspaceId: otherWorkspaceId, status: "cancelled", completedAt }),
    createJob({ requestedByUserId: otherUserId, status: "cancelled", completedAt }),
    createJob({ origin: "operator", status: "cancelled", completedAt }),
    createJob({ itemId, origin: "global_ask", status: "cancelled", completedAt }),
    createJob({ itemId: null, origin: "inline_ask", status: "cancelled", completedAt }),
    createJob({ status: "queued", completedAt: null }),
    createJob({ status: "cancelled", completedAt: null })
  ])("fails closed on a cancellation invariant mismatch", async (invalidJob) => {
    const repository = createRepository({
      cancelAiJob: vi.fn(async () => invalidJob)
    });
    const { dependencies } = createDependencies(repository);

    await expectError(
      await handleCancelAiJob(
        emptyRequest(`/api/ai-jobs/${jobId}/cancel`),
        jobId,
        dependencies
      ),
      503,
      "temporarily_unavailable",
      "The service is temporarily unavailable."
    );
  });

  it("rejects a schema-invalid or over-broad repository object", async () => {
    const repository = createRepository({
      queueGlobalAsk: vi.fn(async () => ({
        ...createJob(),
        serviceRoleKey: "must-never-be-returned"
      }))
    });
    const { dependencies } = createDependencies(repository);

    const response = await handleGlobalAsk(
      jsonRequest("/api/ask", { instruction: "Review the next decision" }),
      dependencies
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: {
        code: "temporarily_unavailable",
        message: "The service is temporarily unavailable."
      }
    });
    expect(JSON.stringify(body)).not.toContain("serviceRoleKey");
    expect(JSON.stringify(body)).not.toContain("must-never-be-returned");
  });
});
