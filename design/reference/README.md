# Handoff: Utsikt — AI second-brain control panel

## Overview
Utsikt ("the view") is a personal AI control panel: an operator-like AI continuously reviews the user's email, messages, calendar, projects and commitments, then maintains a single evolving surface showing what deserves attention and what to do next. This handoff covers the full desktop experience (Today, Week, expanded items, ask/queue interaction, draft review, dynamically-composed items) plus the mobile triage adaptation, and — critically — the **item grammar** that lets arbitrary AI-generated content render coherently without predefined workflow types.

## About the Design Files
The files in this bundle are **design references created in HTML** — high-fidelity static mockups showing intended look and behavior, **not production code to copy directly**. The task is to **recreate these designs in the target codebase's environment** (React, Vue, etc.) using its established patterns — or, if no environment exists yet, choose the most appropriate framework and implement there. The bundled `.dc.html` file is a design-review canvas: each board (`1a`–`1h`) is one screen/state, laid out side by side with explanatory captions. Captions and board chrome (badges, ids, the dark intro panel) are review-canvas furniture, not product UI.

## Fidelity
**High-fidelity.** Colors, type sizes, weights, spacing, borders and copy are final and should be recreated pixel-perfectly. Everything is static — no JS behavior is implemented; interactions are described below and in the on-canvas captions.

## The core model (read this first)
Every item, regardless of content, answers three questions in fixed order — the **spine**:
1. **What's happening** — title: bold lead + plain-weight situation sentence, one line.
2. **What I'd do** — recommendation line, first person, prefixed by a fjord `→`, with the reason.
3. **What you can do** — 1–4 actions, exactly one solid (recommended) button, alternatives as underlined text buttons, plus an always-present quiet "Ask…" affordance.

Collapsed items show spine only. Expanded items keep the spine and insert any stack of **blocks** (see Grammar) between recommendation and actions. The spine never moves — that is what keeps unpredictable AI-composed content calm.

## Screens / Views

