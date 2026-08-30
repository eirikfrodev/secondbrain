import type {
  Action,
  AttentionTier,
  ItemBlock,
  ItemDocumentV1,
  ItemState
} from "@utsikt/domain";
import type { CSSProperties, ReactNode } from "react";

export type StateMarkerProps = {
  state: ItemState;
  label: string;
};

export function StateMarker({ state, label }: StateMarkerProps) {
  const symbol = state === "done" ? "✓" : "";
  return (
    <span
      aria-label={label}
      className={`state-marker state-marker--${state}`}
      role="img"
      title={label}
    >
      {symbol}
    </span>
  );
}

export function ActionList({
  actions,
  itemId,
  onAction,
  onAsk,
  showKeyHints = false,
  mobileAlternativesOpen = false,
  onToggleAlternatives,
  mode = "detail"
}: {
  actions: readonly Action[];
  itemId: string;
  onAction?: (action: Action) => void;
  onAsk?: () => void;
  showKeyHints?: boolean;
  mobileAlternativesOpen?: boolean;
  onToggleAlternatives?: () => void;
  mode?: "overview" | "detail";
}) {
  const primary = actions.find((action) => action.recommended);
  const alternatives = actions.filter((action) => !action.recommended);
  const primaryTone = mode === "overview" ? "ink" : primary?.visualTone;

  return (
    <div className="action-area">
      <div className="action-list" aria-label="Available actions">
        {primary ? (
          <button
            className={`action action--${primaryTone}`}
            data-action-for={itemId}
            data-action-index="0"
            onClick={() => onAction?.(primary)}
            type="button"
          >
            {primary.label}
          </button>
        ) : null}
        {showKeyHints && primary ? <kbd className="action-key">1</kbd> : null}
        <div className={`action-alternatives ${mobileAlternativesOpen ? "is-open" : ""}`}>
          {alternatives.map((action, index) => (
            <button
              className={`action action--${mode === "overview" ? "link" : action.visualTone}`}
              data-action-for={itemId}
              data-action-index={index + 1}
              key={action.id}
              onClick={() => onAction?.(action)}
              type="button"
            >
              {action.label}
            </button>
          ))}
        </div>
        {alternatives.length > 0 ? (
          <button
            aria-expanded={mobileAlternativesOpen}
            aria-label="Show alternative actions"
            className="action-more"
            onClick={onToggleAlternatives}
            type="button"
          >
            ···
          </button>
        ) : null}
        {onAsk ? (
          <button className="action action--ask" onClick={onAsk} type="button">
            Ask…
          </button>
        ) : null}
      </div>
      {primary?.consequence ? (
        <p className="action-consequence">{primary.consequence}</p>
      ) : null}
    </div>
  );
}

function formatTableCell(value: string | number | boolean | null): string {
  if (typeof value === "number") {
    return new Intl.NumberFormat("nb-NO").format(value);
  }
  if (value === null) {
    return "—";
  }
  return String(value);
}

function TextBlock({ block }: { block: Extract<ItemBlock, { type: "text" }> }) {
  return <p className="block-text">{block.text}</p>;
}

function QuoteBlock({ block }: { block: Extract<ItemBlock, { type: "quote" }> }) {
  return (
    <blockquote className="block-quote">
      <span className="block-label">{block.label}</span>
      <p>“{block.quote}”</p>
      {block.attribution ? <cite>{block.attribution}</cite> : null}
    </blockquote>
  );
}

function CalloutBlock({ block }: { block: Extract<ItemBlock, { type: "callout" }> }) {
  return (
    <aside className={`block-callout block-callout--${block.tone}`}>
      <span aria-hidden="true">→</span> {block.text}
    </aside>
  );
}

