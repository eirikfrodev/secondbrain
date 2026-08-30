"use client";

import type { Action, ItemFixture } from "@utsikt/domain";
import {
  ActionList,
  DynamicBlocks,
  ItemHeading,
  ItemMeta,
  Recommendation,
  StateMarker
} from "@utsikt/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import {
  ahead,
  handledToday,
  todayInMotion,
  todayNeedsYou,
  todaySchedule,
  todayWaiting
} from "@/lib/mock-dashboard";
import { SiteHeader } from "./site-header";

const focusableItems = todayNeedsYou.map((fixture) => fixture.item.id);

function InlineAsk({
  itemId,
  onCancel,
  onQueue
}: {
  itemId: string;
  onCancel: () => void;
  onQueue: (value: string) => void;
}) {
  const [value, setValue] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const instruction = value.trim();
    if (instruction) onQueue(instruction);
  }

  return (
    <form className="inline-ask" onSubmit={submit}>
      <label htmlFor={`ask-${itemId}`}>Add an instruction to this item</label>
      <input
        autoFocus
        id={`ask-${itemId}`}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Find another day next week instead…"
        value={value}
      />
      <span className="inline-ask-hint">↵ queue · <button onClick={onCancel} type="button">esc</button></span>
    </form>
  );
}

function QueuedInstruction({ instruction, onCancel }: { instruction: string; onCancel: () => void }) {
  return (
    <div className="queued-instruction" role="status">
      <span>↳ you: “{instruction}” · will run in the 09:40 sync</span>
      <button className="text-link" onClick={onCancel} type="button">cancel</button>
    </div>
  );
}

function ExpandedItem({
  fixture,
  onAction,
  onAsk,
  onClose
}: {
  fixture: ItemFixture;
  onAction: (action: Action) => void;
  onAsk: () => void;
  onClose: () => void;
}) {
  const provenance = fixture.document.spine.provenance;
  return (
    <article className="expanded-item" data-testid="expanded-item">
      <header className="expanded-header">
        <StateMarker label={fixture.document.spine.stateLabel} state={fixture.item.state} />
        <div>
          <ItemHeading document={fixture.document} level={2} />
          <p className="provenance">
            {provenance?.label ?? fixture.document.spine.sourceLabel}
            {provenance?.quote ? ` — “${provenance.quote}”` : ""}
            {typeof provenance?.sourcesRead === "number" ? ` · ${provenance.sourcesRead} sources read` : ""}
            {fixture.document.spine.sourceTime ? ` · ${fixture.document.spine.sourceTime}` : ""}
          </p>
        </div>
        <div className="expanded-state">
          <span>{fixture.document.spine.stateLabel}</span>
          <button aria-label="Collapse item" className="key-button" onClick={onClose} type="button">esc</button>
        </div>
      </header>
      {fixture.document.spine.recommendation ? (
        <Recommendation>{fixture.document.spine.recommendation}</Recommendation>
      ) : null}
      <DynamicBlocks blocks={fixture.document.blocks} />
      <ActionList actions={fixture.actions} itemId={fixture.item.id} mode="overview" onAction={onAction} />
      <button className="expanded-ask" onClick={onAsk} type="button">
        {fixture.document.ask.placeholder ?? "Ask for something else…"}<kbd>↵</kbd>
      </button>
    </article>
  );
}

