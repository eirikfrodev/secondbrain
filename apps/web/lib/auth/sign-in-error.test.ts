import { describe, expect, it } from "vitest";

import { getSignInErrorCopy } from "./sign-in-error";

describe("sign-in error copy", () => {
  it.each([
    [
      "google_sign_in_failed",
      "Google sign-in could not be completed. Try again."
    ],
    ["sign_out_failed", "Sign-out could not be completed. Try again."]
  ])("maps %s to fixed user-facing copy", (code, copy) => {
    expect(getSignInErrorCopy(code)).toBe(copy);
  });

  it.each([undefined, "provider_error=secret", ["google_sign_in_failed"]])(
    "never reflects unknown or ambiguous query values",
    (value) => {
      expect(getSignInErrorCopy(value)).toBeNull();
    }
  );
});
