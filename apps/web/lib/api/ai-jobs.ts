import { PersistenceError } from "@utsikt/db";
import type { PersistenceRepository } from "@utsikt/db";
import { AiJobSchema, AskInstructionSchema } from "@utsikt/domain";
import type { AiJob } from "@utsikt/domain";
import { z } from "zod";

import {
  apiErrorResponse,
  apiJsonResponse,
  readJsonMutationBody,
  requireEmptyMutationBody,
  validateMutationRequest
} from "./browser-mutation";

const UuidSchema = z.string().uuid();
const AskBodySchema = z.strictObject({
  instruction: AskInstructionSchema
});

type AiJobOperation = "global_ask" | "item_ask" | "cancel";

export type AiJobMutationContext = {
  mode: "mock" | "supabase";
  userId: string;
  workspaceId: string;
  repository: PersistenceRepository;
};

export type AiJobApiDependencies = {
  appOrigin: string;
  getContext(): Promise<AiJobMutationContext>;
};

function invalidRequestResponse(): Response {
  return apiErrorResponse(400, "invalid_request", "Invalid request.");
}

function unavailableResponse(): Response {
  return apiErrorResponse(
    503,
    "temporarily_unavailable",
    "The service is temporarily unavailable."
  );
}

function failureResponse(cause: unknown, operation: AiJobOperation): Response {
  if (!(cause instanceof PersistenceError)) {
    return apiErrorResponse(500, "internal_error", "The request could not be completed.");
  }

  switch (cause.code) {
    case "not_authenticated":
      return apiErrorResponse(401, "not_authenticated", "Authentication is required.");
    case "forbidden":
      if (operation === "item_ask") {
        return apiErrorResponse(404, "item_not_found", "The item was not found.");
      }

      if (operation === "cancel") {
        return apiErrorResponse(404, "job_not_found", "The AI job was not found.");
      }

      return apiErrorResponse(403, "forbidden", "This operation is not allowed.");
    case "not_found":
      if (operation === "item_ask") {
        return apiErrorResponse(404, "item_not_found", "The item was not found.");
      }

      if (operation === "cancel") {
        return apiErrorResponse(404, "job_not_found", "The AI job was not found.");
      }

      return apiErrorResponse(500, "internal_error", "The request could not be completed.");
    case "invalid_input":
      return invalidRequestResponse();
    case "invalid_state":
      if (operation === "cancel") {
        return apiErrorResponse(
          409,
          "job_not_cancellable",
          "The AI job cannot be cancelled."
        );
      }

      return apiErrorResponse(
        409,
        "operator_schedule_unavailable",
        "The operator schedule is unavailable."
      );
    case "unavailable":
      return unavailableResponse();
    case "stale_revision":
      return apiErrorResponse(500, "internal_error", "The request could not be completed.");
  }
}

