# Voice test run 2026-09-28T14-11-40-final

App: http://localhost:3000 · customer voice: Deepgram aura-2-apollo-en (synthetic) · 8/9 passed

| Test | Result | Checks | First audio / useful answer per turn (ms) | Duration |
|---|---|---|---|---|
| T1 Normal booking | PASS | ✓ New bookings: tripod_b|1|2026-10-05|2026-10-07 → tripod_b|1|2026-10-05|2026-10-07 | 2168, 2247<br>useful: 3837, 2287 | 34 s |
| T2 Corrected dates | PASS | ✓ New bookings: microphone_c|1|2026-10-16|2026-10-17 → microphone_c|1|2026-10-16|2026-10-17 | 2004, 2224<br>useful: 2807, 2244 | 33 s |
| T3 Insufficient stock | PASS | ✓ New bookings: none → none<br>✓ Agent says /\b(one|1)\b/i → Let me check. I'm sorry, we only have one Camera A free on October eleventh. Would you like to rent just one camera, or would different dates work better for yo | 1401, 1186<br>useful: 2462, 1306 | 27 s |
| T4 Interruption during read-back | PASS | ✓ New bookings: tripod_b|3|2026-10-20|2026-10-22 → tripod_b|3|2026-10-20|2026-10-22<br>✓ Agent was interrupted and stopped talking → playback cut on barge-in | 1781, 1357, 2169<br>useful: 2793, 2697, 2249 | 35 s |
| T5 Repeated confirmation | PASS | ✓ New bookings: tripod_b|1|2026-10-05|2026-10-07 → tripod_b|1|2026-10-05|2026-10-07 | 2391, 2445, 969, 1585<br>useful: 4032, 2465, 969, 1614 | 51 s |
| T6 Ambiguous date → clarification | PASS | ✓ New bookings: none → none<br>✓ Agent asks a clarifying question → Let me clarify the dates. Do you mean Microphone C from October tenth, and when would you return it—the same day, or a later date? | 1564<br>useful: 1564 | 19 s |
| T7 Unknown item → clarification or decline | PASS | ✓ New bookings: none → none<br>✓ Agent says /tripod|camera|microphone/i → We don't have light stands. We rent Camera A, Tripod B, and Microphone C. Would any of those work for you? | 1657<br>useful: 1697 | 20 s |
| T8 No explicit confirmation | PASS | ✓ New bookings: none → none | 2104, 1385<br>useful: 2935, 1525 | 22 s |
| T9 Mid-sentence pause | **FAIL** | ✓ New bookings: none → none<br>✗ Agent stays silent during the mid-sentence pause → answered in the pause: "I'm listening."<br>✓ Final request tripod_b 2026-10-24 2026-10-25 → tripod_b 2026-10-24 2026-10-25 | 1364, 1172<br>useful: 1384, 2453 | 25 s |

## Latency (end of customer speech → first agent audio received)

19 turns · median 1657 ms · p90 2391 ms · max 2445 ms

**Useful answer** (first audio of the reply that carries the tool result): 19 turns · median 2287 ms · p90 3837 ms · max 4032 ms

Measured at the WebSocket client, so it excludes browser playback buffering (the browser adds its output latency, typically 10–50 ms).

## Cost of this run

4.4 min of agent connection × $0.075/min = $0.331 (list price, not free credits).

## Transcripts

### T1 Normal booking

- **Agent** (1.2 s): Hi, this is the rental desk. What would you like to rent, and for which days?
- **Customer** (12.8 s): Hi. I'd like to rent a tripod from October fifth to October seventh.
- **Agent** (13.6 s): Let me check that for you.
- **Agent** (15.2 s): Perfect, one Tripod B from October fifth to October seventh is available.
- **Agent** (20.9 s): Shall I book it?
- **Customer** (25.4 s): Yes. Please book it.
- **Agent** (26.8 s): Done!
- **Agent** (27.4 s): Your booking ID is BK-1001.
- **Agent** (31.7 s): Anything else?

### T2 Corrected dates

- **Agent** (1.3 s): Hi, this is the rental desk. What would you like to rent, and for which days?
- **Customer** (16.1 s): I need the microphone from October fourteenth to fifteenth. Actually, no. Make it the sixteenth to the seventeenth.
- **Agent** (17.0 s): Let me check.
- **Agent** (17.8 s): One Microphone C from October sixteenth to seventeenth.
- **Agent** (21.4 s): Shall I book it?
- **Customer** (24.2 s): Yes.
- **Agent** (25.7 s): Done, your booking ID is BK-1001.
- **Agent** (30.6 s): Anything else?