function NeedsYouItem({
  fixture,
  focused,
  expanded,
  dimmed,
  askOpen,
  queuedInstruction,
  completed,
  alternativesOpen,
  onAction,
  onAsk,
  onCancelAsk,
  onCancelQueue,
  onExpand,
  onFocus,
  onQueue,
  onToggleAlternatives,
  mobileTitle,
  mobileRecommendation
}: {
  fixture: ItemFixture;
  focused: boolean;
  expanded: boolean;
  dimmed: boolean;
  askOpen: boolean;
  queuedInstruction?: string;
  completed: boolean;
  alternativesOpen: boolean;
  onAction: (action: Action) => void;
  onAsk: () => void;
  onCancelAsk: () => void;
  onCancelQueue: () => void;
  onExpand: () => void;
  onFocus: () => void;
  onQueue: (value: string) => void;
  onToggleAlternatives: () => void;
  mobileTitle: string;
  mobileRecommendation: string;
}) {
  if (expanded) {
    return <ExpandedItem fixture={fixture} onAction={onAction} onAsk={onAsk} onClose={onExpand} />;
  }

  return (
    <article
      className={`item-row ${focused ? "is-focused" : ""} ${dimmed ? "is-dimmed" : ""} ${completed ? "is-completed" : ""}`}
      data-item-id={fixture.item.id}
      onClick={onFocus}
    >
      <StateMarker
        label={completed ? "done" : queuedInstruction ? "queued" : fixture.document.spine.stateLabel}
        state={completed ? "done" : queuedInstruction ? "queued" : fixture.item.state}
      />
      <div className="item-content">
        <button className="item-heading-button" onClick={onExpand} type="button">
          <span className="desktop-item-heading"><ItemHeading document={fixture.document} /></span>
          <span className="mobile-item-heading">{mobileTitle}</span>
        </button>
        {fixture.document.spine.recommendation && !completed ? (
          <>
            <span className="desktop-recommendation"><Recommendation>{fixture.document.spine.recommendation}</Recommendation></span>
            <span className="mobile-recommendation"><Recommendation>{mobileRecommendation}</Recommendation></span>
          </>
        ) : null}
        {!completed ? (
          <ActionList
            actions={fixture.actions}
            itemId={fixture.item.id}
            mode="overview"
            mobileAlternativesOpen={alternativesOpen}
            onAction={onAction}
            onAsk={onAsk}
            onToggleAlternatives={onToggleAlternatives}
            showKeyHints={focused}
          />
        ) : <p className="handled-copy">Handled in mock mode. <button className="text-link" type="button">Undo</button></p>}
        {askOpen ? <InlineAsk itemId={fixture.item.id} onCancel={onCancelAsk} onQueue={onQueue} /> : null}
        {queuedInstruction ? <QueuedInstruction instruction={queuedInstruction} onCancel={onCancelQueue} /> : null}
      </div>
      <ItemMeta document={fixture.document} />
    </article>
  );
}

