import type { Metadata } from "next";
import Link from "next/link";

import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { getSignInErrorCopy } from "@/lib/auth/sign-in-error";
import { getServerRuntimeConfig } from "@/lib/runtime-config.server";

export const metadata: Metadata = { title: "Sign in" };

type SignInPageProps = {
  searchParams: Promise<{ error?: string | string[] }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const config = getServerRuntimeConfig();
  const query = await searchParams;
  const errorCopy = getSignInErrorCopy(query.error);

  return (
    <div className="sign-in-shell">
      <header className="sign-in-masthead">
        <Link className="brand" href={config.mode === "mock" ? "/today" : "/sign-in"}>
          <span aria-hidden="true" className="brand-dot" />
          Utsikt
        </Link>
        <span>Private workspace</span>
      </header>
      <main className="sign-in-main">
        <section aria-labelledby="sign-in-title" className="sign-in-panel">
          <p className="eyebrow">One clear view</p>
          <h1 id="sign-in-title">Your day, with the noise removed.</h1>
          <p className="sign-in-intro">
            Utsikt brings the work that needs your attention into one private,
            deliberate view.
          </p>
          {errorCopy === null ? null : (
            <p className="sign-in-error" role="alert">
              {errorCopy}
            </p>
          )}
          {config.mode === "supabase" ? (
            <GoogleSignInButton />
          ) : (
            <Link className="sign-in-action" href="/today">
              Open the mock workspace <span aria-hidden="true">→</span>
            </Link>
          )}
          <p className="sign-in-trust">
            One owner. Nothing is sent or changed without your approval.
          </p>
        </section>
        <aside aria-label="How Utsikt works" className="sign-in-notes">
          <p><span>01</span> Interprets what arrived.</p>
          <p><span>02</span> Recommends the next useful move.</p>
          <p><span>03</span> Waits for your approval.</p>
        </aside>
      </main>
    </div>
  );
}