function parseJob(value: unknown): AiJob | null {
  const parsed = AiJobSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function hasQueuedJobInvariants(
  job: AiJob,
  context: AiJobMutationContext,
  expected: {
    itemId: string | null;
    instruction: string;
    origin: "inline_ask" | "global_ask";
  }
): boolean {
  return (
    job.workspaceId === context.workspaceId &&
    job.requestedByUserId === context.userId &&
    job.itemId === expected.itemId &&
    job.instruction === expected.instruction &&
    job.origin === expected.origin &&
    job.status === "queued" &&
    job.completedAt === null
  );
}

function hasCancelledJobInvariants(
  job: AiJob,
  context: AiJobMutationContext,
  expectedJobId: string
): boolean {
  const hasUserAskShape =
    (job.origin === "global_ask" && job.itemId === null) ||
    (job.origin === "inline_ask" && job.itemId !== null);

  return (
    job.id === expectedJobId &&
    job.workspaceId === context.workspaceId &&
    job.requestedByUserId === context.userId &&
    hasUserAskShape &&
    job.status === "cancelled" &&
    job.completedAt !== null
  );
}

function jobReceipt(job: AiJob) {
  return {
    job: {
      id: job.id,
      itemId: job.itemId,
      instruction: job.instruction,
      origin: job.origin,
      status: job.status,
      queuedFor: job.queuedFor,
      createdAt: job.createdAt,
      completedAt: job.completedAt
    }
  };
}

async function readAskBody(request: Request): Promise<
  | { instruction: string; response?: never }
  | { response: Response; instruction?: never }
> {
  const body = await readJsonMutationBody(request);

  if (body.response !== undefined) {
    return { response: body.response };
  }

  const parsed = AskBodySchema.safeParse(body.data);
  if (!parsed.success) {
    return { response: invalidRequestResponse() };
  }

  return { instruction: parsed.data.instruction };
}

export async function handleGlobalAsk(
  request: Request,
  dependencies: AiJobApiDependencies
): Promise<Response> {
  const boundaryFailure = validateMutationRequest(
    request,
    dependencies.appOrigin,
    "/api/ask"
  );
  if (boundaryFailure !== null) {
    return boundaryFailure;
  }

  const body = await readAskBody(request);
  if (body.response !== undefined) {
    return body.response;
  }

  try {
    const context = await dependencies.getContext();
    const result = await context.repository.queueGlobalAsk({
      workspaceId: context.workspaceId,
      instruction: body.instruction
    });
    const job = parseJob(result);

    if (
      job === null ||
      !hasQueuedJobInvariants(job, context, {
        itemId: null,
        instruction: body.instruction,
        origin: "global_ask"
      })
    ) {
      return unavailableResponse();
    }

    return apiJsonResponse(jobReceipt(job), 201);
  } catch (cause) {
    return failureResponse(cause, "global_ask");
  }
}

export async function handleItemAsk(
  request: Request,
  rawItemId: string,
  dependencies: AiJobApiDependencies
): Promise<Response> {
  const itemId = UuidSchema.safeParse(rawItemId);
  if (!itemId.success) {
    return invalidRequestResponse();
  }

  const boundaryFailure = validateMutationRequest(
    request,
    dependencies.appOrigin,
    `/api/items/${itemId.data}/ask`
  );
  if (boundaryFailure !== null) {
    return boundaryFailure;
  }

  const body = await readAskBody(request);
  if (body.response !== undefined) {
    return body.response;
  }

  try {
    const context = await dependencies.getContext();
    const result = await context.repository.queueItemAsk({
      itemId: itemId.data,
      instruction: body.instruction
    });
    const job = parseJob(result);

    if (
      job === null ||
      !hasQueuedJobInvariants(job, context, {
        itemId: itemId.data,
        instruction: body.instruction,
        origin: "inline_ask"
      })
    ) {
      return unavailableResponse();
    }

    return apiJsonResponse(jobReceipt(job), 201);
  } catch (cause) {
    return failureResponse(cause, "item_ask");
  }
}

export async function handleCancelAiJob(
  request: Request,
  rawJobId: string,
  dependencies: AiJobApiDependencies
): Promise<Response> {
  const jobId = UuidSchema.safeParse(rawJobId);
  if (!jobId.success) {
    return invalidRequestResponse();
  }

  const boundaryFailure = validateMutationRequest(
    request,
    dependencies.appOrigin,
    `/api/ai-jobs/${jobId.data}/cancel`
  );
  if (boundaryFailure !== null) {
    return boundaryFailure;
  }

  const bodyFailure = await requireEmptyMutationBody(request);
  if (bodyFailure !== null) {
    return bodyFailure;
  }

  try {
    const context = await dependencies.getContext();
    const result = await context.repository.cancelAiJob({ jobId: jobId.data });
    const job = parseJob(result);

    if (job === null || !hasCancelledJobInvariants(job, context, jobId.data)) {
      return unavailableResponse();
    }

    return apiJsonResponse(jobReceipt(job), 200);
  } catch (cause) {
    return failureResponse(cause, "cancel");
  }
}
