// Voice test cases from docs/test-plan.md. Each step is spoken by a synthetic customer voice
// (Deepgram Aura, a different voice from the agent) and streamed to the app as microphone audio.
//
// Step kinds:
//   { say }                          speak, then wait for the agent's full reply
//   { say, pauseMs, then }           speak, stay silent for pauseMs mid-sentence, speak the rest
//   { interrupt, afterMs }           start speaking afterMs into the agent's next reply (barge-in)
//
// Expectations are checked automatically against the database and the final request.

const T1_STEPS = [
  { say: "Hi, I'd like to rent a tripod from October fifth to October seventh." },
  { say: 'Yes, please book it.' },
];

export const CASES = [
  {
    id: 'T1',
    title: 'Normal booking',
    steps: T1_STEPS,
    expect: { newBookings: [{ itemId: 'tripod_b', quantity: 1, startDate: '2026-10-05', endDate: '2026-10-07' }] },
  },
  {
    id: 'T2',
    title: 'Corrected dates',
    steps: [
      { say: 'I need the microphone from October fourteenth to fifteenth. Actually, no, make it the sixteenth to the seventeenth.' },
      { say: 'Yes.' },
    ],
    expect: { newBookings: [{ itemId: 'microphone_c', quantity: 1, startDate: '2026-10-16', endDate: '2026-10-17' }] },
  },
  {
    id: 'T3',
    title: 'Insufficient stock',
    steps: [{ say: 'I need two cameras for October eleventh.' }, { say: "No thanks, that's all." }],
    expect: { newBookings: [], agentSays: /\b(one|1)\b/i },
  },
  {
    id: 'T4',
    title: 'Interruption during read-back',
    steps: [
      { say: 'Two tripods from October twentieth to twenty-second.' },
      { interrupt: 'Wait, make it three tripods.', afterMs: 1500 },
      { say: 'Yes.' },
    ],
    expect: {
      newBookings: [{ itemId: 'tripod_b', quantity: 3, startDate: '2026-10-20', endDate: '2026-10-22' }],
      interrupted: true,
    },
  },
  {
    id: 'T5',
    title: 'Repeated confirmation',
    steps: [...T1_STEPS, { say: 'Yes, confirm.' }, { say: 'Yes, yes, book it.' }],
    expect: { newBookings: [{ itemId: 'tripod_b', quantity: 1, startDate: '2026-10-05', endDate: '2026-10-07' }] },
  },
  {
    id: 'T6',
    title: 'Ambiguous date → clarification',
    steps: [{ say: 'Can I get the microphone from the tenth?' }],
    expect: { newBookings: [], agentAsks: true },
  },
  {
    id: 'T7',
    title: 'Unknown item → clarification or decline',
    steps: [{ say: 'I need a light stand for October eighth.' }],
    expect: { newBookings: [], agentSays: /tripod|camera|microphone/i },
  },
  {
    id: 'T8',
    title: 'No explicit confirmation',
    steps: [{ say: 'One camera for October twentieth.' }, { say: 'Hmm, let me think about it.' }],
    expect: { newBookings: [] },
  },
  {
    id: 'T9',
    title: 'Mid-sentence pause',
    steps: [{ say: 'I need a tripod from', pauseMs: 1500, then: 'October twenty-fourth to twenty-fifth.' }],
    expect: {
      newBookings: [],
      noReplyDuringPause: true,
      finalRequest: { itemId: 'tripod_b', startDate: '2026-10-24', endDate: '2026-10-25' },
    },
  },
];