export function TodayDashboard() {
  const router = useRouter();
  const [focusIndex, setFocusIndex] = useState(0);
  const [expandedId, setExpandedId] = useState<string>();
  const [askId, setAskId] = useState<string>();
  const [queued, setQueued] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState<string[]>([]);
  const [alternativesId, setAlternativesId] = useState<string>();
  const [liveMessage, setLiveMessage] = useState("Ready");
  const globalAskRef = useRef<HTMLInputElement>(null);

  const focusedId = focusableItems[focusIndex] ?? focusableItems[0];

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      const editing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        globalAskRef.current?.focus();
        return;
      }
      if (event.key === "Escape") {
        setAskId(undefined);
        setExpandedId(undefined);
        setAlternativesId(undefined);
        return;
      }
      if (editing) return;

      if (event.key === "j" || event.key === "k") {
        event.preventDefault();
        const direction = event.key === "j" ? 1 : -1;
        setFocusIndex((index) => (index + direction + focusableItems.length) % focusableItems.length);
      }
      if (event.key === "e" && focusedId) {
        event.preventDefault();
        setExpandedId((id) => id === focusedId ? undefined : focusedId);
      }
      if (event.key === "a" && focusedId) {
        event.preventDefault();
        setAskId(focusedId);
      }
      if (["1", "2", "3"].includes(event.key) && focusedId) {
        event.preventDefault();
        const actionIndex = Number(event.key) - 1;
        document.querySelector<HTMLButtonElement>(
          `[data-action-for="${focusedId}"][data-action-index="${actionIndex}"]`
        )?.focus();
        setLiveMessage(`Action ${event.key} focused. Press Enter to continue.`);
      }
      if (event.key === "z" && completed.length > 0) {
        event.preventDefault();
        setCompleted((ids) => ids.slice(0, -1));
        setLiveMessage("Latest mock action undone.");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [completed.length, focusedId]);

  function handleAction(action: Action) {
    if (action.kind === "external" || action.kind === "hybrid") {
      setLiveMessage(`${action.label} opened for explicit review; nothing has executed.`);
      router.push(`/item/${action.itemId}`);
      return;
    }
    if (action.kind === "ai") {
      const instruction = typeof action.payload.instruction === "string"
        ? action.payload.instruction
        : action.label;
      setQueued((current) => ({ ...current, [action.itemId]: instruction }));
      setLiveMessage(`${action.label} queued for 09:40.`);
      return;
    }
    setCompleted((ids) => ids.includes(action.itemId) ? ids : [...ids, action.itemId]);
    setLiveMessage(`${action.label} completed in mock mode.`);
  }

  function queueInstruction(itemId: string, instruction: string) {
    setQueued((current) => ({ ...current, [itemId]: instruction }));
    setAskId(undefined);
    setLiveMessage("Instruction queued for the 09:40 sync.");
  }

  function cancelQueue(itemId: string) {
    setQueued((current) => {
      const next = { ...current };
      delete next[itemId];
      return next;
    });
    setLiveMessage("Queued instruction cancelled.");
  }

  return (
    <div className={`app-frame ${expandedId ? "has-expanded" : ""}`}>
      <SiteHeader active="today" />
      <main>
        <section className="today-hero">
          <div>
            <p className="eyebrow">Wednesday 27 August</p>
            <h1>Three things need you before noon.</h1>
            <p>Two replies are drafted and waiting. The Copenhagen hotels are in — Sanders looks right. Athens research lands by 15:00.</p>
          </div>
          <form className="global-ask" onSubmit={(event) => {
            event.preventDefault();
            setLiveMessage("Global instruction queued for 09:40.");
            globalAskRef.current?.blur();
          }}>
            <label htmlFor="global-ask">Ask for anything…</label>
            <div><input id="global-ask" ref={globalAskRef} /><kbd>⌘K</kbd></div>
            <small>6 handled since yesterday · 2 in motion</small>
          </form>
        </section>

        <div className="today-grid">
          <div className="today-stream">
            <section aria-labelledby="needs-you-heading" className="tier tier--needs">
              <header className="tier-header"><h2 id="needs-you-heading">Needs you</h2><span>3</span></header>
              {todayNeedsYou.map((fixture, index) => (
                <NeedsYouItem
                  alternativesOpen={alternativesId === fixture.item.id}
                  askOpen={askId === fixture.item.id}
                  completed={completed.includes(fixture.item.id)}
                  dimmed={Boolean(expandedId && expandedId !== fixture.item.id)}
                  expanded={expandedId === fixture.item.id}
                  fixture={fixture}
                  focused={focusIndex === index}
                  key={fixture.item.id}
                  mobileRecommendation={[
                    "Thursday 14:00. Reply is drafted.",
                    "Sanders, 4 210 kr a night.",
                    "Send the drafted nudge."
                  ][index] ?? fixture.document.spine.recommendation ?? ""}
                  mobileTitle={[
                    "Anders — Thursday or Friday?",
                    "Copenhagen — choose a hotel",
                    "Cabin — estimate 3 days late"
                  ][index] ?? fixture.item.titleLead}
                  onAction={handleAction}
                  onAsk={() => setAskId(fixture.item.id)}
                  onCancelAsk={() => setAskId(undefined)}
                  onCancelQueue={() => cancelQueue(fixture.item.id)}
                  onExpand={() => setExpandedId((id) => id === fixture.item.id ? undefined : fixture.item.id)}
                  onFocus={() => setFocusIndex(index)}
                  onQueue={(value) => queueInstruction(fixture.item.id, value)}
                  onToggleAlternatives={() => setAlternativesId((id) => id === fixture.item.id ? undefined : fixture.item.id)}
                  queuedInstruction={queued[fixture.item.id]}
                />
              ))}
            </section>

            <section aria-labelledby="in-motion-heading" className={`tier tier--compact ${expandedId ? "is-dimmed" : ""}`}>
              <header className="tier-header"><h2 id="in-motion-heading">In motion</h2><span>3</span></header>
              {todayInMotion.map((item) => (
                <article className="compact-row" key={item.id}>
                  <StateMarker label={item.state} state={item.state} />
                  <p className="desktop-compact-copy"><strong>{item.titleLead}</strong> — {item.situation}</p>
                  <p className="mobile-compact-copy"><strong>Athens hotels</strong> — working, 7 of 11</p>
                  <span>{item.meta}</span>
                </article>
              ))}
            </section>

            <section aria-labelledby="waiting-heading" className={`tier tier--compact tier--waiting ${expandedId ? "is-dimmed" : ""}`}>
              <header className="tier-header"><h2 id="waiting-heading">Waiting on others</h2><span>3</span></header>
              <button className="mobile-waiting-rollup" type="button">Waiting on 3 people — all quiet <span>›</span></button>
              {todayWaiting.map((item) => (
                <article className="compact-row" key={item.id}>
                  <StateMarker label="waiting" state="waiting" />
                  <p><strong>{item.titleLead}</strong> — {item.situation}</p>
                  <span>{item.meta}</span>
                </article>
              ))}
            </section>

            <section aria-labelledby="handled-heading" className={`tier tier--compact tier--handled ${expandedId ? "is-dimmed" : ""}`}>
              <header className="tier-header"><h2 id="handled-heading">Handled this morning</h2><span>3 of 6</span></header>
              {handledToday.map((item) => (
                <article className="compact-row handled-row" key={item.id}>
                  <StateMarker label="done" state="done" />
                  <p>{item.text} {item.undo ? <button className="text-link" type="button">Undo</button> : null}</p>
                  <span>{item.time}</span>
                </article>
              ))}
            </section>
          </div>

          <aside className="right-rail">
            <section>
              <header className="rail-header"><h2>Today</h2><span>free from 15:00</span></header>
              <div className="schedule">
                {todaySchedule.map((entry) => (
                  <div className={`schedule-row schedule-row--${entry.kind}`} key={`${entry.time}-${entry.title}`}>
                    <time>{entry.time}</time>
                    <p>{entry.title}{"detail" in entry ? <small>{entry.detail}</small> : null}</p>
                  </div>
                ))}
              </div>
            </section>
            <section className="ahead">
              <header className="rail-header"><h2>Ahead</h2></header>
              {ahead.map((entry) => <div className="ahead-row" key={entry.when}><span>{entry.when}</span><p>{entry.title}</p></div>)}
            </section>
            <section className="drifting-panel">
              <h2>Drifting</h2>
              <p>The garage door quote has sat untouched for five weeks. <button className="text-link" type="button">Reassess</button> · <button className="text-link" type="button">Drop it</button></p>
            </section>
          </aside>
        </div>
      </main>
      <form className="mobile-ask-bar" onSubmit={(event) => { event.preventDefault(); setLiveMessage("Global instruction queued for 09:40."); }}>
        <label htmlFor="mobile-ask">Ask for anything…</label><input id="mobile-ask" /><button aria-label="Queue instruction" type="submit">↵</button>
      </form>
      <footer className="keyboard-footer">j / k move · 1–3 focus · a ask · e expand · z undo</footer>
      <p aria-live="polite" className="sr-only">{liveMessage}</p>
    </div>
  );
}
