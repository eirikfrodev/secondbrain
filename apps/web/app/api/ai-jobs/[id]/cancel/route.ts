import type { NextRequest } from "next/server";

import { handleCancelAiJob } from "@/lib/api/ai-jobs";
import { resolveAiJobMutationRouteRuntime } from "@/lib/api/route-runtime";
import { getRequestPersistenceContext } from "@/lib/persistence/repository";

type CancelAiJobRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: NextRequest,
  context: CancelAiJobRouteContext
) {
  const { id } = await context.params;
  const runtime = resolveAiJobMutationRouteRuntime(request.url);
  if (!runtime.enabled) {
    return runtime.response;
  }

  return handleCancelAiJob(request, id, {
    appOrigin: runtime.appOrigin,
    getContext: getRequestPersistenceContext
  });
}
