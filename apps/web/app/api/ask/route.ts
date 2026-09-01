import type { NextRequest } from "next/server";

import { handleGlobalAsk } from "@/lib/api/ai-jobs";
import { resolveAiJobMutationRouteRuntime } from "@/lib/api/route-runtime";
import { getRequestPersistenceContext } from "@/lib/persistence/repository";

export async function POST(request: NextRequest) {
  const runtime = resolveAiJobMutationRouteRuntime(request.url);
  if (!runtime.enabled) {
    return runtime.response;
  }

  return handleGlobalAsk(request, {
    appOrigin: runtime.appOrigin,
    getContext: getRequestPersistenceContext
  });
}
