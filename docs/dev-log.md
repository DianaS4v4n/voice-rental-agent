# Development log

Notes for the delivery report: time spent, AI tools used, and how AI output was checked.

## AI tools

- **Claude Code** (VS Code extension in Antigravity IDE), model **Claude Opus 5.5** (`claude-opus-5-5`) — code, tests, docs.
- **Claude Design** — design system and UI exploration.

## Time log

| Date | Work | Time |
|---|---|---|
| 2026-09-25 | Brief analysis, voice stack choice, accounts (GitHub, Deepgram), test plan with expected outcomes | ~1.5 h |
| 2026-09-25 | Booking domain logic + unit tests | ~0.5 h |
| 2026-09-25 | Design system in Claude Design (Diana) | ~0.9 h |
| 2026-09-25 | Session 2 started 23:06 — voice integration | — |

## Checking AI output

### Booking logic tests were verified to be able to fail (2026-09-25)
All 13 unit tests written with Claude passed on the first run — which alone proves little.
To check that the tests actually guard the rules, the inclusive-end-date rule in the availability query
was deliberately broken (`end_date >= ?` → `end_date > ?`). The test
"availability treats both ends of a booking as booked days" failed as expected; after restoring the code,
all 13 passed again.

## Decisions

- **Voice stack: Deepgram Voice Agent API** — speech recognition, LLM and speech synthesis in one API,
  with built-in turn detection and barge-in. Published price ~$0.08/min (standard tier, pay-as-you-go).
  Alternatives considered: OpenAI Realtime (speech-to-speech), Gemini Live (cheapest, preview models).
- **The model never writes to the database.** It calls tools; availability, validation and saving are
  deterministic code with unit tests.
- **Obsolete choices can't be saved:** the confirm call must repeat the exact request the agent read back;
  if the request changed since, the confirmation is refused.
- **No duplicates:** a request can produce at most one booking (UNIQUE constraint on `draft_id`),
  and repeated confirmation returns the existing booking.
- **No customer name** is collected: the brief doesn't need it, and names are the least reliable part of
  speech recognition. Bookings are identified by ID.
- **Storage:** SQLite built into Node 24 (`node:sqlite`) — no native dependencies to install.
