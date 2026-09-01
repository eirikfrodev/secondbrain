import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AppendItemRevisionInputSchema,
  CancelAiJobInputSchema,
  QueueGlobalAskInputSchema,
  QueueItemAskInputSchema
} from "@utsikt/domain";
import type {
  AppendItemRevisionInput,
  CancelAiJobInput,
  QueueGlobalAskInput,
  QueueItemAskInput
} from "@utsikt/domain";
import { z } from "zod";

import {
  mapAiJobRow,
  mapItemRevisionReceiptRow,
  mapSourceHealthRow,
  PersistenceError
} from "./repository";
import type { PersistenceRepository } from "./repository";
import type { CoreDatabase, Json } from "./rows";

const SourceHealthColumns = [
  "id",
  "workspace_id",
  "source_key",
  "label",
  "status",
  "message",
  "last_success_at",
  "last_checked_at",
  "next_expected_at",
  "metadata"
].join(",");

const JsonValueSchema: z.ZodType<Json> = z.json();
const WorkspaceIdSchema = z.string().uuid();
const BackendErrorSchema = z.object({
  code: z.string().optional(),
  status: z.number().int().optional()
}).passthrough();

type FunctionName = keyof CoreDatabase["public"]["Functions"];
type FunctionArgs<Name extends FunctionName> = CoreDatabase["public"]["Functions"][Name]["Args"];

export type PersistenceGatewayResult = {
  data: unknown;
  error: unknown;
  status?: number;
};

export interface PersistenceGateway {
  appendItemRevision(
    args: FunctionArgs<"append_item_revision">
  ): Promise<PersistenceGatewayResult>;
  queueItemAsk(args: FunctionArgs<"queue_item_ask">): Promise<PersistenceGatewayResult>;
  queueGlobalAsk(args: FunctionArgs<"queue_global_ask">): Promise<PersistenceGatewayResult>;
  cancelAiJob(args: FunctionArgs<"cancel_ai_job">): Promise<PersistenceGatewayResult>;
  listSourceHealth(workspaceId: string): Promise<PersistenceGatewayResult>;
}

function stableErrorMessage(code: PersistenceError["code"]): string {
  switch (code) {
    case "not_authenticated":
      return "Authentication is required.";
    case "forbidden":
      return "This workspace operation is not allowed.";
    case "not_found":
      return "The requested record was not found.";
    case "invalid_input":
      return "The persistence request is invalid.";
    case "stale_revision":
      return "The item changed before this request completed.";
    case "invalid_state":
      return "The operation is not valid in the current state.";
    case "unavailable":
      return "The persistence service is unavailable.";
  }
}

export function mapPersistenceError(cause: unknown, responseStatus?: number): PersistenceError {
  if (cause instanceof PersistenceError) {
    return cause;
  }

  const parsed = BackendErrorSchema.safeParse(cause);
  const code = parsed.success ? parsed.data.code : undefined;
  const status = responseStatus ?? (parsed.success ? parsed.data.status : undefined);

  let mappedCode: PersistenceError["code"] = "unavailable";

  if (code === "P0002") {
    mappedCode = "not_found";
  } else if (code === "40001") {
    mappedCode = "stale_revision";
  } else if (code === "55000") {
    mappedCode = "invalid_state";
  } else if (
    code?.startsWith("22") ||
    code === "23503" ||
    code === "23505" ||
    code === "23514"
  ) {
    mappedCode = "invalid_input";
  } else if (code === "42501") {
    mappedCode = status === 401 ? "not_authenticated" : "forbidden";
  } else if (code === "PGRST301" || code === "PGRST302" || code === "PGRST303" || status === 401) {
    mappedCode = "not_authenticated";
  } else if (status === 403) {
    mappedCode = "forbidden";
  } else if (
    code?.startsWith("08") ||
    code?.startsWith("53") ||
    code === "PGRST000" ||
    code === "PGRST001" ||
    code === "PGRST002" ||
    code === "PGRST003" ||
    code === "PGRST116" ||
    code === "PGRST202" ||
    code === "PGRST204" ||
    code === "PGRST205" ||
    (status !== undefined && status >= 500)
  ) {
    mappedCode = "unavailable";
  }

  return new PersistenceError(mappedCode, stableErrorMessage(mappedCode), cause);
}

