// Development-only fixtures: open /?preview=<state> to see a board state without a live conversation.
// Used for screenshot checks of the layout at different screen sizes.

const SEED = { id: 'BK-1000', itemId: 'camera_a', itemName: 'Camera A', quantity: 1, startDate: '2026-10-10', endDate: '2026-10-12', createdAt: 'seed' };
const BOOKED = { id: 'BK-1001', itemId: 'tripod_b', itemName: 'Tripod B', quantity: 1, startDate: '2026-10-05', endDate: '2026-10-07', createdAt: '2026-09-25T21:25:40.000Z' };

const inventory = (camera, tripod, mic) => [
  { itemId: 'camera_a', name: 'Camera A', total: 2, free: camera },
  { itemId: 'tripod_b', name: 'Tripod B', total: 3, free: tripod },
  { itemId: 'microphone_c', name: 'Microphone C', total: 1, free: mic },
];

const draft = (fields) => ({ id: 'd1', version: 2, bookingId: null, missing: [], ...fields });

const lines = [
  { id: 1, speaker: 'agent', text: 'Hi, this is the rental desk. What would you like to rent, and for which days?' },
  { id: 2, speaker: 'user', text: 'I need a tripod from October fifth to seventh.' },
  { id: 3, speaker: 'agent', text: 'One Tripod B from October 5 to 7. Shall I book it?' },
];

const STATES = {
  awaiting: {
    board: { request: draft({ itemId: 'tripod_b', itemName: 'Tripod B', quantity: 1, startDate: '2026-10-05', endDate: '2026-10-07', status: 'awaiting_confirmation', freeUnits: 3 }), inventory: inventory(2, 3, 1), bookings: [SEED] },
    lines,
    lastEvent: null,
  },
  unavailable: {
    board: { request: draft({ itemId: 'camera_a', itemName: 'Camera A', quantity: 2, startDate: '2026-10-11', endDate: '2026-10-11', status: 'unavailable', freeUnits: 1 }), inventory: inventory(1, 3, 1), bookings: [SEED] },
    lines: [...lines.slice(0, 1), { id: 2, speaker: 'user', text: 'Two cameras for October 11th.' }, { id: 3, speaker: 'agent', text: 'Only one Camera A is free on October 11. I can book one, or we can try other dates.' }],
    lastEvent: null,
  },
  booked: {
    board: { request: draft({ itemId: 'tripod_b', itemName: 'Tripod B', quantity: 1, startDate: '2026-10-05', endDate: '2026-10-07', status: 'confirmed', freeUnits: null, bookingId: 'BK-1001' }), inventory: inventory(2, 2, 1), bookings: [SEED, BOOKED] },
    lines: [...lines, { id: 4, speaker: 'user', text: 'Yes.' }, { id: 5, speaker: 'system', text: 'Booking BK-1001 saved', tone: 'success' }, { id: 6, speaker: 'agent', text: 'Perfect, your booking ID is BK-1001. Anything else?' }],
    lastEvent: { kind: 'booked', bookingId: 'BK-1001', at: 1, before: inventory(2, 3, 1), after: inventory(2, 2, 1) },
  },
};

export const PREVIEW = import.meta.env.DEV ? STATES[new URLSearchParams(location.search).get('preview')] ?? null : null;
