# Voice Rental Design System

Design system for **Rental Desk** (working name), a browser-based voice agent for a small photo/video equipment rental counter. The customer says what they want and for which days, may change their mind, and the agent checks stock and saves a booking **only after an explicit “yes”**.

Interface metaphor: a **drive-thru menu board**. You talk on the left; your order assembles on a board on the right.

- **Left — Conversation:** transcript on top (plain text, no bubbles), one voice button at the bottom.
- **Right — Board:** current request card, three product cards, the saved booking (“Your booking”).
- **Demo panel:** a hideable drawer for reviewers — bookings table, before/after stock, per-turn latency, session cost.

Desktop-first at 1440; at ≤1080 (target 390) the board stacks under the conversation. Light theme only. All UI copy is English.

## Sources
No codebase, Figma, logo or brand assets were provided. Everything here was authored from the written brief pasted into the project. Product name “Rental Desk” is a **placeholder** — replace via `AppHeader productName`.

## Data shown
- **Products (3):** Camera A (2 units), Tripod B (3), Microphone C (1).
- **Request (draft):** item, qty, start date, end date (daily rental, both dates inclusive). Fields fill in and can change during the conversation.
- **Statuses:** `Collecting details` · `Checking…` · `Available` · `Not available` · `Awaiting confirmation` · `Confirmed · BK-1001` · `Already booked`.
- **Booking:** number (`BK-1001`), item, qty, dates, created time. No customer name is collected.
- **Metrics (demo panel only):** response latency per turn (ms) + median, session cost ($).

---

## CONTENT FUNDAMENTALS

**Voice:** a calm, competent counter clerk. Short, literal, no filler, no enthusiasm markers. The agent restates facts (item, quantity, dates) before asking for a decision.

- **Person:** the agent speaks as “I” to “you” (“Shall I book it?”, “I haven’t created a duplicate”). UI chrome is impersonal (“Your booking”, “Current request”).
- **Casing:** Sentence case everywhere (`Show database`, `Reset demo`, `Tap to start`). Eyebrow labels are uppercase set by CSS, written in sentence case in source.
- **Numbers:** always digits in UI (`1 of 2 free`, `Oct 5–7`, `710 ms`, `$0.0132`). The agent spells dates out in speech (“October 5 to 7”) while the board shows the short form (`Oct 5–7`). Ranges use an en dash; ranges are inclusive.
- **Booking IDs:** `BK-` + 4 digits, tabular numerals.
- **Separators:** a middle dot joins a state and its detail: `Speaking · tap to interrupt`, `Confirmed · BK-1001`, `Connection lost · Retry`.
- **Ellipsis** (`…`, single glyph) = in progress: `Connecting…`, `Thinking…`, `Checking…`; also marks an interrupted agent line.
- **Errors** say what happened, then what to do: `Microphone access is blocked` / `Allow microphone access to talk to the agent`.
- **No emoji.** No exclamation marks. No “Oops”.

Examples:
- Agent: `Tripod B, one unit, October 5 to 7 — that's available. Shall I book it?`
- User: `Yes, please.`
- Not available: `Only 1 of 2 Camera A free on Oct 11`
- Confirmed: `Booked · BK-1001`
- Already booked: `Already booked as BK-1001 — no duplicate created`
- System notes in transcript: `Booking BK-1001 saved`, `Request changed · Dates Oct 14–15 → Oct 5–7`

---

## VISUAL FOUNDATIONS

**Mood:** a darkroom/equipment counter — near-monochrome, precise, quiet. One muted burgundy “REC lamp” accent. No neon, no gradients, no glassmorphism.

**Colour**
- Neutrals: 14-step, very slightly warm grey (`--gray-0` … `--gray-950`). Page `--gray-25`, panels white, board column `--gray-50`.
- **Accent = one variable**, `--accent: #7d4550` (muted greyish burgundy). `--accent-strong / -soft / -softer / -border / -glow` are all derived with `color-mix()`, so changing `--accent` re-themes everything.
- Accent means *live / yours / changed*: listening disc, REC dot, agent eyebrow, product in your request, corrected field tint and strike line, new DB row, median marker.
- Semantic (bg / fg / border / solid each): success green, danger **bright red `#d8322a`** (clearly not the burgundy), warning amber, info slate-blue. Used only where they mean something: availability, errors, awaiting, checking.
- **Status is never colour alone** — always icon + text.

**Type**
- One family: `Geist` (400–700), self-hosted woff2 in `assets/fonts/`. **No monospace font.** Numbers (IDs, dates, qty, ms, $) use `font-variant-numeric: tabular-nums`.
- Scale: 11 / 12 / 13 / 14 / 16 / 18 / 22 / 28 / 36. Body 14. Transcript 16 (all lines; recency shown by opacity, not size).
- Eyebrows: 11px semibold uppercase, +0.06em tracking, `--text-tertiary`.

**Spacing & layout:** 2 / 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 56 / 72. 56px header. Board column 520px. Drawer 420px, fixed right, overlays content. Voice button is pinned to the bottom of the conversation column (sticky on mobile).

**Surfaces & cards:** white card, 1px `--border-default` hairline, radius 14 (`--radius-lg`), **no shadow**. Shadows are reserved for things that float: voice button (`--shadow-md`), drawer and toast (`--shadow-lg`). No coloured left-border accents. Board sits on a sunken grey column so white cards read as “tiles on a menu board”.

