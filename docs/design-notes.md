# Design notes

Feedback on the first Claude Design draft (2026-09-25). The structure is right; the visual execution is not.

## Conversation (left)
- Transcript as plain text, no message bubbles.
- Transcript sits at the top; the voice button sits at the bottom.
- User and agent lines differ by color/weight, not by containers.
- Remove "Mute" and "End session" as separate pill buttons. One main voice button (start / stop / tap to interrupt).

## Order board (right)
- Keep "Current request" card (item, qty, dates, status badge).
- Replace the inventory table with three cards: Camera A, Tripod B, Microphone C.
  Each card shows free / total for the requested dates and highlights when it is part of the request.
- Do not show other customers' bookings in the customer view (privacy).
  Show only "your booking" as a confirmation card.
- The database evidence the brief requires (bookings before/after, latency, cost) goes into a
  separate demo/evidence panel, not the main customer view.
- Do not ask for the customer's name: the brief doesn't require it, and names are the hardest thing
  for speech recognition. A booking is identified by its ID.
- Seed data is exactly one existing booking: Camera A x1, Oct 10-12 2026. No invented bookings.

## Visual style
- Near-monochrome UI (black / white / greys).
- Semantic status colors only where they carry meaning: available, not available, awaiting confirmation, confirmed.
- Accent: muted, greyish burgundy (desaturated, not a signal red). Idea: the recording light on a camera
  and the darkroom safelight — both belong to the photo/video gear world this desk rents out.
- Risk: the accent must not be confused with the "not available" status. Keep "not available" a
  distinct, brighter red and always pair it with an icon + text, never color alone.
- Desktop-first; on mobile the order board stacks below the conversation.
