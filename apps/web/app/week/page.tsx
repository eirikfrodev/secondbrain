import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";
import { weekDays } from "@/lib/mock-dashboard";

export const metadata: Metadata = { title: "Week" };

export default function WeekPage() {
  return (
    <div className="app-frame week-view">
      <SiteHeader active="week" />
      <main>
        <section className="view-hero week-hero">
          <div><p className="eyebrow">Week 35</p><h1>Thursday is the heavy day. Friday afternoon is clear.</h1></div>
          <p className="view-stats">2 deadlines · 3 waiting · 2 drifting</p>
        </section>
        <section aria-label="Week load" className="week-grid">
          {weekDays.map((day) => (
            <article className={`week-day week-day--${day.tone}`} key={`${day.day}-${day.date}`}>
              <header><span>{day.day} {day.date}</span>{day.tone === "today" ? <strong>today</strong> : day.tone === "heavy" ? <strong>6.5 h booked</strong> : day.tone === "light" ? <strong>light</strong> : null}</header>
              <div aria-label={`${day.load} booked hour blocks`} className="load-strip">
                {Array.from({ length: 6 }, (_, index) => <span className={index < day.load ? "is-booked" : ""} key={index} />)}
              </div>
              <div className="week-day-copy">
                {day.summary.map((line) => <p className={line.includes("moved?") ? "is-suggestion" : line.startsWith("▲") ? "is-deadline" : undefined} key={line}>{line}</p>)}
              </div>
            </article>
          ))}
          <div className="week-suggestion">
            <p><span>→</span> Thursday holds 6.5 booked hours plus two deadlines. Bjørnstad is free Friday 09:00 — move the cabin call there?</p>
            <button className="action action--ink" type="button">Move it</button>
            <button className="action action--link" type="button">Leave Thursday</button>
          </div>
        </section>
        <div className="week-lists">
          <section><header className="tier-header"><h2>Decisions this week</h2><span>3</span></header>
            <p><strong>Insurance</strong> — switch to If, or stay. Comparison lands 09:40. <time>today 17:00</time></p>
            <p><strong>DNB mortgage</strong> — re-fix at 5.1% or float. I lean float; memo ready. <time>thu</time></p>
            <p><strong>Copenhagen hotel</strong> — free cancellation ends Friday. <time>fri</time></p>
          </section>
          <section><header className="tier-header"><h2>Drifting</h2><span>quietly getting old</span></header>
            <p><strong>Kitchen water filter</strong> — researched, never decided. <button className="text-link" type="button">Reassess</button> · <button className="text-link" type="button">Drop</button><time>3 w</time></p>
            <p><strong>Garage door quote</strong> — expires next month. <button className="text-link" type="button">Reassess</button> · <button className="text-link" type="button">Drop</button><time>5 w</time></p>
          </section>
        </div>
      </main>
      <footer className="keyboard-footer">▲ deadline · ■ booked hour · dashed = suggested, nothing moved</footer>
    </div>
  );
}
