// Deepgram Voice Agent settings: speech recognition, the LLM with its tools, and the voice.

import { ITEMS } from './booking.ts';

export const DEEPGRAM_AGENT_URL = 'wss://agent.deepgram.com/v1/agent/converse';

/** Audio format shared with the browser: 16-bit PCM, mono, 24 kHz, both directions. */
export const SAMPLE_RATE = 24000;

const ITEM_IDS = ITEMS.map((item) => item.id);

export const FUNCTIONS = [
  {
    name: 'update_request',
    description:
      'Create or correct the current booking request. Pass only the fields the user just gave or changed. ' +
      'Returns the full request, its availability and what is still missing. Call it every time the user gives or changes an item, quantity or date.',
    parameters: {
      type: 'object',
      properties: {
        item: { type: 'string', enum: ITEM_IDS, description: 'camera_a = Camera A, tripod_b = Tripod B, microphone_c = Microphone C' },
        quantity: { type: 'integer', minimum: 1 },
        start_date: { type: 'string', description: 'First rental day, YYYY-MM-DD' },
        end_date: { type: 'string', description: 'Last rental day (inclusive), YYYY-MM-DD. Same as start_date for one day.' },
      },
    },
  },
  {
    name: 'check_availability',
    description: 'Free units of every item for a date range, without changing the request. Use it to suggest alternatives.',
    parameters: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: 'YYYY-MM-DD' },
        end_date: { type: 'string', description: 'YYYY-MM-DD, inclusive' },
      },
      required: ['start_date', 'end_date'],
    },
  },
  {
    name: 'confirm_booking',
    description:
      'Save the booking. Call ONLY right after the user explicitly said yes to your read-back of the complete, available request. ' +
      'Pass exactly the values you read back.',
    parameters: {
      type: 'object',
      properties: {
        item: { type: 'string', enum: ITEM_IDS },
        quantity: { type: 'integer', minimum: 1 },
        start_date: { type: 'string' },
        end_date: { type: 'string' },
      },
      required: ['item', 'quantity', 'start_date', 'end_date'],
    },
  },
  {
    name: 'start_new_request',
    description: 'Start a separate, new booking request after the current one was confirmed.',
    parameters: { type: 'object', properties: {} },
  },
];

function buildPrompt(today: string): string {
  const weekday = new Date(`${today}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  return `You are the voice agent of a small equipment rental desk. You speak English. Today is ${weekday}, ${today}.

We rent exactly three items, by whole days (both the first and last day count):
- Camera A (2 units)
- Tripod B (3 units)
- Microphone C (1 unit)
Nothing else. If the user asks for anything else, say we don't have it and name the three items. Never map an unknown item to one of ours on your own; ask.

How to work:
- Collect item, quantity and dates. Call update_request as soon as the user gives or changes any of them, then use its result. Never guess availability yourself.
- Clarify instead of guessing: a missing end date, a missing month, "next weekend", "a few days", or an unclear item. Say the concrete dates you understood and ask.
- If the request is not available, say how many units are free and offer fewer units or other dates. Do not ask for a confirmation of an unavailable request.
- When update_request says the request is ready, read it back in one sentence (item, quantity, dates spelled out, e.g. "October 5 to 7") and ask "Shall I book it?".
- Call confirm_booking only after the user answers that read-back with a clear yes. Pass exactly what you read back. If it returns an error, follow its guidance.
- If the user changes anything after your read-back, call update_request again and read back the new request. Never book an old version.
- After a booking, give the booking ID. If the user confirms again, say it's already booked with the same ID; don't book twice.
- Dates are in 2026 unless the user says otherwise. Don't book dates in the past.

Style: calm counter clerk. One or two short sentences per turn. No lists, no emoji, no markdown. Spell dates out for speech.`;
}

export function buildSettings(today: string) {
  return {
    type: 'Settings',
    audio: {
      input: { encoding: 'linear16', sample_rate: SAMPLE_RATE },
      output: { encoding: 'linear16', sample_rate: SAMPLE_RATE, container: 'none' },
    },
    agent: {
      listen: {
        provider: {
          type: 'deepgram',
          model: 'flux-general-en',
          version: 'v2',
          keyterms: ['Camera A', 'Tripod B', 'Microphone C', 'tripod', 'microphone'],
        },
      },
      think: {
        provider: {
          type: process.env.THINK_PROVIDER ?? 'anthropic',
          model: process.env.THINK_MODEL ?? 'claude-haiku-4-5',
          temperature: 0.2,
        },
        prompt: buildPrompt(today),
        functions: FUNCTIONS,
      },
      speak: {
        provider: { type: 'deepgram', model: process.env.SPEAK_MODEL ?? 'aura-2-thalia-en' },
      },
      greeting: 'Hi, this is the rental desk. What would you like to rent, and for which days?',
    },
  };
}
