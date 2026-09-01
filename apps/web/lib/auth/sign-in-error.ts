import { z } from "zod";

const SignInErrorCodeSchema = z.enum([
  "google_sign_in_failed",
  "sign_out_failed"
]);

type SignInErrorCode = z.infer<typeof SignInErrorCodeSchema>;

const signInErrorCopy: Record<SignInErrorCode, string> = {
  google_sign_in_failed: "Google sign-in could not be completed. Try again.",
  sign_out_failed: "Sign-out could not be completed. Try again."
};

export function getSignInErrorCopy(
  value: string | string[] | undefined
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const code = SignInErrorCodeSchema.safeParse(value);
  return code.success ? signInErrorCopy[code.data] : null;
}
