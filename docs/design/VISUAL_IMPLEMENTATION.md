# Visual and interaction implementation

> Derived navigation document. `HANDOFF.md` remains canonical.

Use together with `design/reference/README.md` and the rendered boards. Do not redesign into a generic dashboard.

# 17. Visual handoff

The visual design is implementation-ready. Recreate it closely; do not redesign it into a generic Tailwind dashboard.

## 17.1 Visual character

```text
Scandinavian editorial modernism
Calm, warm and highly polished
High information density without enterprise visual noise
Square, honest geometry
Paper, ink, fjord and restrained accent colour
No AI gimmicks
No generic cards everywhere
```

Avoid:

- gradients;
- glowing AI effects;
- robot or sparkle icons;
- rounded SaaS cards;
- floating shadows;
- oversized whitespace;
- a Notion, Linear, Jira, CRM or email-client look;
- modal-heavy interaction;
- chat bubbles as the primary product model.

## 17.2 Design tokens

```css
:root {
  --paper: #F4EFE0;
  --paper-2: #ECE6D4;
  --paper-3: #DCD2BA;
  --line: #C9BDA0;

  --ink: #0E2A47;
  --ink-2: #31486A;
  --ink-3: #5E7089;

  --fjord: #005090;
  --sky: #50B0D0;
  --saffron: #FFB000;
  --success: #4A7C59;
  --danger: #C25A3D;

  --sky-text: #1E6E85;
  --saffron-text: #8C5C00;

  --font-sans: "Familjen Grotesk", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}
```

Use framework-managed web fonts. Do not bundle unlicensed font files.

Form:

```text
Radius 0 for controls and panels
999px only for circular state dots
No product shadows
1px hairlines
1px ink rules to open important sections
No transform/bounce hover effects
200–300ms restrained fades only
```

Typography:

```text
38/500 desktop Today hero, tracking -0.03em, line-height ~1.02
30/500 Week hero
26/500 mobile hero
19/600 expanded item title
15/600 lead + 15/400 situation in rows
14–14.5 body and recommendation, line-height 1.5–1.6
13/500–600 buttons
11.5 mono state
10.5–11 mono provenance, labels and numbers
11 uppercase eyebrow, tracking 0.18em
```

Colour budget:

- saffron: needs-attention and deadlines;
- fjord: recommendations and outbound effects;
- sky: operator work in motion;
- green/danger: status marks only;
- everything else: ink on paper;
- usually no more than paper and paper-2 as background tones in one view.

## 17.3 Fixed item spine

Every item uses this order:

1. status marker;
2. title with bold lead plus plain situation;
3. recommendation line beginning with fjord `→`;
4. optional dynamic blocks when expanded;
5. 0–4 actions;
6. quiet Ask affordance;
7. right-aligned mono state/source/time.

The spine never moves. That stable rhythm makes unpredictable AI-composed content feel calm.

## 17.4 Action hierarchy

```text
Solid ink     recommended action resolved inside Utsikt
Solid fjord   user-approved action touching an external system
Ink outline   equally final alternative
Underlined    sends the operator back to work
```

Rules:

- maximum four visible actions;
- one solid action for actionable items;
- verbs with objects: `Reply: Thursday 14:00`, never `OK`;
- show exact consequences in mono small print;
- do not rely on colour alone;
- use delay/cancel or real undo instead of unnecessary confirmation dialogs.

## 17.5 State vocabulary

```text
needs you        saffron circle
draft ready      fjord text
queued · 13:00   hollow sky circle
working          filled sky circle + progress
waiting · 3 d    hollow ink-3 circle
done · 08:12     green check + receipt
stuck            danger square + plain-language reason + recovery actions
```

The danger square is deliberately the only non-circular state marker.

## 17.6 Today desktop — board 1a

Target viewport: 1440px.

Layout:

```text
56px masthead
40px page side padding
hero
main grid: minmax(0, 1fr) 300px
56px column gap
right rail: 1px left border + 32px left padding
keyboard footer
```

Masthead:

- saffron 10px dot + `Utsikt` at left;
- Today / Week / Month at right;
- active tab has 2px ink underline;
- mono sync copy such as `synced 08:52 · next 13:00`.

Hero:

- uppercase date eyebrow;
- 38px headline answering the day in one sentence;
- short summary, maximum width about 620px;
- right-side baseline-style global Ask field and small statistics line.

