import type { CookieMethodsServer } from "@supabase/ssr";
import { type NextRequest, type NextResponse } from "next/server";

type CookieMutation = Parameters<
  NonNullable<CookieMethodsServer["setAll"]>
>[0][number];

const MandatoryNoStoreHeaders = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
  Expires: "0",
  Pragma: "no-cache"
} as const;

export function applyAuthNoStoreHeaders(response: NextResponse): NextResponse {
  for (const [name, value] of Object.entries(MandatoryNoStoreHeaders)) {
    response.headers.set(name, value);
  }

  return response;
}

function cookieMutationKey(cookie: CookieMutation): string {
  return [cookie.name, cookie.options.domain ?? "", cookie.options.path ?? ""].join("\u0000");
}

export function createAuthResponseCookieBridge(request: NextRequest) {
  const pendingCookies = new Map<string, CookieMutation>();
  const pendingHeaders = new Headers();

  const cookies: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet, headers) {
      for (const cookie of cookiesToSet) {
        request.cookies.set(cookie.name, cookie.value);
        pendingCookies.set(cookieMutationKey(cookie), cookie);
      }

      for (const [name, value] of Object.entries(headers)) {
        pendingHeaders.set(name, value);
      }
    }
  };

  return {
    cookies,
    applyTo(response: NextResponse): NextResponse {
      for (const [name, value] of pendingHeaders) {
        response.headers.set(name, value);
      }

      applyAuthNoStoreHeaders(response);

      for (const { name, value, options } of pendingCookies.values()) {
        response.cookies.set(name, value, options);
      }

      return response;
    }
  };
}