function ComparisonTableBlock({
  block
}: {
  block: Extract<ItemBlock, { type: "comparison_table" }>;
}) {
  return (
    <div className="block-table-wrap">
      <table className="block-table">
        <thead>
          <tr>
            <th aria-label="Recommendation" className="table-marker" />
            {block.columns.map((column) => (
              <th className={column.align === "right" ? "align-right" : undefined} key={column.key}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row) => {
            const recommended = row.id === block.recommendedRowId;
            return (
              <tr className={recommended ? "is-recommended" : undefined} key={row.id}>
                <td className="table-marker">
                  <span aria-label={recommended ? "Recommended" : "Alternative"} />
                </td>
                {block.columns.map((column, columnIndex) => (
                  <td className={column.align === "right" ? "align-right mono" : undefined} key={column.key}>
                    <span className={columnIndex === 0 ? "table-primary" : undefined}>
                      {formatTableCell(row.cells[column.key] ?? null)}
                    </span>
                    {recommended && columnIndex === 0 ? (
                      <span className="recommended-label">recommended</span>
                    ) : null}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SlotsBlock({ block }: { block: Extract<ItemBlock, { type: "slots" }> }) {
  return (
    <div className="block-slots">
      <span className="block-label">Open slots</span>
      <div className="slot-list">
        {block.options.map((option) => (
          <button
            className={option.id === block.recommendedOptionId ? "slot is-recommended" : "slot"}
            key={option.id}
            type="button"
          >
            {option.label}
          </button>
        ))}
        {block.overflowLabel ? <button className="text-link" type="button">{block.overflowLabel}</button> : null}
      </div>
    </div>
  );
}

function StepsBlock({ block }: { block: Extract<ItemBlock, { type: "steps" }> }) {
  return (
    <ol className="block-steps">
      {block.steps.map((step) => (
        <li className={`step step--${step.state}`} key={step.id}>
          <span className="step-marker" aria-hidden="true">{step.state === "done" ? "✓" : ""}</span>
          <strong>{step.label}</strong>
          {step.detail ? <small>{step.detail}</small> : null}
        </li>
      ))}
    </ol>
  );
}

function ChecklistBlock({ block }: { block: Extract<ItemBlock, { type: "checklist" }> }) {
  return (
    <ul className="block-checklist">
      {block.items.map((item) => (
        <li key={item.id}>
          <span aria-hidden="true">{item.state === "done" ? "✓" : "○"}</span>
          <span>
            {item.label}
            {item.detail ? ` — ${item.detail}` : ""}
            {item.linkLabel ? <> — <button className="text-link" type="button">{item.linkLabel}</button></> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ProgressBlock({ block }: { block: Extract<ItemBlock, { type: "progress" }> }) {
  const value = Math.min(block.value, block.max);
  const percent = `${(value / block.max) * 100}%`;
  return (
    <div className="block-progress">
      <div className="progress-copy">
        <strong>{block.label}</strong>
        {block.detail ? <span>{block.detail}</span> : null}
      </div>
      <div
        aria-label={block.label}
        aria-valuemax={block.max}
        aria-valuemin={0}
        aria-valuenow={value}
        className="progress-track"
        role="progressbar"
      >
        <span style={{ "--progress": percent } as CSSProperties} />
      </div>
    </div>
  );
}

function DraftBlock({ block }: { block: Extract<ItemBlock, { type: "draft" }> }) {
  const stateLabels: Record<typeof block.providerState, string> = {
    dashboard_only: "dashboard draft",
    creating: "creating provider draft",
    provider_ready: "provider draft ready",
    changed_externally: "draft changed externally",
    send_scheduled: "send scheduled",
    sent: "sent",
    failed: "failed"
  };
  return (
    <section className="block-draft">
      <header>
        <span className="block-label">Your reply · {stateLabels[block.providerState]}</span>
        {block.editable ? <button className="text-link" type="button">edit</button> : null}
      </header>
      {block.subject ? <p className="draft-subject">{block.subject}</p> : null}
      {block.editable ? (
        <textarea aria-label={`Draft message to ${block.recipientLabel}`} defaultValue={block.body} />
      ) : (
        <p className="draft-body">{block.body}</p>
      )}
    </section>
  );
}

function DayStripBlock({ block }: { block: Extract<ItemBlock, { type: "day_strip" }> }) {
  return (
    <div className="block-day-strip">
      {block.days.map((day) => (
        <section key={`${day.date}-${day.label}`}>
          <header><strong>{day.label}</strong><span>{day.date}</span></header>
          {day.slots.map((slot, index) => (
            <div className={slot === block.proposedSlotId ? "day-slot is-proposed" : "day-slot"} key={`${slot}-${index}`}>
              <span>{slot}</span><i />
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

function KeyValueBlock({ block }: { block: Extract<ItemBlock, { type: "key_value" }> }) {
  return (
    <dl className="block-key-value">
      {block.entries.map((entry) => (
        <div key={entry.label}>
          <dt>{entry.label}</dt>
          <dd className={entry.emphasis ? "is-emphasized" : undefined}>{String(entry.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function BlockRenderer({ block }: { block: ItemBlock }) {
  switch (block.type) {
    case "text": return <TextBlock block={block} />;
    case "quote": return <QuoteBlock block={block} />;
    case "callout": return <CalloutBlock block={block} />;
    case "comparison_table": return <ComparisonTableBlock block={block} />;
    case "slots": return <SlotsBlock block={block} />;
    case "steps": return <StepsBlock block={block} />;
    case "checklist": return <ChecklistBlock block={block} />;
    case "progress": return <ProgressBlock block={block} />;
    case "draft": return <DraftBlock block={block} />;
    case "day_strip": return <DayStripBlock block={block} />;
    case "key_value": return <KeyValueBlock block={block} />;
    case "fallback":
      return (
        <p className="block-fallback" data-original-block={block.originalType} role="status">
          {block.fallbackText}
        </p>
      );
  }
}

export function DynamicBlocks({ blocks }: { blocks: readonly ItemBlock[] }) {
  return (
    <div className="dynamic-blocks">
      {blocks.map((block) => <BlockRenderer block={block} key={block.id} />)}
    </div>
  );
}

export function ItemHeading({
  document,
  level = 3
}: {
  document: ItemDocumentV1;
  level?: 1 | 2 | 3;
}) {
  const content = (
    <><strong>{document.spine.titleLead}</strong> — {document.spine.situation}</>
  );
  if (level === 1) return <h1 className="item-title">{content}</h1>;
  if (level === 2) return <h2 className="item-title">{content}</h2>;
  return <h3 className="item-title">{content}</h3>;
}

export function Recommendation({ children }: { children: ReactNode }) {
  return <p className="recommendation"><span aria-hidden="true">→</span>{children}</p>;
}

export function ItemMeta({ document }: { document: ItemDocumentV1 }) {
  return (
    <p className="item-meta">
      <span>{document.spine.stateLabel}</span>
      <span>{[document.spine.sourceLabel, document.spine.sourceTime].filter(Boolean).join(" · ")}</span>
    </p>
  );
}

export const tierLabels: Record<AttentionTier, string> = {
  needs_you: "Needs you",
  in_motion: "In motion",
  waiting: "Waiting on others",
  handled: "Handled"
};
