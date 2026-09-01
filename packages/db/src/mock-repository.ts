import { randomUUID } from "node:crypto";

import {
  AiJobSchema,
  AppendItemRevisionInputSchema,
  CancelAiJobInputSchema,
  QueueGlobalAskInputSchema,
  QueueItemAskInputSchema,
  SourceHealthSchema
} from "@utsikt/domain";
import type { AiJob, SourceHealth } from "@utsikt/domain";
import { z } from "zod";

import { PersistenceError } from "./repository";
import type { PersistenceRepository } from "./repository";

const DefaultWorkspaceId = "10000000-0000-4000-8000-000000000001";
const DefaultUserId = "10000000-0000-4000-8000-000000000002";
const UuidSchema = z.string().uuid();
const MockItemSchema = z.strictObject({
  id: UuidSchema,
  workspaceId: UuidSchema,
  version: z.number().int().positive(),
  currentRevisionId: UuidSchema
});

type RevisionState = {
  version: number;
  revisionId: string;
};

export type MockPersistenceRepositoryOptions = {
  workspaceId?: string;
  userId?: string;
  now?: () => Date;
  nextId?: () => string;
  nextOperatorSync?: (now: Date) => Date;
  maxJobs?: number;
  items?: readonly z.input<typeof MockItemSchema>[];
  sourceHealth?: readonly SourceHealth[];
};

function parseInput<Output>(schema: z.ZodType<Output>, input: unknown): Output {
  try {
    return schema.parse(input);
  } catch (cause) {
    throw new PersistenceError("invalid_input", "The persistence request is invalid.", cause);
  }
}

export function createMockPersistenceRepository(
  options: MockPersistenceRepositoryOptions = {}
): PersistenceRepository {
  const workspaceId = UuidSchema.parse(options.workspaceId ?? DefaultWorkspaceId);
  const userId = UuidSchema.parse(options.userId ?? DefaultUserId);
  const now = options.now ?? (() => new Date());
  const nextId = options.nextId ?? randomUUID;
  const nextOperatorSync = options.nextOperatorSync ?? ((current) => new Date(current.getTime() + 5 * 60_000));
  const maxJobs = z.number().int().positive().max(10_000).parse(
    options.maxJobs ?? 1_000
  );
  const items = z.array(MockItemSchema).parse(options.items ?? []);
  const sourceHealth = z.array(SourceHealthSchema).parse(options.sourceHealth ?? []);
  const jobs = new Map<string, AiJob>();
  const revisions = new Map<string, RevisionState>();

  if (items.some((item) => item.workspaceId !== workspaceId)) {
    throw new PersistenceError(
      "invalid_input",
      "Mock items must belong to the configured workspace."
    );
  }

  if (new Set(items.map((item) => item.id)).size !== items.length) {
    throw new PersistenceError("invalid_input", "Mock item IDs must be unique.");
  }

  if (sourceHealth.some((health) => health.workspaceId !== workspaceId)) {
    throw new PersistenceError(
      "invalid_input",
      "Mock source health must belong to the configured workspace."
    );
  }

  for (const item of items) {
    revisions.set(item.id, {
      version: item.version,
      revisionId: item.currentRevisionId
    });
  }

  function createJob(input: {
    itemId: string | null;
    instruction: string;
    origin: "inline_ask" | "global_ask";
  }): AiJob {
    if (jobs.size >= maxJobs) {
      throw new PersistenceError(
        "unavailable",
        "The process-local mock queue has reached its capacity."
      );
    }

    const createdAt = now();
    const job = AiJobSchema.parse({
      id: UuidSchema.parse(nextId()),
      workspaceId,
      itemId: input.itemId,
      requestedByUserId: userId,
      instruction: input.instruction,
      origin: input.origin,
      priority: 50,
      status: "queued",
      queuedFor: nextOperatorSync(createdAt).toISOString(),
      resultSummary: null,
      resultPayload: {},
      attemptCount: 0,
      createdAt: createdAt.toISOString(),
      startedAt: null,
      completedAt: null
    });

    jobs.set(job.id, job);
    return job;
  }

  return {
    async appendItemRevision(input) {
      const parsed = parseInput(AppendItemRevisionInputSchema, input);
      parseInput(z.json(), parsed.document);
      const current = revisions.get(parsed.itemId);

      if (current === undefined) {
        throw new PersistenceError("not_found", "The requested record was not found.");
      }

      if (
        (current.version !== parsed.expectedVersion || current.revisionId !== parsed.expectedRevisionId)
      ) {
        throw new PersistenceError(
          "stale_revision",
          "The item changed before this request completed."
        );
      }

      const receipt = {
        revisionId: UuidSchema.parse(nextId()),
        newVersion: parsed.expectedVersion + 1
      };

      revisions.set(parsed.itemId, {
        version: receipt.newVersion,
        revisionId: receipt.revisionId
      });

      return receipt;
    },

    async queueItemAsk(input) {
      const parsed = parseInput(QueueItemAskInputSchema, input);

      if (parsed.workspaceId !== workspaceId) {
        throw new PersistenceError("forbidden", "This workspace operation is not allowed.");
      }

      if (!revisions.has(parsed.itemId)) {
        throw new PersistenceError("not_found", "The requested record was not found.");
      }

      return createJob({
        itemId: parsed.itemId,
        instruction: parsed.instruction,
        origin: "inline_ask"
      });
    },

    async queueGlobalAsk(input) {
      const parsed = parseInput(QueueGlobalAskInputSchema, input);

      if (parsed.workspaceId !== workspaceId) {
        throw new PersistenceError("forbidden", "This workspace operation is not allowed.");
      }

      return createJob({
        itemId: null,
        instruction: parsed.instruction,
        origin: "global_ask"
      });
    },

    async cancelAiJob(input) {
      const parsed = parseInput(CancelAiJobInputSchema, input);

      if (parsed.workspaceId !== workspaceId) {
        throw new PersistenceError("forbidden", "This workspace operation is not allowed.");
      }

      const current = jobs.get(parsed.jobId);

      if (current === undefined) {
        throw new PersistenceError("not_found", "The requested record was not found.");
      }

      if (current.requestedByUserId !== userId) {
        throw new PersistenceError("forbidden", "This workspace operation is not allowed.");
      }

      if (current.status === "cancelled") {
        return current;
      }

      if (current.status !== "queued") {
        throw new PersistenceError("invalid_state", "The operation is not valid in the current state.");
      }

      const cancelled = AiJobSchema.parse({
        ...current,
        status: "cancelled",
        completedAt: now().toISOString()
      });
      jobs.set(cancelled.id, cancelled);
      return cancelled;
    },

    async listSourceHealth(requestedWorkspaceId) {
      const parsedWorkspaceId = parseInput(UuidSchema, requestedWorkspaceId);
      return parsedWorkspaceId === workspaceId ? sourceHealth : [];
    }
  };
}
