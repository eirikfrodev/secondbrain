import type { CookieOptionsWithName } from "@supabase/ssr";

export function createSupabaseCookieOptions(
  applicationOrigin: string
): CookieOptionsWithName {
  return {
    secure: new URL(applicationOrigin).protocol === "https:"
  };
}
export function getBrowserApplicationOrigin(fallbackOrigin: string): string {
  return typeof globalThis.location?.origin === "string"
    ? globalThis.location.origin
    : fallbackOrigin;
}
