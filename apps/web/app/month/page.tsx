import type { Metadata } from "next";

import { LiveWorkspaceState } from "@/components/live-workspace-state";
import { SiteHeader } from "@/components/site-header";
import { requireProductPageAccess } from "@/lib/auth/product-access";
import { monthWeeks } from "@/lib/mock-dashboard";

export const metadata: Metadata = { title: "Month" };

export default async function MonthPage() {
  const access = await requireProductPageAccess();

  if (access.mode === "supabase") {
    return <LiveWorkspaceState active="month" viewLabel="Month" />;
  }

  return (
    <div className="app-frame month-view">
      <SiteHeader active="month" />
      <main>
        <section className="view-hero month-hero">
          <div><p className="eyebrow">September 2026</p><h1>The first week is crowded. Protect the final Friday.</h1><p>Two deadlines, one trip, and a passport renewal shape the month. The middle stays workable if Thursday’s cabin call moves.</p></div>
          <p className="view-stats">5 weeks · 4 decisions · 2 drifting</p>
        </section>
        <section aria-labelledby="month-load" className="month-load">
          <header className="tier-header"><h2 id="month-load">Load by week</h2><span>September</span></header>
          {monthWeeks.map((week) => (
            <article className="month-week" key={week.label}>
              <time>{week.label}</time>
              <div className="month-load-track" aria-label={`${week.load}% committed`}><span style={{ width: `${week.load}%` }} /></div>
              <p>{week.note}</p>
              <span className={`month-tone month-tone--${week.tone}`}>{week.tone}</span>
            </article>
          ))}
        </section>
        <div className="month-columns">
          <section><header className="tier-header"><h2>Dates with consequence</h2><span>4</span></header>
            <article><time>3 Sep</time><p><strong>Insurance decision</strong><br />Comparison and recommendation ready by 09:40.</p><span>deadline</span></article>
            <article><time>8 Sep</time><p><strong>Passport renewal</strong><br />Recommended appointment at 10:20.</p><span>needs you</span></article>
            <article><time>18 Sep</time><p><strong>Copenhagen</strong><br />Hotel cancellation window closes.</p><span>decision</span></article>
            <article><time>4 Oct</time><p><strong>Marathon bib pickup</strong><br />Administration closes just beyond this month.</p><span>ahead</span></article>
          </section>
          <section><header className="tier-header"><h2>Travel and renewals</h2><span>ahead</span></header>
            <article><time>18–20</time><p><strong>Copenhagen</strong><br />Hotel choice now; transport can wait.</p></article>
            <article><time>41 d</time><p><strong>Passport expires</strong><br />Athens requires three months’ validity.</p></article>
            <div className="drifting-panel"><h2>Drifting</h2><p>Kitchen water filter and garage door quote both need a close-or-continue decision.</p></div>
          </section>
        </div>
        <aside className="month-suggestion"><span>→</span><p>Move the cabin call to Friday 09:00. It lowers the heaviest week without creating a new conflict.</p><button className="action action--ink" type="button">Move it</button><button className="action action--link" type="button">Leave it</button></aside>
      </main>
    </div>
  );
}
