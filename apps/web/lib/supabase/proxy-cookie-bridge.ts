import type { CookieMethodsServer } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export function createProxyCookieBridge(request: NextRequest) {
  let response = NextResponse.next({ request });

  const cookies: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet, headers) {
      for (const { name, value } of cookiesToSet) {
        request.cookies.set(name, value);
      }

      response = NextResponse.next({ request });

      for (const { name, value, options } of cookiesToSet) {
        response.cookies.set(name, value, options);
      }

      for (const [name, value] of Object.entries(headers)) {
        response.headers.set(name, value);
      }
    }
  };

  return {
    cookies,
    get response() {
      return response;
    }
  };
}