function invalidInput(cause: unknown): PersistenceError {
  return new PersistenceError("invalid_input", stableErrorMessage("invalid_input"), cause);
}

function invalidOutput(cause: unknown): PersistenceError {
  return new PersistenceError("unavailable", stableErrorMessage("unavailable"), cause);
}

function parseInput<Output>(schema: z.ZodType<Output>, input: unknown): Output {
  try {
    return schema.parse(input);
  } catch (cause) {
    throw invalidInput(cause);
  }
}

async function execute<Output>(
  operation: () => Promise<PersistenceGatewayResult>,
  parseOutput: (data: unknown) => Output
): Promise<Output> {
  let result: PersistenceGatewayResult;

  try {
    result = await operation();
  } catch (cause) {
    throw mapPersistenceError(cause);
  }

  if (result.error !== null) {
    throw mapPersistenceError(result.error, result.status);
  }

  try {
    return parseOutput(result.data);
  } catch (cause) {
    throw invalidOutput(cause);
  }
}

export function createPersistenceRepositoryFromGateway(
  gateway: PersistenceGateway
): PersistenceRepository {
  return {
    async appendItemRevision(input: AppendItemRevisionInput) {
      const parsed = parseInput(AppendItemRevisionInputSchema, input);
      const document = parseInput(JsonValueSchema, parsed.document);

      return execute(
        () => gateway.appendItemRevision({
          target_item_id: parsed.itemId,
          expected_version: parsed.expectedVersion,
          expected_revision_id: parsed.expectedRevisionId,
          next_document: document,
          source_ref_ids: parsed.sourceRefIds
        }),
        mapItemRevisionReceiptRow
      );
    },

    async queueItemAsk(input: QueueItemAskInput) {
      const parsed = parseInput(QueueItemAskInputSchema, input);

      return execute(
        () => gateway.queueItemAsk({
          target_workspace_id: parsed.workspaceId,
          target_item_id: parsed.itemId,
          job_instruction: parsed.instruction
        }),
        mapAiJobRow
      );
    },

    async queueGlobalAsk(input: QueueGlobalAskInput) {
      const parsed = parseInput(QueueGlobalAskInputSchema, input);

      return execute(
        () => gateway.queueGlobalAsk({
          target_workspace_id: parsed.workspaceId,
          job_instruction: parsed.instruction
        }),
        mapAiJobRow
      );
    },

    async cancelAiJob(input: CancelAiJobInput) {
      const parsed = parseInput(CancelAiJobInputSchema, input);

      return execute(
        () => gateway.cancelAiJob({
          target_workspace_id: parsed.workspaceId,
          target_job_id: parsed.jobId
        }),
        mapAiJobRow
      );
    },

    async listSourceHealth(workspaceId: string) {
      const parsedWorkspaceId = parseInput(WorkspaceIdSchema, workspaceId);

      return execute(
        () => gateway.listSourceHealth(parsedWorkspaceId),
        (data) => z.array(z.unknown()).parse(data).map(mapSourceHealthRow)
      );
    }
  };
}

export function createSupabasePersistenceGateway(
  client: SupabaseClient<CoreDatabase>
): PersistenceGateway {
  return {
    async appendItemRevision(args) {
      const { data, error, status } = await client.rpc("append_item_revision", args).single();
      return { data, error, status };
    },

    async queueItemAsk(args) {
      const { data, error, status } = await client.rpc("queue_item_ask", args).single();
      return { data, error, status };
    },

    async queueGlobalAsk(args) {
      const { data, error, status } = await client.rpc("queue_global_ask", args).single();
      return { data, error, status };
    },

    async cancelAiJob(args) {
      const { data, error, status } = await client.rpc("cancel_ai_job", args).single();
      return { data, error, status };
    },

    async listSourceHealth(workspaceId) {
      const { data, error, status } = await client
        .from("source_health")
        .select(SourceHealthColumns)
        .eq("workspace_id", workspaceId)
        .order("label", { ascending: true })
        .order("source_key", { ascending: true });

      return { data, error, status };
    }
  };
}

export function createSupabasePersistenceRepository(
  client: SupabaseClient<CoreDatabase>
): PersistenceRepository {
  return createPersistenceRepositoryFromGateway(createSupabasePersistenceGateway(client));
}
