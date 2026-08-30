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

import type { AiJobRow, ItemRevisionReceiptRow, SourceHealthRow } from "./rows";

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
    readonly cause?: unknown
  ) {
    super(message);
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

export function mapAiJobRow(row: AiJobRow): AiJob {
  return AiJobSchema.parse({
    id: row.id,
    workspaceId: row.workspace_id,
    itemId: row.item_id,
    requestedByUserId: row.requested_by_user_id,
    instruction: row.instruction,
    origin: row.origin,
    priority: row.priority,
    status: row.status,
    queuedFor: row.queued_for,
    resultSummary: row.result_summary,
    resultPayload: row.result_payload,
    attemptCount: row.attempt_count,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at
  });
}

export function mapSourceHealthRow(row: SourceHealthRow): SourceHealth {
  return SourceHealthSchema.parse({
    id: row.id,
    workspaceId: row.workspace_id,
    sourceKey: row.source_key,
    label: row.label,
    status: row.status,
    message: row.message,
    lastSuccessAt: row.last_success_at,
    lastCheckedAt: row.last_checked_at,
    nextExpectedAt: row.next_expected_at,
    metadata: row.metadata
  });
}

export function mapItemRevisionReceiptRow(row: ItemRevisionReceiptRow): ItemRevisionReceipt {
  return ItemRevisionReceiptSchema.parse({
    revisionId: row.revision_id,
    newVersion: row.new_version
  });
}
