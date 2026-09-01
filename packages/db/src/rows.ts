import { z } from "zod";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export const WorkspaceAccessRowSchema = z.strictObject({
  id: z.string().uuid(),
  owner_user_id: z.string().uuid(),
  kind: z.enum(["personal", "work"])
});

export const AiJobRowSchema = z.strictObject({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  item_id: z.string().uuid().nullable(),
  requested_by_user_id: z.string().uuid().nullable(),
  instruction: z.string(),
  origin: z.enum(["inline_ask", "global_ask", "operator", "capture", "system"]),
  priority: z.number().int(),
  status: z.enum(["queued", "working", "completed", "stuck", "cancelled"]),
  queued_for: z.string(),
  result_summary: z.string().nullable(),
  result_payload: z.record(z.string(), z.unknown()),
  attempt_count: z.number().int(),
  created_at: z.string(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable()
});

export const SourceHealthRowSchema = z.strictObject({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  source_key: z.string(),
  label: z.string(),
  status: z.enum([
    "healthy",
    "disconnected",
    "permission_expired",
    "sync_delayed",
    "partial_sync",
    "unavailable",
    "stale",
    "offline",
    "error",
    "not_configured"
  ]),
  message: z.string().nullable(),
  last_success_at: z.string().nullable(),
  last_checked_at: z.string(),
  next_expected_at: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.string(),
  updated_at: z.string()
});

export const SourceHealthProjectionSchema = SourceHealthRowSchema.omit({
  created_at: true,
  updated_at: true
});

export const ItemRevisionReceiptRowSchema = z.strictObject({
  revision_id: z.string().uuid(),
  new_version: z.number().int()
});

export type AiJobRow = z.infer<typeof AiJobRowSchema>;
export type WorkspaceAccessRow = z.infer<typeof WorkspaceAccessRowSchema>;
export type SourceHealthRow = z.infer<typeof SourceHealthRowSchema>;
export type SourceHealthProjection = z.infer<typeof SourceHealthProjectionSchema>;
export type ItemRevisionReceiptRow = z.infer<typeof ItemRevisionReceiptRowSchema>;

export type CoreDatabase = {
  public: {
    Tables: {
      workspaces: {
        Row: WorkspaceAccessRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      ai_jobs: {
        Row: AiJobRow;
        Insert: Pick<AiJobRow, "workspace_id" | "instruction" | "origin" | "queued_for"> & Partial<AiJobRow>;
        Update: Partial<AiJobRow>;
        Relationships: [];
      };
      source_health: {
        Row: SourceHealthRow;
        Insert: Pick<SourceHealthRow, "workspace_id" | "source_key" | "label" | "status"> & Partial<SourceHealthRow>;
        Update: Partial<SourceHealthRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      append_item_revision: {
        Args: {
          target_item_id: string;
          expected_version: number;
          expected_revision_id: string;
          next_document: Json;
          source_ref_ids?: string[];
        };
        Returns: ItemRevisionReceiptRow[];
      };
      queue_item_ask: {
        Args: { target_item_id: string; job_instruction: string };
        Returns: AiJobRow[];
      };
      queue_global_ask: {
        Args: { target_workspace_id: string; job_instruction: string };
        Returns: AiJobRow[];
      };
      cancel_ai_job: {
        Args: { target_job_id: string };
        Returns: AiJobRow[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
