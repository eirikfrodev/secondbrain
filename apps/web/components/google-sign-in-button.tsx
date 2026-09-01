"use client";

import { useRef, useState } from "react";
import type { MouseEvent } from "react";

const googleSignInPath = "/api/auth/google/start";
const googleSignInStatusId = "google-sign-in-status";

type GoogleSignInButtonViewProps = {
  onStart: (event: MouseEvent<HTMLAnchorElement>) => void;
  starting: boolean;
};

export function GoogleSignInButtonView({
  onStart,
  starting
}: GoogleSignInButtonViewProps) {
  return (
    <div className="google-sign-in-control">
      <a
        aria-busy={starting || undefined}
        aria-describedby={googleSignInStatusId}
        aria-disabled={starting || undefined}
        className="sign-in-action"
        href={googleSignInPath}
        onClick={onStart}
      >
        {starting ? "Opening Google…" : "Continue with Google"}
        <span aria-hidden="true">→</span>
      </a>
      <span
        aria-atomic="true"
        aria-live="polite"
        className="sr-only"
        id={googleSignInStatusId}
        role="status"
      >
        {starting ? "Google sign-in is opening. Please wait." : ""}
      </span>
    </div>
  );
}

export function GoogleSignInButton() {
  const startingRef = useRef(false);
  const [starting, setStarting] = useState(false);

  function startGoogleSignIn(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();

    if (startingRef.current) {
      return;
    }

    startingRef.current = true;
    setStarting(true);
    // OAuth initiation needs a full document navigation so the PKCE cookie and redirect stay paired.
    window.location.assign(new URL(googleSignInPath, window.location.origin).href);
  }

  return <GoogleSignInButtonView onStart={startGoogleSignIn} starting={starting} />;
}