### 1a — Today (desktop 1440)
Purpose: 10-second answer to "what deserves my attention right now?"
Layout: full-width masthead bar (56px, hairline bottom) → hero block → two-column grid `1fr 300px`, 56px gap, 40px page side-padding → centered keyboard-hint footer bar.
- **Masthead**: left — 10px saffron dot + "Utsikt" (15px/600). Right — Today/Week/Month nav (14px/500; active = ink with 2px ink underline, inactive = ink-3) + mono sync line "synced 08:52 · next 09:40" (11.5px, ink-3).
- **Hero**: eyebrow date (uppercase, letterspaced, ink-3) → headline "Three things need you before noon." (38px/500, -0.03em, 1.02 line-height) → 15px ink-2 summary sentence, max-width 620px. Right: 300px "Ask for anything…" field — no box; a baseline hairline with ⌘K key hint, mono stats line beneath.
- **Left column, four tiers** in order: **Needs you** (section header: uppercase eyebrow + mono count, 1px INK rule below — section-opening rules are ink, row separators are hairline `--line`), then **In motion**, **Waiting on others**, **Handled this morning** (header rule stays hairline — it's a receipts tier).
- **Item row (Needs you)**: grid `18px 1fr auto`, 12px column gap, 16px vertical padding, hairline bottom. Col 1: 8px status dot. Col 2: title line (15px; bold lead + ink-2 remainder) → recommendation line (14px, fjord `→` 600) → action row (flex, 14px gap): solid ink button (13px/600, paper text, 7×14px padding, radius 0) + underlined text buttons (13px/500, ink-2, underline offset 3px) + right-aligned "Ask…" in ink-3. Col 3: right-aligned mono stack — state word (11.5px; fjord for `draft ready`, danger for `3 days over`) over source·time (ink-3).
- **Keyboard focus state** (shown on first row): background `--paper-2`, inset 2px ink left edge, row bleeds 10–12px into the margins, mono key hint `1` beside the primary button.
- **In motion rows**: single line — filled sky dot (working) or hollow sky dot (queued), bold lead + ink-2 rest (14px), right mono state "working · since 08:15" / "queued · 09:40".
- **Waiting rows**: hollow ink-3 dot, same one-line pattern, right mono elapsed "2 days".
- **Handled rows**: green ✓, 14px ink-3 text, underlined "Undo" inline where safe, right mono timestamp.
- **Right column** (hairline left border, 32px padding-left): **Today** schedule — rows `44px 1fr`, mono time, 14px title with 2px ink left border on padding (10px); free slots use hairline border + ink-3 text ("Clear — good slot for the passport form"); deadline row uses saffron time, saffron border, 600 weight. **Ahead** — same grid, mono day tokens (Fri/Mon/Thu 4/Oct 7). **Drifting** — `--paper-2` panel, 14×16px padding: eyebrow + 13px ink-2 sentence with underlined inline actions ("Reassess · Drop it").
- **Footer**: centered mono hints (11px, ink-3): `j / k move · 1–3 act · a ask · e expand · z undo`.

### 1b — Expanded item (research result)
Purpose: show in-place expansion — neighbours stay visible (rendered at 45% opacity above/below), context never lost.
Layout: 900px card; expanded item is a 1px INK-bordered panel bleeding 20px into the gutter.
- Header: saffron dot + 19px/600 title + mono provenance line (11px, ink-3): `your ask · mon 14:02 — "good hotels, ideally under 5 000 kr/night" · 14 sources read · done 08:12`; right — fjord state `results in` + `esc` key hint.
- 14px ink-2 context paragraph (max-width 640px).
- **Comparison table**: ink top rule; mono uppercase column headers (10.5px, ink-3): hotel / where / night / worth knowing; grid `26px 1.1fr 1.2fr 90px 1.6fr`. Recommended row: `--paper-2` background bleed, saffron dot, name 14.5px/600 + mono fjord "recommended" tag; other rows hollow dots, hairline top. Prices mono, right-aligned.
- **Reasoning callout**: 2px fjord left border, `--paper-2` fill, 10×16px padding: `→ I'd take Sanders. …buys dinner at Barr.`
- **Action row** + right-aligned mono trust note: `books nothing yet — hold placed on choice`.
- **Ask field**: hairline top; placeholder shows example asks; `↵` key hint.

### 1c — Week (desktop 1440)
Purpose: load and consequence, not a second calendar.
- Same masthead (Week active; mono week-pager `‹ week 35 · 25–31 aug ›`).
- Hero: eyebrow "Week 35" + 30px/500 headline "Thursday is the heavy day. Friday afternoon is clear." + right mono stat line.
- **7-column day grid** (1px `--line` outer border, hairline column separators): each day = mono day header + optional right status (danger "6.5 h booked", success "light") → **booked-hours strip**: 6 cells, 5px tall, 2px gap; ink = booked hour-block, `--paper-3` = free → content: past days at 50% opacity with 13px ink-2 receipts ("7 handled. Bjørnstad's estimate didn't come." — misses in danger); today: `--paper-2` bg + inset 3px saffron top edge + mono "today" tag; schedule lines grid `32px 1fr` mono-time + 13px title; deadlines: saffron ▲ + 600 weight; suggested change: fjord dashed-border chip ("cabin call, moved?").
- **Operator suggestion bar** below grid: ink top rule, `--paper-2` fill: `→ Thursday holds 6.5 booked hours plus two deadlines. Bjørnstad is free Friday 09:00 — move the cabin call there?` + solid "Move it" + underlined "Leave Thursday".
- **Two-column footer** `1fr 1fr`, 56px gap: **Decisions this week** (bold lead + sentence, right mono due — saffron for today) and **Drifting** (age in mono: 3 w / 5 w, inline underlined Reassess · Drop).
- Legend footer: `▲ deadline · ■ booked hour · dashed = suggested, nothing moved`.

### 1d — Asking (instruction → queue → receipt)
Purpose: asking is annotating, not chatting.
Three numbered demonstrations (numbered ink chips are review furniture):
1. **Ask field open** on a focused row (ink border, `--paper-2`): field is a `--paper` box, hairline border, indented 46px to align with title column; typed text 14px with a 1.5px fjord caret bar; right mono hint `↵ queue · esc`.
2. **Row after queueing**: dot becomes hollow sky; mono echo line `↳ you: "find another day next week instead — not thursday" · will run in the 09:40 sync`; right: `queued · 09:40` + underlined "cancel".
3. **In-motion section expanded**: working row with origin line (`↳ you, tue 21:14 · reading booking sites — 7 of 11 done`) + progress bar (3px; sky filled / `--paper-3` rest, width 220px); queued rows (`↳ you, just now`); standing job (`↳ standing instruction, set 12 May` / `scheduled · sun`); done receipt (✓, "filed under Needs you", `done · 08:12`); **stuck row**: 8px danger SQUARE (only non-circle marker), plain-words failure "Gjensidige's PDF is password-protected; I can't read it." + recovery actions (solid "Ask them to resend" + underlined "Upload it here" / "Skip the comparison"), right mono danger `stuck`.

### 1e — Draft review (recommend → approve → execute)
Purpose: the response workflow; the only screen with a fjord solid button.
900px card, 1px ink border, 20px gutter bleed.
- Header: saffron dot, 19px title, mono provenance `mail · anders@kollektivet.no · today 08:31`; right fjord mono `draft ready — nothing sent` + esc hint.
- Two columns `1fr 1.15fr`, 28px gap. **Left**: his message in `--paper-2` quote block (mono label "his message"; 14px text) → "why thursday — your two days": two mini day-columns (Thu/Fri), rows of `22px mono hour + 10px bar` (ink = busy, hairline outline = free; the 14:00 slot is a 14px-tall 1.5px-fjord-outlined cell with centered mono "here" at 8.5px); Friday column at 80% opacity → 13px ink-2 rationale paragraph.
- **Right**: draft panel (hairline border): header row mono "your reply — editable" + underlined "edit"; 14.5px/1.6 letter body → action row: **solid FJORD** "Send reply — Thursday 14:00" (fjord = touches the outside world) + underlined alternatives → mono trust line `sends from your Gmail · calendar hold placed on Thu 14:00 · undo for 30 s`.
- Footer strip (hairline top): mono `I recommend and prepare → you approve → Gmail and Calendar execute` (middle segment ink, rest ink-3).

### 1f — Undesigned workflow (passport renewal)
Purpose: prove the grammar composes arbitrary items. Same spine; provenance says `surfaced by me — Athens flights in November need 3 months' validity · nobody asked`; right saffron mono `one step needs you`.
Blocks used, top to bottom: **steps** (4 stages: done = 12px ink disc with paper ✓ + ink connector; current = 2px saffron ring + label in ink + saffron mono sublabel; future = hollow ink-3 ring, ink-3 label) → **reasoning callout** (fjord left border: Thursday 15:40 "sits neatly behind the Anders meeting") → **slot chips** (recommended = solid ink chip; others = 1px ink outline chips; "other weeks" underlined) → **checklist** (3-col grid: ✓ Form prefilled — underlined "review two fields" / ✓ Old passport location / ✓ 690 kr — card on file) → **actions** (solid fjord "Book Thursday 15:40" — external booking; mono note `books at politiet.no · calendar entry with travel time`) → **ask field**.

### 1g — Mobile (393px logical, iPhone frame)
Purpose: triage, not a shrunken desktop. Two screens.
- **Today**: brand row + mono sync → eyebrow date → 26px/500 headline "Three things need you." → **Needs you** (ink-ruled header): per item — 15px/600 title, 14px recommendation line (`→` fjord), then a 44px-tall action pair: full-width solid ink primary + 44×44px `···` outline square (alternatives sheet behind it) → one-line In-motion row (sky dot, "working, 7 of 11", mono time) → one-line Waiting rollup ("Waiting on 3 people — all quiet" + `›`) → bottom-pinned ask bar (hairline top, baseline-underline field + ↵).
- **Approve flow**: back link "‹ Today" + fjord mono state → 22px title → his message (paper-2 block) → recommendation line → draft panel (hairline border, edit link) → stacked full-width actions: 50px solid fjord primary / 46px ink-outline "Suggest Friday 10:00" / 40px underlined "Find other times" → centered mono trust line `sends from your Gmail · undo for 30 s` → ask bar.
- All tap targets ≥44px. Mobile hex values are hardcoded (no CSS vars in frames): paper #F4EFE0, ink #0E2A47, ink-2 #31486A, ink-3 #5E7089, line #C9BDA0, paper-2 #ECE6D4.

### 1h — The grammar sheet
On-canvas spec (board `1h`) — recreate as internal docs, not product UI. Contents duplicated in "Item grammar" below.

## Item grammar (the contract an implementation agent builds against)
An item is `spine + block[]` (JSON). Unknown block type → render its text content as a plain text block: **degrade, never break**.

**Spine** (fixed): status dot · title (bold lead + plain situation) · recommendation (`→` + first-person reason) · actions (≤4) · right-aligned mono `state · source · time`.

**Blocks** (stock parts, stack in any order between recommendation and actions):
- `text` — one short paragraph, 14px ink-2, max-width ~640px
- `quote` — source material, `--paper-2` block, mono label, "their words" in quotes
- `callout` — the reasoning, 2px fjord left border + `--paper-2` fill, starts with `→`
- `table` — comparison, ≤5 rows; ink top rule, mono uppercase headers, mono right-aligned numbers, recommended row = paper-2 bleed + saffron dot + mono fjord tag
- `slots` — pickable times: solid ink chip (recommended) + outlined chips + underlined overflow
- `steps` — multi-stage progress: ✓ disc / accent ring (current) / hollow ring (future), hairline connectors
- `checklist` — prerequisites, green ✓ + 13px ink-2, inline underlined links
- `progress` — 3px bar, sky filled / paper-3 remainder + mono "7 of 11" in provenance line
- `draft` — outbound message: hairline-border panel, mono header + "edit" link, letter-set body
- `day-strip` — calendar evidence: mono hour + bar rows (ink busy / outline free / fjord-outline proposed)
- `key-value` — facts, mono values
- `ask` — always last, always present: baseline-hairline field + ↵ hint

**Action hierarchy** (the only hierarchy): solid ink = recommended, resolves inside the app · solid fjord = touches the outside world (mail, calendar, money) · 1px ink outline = real alternative, equally final · underlined text = sends the AI back to work · max 4, exactly one solid · verbs with their object ("Reply: Thursday 14:00", never "OK") · consequence in mono small print next to actions · undo over confirmation dialogs.

**State vocabulary** (mono, one word + time, always top-right): `needs you` (saffron dot) · `draft ready` (fjord text) · `queued · 09:40` (hollow sky) · `working` (filled sky, + progress) · `waiting · 3 d` (hollow ink-3) · `done · 08:12` (green ✓, receipt + undo) · `stuck` (danger SQUARE + plain-words reason + recovery actions).

**Color budget**: saffron = needs-you/deadlines (ration it — "the sun") · fjord = recommendations + outbound sends · sky = AI work in motion · green/danger only as ✓/state marks · everything else ink on paper. Max ~2 background tones per view (paper + paper-2).

**Voice**: first-person operator, plainspoken, reasons given. "Thursday works — your afternoon is free." Never "✨ Your AI copilot has optimized your day!" No "AI" labels, no robot icons, no sparkles. Norwegian names/amounts keep diacritics; amounts formatted `4 210 kr`.

## Interactions & Behavior (described, not implemented)
- **Keyboard (desktop)**: `j/k` move row focus · `1–3` trigger that row's actions in order · `a` open ask field · `e` expand/collapse · `z` undo · `esc` close · `⌘K` global ask · `↵` submit ask.
- **Row focus**: paper-2 background + inset 2px ink left edge + numeric key hints appear beside actions.
- **Expansion**: in place; siblings dim to ~45% opacity, never removed. No modals anywhere.
- **Ask flow**: field opens under the row → on `↵` the row's dot goes hollow-sky, echo line `↳ you: "…" · will run in the HH:MM sync` appears with an underlined cancel; processed at next sync cycle.
- **Execution model**: AI recommends and prepares → user approves (one press) → external systems execute. Fjord solids are the only buttons that touch the outside world; each carries a mono consequence note. Prefer 30s undo over confirmation.
- **Hover**: underlined text buttons darken ink-2→ink; solid buttons no transform — restrained 200–300ms eased fades only, no bounce.
- **Failure**: a `stuck` row with plain-language reason + 2–3 recovery actions; never a silent stall or toast-only error.
- **Mobile `···`**: opens the row's alternative actions (sheet/expansion); primary action always directly tappable.

## State Management (implementation guidance)
- `items[]`: `{id, tier: needsYou|inMotion|waiting|handled, spine: {title, situation, recommendation, state, source, time}, blocks[], actions[]}` — tier and full contents can change every AI sync cycle; treat items as server-composed documents keyed by stable id.
- `askQueue[]`: `{itemId|null, text, queuedFor}` — global ⌘K asks have null itemId.
- Sync metadata: `lastSync`, `nextSync` (masthead), per-job progress for working items.
- Focus index + expanded-item id for keyboard nav; undo stack with 30s expiry for executed actions.

## Design Tokens
Colors (from Rime Labs `colors_and_type.css`):
- `--paper` #F4EFE0 (page) · `--paper-2` #ECE6D4 (panels, focus, quotes) · `--paper-3` (empty strip cells)
- `--ink` #0E2A47 (type, rules, solid buttons) · ink-2 #31486A (secondary text — darkened from stock for readability) · ink-3 #5E7089 (tertiary/mono meta — darkened from stock)
- `--line` #C9BDA0-range hairline (1px separators)
- `--fjord` #005090 · `--sky` #50B0D0 · `--saffron` #FFB000 · `--success` green · `--danger` red (state marks only)
- Review-canvas desk background #EAE3CF (not product)

Typography: **Familjen Grotesk** (all UI) + **JetBrains Mono** (state, time, provenance, keys, numbers), both via Google Fonts.
Scale (px/weight): 38/500 hero (-0.03em, lh 1.02) · 30/500 week hero · 26/500 mobile hero · 19/600 expanded titles · 15/600+400 row titles · 14–14.5/400 body & recommendations (lh 1.5–1.6) · 13/500–600 buttons · 13 ink-2 captions/checklists · mono 11.5 state · mono 11 meta · mono 10.5 provenance/labels/uppercase headers (0.08em) · eyebrows uppercase 0.18em.
Spacing: 40px page side-padding · 56px column gap · 16px row vertical padding · 12px grid column gap · 18px dot column · section rhythm 28px.
Radius: **0 everywhere** (999px only on status dots). Shadows: none in product (card drop shadows on the canvas are review furniture). Rules: 1px ink = section-opening / table-opening; 1px `--line` = all row separators.

## Assets
- Rime Labs marks copied to `assets/` (mark-sun.svg, mark-peaks.svg, mark-horizon.svg) — available brand vocabulary; current design uses only a saffron dot as the brand mark.
- Lucide is the sanctioned icon set (1.6px stroke, currentColor); current design is icon-free except ✓/▲/→/···/↳ glyphs set in type.
- No raster images anywhere.

## Files
- `Utsikt - Second Brain.dc.html` — the full review canvas; boards `1a`–`1h` (anchor ids `#1a`…`#1h`). All product styling is inline on the elements.
- `assets/` — brand marks.
- `ios-frame.jsx`, `support.js`, `_ds/` — canvas/preview machinery only; ignore for implementation.
