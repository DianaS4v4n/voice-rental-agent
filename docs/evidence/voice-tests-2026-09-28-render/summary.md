# Voice test run 2026-09-28T14-39-44-render

App: https://voice-rental-agent.onrender.com · customer voice: Deepgram aura-2-apollo-en (synthetic) · 2/2 passed

| Test | Result | Checks | First audio / useful answer per turn (ms) | Duration |
|---|---|---|---|---|
| T1 Normal booking | PASS | ✓ New bookings: tripod_b|1|2026-10-05|2026-10-07 → tripod_b|1|2026-10-05|2026-10-07 | 2119, 2296<br>useful: 3270, 2316 | 31 s |
| T3 Insufficient stock | PASS | ✓ New bookings: none → none<br>✓ Agent says /\b(one|1)\b/i → Let me check. We only have one Camera A free on October eleventh. Would you like to rent just one camera, or would different dates work better for you? No probl | 2026, 1217<br>useful: 3066, 1337 | 26 s |

## Latency (end of customer speech → first agent audio received)

4 turns · median 2119 ms · p90 2296 ms · max 2296 ms

**Useful answer** (first audio of the reply that carries the tool result): 4 turns · median 3066 ms · p90 3270 ms · max 3270 ms

Measured at the WebSocket client, so it excludes browser playback buffering (the browser adds its output latency, typically 10–50 ms).

## Cost of this run

1.0 min of agent connection × $0.075/min = $0.071 (list price, not free credits).

## Transcripts

### T1 Normal booking

- **Agent** (0.8 s): Hi, this is the rental desk. What would you like to rent, and for which days?
- **Customer** (12.7 s): Hi. I'd like to rent a tripod from October fifth to October seventh.
- **Agent** (13.5 s): Let me check.
- **Agent** (14.7 s): One Tripod B from October fifth to seventh is available.
- **Agent** (18.5 s): Shall I book it?
- **Customer** (23.1 s): Yes. Please book it.
- **Agent** (24.6 s): Done.
- **Agent** (25.2 s): Your booking ID is BK-1001.
- **Agent** (29.1 s): Anything else?

### T3 Insufficient stock

- **Agent** (0.7 s): Hi, this is the rental desk. What would you like to rent, and for which days?
- **Customer** (9.9 s): I need two cameras for October eleventh.
- **Agent** (10.7 s): Let me check.
- **Agent** (11.7 s): We only have one Camera A free on October eleventh.
- **Agent** (15.0 s): Would you like to rent just one camera, or would different dates work better for you?
- **Customer** (22.5 s): No. Thanks. That's all.
- **Agent** (22.5 s): No problem, thanks for stopping by!
