import { PersistenceError } from "@utsikt/db";
import { describe, expect, it, vi } from "vitest";

import {
  evaluateProductPageAccess,
  isProductAccessRedirectError
} from "./product-access-policy";

const userId = "00000000-0000-4000-8000-000000000001";
const workspaceId = "00000000-0000-4000-8000-000000000002";
const liveConfig = {
  mode: "supabase" as const,
  supabaseUrl: "https://example.supabase.co",
  publishableKey: "sb_publishable_example"
};

describe("product page access policy", () => {
  it("keeps explicit mock mode usable without credentials", async () => {
    const requireSession = vi.fn();
    const findPersonalWorkspace = vi.fn();

    await expect(
      evaluateProductPageAccess(
        { mode: "mock" },
        { requireSession, findPersonalWorkspace }
      )
    ).resolves.toEqual({ mode: "mock", liveAuthenticated: false });

    expect(requireSession).not.toHaveBeenCalled();
    expect(findPersonalWorkspace).not.toHaveBeenCalled();
  });

  it("returns the verified owner and RLS-visible personal workspace", async () => {
    const requireSession = vi.fn().mockResolvedValue({ userId });
    const findPersonalWorkspace = vi.fn().mockResolvedValue({
      id: workspaceId,
      owner_user_id: userId,
      kind: "personal"
    });

    await expect(
      evaluateProductPageAccess(liveConfig, {
        requireSession,
        findPersonalWorkspace
      })
    ).resolves.toEqual({
      mode: "supabase",
      liveAuthenticated: true,
      userId,
      workspaceId
    });
    expect(findPersonalWorkspace).toHaveBeenCalledWith(userId);
  });

  it.each([
    null,
    { id: workspaceId, owner_user_id: userId, kind: "work" },
    {
      id: workspaceId,
      owner_user_id: "00000000-0000-4000-8000-000000000003",
      kind: "personal"
    },
    { id: "not-a-uuid", owner_user_id: userId, kind: "personal" }
  ])("rejects missing, non-personal, mismatched, or malformed workspaces", async (workspace) => {
    const access = evaluateProductPageAccess(liveConfig, {
      requireSession: vi.fn().mockResolvedValue({ userId }),
      findPersonalWorkspace: vi.fn().mockResolvedValue(workspace)
    });

    await expect(access).rejects.toMatchObject({ code: "forbidden" });
  });

  it("does not turn infrastructure failures into sign-in redirects", async () => {
    const failure = new PersistenceError("unavailable", "Unavailable");
    const access = evaluateProductPageAccess(liveConfig, {
      requireSession: vi.fn().mockResolvedValue({ userId }),
      findPersonalWorkspace: vi.fn().mockRejectedValue(failure)
    });

    await expect(access).rejects.toBe(failure);
    expect(isProductAccessRedirectError(failure)).toBe(false);
  });

  it("redirects only authentication and authorization failures", () => {
    expect(
      isProductAccessRedirectError(
        new PersistenceError("not_authenticated", "Authentication is required.")
      )
    ).toBe(true);
    expect(
      isProductAccessRedirectError(new PersistenceError("forbidden", "Forbidden"))
    ).toBe(true);
    expect(isProductAccessRedirectError(new Error("not authenticated"))).toBe(false);
  });
});
