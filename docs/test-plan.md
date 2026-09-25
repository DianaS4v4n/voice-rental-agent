# Test plan

Expected outcomes are written **before** any test is run. The commit that adds this file is the timestamp.
Actual results are filled in later, in a separate commit, without editing the expectations.

## Fixed setup

Every test starts from **Reset demo**, which restores this state:

| Item | Stock |
|---|---|
| Camera A | 2 |
| Tripod B | 3 |
| Microphone C | 1 |

Seed booking: **Camera A × 1, 10–12 October 2026, inclusive.**
(The brief doesn't state the quantity of the seed booking; we assume 1.)

Rules the tests check:
- Dates are whole days, both ends inclusive. An item is available for a range only if it is free on **every** day of it.
- A booking is saved only after the agent has read back the final summary **and** the user explicitly confirms it.
- The database has **no** "update booking" path: a correction changes the draft, never a saved booking.
- Confirming the same draft twice returns the existing booking and writes nothing new.
- Dates in the past are rejected.

Each voice test is a recorded WAV file played into the app as the microphone (Chrome fake-audio-capture),
so the app processes real audio every run. For each test we save: DB snapshot before, DB snapshot after,
transcript, and per-turn latency.

## Test cases

### T1 — Normal booking
**Say:** "Hi, I'd like to rent a tripod from October 5th to October 7th." → agent reads back → "Yes, please book it."
**Expected:**
- Agent reads back: Tripod B × 1, 5–7 October, available.
- After "yes": exactly **one** new booking: Tripod B × 1, 5–7 Oct.
- Screen: Tripod B shows 2 of 3 free for 5–7 Oct; booking ID visible.

### T2 — Corrected dates
**Say:** "I need the microphone from October 14th to 15th… actually no, make it the 16th to the 17th." → "Yes."
**Expected:**
- Agent's read-back uses **16–17 Oct** only; 14–15 is never mentioned as the final choice.
- After "yes": one booking, Microphone C × 1, 16–17 Oct. **No** booking on 14–15 Oct.

### T3 — Insufficient stock
**Say:** "I need two cameras for October 11th." → agent explains → "No thanks, that's all."
**Expected:**
- Agent says only **1** Camera A is free on 11 Oct (the seed booking holds the other) and offers 1 camera or other dates.
- Agent does **not** ask for a booking confirmation for 2 cameras.
- After "No thanks": DB unchanged (still only the seed booking).

### T4 — Interruption during read-back
**Say:** "Two tripods from October 20th to 22nd." → while the agent is reading back → interrupt: "Wait — make it three tripods." → "Yes."
**Expected:**
- Agent audio stops within ~1 s of the user starting to speak; it doesn't talk over the user.
- Agent reads back the new summary: Tripod B × **3**, 20–22 Oct.
- After "yes": one booking, Tripod B × 3. **No** booking with quantity 2.

### T5 — Repeated confirmation
Continue T1 after the booking is confirmed. **Say:** "Yes, confirm." → "Yes, yes, book it."
**Expected:**
- Agent says it's already booked and repeats the same booking ID.
- DB still has exactly **one** booking from T1 (no duplicate).

### T6 — Ambiguous date → clarification
**Say:** "Can I get the microphone from the 10th?"
**Expected:**
- Agent asks for the missing information (end date / how many days) and confirms the month.
- No availability result or confirmation request until dates are complete.
- DB unchanged.

### T7 — Unknown item → clarification or decline
**Say:** "I need a light stand for October 8th."
**Expected:**
- Agent says it only rents Camera A, Tripod B and Microphone C and asks which one (or whether "stand" means the tripod).
- It does **not** silently map "light stand" to Tripod B and book it.
- DB unchanged.

### T8 — No explicit confirmation
**Say:** "One camera for October 20th." → agent reads back → "Hmm, let me think about it."
**Expected:**
- "Let me think" is not treated as a confirmation. No booking is saved.
- DB unchanged.

### T9 — Mid-sentence pause
**Say:** "I need a tripod from…" (pause ~1.5 s) "…October 24th to 25th."
**Expected:**
- Agent doesn't answer during the pause, or answers only after the full request.
- Final read-back: Tripod B × 1, 24–25 Oct.
- The exact pause the system tolerates is measured and reported, not promised.

## Measurements (per test run)

- **Latency:** time from the end of the user's speech to the first audible sample of the agent's reply, per turn.
  Reported as median and worst case, with the number of turns.
- **Cost:** minutes of session × published price per minute of the voice stack, plus any separate LLM/TTS
  charges. Hosting reported separately. Free credits are not counted as zero cost.
