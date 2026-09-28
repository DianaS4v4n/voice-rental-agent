# Rental Desk — voice equipment booking agent

**Live demo:** https://voice-rental-agent.onrender.com (free tier — the first visit may take ~50 s to wake up).

A browser voice agent for a small equipment rental desk. You say what you need and for which days,
change your mind, and the agent checks the real test inventory and saves **exactly one** booking —
only after you explicitly say yes to its read-back.

- Inventory: Camera A × 2, Tripod B × 3, Microphone C × 1. Seed booking: Camera A × 1, 10–12 Oct 2026 (inclusive).
- One language (English), day-based rentals, one conversation at a time.
- The screen shows the current request, the saved booking and stock per item; a reviewer drawer (`Show database`)
  shows the bookings table, before/after stock, per-turn latency and session cost.

## Run it locally

Requirements: **Node.js 24+** (uses the built-in `node:sqlite`) and a **Deepgram API key**
(new accounts get free credits at https://console.deepgram.com).

```bash
npm install
cp .env.example .env        # then put your key after DEEPGRAM_API_KEY=
npm run dev                 # http://localhost:3000
```

Open http://localhost:3000 in **Chrome**, allow the microphone, press the black button and talk.
Headphones are recommended so the agent doesn't hear itself through the speakers.
`Reset demo` restores the seed database.

Production build: `npm run build && npm start` (serves `web/dist`, same port).

## Tests

```bash
npm test                    # unit tests: booking rules and the confirmation gate (no network)
npm run test:voice          # voice tests T1–T9 against the running app (needs the key; ~7 min)
npm run test:voice T1 T4    # selected cases
```

The voice tests play a **synthetic customer voice** (Deepgram Aura, a different voice from the agent) into the app
as microphone audio in real time — including a mid-sentence pause and a barge-in — and simulate the browser's playback.
The app processes new audio on every run; nothing is pre-scripted on the agent side.
Each run writes to `tests/voice/results/<timestamp>/`: a WAV of the whole conversation per test, JSON with events,
transcript and DB before/after, and `summary.md` with pass/fail, latency and cost.

Expected outcomes were written before testing: [docs/test-plan.md](docs/test-plan.md).

## How it works

```
Browser (React)                 Node server                          Deepgram Voice Agent API
mic 24 kHz PCM  ──────────────▶  /agent WebSocket  ────────────────▶  Flux speech recognition
agent audio     ◀──────────────  (API key stays here)  ◀────────────  Claude Haiku 4.5 (tools)
board state     ◀──────────────  runs function calls                  Aura-2 speech
                                 └▶ booking.ts + SQLite
```

- **The model never writes to the database.** It calls four tools (`update_request`, `check_availability`,
  `confirm_booking`, `start_new_request`). Availability, validation and saving are deterministic code
  with unit tests ([server/booking.ts](server/booking.ts)).
- **Availability** is checked for every day of the range (both ends inclusive) and re-checked inside the
  transaction that saves the booking.
- **No obsolete choices:** `confirm_booking` must repeat exactly the request the agent read back; if the request changed
  since, the confirmation is refused and the agent reads back again.
- **No duplicates:** one request can produce at most one booking (UNIQUE constraint); a repeated yes returns the same booking.
- **Explicit confirmation gate** ([server/confirm-gate.ts](server/confirm-gate.ts)): a booking is saved only if the
  user's last words are an explicit yes without hedges ("yes, but…", "let me think" don't count) **and** the user
  heard the whole read-back — a yes that interrupted the read-back is refused.
- **Barge-in:** when Deepgram detects the user speaking, the browser cuts the agent's audio immediately and tells
  the server, which feeds the confirmation gate.

## What is reused and what is ours

| Reused | Our work |
|---|---|
| Deepgram Voice Agent API (recognition, LLM hosting, speech) | Server bridge, tools, booking rules, confirmation gate, tests |
| Claude Haiku 4.5 via Deepgram | Agent prompt and tool design |
| Design system generated with Claude Design from our brief (`web/src/design/`) | Visual direction v2 in [web/src/theme.css](web/src/theme.css); changes to ProductCard, BookingReceipt, VoiceButton (live level), ConnectionIndicator |
| React, Vite, `ws`, Lucide icons, Geist font | Audio capture/playback with barge-in, latency measurement, voice test runner |
| Product photos generated with Nano Banana (Gemini) | Background removal and resizing |

Code was written with Claude Code (Claude Opus 5.5). See [docs/dev-log.md](docs/dev-log.md) for time spent,
tools, and how AI output was checked.

## Limitations

- Tested in desktop Chrome. The layout adapts down to phone width, but voice on mobile browsers was not tested.
- English only. Dates are assumed to be in 2026 unless said otherwise.
- The customer's name isn't collected (not required; names are the least reliable part of speech recognition).
- One conversation at a time; the SQLite database is shared by all visitors of a deployment.
