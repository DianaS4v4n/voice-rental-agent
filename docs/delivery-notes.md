# Delivery notes

Voice equipment booking agent — Diana, Product Builder test assignment, 2026-09-25 → 2026-09-30.

- **Demo:** https://voice-rental-agent.onrender.com (Render free tier: the first visit after 15 idle minutes takes up to ~50 s to wake the server)
- **Repository:** this repo; setup in [README.md](../README.md)
- **Video walkthrough:** _link added after recording_

## 1. What works

A browser voice agent (English) for a rental desk with Camera A × 2, Tripod B × 3, Microphone C × 1 and a seed booking
Camera A × 1, 10–12 Oct 2026. The customer talks; the agent collects item, quantity and dates, checks the real SQLite
inventory for every day of the range, reads the request back, and saves **one** booking only after an explicit yes.
Corrections, interruptions, unavailable requests, ambiguous input and repeated confirmations are handled; the screen shows
the live request, the saved booking and stock, and a reviewer drawer shows the database, before/after stock, per-turn
latency and session cost.

## 2. Test set: inputs, expected and actual results

Expected outcomes were committed **before** any test ran ([test-plan.md](test-plan.md), commit `a958cae`, 2026-09-25 17:51).
Inputs are spoken by a synthetic customer voice (Deepgram Aura `aura-2-apollo-en`, a different voice from the agent),
streamed to the app in real time as microphone audio — the app processes new audio every run.
Recordings, transcripts and DB before/after: [evidence/voice-tests-2026-09-28/](evidence/voice-tests-2026-09-28/)
(`T*.wav` = the whole conversation, `T*.json` = events, transcript, DB snapshots, checks). Reproduce with `npm run test:voice`.

| # | Input (customer says) | Expected | Actual (final run) | Result |
|---|---|---|---|---|
| T1 | "I'd like to rent a tripod from October fifth to October seventh." → "Yes, please book it." | 1 booking: Tripod B × 1, 5–7 Oct | Read back, booked BK-1001: Tripod B × 1, 5–7 Oct | ✅ |
| T2 | "…microphone from October fourteenth to fifteenth. Actually, no, make it the sixteenth to the seventeenth." → "Yes." | 1 booking on 16–17 Oct only | Read back 16–17, booked Microphone C × 1, 16–17 Oct; nothing on 14–15 | ✅ |
| T3 | "I need two cameras for October eleventh." → "No thanks, that's all." | Says only 1 free (seed holds the other), offers alternatives, no booking | "…we only have one Camera A free on October eleventh. Would you like to rent just one camera, or would different dates work better?" DB unchanged | ✅ |
| T4 | "Two tripods from October twentieth to twenty-second." → barge-in 1.5 s into the read-back: "Wait, make it three tripods." → "Yes." | Agent stops talking; books × 3, never × 2 | Playback cut on barge-in; re-read with × 3; booked Tripod B × 3, 20–22 Oct | ✅ |
| T5 | T1, then "Yes, confirm." → "Yes, yes, book it." | Same booking ID repeated, no duplicate | "Your booking is already confirmed with ID BK-1001." DB has exactly one new booking. The model answered from the conversation without calling `confirm_booking` again, so the server-side duplicate guard wasn't exercised here — it is covered by the unit test (a repeated confirm returns the same booking). The third phrase was recognised as "Yes. Yes. Okay." | ✅ |
| T6 | "Can I get the microphone from the tenth?" | Asks for end date / month, no booking | "Do you mean Microphone C from October tenth, and when would you return it — the same day, or a later date?" | ✅ |
| T7 | "I need a light stand for October eighth." | Doesn't map it to Tripod B; names the three items | "We don't have light stands. We rent Camera A, Tripod B, and Microphone C. Would any of those work for you?" | ✅ |
| T8 | "One camera for October twentieth." → "Hmm, let me think about it." | Not a confirmation; no booking | Read back, then "No problem, take your time." DB unchanged | ✅ |
| T9 | "I need a tripod from…" (1.5 s pause) "…October twenty-fourth to twenty-fifth." | Doesn't answer during the pause; final request Tripod B 24–25 | Final request correct, nothing saved — **but it answered in the pause** ("I'm listening. Which tripod model…?") | ❌ partial |

Unit tests (`npm test`, 18): availability per day with inclusive ends, corrections, refusing an obsolete confirmation,
idempotent repeat, re-check at confirmation time, validation, and the confirmation gate (explicit yes; a yes that
interrupted the read-back is refused).

## 3. What failed or is unfinished

- **T9 — mid-sentence pause.** Deepgram Flux ends the turn after ~1.5 s of silence on "I need a tripod from", so the agent
  replies into the pause. Nothing wrong is saved and barge-in stops it if the customer resumes, but it does answer.
  Tuning didn't fix it (see §4, B and D). Next step: hold the turn client-side when the transcript ends on a
  preposition/conjunction, or use eager end-of-turn with a "wait" decision from the model.
- **Bugs found and fixed during the work:** agent went silent after the first turn (Deepgram's agent API doesn't send
  `AgentStartedSpeaking`, which the barge-in logic waited for); dev server restart loop on Windows (`--watch-path`);
  clipped booking card; recorder clicks in test WAVs.
- **Not done:** a calendar where the agent visibly picks dates (designed, postponed); voice on mobile browsers not tested
  (layout adapts); one shared database for every visitor of a deployment (fine for a one-conversation demo, not for real use).
- A "second conversation doesn't update the UI" report couldn't be reproduced in a clean page (automated start → stop →
  start works); most likely caused by hot code reloads while the page was open during development.

## 4. Speed / quality / cost: what was measured and chosen

