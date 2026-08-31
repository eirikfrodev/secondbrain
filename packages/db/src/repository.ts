import {
  AiJobSchema,
  ItemRevisionReceiptSchema,
  SourceHealthSchema
} from "@utsikt/domain";
import type {
  AiJob,
  AppendItemRevisionInput,
  CancelAiJobInput,
  ItemRevisionReceipt,
  QueueGlobalAskInput,
  QueueItemAskInput,
  SourceHealth
} from "@utsikt/domain";

import {
  AiJobRowSchema,
  ItemRevisionReceiptRowSchema,
  SourceHealthProjectionSchema
} from "./rows";

export type PersistenceErrorCode =
  | "not_authenticated"
  | "forbidden"
  | "not_found"
  | "invalid_input"
  | "stale_revision"
  | "invalid_state"
  | "unavailable";

export class PersistenceError extends Error {
  constructor(
    readonly code: PersistenceErrorCode,
    message: string,
    cause?: unknown
  ) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "PersistenceError";
  }
}

export interface PersistenceRepository {
  appendItemRevision(input: AppendItemRevisionInput): Promise<ItemRevisionReceipt>;
  queueItemAsk(input: QueueItemAskInput): Promise<AiJob>;
  queueGlobalAsk(input: QueueGlobalAskInput): Promise<AiJob>;
  cancelAiJob(input: CancelAiJobInput): Promise<AiJob>;
  listSourceHealth(workspaceId: string): Promise<readonly SourceHealth[]>;
}

export function mapAiJobRow(row: unknown): AiJob {
  const parsedRow = AiJobRowSchema.parse(row);

  return AiJobSchema.parse({
    id: parsedRow.id,
    workspaceId: parsedRow.workspace_id,
    itemId: parsedRow.item_id,
    requestedByUserId: parsedRow.requested_by_user_id,
    instruction: parsedRow.instruction,
    origin: parsedRow.origin,
    priority: parsedRow.priority,
    status: parsedRow.status,
    queuedFor: parsedRow.queued_for,
    resultSummary: parsedRow.result_summary,
    resultPayload: parsedRow.result_payload,
    attemptCount: parsedRow.attempt_count,
    createdAt: parsedRow.created_at,
    startedAt: parsedRow.started_at,
    completedAt: parsedRow.completed_at
  });
}

export function mapSourceHealthRow(row: unknown): SourceHealth {
  const parsedRow = SourceHealthProjectionSchema.parse(row);

  return SourceHealthSchema.parse({
    id: parsedRow.id,
    workspaceId: parsedRow.workspace_id,
    sourceKey: parsedRow.source_key,
    label: parsedRow.label,
    status: parsedRow.status,
    message: parsedRow.message,
    lastSuccessAt: parsedRow.last_success_at,
    lastCheckedAt: parsedRow.last_checked_at,
    nextExpectedAt: parsedRow.next_expected_at,
    metadata: parsedRow.metadata
  });
}

export function mapItemRevisionReceiptRow(row: unknown): ItemRevisionReceipt {
  const parsedRow = ItemRevisionReceiptRowSchema.parse(row);

  return ItemRevisionReceiptSchema.parse({
    revisionId: parsedRow.revision_id,
    newVersion: parsedRow.new_version
  });
}
