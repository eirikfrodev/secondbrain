import type { NextRequest } from "next/server";

import { handleItemAsk } from "@/lib/api/ai-jobs";
import { resolveAiJobMutationRouteRuntime } from "@/lib/api/route-runtime";
import { getRequestPersistenceContext } from "@/lib/persistence/repository";

type ItemAskRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: NextRequest,
  context: ItemAskRouteContext
) {
  const { id } = await context.params;
  const runtime = resolveAiJobMutationRouteRuntime(request.url);
  if (!runtime.enabled) {
    return runtime.response;
  }

  return handleItemAsk(request, id, {
    appOrigin: runtime.appOrigin,
    getContext: getRequestPersistenceContext
  });
}