### T3 Insufficient stock

- **Agent** (1.3 s): Hi, this is the rental desk. What would you like to rent, and for which days?
- **Customer** (10.4 s): I need two cameras for October eleventh.
- **Agent** (10.6 s): Let me check.
- **Agent** (11.7 s): I'm sorry, we only have one Camera A free on October eleventh.
- **Agent** (16.1 s): Would you like to rent just one camera, or would different dates work better for you?
- **Customer** (23.7 s): No. Thanks. That's all.
- **Agent** (23.7 s): No problem, thanks for stopping by!

### T4 Interruption during read-back

- **Agent** (1.1 s): Hi, this is the rental desk. What would you like to rent, and for which days?
- **Customer** (11.8 s): Two tripods from October twentieth to twenty second.
- **Agent** (12.3 s): Let me check.
- **Agent** (13.3 s): Two Tripod B from October twentieth to twenty-second.
- **Customer** (17.6 s): Wait. Make it three tripods.
- **Agent** (18.0 s): Let me update that.
- **Agent** (19.3 s): Three Tripod B from October twentieth to twenty-second.
- **Agent** (23.5 s): Shall I book it?
- **Customer** (26.3 s): Yes.
- **Agent** (27.7 s): Perfect, your booking ID is BK-1001.
- **Agent** (32.7 s): Anything else?

### T5 Repeated confirmation

- **Agent** (1.3 s): Hi, this is the rental desk. What would you like to rent, and for which days?
- **Customer** (14.2 s): Hi. I'd like to rent a tripod from October fifth to October seventh.
- **Agent** (15.0 s): Let me check that for you.
- **Agent** (16.5 s): Perfect, one Tripod B from October fifth to October seventh is available.
- **Agent** (21.6 s): Shall I book it?
- **Customer** (26.2 s): Yes. Please book it.
- **Agent** (27.7 s): Done!
- **Agent** (28.3 s): Your booking ID is BK-1001.
- **Agent** (32.6 s): Anything else?
- **Customer** (36.5 s): Yes. Confirm.
- **Agent** (36.5 s): Your booking is already confirmed with ID BK-1001.
- **Agent** (41.3 s): Is there anything else you'd like to rent?
- **Customer** (47.0 s): Yes. Yes. Okay.
- **Agent** (47.6 s): What would you like to rent, and for which days?

### T6 Ambiguous date → clarification

- **Agent** (1.4 s): Hi, this is the rental desk. What would you like to rent, and for which days?
- **Customer** (9.4 s): Can I get the microphone from the tenth?
- **Agent** (10.6 s): Let me clarify the dates.
- **Agent** (12.2 s): Do you mean Microphone C from October tenth, and when would you return it—the same day, or a later date?

### T7 Unknown item → clarification or decline

- **Agent** (1.4 s): Hi, this is the rental desk. What would you like to rent, and for which days?
- **Customer** (11.6 s): I need a light stand for October eighth.
- **Agent** (11.9 s): We don't have light stands.
- **Agent** (13.5 s): We rent Camera A, Tripod B, and Microphone C.
- **Agent** (17.5 s): Would any of those work for you?

### T8 No explicit confirmation

- **Agent** (1.4 s): Hi, this is the rental desk. What would you like to rent, and for which days?
- **Customer** (10.6 s): One camera for October twentieth.
- **Agent** (11.2 s): Let me check.
- **Agent** (12.0 s): One Camera A for October twentieth.
- **Agent** (14.5 s): Shall I book it?
- **Customer** (19.3 s): let me think about it.
- **Agent** (19.3 s): No problem, take your time.

### T9 Mid-sentence pause

- **Agent** (1.2 s): Hi, this is the rental desk. What would you like to rent, and for which days?
- **Customer** (10.2 s): I need a tripod from
- **Agent** (10.2 s): I'm listening.
- **Agent** (11.2 s): Which tripod model, and what dates do you need it for?
- **Customer** (13.9 s): October twenty fourth to twenty fifth.
- **Agent** (14.3 s): Let me check.
- **Agent** (15.3 s): One Tripod B from October 24 to 25?
- **Agent** (19.1 s): One Tripod B from October twenty fourth to twenty fifth.
- **Agent** (23.3 s): Shall I book it?
