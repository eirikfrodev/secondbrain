"use client";

import type { Action, ItemFixture } from "@utsikt/domain";
import {
  ActionList,
  BlockRenderer,
  DynamicBlocks,
  ItemHeading,
  Recommendation,
  StateMarker
} from "@utsikt/ui";
import Link from "next/link";
import { useState } from "react";

import { meetingCalendarEvidence } from "@/lib/mock-dashboard";

function ApprovalReview({ fixture }: { fixture: ItemFixture }) {
  const quote = fixture.document.blocks.find((block) => block.type === "quote");
  const draft = fixture.document.blocks.find((block) => block.type === "draft");
  const [scheduled, setScheduled] = useState(false);
  const [queued, setQueued] = useState<string>();
  const primary = fixture.actions.find((action) => action.recommended);
  const alternatives = fixture.actions.filter((action) => !action.recommended);

  function act(action: Action) {
    if (action.kind === "ai") {
      setQueued(`${action.label} queued for 09:40.`);
      return;
    }
    if (action.kind === "external" || action.kind === "hybrid") {
      setScheduled(true);
    }
  }

  return (
    <main className="detail-stage approval-stage">
      <article className="approval-card">
        <header className="detail-header">
          <StateMarker label={fixture.document.spine.stateLabel} state={fixture.item.state} />
          <div>
            <span className="desktop-detail-title"><ItemHeading document={fixture.document} level={1} /></span>
            <h1 className="mobile-detail-title">Anders — Thursday or Friday?</h1>
            <p className="provenance">mail · anders@kollektivet.no · today 08:31</p>
          </div>
          <span className="detail-state">draft ready — nothing sent</span>
        </header>
        <Link className="detail-back" href="/today">‹ Today</Link>
        <div className="approval-grid">
          <section className="approval-evidence" aria-label="Source and calendar evidence">
            {quote ? <BlockRenderer block={quote} /> : null}
            <div>
              <p className="block-label">Why Thursday — your two days</p>
              <BlockRenderer block={meetingCalendarEvidence} />
              <p className="evidence-reason">Thursday after 12 is clear; Friday is broken up by the leadership sync and Live’s 11. You also said no morning meetings before the long run when you can help it.</p>
            </div>
          </section>
          <section className="approval-response" aria-label="Prepared response">
            {fixture.document.spine.recommendation ? <Recommendation>{fixture.document.spine.recommendation}</Recommendation> : null}
            {draft ? <BlockRenderer block={draft} /> : null}
            <div className="approval-actions">
              {scheduled ? (
                <div className="scheduled-state" role="status">
                  <strong>Mock approval staged for 30 seconds.</strong>
                  <span>No Gmail or Calendar call will be made.</span>
                  <button className="action action--outline" onClick={() => setScheduled(false)} type="button">Cancel</button>
                </div>
              ) : primary ? (
                <button className="action action--fjord" onClick={() => act(primary)} type="button">Send reply — Thursday 14:00</button>
              ) : null}
              {alternatives.map((action) => (
                <button className={`action action--${action.visualTone}`} key={action.id} onClick={() => act(action)} type="button">{action.label}</button>
              ))}
            </div>
            <p className="approval-trust">sends from your Gmail · calendar hold placed on Thu 14:00 · undo for 30 s</p>
            {queued ? <p className="queued-instruction" role="status">{queued}</p> : null}
          </section>
        </div>
        <footer className="approval-footer">I recommend and prepare <span>→</span> <strong>you approve</strong> <span>→</span> Gmail and Calendar execute</footer>
        <button className="expanded-ask" type="button">Ask — “push it a week”… <kbd>↵</kbd></button>
      </article>
    </main>
  );
}

function GenericDetail({ fixture }: { fixture: ItemFixture }) {
  const [message, setMessage] = useState("");
  function act(action: Action) {
    const description = action.kind === "external" || action.kind === "hybrid"
      ? `${action.label} opened for explicit approval. Mock mode performed no external effect.`
      : action.kind === "ai"
        ? `${action.label} queued for 09:40.`
        : `${action.label} completed in mock mode.`;
    setMessage(description);
  }
  return (
    <main className="detail-stage">
      <article className="generic-detail-card">
        <header className="detail-header">
          <StateMarker label={fixture.document.spine.stateLabel} state={fixture.item.state} />
          <div><ItemHeading document={fixture.document} level={1} /><p className="provenance">{fixture.document.spine.provenance?.label ?? fixture.document.spine.sourceLabel} · {fixture.document.spine.sourceTime}</p></div>
          <span className="detail-state">{fixture.document.spine.stateLabel}</span>
        </header>
        <Link className="detail-back" href="/today">‹ Today</Link>
        {fixture.document.spine.recommendation ? <Recommendation>{fixture.document.spine.recommendation}</Recommendation> : null}
        <DynamicBlocks blocks={fixture.document.blocks} />
        <ActionList actions={fixture.actions} itemId={fixture.item.id} onAction={act} />
        {message ? <p className="queued-instruction" role="status">{message}</p> : null}
        <button className="expanded-ask" type="button">{fixture.document.ask.placeholder ?? "Ask for something else…"}<kbd>↵</kbd></button>
      </article>
    </main>
  );
}

export function ItemDetail({ fixture }: { fixture: ItemFixture }) {
  return fixture.item.id.startsWith("11111111")
    ? <ApprovalReview fixture={fixture} />
    : <GenericDetail fixture={fixture} />;
}
