import { describe, expect, it } from "vitest";

import {
  mapAiJobRow,
  mapItemRevisionReceiptRow,
  mapSourceHealthRow
} from "./repository";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const now = "2026-08-30T21:00:00.000Z";

describe("database boundary mappings", () => {
  it("maps an AI job row into the validated domain receipt", () => {
    const job = mapAiJobRow({
      id: "22222222-2222-4222-8222-222222222222",
      workspace_id: workspaceId,
      item_id: "33333333-3333-4333-8333-333333333333",
      requested_by_user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      instruction: "Move this to next week",
      origin: "inline_ask",
      priority: 50,
      status: "queued",
      queued_for: "2026-08-30T22:00:00.000Z",
      result_summary: null,
      result_payload: {},
      attempt_count: 0,
      created_at: now,
      started_at: null,
      completed_at: null
    });

    expect(job.workspaceId).toBe(workspaceId);
    expect(job.requestedByUserId).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(job.status).toBe("queued");
  });

  it("maps source health and revision receipts", () => {
    const health = mapSourceHealthRow({
      id: "44444444-4444-4444-8444-444444444444",
      workspace_id: workspaceId,
      source_key: "utsikt_operator",
      label: "Utsikt operator",
      status: "healthy",
      message: null,
      last_success_at: now,
      last_checked_at: now,
      next_expected_at: "2026-08-30T22:00:00.000Z",
      metadata: {}
    });
    const revision = mapItemRevisionReceiptRow({
      revision_id: "55555555-5555-4555-8555-555555555555",
      new_version: 4
    });

    expect(health.sourceKey).toBe("utsikt_operator");
    expect(revision.newVersion).toBe(4);
  });
});