Main column tiers:

```text
Needs you
In motion
Waiting on others
Handled this morning
```

Needs-you row:

```text
grid: 18px 1fr auto
12px gap
16px vertical padding
hairline bottom border
```

Focused row:

- paper-2 background;
- inset 2px ink left edge;
- row bleeds 10–12px into side gutters;
- numeric action hints appear.

Right rail:

- Today schedule;
- Ahead;
- Drifting panel;
- calendar is context, not the main app.

## 17.7 Expanded item — board 1b

- expand in place, never in a modal;
- neighbouring rows remain visible at about 45% opacity;
- 900px content area;
- 1px ink border;
- 20px gutter bleed;
- provenance line at top;
- dynamic blocks inserted between recommendation and actions;
- Ask field always last.

Comparison tables:

- ink opening rule;
- mono uppercase headers;
- right-aligned mono numbers;
- paper-2 recommended row bleed;
- saffron dot and fjord `recommended` label.

Reasoning callout:

- 2px fjord left border;
- paper-2 fill;
- starts with `→`.

## 17.8 Week — board 1c

The Week view shows load and consequence, not a second full calendar.

Include:

- week pager;
- hero summary;
- seven-column day grid;
- booked-hours strips;
- faded past days;
- today with paper-2 and saffron top edge;
- deadline markers;
- dashed suggested change;
- operator suggestion bar;
- Decisions this week;
- Drifting.

## 17.9 Ask / queue — board 1d

Asking is annotation, not chat.

States:

1. inline Ask open beneath focused row;
2. queued receipt with exact instruction and next run time;
3. working progress;
4. standing instruction;
5. completed receipt;
6. stuck state with recovery actions.

No conversation bubbles or threaded chat UI.

## 17.10 Draft review — board 1e

Desktop target: 900px card.

Header:

- source provenance;
- `draft ready — nothing sent`.

Content:

- source message at left;
- calendar evidence/rationale at left;
- editable prepared response at right;
- fjord primary action for external send;
- alternatives beneath;
- exact consequence and delay state;
- trust strip: `I recommend and prepare → you approve → Gmail and Calendar execute`.

Distinguish visually and semantically:

```text
dashboard draft
Gmail draft ready
scheduled to send
sent
failed
```

## 17.11 Novel workflow — board 1f

Recreate the passport-renewal example using only stock blocks:

```text
steps
callout
slots
checklist
actions
ask
```

There must not be a `PassportCard` component. The point is to prove the dynamic grammar.

## 17.12 Mobile — board 1g

Logical width: 393px.

Mobile is triage, not a shrunken desktop.

Today:

- brand + sync;
- 26px hero;
- needs-you items;
- full-width 44px primary action;
- 44×44 alternatives button;
- compact in-motion row;
- waiting rollup;
- bottom Ask field.

Approval:

- back link;
- source message;
- recommendation;
- editable draft;
- 50px full-width fjord primary;
- outline alternative;
- underlined AI action;
- consequence line;
- Ask field.

All tap targets must be at least 44px.

## 17.13 Month view

The design bundle does not contain a finished Month screen. Create it from the same grammar.

Do not use a conventional month calendar grid.

It should answer:

```text
Which weeks are heavy?
Which deadlines and decisions matter?
What travel, renewals or administrative obligations approach?
Which projects are drifting?
What does the operator recommend changing?
```

Suggested structure:

- month hero summary;
- four or five weekly load rows;
- important deadlines/decisions grouped by week;
- upcoming travel and renewals;
- drifting projects;
- one operator suggestion.

## 17.14 Keyboard behaviour

```text
j / k     move item focus
1–3       focus the corresponding action
a         open item Ask
e         expand/collapse
z         cancel or undo latest eligible action
esc       close/collapse
⌘K        focus global Ask
enter     submit Ask
```

A numeric shortcut must not silently trigger an external action. It may focus/open the inline approval state.

## 17.15 Accessibility

Meet WCAG 2.2 AA.

Include:

- visible focus;
- logical headings;
- semantic tables;
- screen-reader labels;
- reduced motion;
- `aria-live` for queue and execution changes;
- colour-independent state labels;
- accessible text variants for saffron and sky;
- no tiny low-contrast metadata.

---

