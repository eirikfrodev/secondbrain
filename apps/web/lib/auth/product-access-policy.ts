import { PersistenceError, WorkspaceAccessRowSchema } from "@utsikt/db";

import type { RuntimeConfig } from "../runtime-config";
import type { VerifiedSession } from "./claims";

export type ProductPageAccess =
  | {
      mode: "mock";
      liveAuthenticated: false;
    }
  | {
      mode: "supabase";
      liveAuthenticated: true;
      userId: string;
      workspaceId: string;
    };

export type ProductAccessDependencies = {
  requireSession: () => Promise<VerifiedSession>;
  findPersonalWorkspace: (userId: string) => Promise<unknown>;
};

function forbidden(): PersistenceError {
  return new PersistenceError(
    "forbidden",
    "A personal workspace is required to access this page."
  );
}

export async function evaluateProductPageAccess(
  config: RuntimeConfig,
  dependencies: ProductAccessDependencies
): Promise<ProductPageAccess> {
  if (config.mode === "mock") {
    return { mode: "mock", liveAuthenticated: false };
  }

  const session = await dependencies.requireSession();
  const workspace = WorkspaceAccessRowSchema.safeParse(
    await dependencies.findPersonalWorkspace(session.userId)
  );

  if (
    !workspace.success ||
    workspace.data.kind !== "personal" ||
    workspace.data.owner_user_id !== session.userId
  ) {
    throw forbidden();
  }

  return {
    mode: "supabase",
    liveAuthenticated: true,
    userId: session.userId,
    workspaceId: workspace.data.id
  };
}

export function isProductAccessRedirectError(error: unknown): boolean {
  return (
    error instanceof PersistenceError &&
    (error.code === "not_authenticated" || error.code === "forbidden")
  );
}