**Latency definition:** end of the customer's speech → first agent audio (the WebSocket client receives it; a browser adds
its output latency, typically 10–50 ms). **Useful answer:** end of speech → the agent's first line that isn't a short
acknowledgement (i.e. the reply that carries the availability or booking result). The browser UI measures the first
metric live from the microphone level and shows it in the reviewer drawer.

| Variant (all: Deepgram Flux STT + Aura-2 TTS) | Tests | First audio, per turn (ms) | Quality |
|---|---|---|---|
| A — Claude Haiku 4.5, default end-of-turn | T1–T9 | median 2227, p90 3036 | all DB checks pass; answers into the T9 pause |
| B — + eager end-of-turn (0.5) | T1 T4 T9 | 2453–4559 | not faster |
| C — GPT-4.1 mini instead of Haiku | T1 T4 T9 | 993–2769 | **T1 failed**: asked "how many tripods?" after "a tripod", booking never completed |
| D — end-of-turn threshold 0.85 | T1 T4 T9 | 2017–3131 | still answers into the T9 pause |
| A — repeated on T1 T2 T4 | T1 T2 T4 | median 2611 | pass |
| **E — A + "Let me check." before tool calls** | T1 T2 T4 | **median 2092** | pass |
| **Final (E) — full run** | T1–T9 | **median 1657, p90 2391, max 2445** (19 turns) | 8/9 (T9 partial) |
| Final — useful answer | T1–T9 | **median 2287, p90 3837** | |

**Deployed demo** (Render, US region; tests run from Europe): T1 and T3 pass; first audio median 2119 ms, useful answer median 3066 ms over 4 turns — the extra network hop adds ~0.4–0.8 s ([evidence](evidence/voice-tests-2026-09-28-render/)).

Time to a useful result for a whole booking: the booking is saved **25–27 s** after the conversation starts
(including the 5 s greeting) in T1, T2 and T4.

**Chosen tradeoff.** One speech vendor (Deepgram Voice Agent: recognition, hosted LLM, speech) with a small, fast LLM
(Claude Haiku 4.5, Standard tier). It gave built-in turn detection and barge-in within the time box, a flat per-minute
price, and the best booking reliability of what was tried: GPT-4.1 mini answered faster on simple turns but broke the
normal booking. The deterministic part (availability, validation, saving, confirmation gate) is ordinary code, so model
choice affects conversation quality and speed, never data correctness. The "Let me check." acknowledgement cuts
time-to-first-audio by ~0.5 s at no cost and no quality loss; the useful answer is reported separately so the gain isn't
overstated. Not measured (priced only): OpenAI Realtime speech-to-speech ($0.02–0.11/min published) and Gemini Live.

## 5. Cost

**Pricing assumptions** (published list prices, checked 2026-09-28):
Deepgram Voice Agent API, Standard tier, pay-as-you-go **$0.075 per minute of WebSocket connection** — includes Flux
speech recognition, the LLM (Claude Haiku 4.5 is a Standard-tier model) and Aura-2 speech. Tool calls run on our server
(no extra charge). There are no other paid intermediaries. Free signup credits ($200) were used but are **not** counted as zero.

| Item | Cost |
|---|---|
| Voice stack, per connected minute (recognition + reasoning + speech + retries, silence included) | **$0.075** |
| One booking conversation in tests (33–35 s: T1, T2, T4) | **≈ $0.042–0.044** |
| With repeated confirmations (T5, 51 s) | ≈ $0.064 |
| Estimated real customer booking (60–90 s with human pauses and corrections) | ≈ $0.075–0.11 |
| Full voice test run T1–T9 (4.4 min connected) | $0.33 |
| Synthetic customer voice for tests (Aura-2, ~16 short phrases, one-off, cached in the repo) | < $0.02 |
| **Hosting (separate):** Render free web service | $0 (sleeps after 15 min idle, ~50 s cold start) |
| Hosting, always-on alternative: Render Starter | $7 / month |

Development usage for the whole assignment (live tries + all test runs) was a few dollars at list price.

## 6. Time spent

See the time log in [dev-log.md](dev-log.md). Total ≈ **5.5–6 h** of focused work, including design iterations
(Claude Design, Nano Banana) and all test runs.

## 7. AI tools and how their output was checked

- **Claude Code** (VS Code extension, model **Claude Opus 5.5**, `claude-opus-5-5`) — code, tests, docs, test runner.
- **Claude Design** — first design system (tokens, components, UI kit); visual direction v2 was then done in code.
- **Nano Banana (Gemini image model)** — the three product photos; background removed by hand.
- **Deepgram Aura** — the synthetic customer voice for tests. **Claude Haiku 4.5** — the agent's LLM at runtime.

Examples of checking AI output:
1. **Tests that can fail.** All 13 booking tests written with Claude passed on the first run, so the inclusive-end-date
   rule was deliberately broken (`end_date >= ?` → `end_date > ?`); the right test failed, then passed after restoring.
2. **Reading transcripts, not only the green checks.** The first full voice run passed all automated checks, but the
   T9 transcript showed the agent answering into the pause — a check was added and T9 is now reported as a failure.
3. **Measuring the UI instead of trusting it.** A "row spacing looks uneven" report was confirmed by measuring element
   boxes in headless Chrome (22 px above vs 34 px below the text) and fixed to equal spacing.

## 8. What I'd improve next

1. Turn-holding for mid-sentence pauses (T9).
2. A calendar on the board where the requested and booked days light up as the customer speaks.
3. Live interim transcript (show words while the customer is still speaking).
4. Per-session isolation and simple auth for a multi-user deployment; a real database.
5. Compare a speech-to-speech model (OpenAI Realtime / Gemini Live) on the same test set for latency.
6. Ukrainian as a second language.
