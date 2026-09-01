import type { Metadata } from "next";

import { StateMarker } from "@utsikt/ui";

import { LiveWorkspaceState } from "@/components/live-workspace-state";
import { SiteHeader } from "@/components/site-header";
import { requireProductPageAccess } from "@/lib/auth/product-access";

export const metadata: Metadata = { title: "Activity" };

export default async function ActivityPage() {
  const access = await requireProductPageAccess();

  if (access.mode === "supabase") {
    return <LiveWorkspaceState viewLabel="Activity" />;
  }

  return (
    <div className="app-frame activity-view">
      <SiteHeader />
      <main>
        <section className="view-hero"><div><p className="eyebrow">Ask and operator work</p><h1>Instructions stay attached to the work.</h1></div><p className="view-stats">next run · 09:40</p></section>
        <section className="ask-demo">
          <p className="demo-caption"><strong>1</strong> Press <kbd>a</kbd> on a row — the ask field opens beneath it.</p>
          <article className="demo-item is-open">
            <StateMarker label="draft ready" state="draft_ready" />
            <div><h2><strong>Anders</strong> — Thursday or Friday?</h2><p className="recommendation"><span>→</span> Thursday 14:00 — your afternoon is free.</p>
              <form className="inline-ask"><label htmlFor="demo-ask">Add an instruction</label><input defaultValue="Find another day next week instead — not Thursday, I want it clear" id="demo-ask" /><span className="inline-ask-hint">↵ queue · esc</span></form>
            </div><span className="detail-state">draft ready</span>
          </article>
          <p className="demo-caption"><strong>2</strong> On return, the row carries its instruction.</p>
          <article className="demo-item"><StateMarker label="queued" state="queued" /><div><h2><strong>Anders</strong> — find another day next week, not Thursday.</h2><p className="provenance">↳ you, just now · will run in the 09:40 sync</p></div><span className="detail-state">queued · 09:40<br /><button className="text-link" type="button">cancel</button></span></article>
          <p className="demo-caption"><strong>3</strong> In motion shows origin, progress, receipts, and visible failure.</p>
          <div className="jobs-list">
            <article><StateMarker label="working" state="working" /><div><h2><strong>Athens</strong> — hotels within 1 km of the marathon start, under 2 000 kr.</h2><p>↳ you, tue 21:14 · reading booking sites — 7 of 11 done</p><div className="mini-progress"><span /></div></div><time>working · since 08:15</time></article>
            <article><StateMarker label="queued" state="queued" /><div><h2><strong>Weekly review</strong> — standing job, runs Sunday 18:00.</h2><p>↳ standing instruction, set 12 May</p></div><time>scheduled · sun</time></article>
            <article><StateMarker label="done" state="done" /><div><h2><strong>Copenhagen hotels</strong> — three options filed under <button className="text-link" type="button">Needs you</button>.</h2></div><time>done · 08:12</time></article>
            <article className="job-stuck"><StateMarker label="stuck" state="stuck" /><div><h2><strong>Insurance</strong> — Gjensidige’s PDF is password-protected; I can’t read it.</h2><div className="action-list"><button className="action action--ink" type="button">Ask them to resend</button><button className="action action--link" type="button">Upload it here</button><button className="action action--link" type="button">Skip the comparison</button></div></div><time>stuck</time></article>
          </div>
        </section>
      </main>
    </div>
  );
}
