export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AiJobRow = {
  id: string;
  workspace_id: string;
  item_id: string | null;
  requested_by_user_id: string | null;
  instruction: string;
  origin: "inline_ask" | "global_ask" | "operator" | "capture" | "system";
  priority: number;
  status: "queued" | "working" | "completed" | "stuck" | "cancelled";
  queued_for: string;
  result_summary: string | null;
  result_payload: Record<string, unknown>;
  attempt_count: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

export type SourceHealthRow = {
  id: string;
  workspace_id: string;
  source_key: string;
  label: string;
  status:
    | "healthy"
    | "disconnected"
    | "permission_expired"
    | "sync_delayed"
    | "partial_sync"
    | "unavailable"
    | "stale"
    | "offline"
    | "error"
    | "not_configured";
  message: string | null;
  last_success_at: string | null;
  last_checked_at: string;
  next_expected_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ItemRevisionReceiptRow = {
  revision_id: string;
  new_version: number;
};

export type CoreDatabase = {
  public: {
    Tables: {
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
        Returns: AiJobRow;
      };
      queue_global_ask: {
        Args: { target_workspace_id: string; job_instruction: string };
        Returns: AiJobRow;
      };
      cancel_ai_job: {
        Args: { target_job_id: string };
        Returns: AiJobRow;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