**Radii:** 4 (field highlight), pill (buttons, `--radius-button`), 10 (glyph tiles, banners, toast), 14 (cards), pill (badges, toggle), circle (voice button, unit dots).

**Borders:** hairlines separate rows inside cards (`--border-subtle`); dashed rules only in the receipt (tear-off feel) and the empty booking slot.

**Backgrounds & imagery:** flat colour only. No photos, textures, patterns or illustrations. Product visuals are line icons on a grey tile (the tile turns burgundy when the product is in your request).

**Transparency / blur:** none, except `--accent-glow` (22% accent) for halos and selection rings.

**States**
- Hover: buttons darken one step (primary → `--gray-700`, secondary → sunken bg + stronger border, ghost → `--surface-hover`). Voice button scales 1.03.
- Press: buttons nudge 1px down; voice button scales 0.97.
- Focus: 3px `--accent-glow` ring (`--focus-ring`).
- Disabled: 45% opacity.
- Selected product: accent border + 3px glow + softer accent wash.

**Motion** (`tokens/motion.css`)
- Durations: instant 80, fast 150, base 220, slow 300. Loops: breathe 2400, spin 900.
- Easing: `--ease-standard` state changes, `--ease-out` entrances, `--ease-in` exits/cuts, `--ease-in-out` breathe/nod, `--ease-settle` (only curve with overshoot) for unit dots.
- Enter = fade + 6px rise. Transcript: agent lines left, your lines right, no speaker labels, no bubbles; what you are saying right now is the brightest line (primary + burgundy caret). Status badge re-keys and rises in. Just-filled field: accent-soft flash 900ms. Corrected field: strike line draws left→right over the old value (300ms) and keeps a faint accent tint. Product counter ticks down into place. Booking receipt unrolls (clip-path) and the green stamp settles; repeat “yes” = 420ms vertical nod. No confetti, no bounces.
- Voice: the disc is **always burgundy** (REC lamp), except error states. Around it ONE continuous translucent burgundy filled wave; states only set targets (amplitude, shape, opacity) and it eases between them — no jumps, no outline strokes. **User** = quick many-lobed wave + mic icon; **agent** = slow round wave + white bars inside. Listening = low soft breathe; connecting = faint pulse; thinking = wave retracts, three dots; interrupted = bars snap to zero, wave drops fast to listening.
- `prefers-reduced-motion: reduce`: every entrance becomes a 120ms fade, loops stop, voice rings change opacity only.

---

## ICONOGRAPHY
- **Lucide** outline icons (ISC), copied from `lucide-static@0.460.0` into `assets/icons/*.svg` and embedded as JSX in `components/core/Icon.jsx`. 24px grid, round caps/joins; we render at stroke 1.75 (2 inside badges).
- Sizes: 14 in badges/status lines, 16 in buttons/toasts, 18 in banners, 20–22 in product tiles, 28 in the voice button.
- **Substitution:** Lucide has no tripod glyph; `tripod` uses `drafting-compass`. Flagged — replace with a real tripod icon if you have one.
- No emoji. Unicode is used only for typographic separators (`·`, `–`, `…`, `→` in the demo snapshot), never as icons.
- No logo was provided; the product name is set in plain Geist 600. The burgundy REC dot is the only brand motif.

---

## Components
All in `components/`, exported on the bundle namespace. Styles in `components/components.css` (class prefix `vr-`).

- **Icon** — `core/Icon.jsx` (+ `ICON_NAMES`)
- **Button** — primary / accent / secondary / ghost; sm / md / lg
- **IconButton** — icon-only, `pressed` state
- **Toggle** — switch (`Show database`)
- **StatusBadge** — 7 request statuses (+ `STATUS_META`)
- **VoiceButton** — 9 states: idle, connecting, listening, user-speaking, thinking, agent-speaking, interrupted, mic-blocked, error
- **TranscriptLine** / **Transcript** — agent left / user right, interim, interrupted, system; recency fade
- **RequestCard** — Item / Qty / Dates; empty, just filled, corrected (struck old value), all statuses
- **ProductCard** — default stock, in request, enough, not enough, sold out; unit dots
- **BookingReceipt** — empty, new (unroll + stamp), repeat (“Already booked” nod)
- **DemoPanel** / **BookingsTable** — drawer with DB table (new row highlight), before/after, latency + median, cost
- **Banner** — mic blocked, connection lost
- **Toast** — light confirmation
- **AppHeader** / **ConnectionIndicator** — name, connection, Show database, Reset demo

### Intentional additions
- **Icon** — wrapper for the glyph set so components never inline SVG.
- **ConnectionIndicator** — the brief lists a connection indicator inside the header; exported separately for reuse.
- **Button `accent` variant** — for the rare single burgundy action.

## UI kit
- `ui_kits/voice-agent/` — interactive recreation of the full app. `index.html` (1440 desktop) plays a scripted session: request → not available → correction → interruption → awaiting → “yes” → confirmed → repeat “yes” → already booked. Tap the voice button to start; tap while the agent speaks to interrupt. `mobile.html` shows it at 390. Demo panel has “Simulate failure” buttons.

## Index
- `styles.css` — entry point (imports only)
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `motion.css`, `base.css`
- `components/` — components + `components.css`; one `*.card.html` per folder
- `guidelines/` — foundation specimen cards (Colors, Type, Spacing, Motion, Brand)
- `assets/icons/` — Lucide SVGs; `assets/fonts/` — Geist woff2
- `ui_kits/voice-agent/` — full app recreation
- `thumbnail.html` — project tile
- `SKILL.md` — agent-skill entry
