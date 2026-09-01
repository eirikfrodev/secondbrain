import "server-only";

import type { NextResponse } from "next/server";

import {
  getServerMutationAppOrigin,
  getServerRuntimeConfig
} from "../runtime-config.server";
import { apiErrorResponse } from "./browser-mutation";

const LoopbackHostnames = new Set(["localhost", "127.0.0.1", "[::1]"]);

export type AiJobMutationRouteRuntime =
  | { enabled: true; appOrigin: string }
  | { enabled: false; response: NextResponse };

function unavailableRoute(): NextResponse {
  return apiErrorResponse(404, "not_found", "The resource was not found.");
}

export function resolveAiJobMutationRouteRuntime(
  requestUrl: string
): AiJobMutationRouteRuntime {
  const config = getServerRuntimeConfig();

  if (config.mode === "supabase") {
    return {
      enabled: true,
      appOrigin: getServerMutationAppOrigin(requestUrl)
    };
  }

  let appOrigin: string;
  try {
    appOrigin = getServerMutationAppOrigin(requestUrl);
  } catch {
    return { enabled: false, response: unavailableRoute() };
  }

  const url = new URL(appOrigin);
  const isLocalRuntime =
    (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") &&
    url.protocol === "http:" &&
    LoopbackHostnames.has(url.hostname);

  return isLocalRuntime
    ? { enabled: true, appOrigin }
    : { enabled: false, response: unavailableRoute() };
}
