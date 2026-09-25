import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { openBookingService, BookingError, type BookingService } from './booking.ts';

const TODAY = '2026-09-25';
let service: BookingService;
let session: string;

beforeEach(() => {
  service = openBookingService({ today: () => TODAY });
  session = 'session-1';
});
afterEach(() => service.close());

function expectError(fn: () => unknown, code: string) {
  assert.throws(fn, (error: unknown) => error instanceof BookingError && error.code === code);
}

test('starts with the seed inventory and the one existing Camera A booking', () => {
  const bookings = service.listBookings();
  assert.equal(bookings.length, 1);
  assert.deepEqual(
    { id: bookings[0].id, item: bookings[0].itemId, qty: bookings[0].quantity, from: bookings[0].startDate, to: bookings[0].endDate },
    { id: 'BK-1000', item: 'camera_a', qty: 1, from: '2026-10-10', to: '2026-10-12' },
  );
  assert.deepEqual(
    service.inventory('2026-10-01').map((row) => [row.itemId, row.total, row.free]),
    [['camera_a', 2, 2], ['tripod_b', 3, 3], ['microphone_c', 1, 1]],
  );
});

test('availability treats both ends of a booking as booked days', () => {
  assert.equal(service.freeUnits('camera_a', '2026-10-09', '2026-10-09'), 2);
  assert.equal(service.freeUnits('camera_a', '2026-10-10', '2026-10-10'), 1);
  assert.equal(service.freeUnits('camera_a', '2026-10-12', '2026-10-12'), 1);
  assert.equal(service.freeUnits('camera_a', '2026-10-13', '2026-10-13'), 2);
  // A range that only touches one booked day is still limited by it.
  assert.equal(service.freeUnits('camera_a', '2026-10-05', '2026-10-10'), 1);
});

test('T1 normal booking: saves exactly one booking after confirmation', () => {
  let draft = service.updateDraft(session, { itemId: 'tripod_b', quantity: 1 });
  assert.equal(draft.status, 'collecting');
  assert.deepEqual(draft.missing, ['startDate', 'endDate']);

  draft = service.updateDraft(session, { startDate: '2026-10-05', endDate: '2026-10-07' });
  assert.equal(draft.status, 'awaiting_confirmation');
  assert.equal(draft.freeUnits, 3);

  const { booking, alreadyConfirmed } = service.confirm(session, {
    itemId: 'tripod_b', quantity: 1, startDate: '2026-10-05', endDate: '2026-10-07',
  });
  assert.equal(alreadyConfirmed, false);
  assert.equal(booking.id, 'BK-1001');
  assert.equal(service.listBookings().length, 2);
  assert.equal(service.freeUnits('tripod_b', '2026-10-05', '2026-10-07'), 2);
  assert.equal(service.currentDraft(session)!.status, 'confirmed');
});

test('T2 corrected dates: a confirmation for the old dates is refused', () => {
  service.updateDraft(session, { itemId: 'microphone_c', quantity: 1, startDate: '2026-10-14', endDate: '2026-10-15' });
  const corrected = service.updateDraft(session, { startDate: '2026-10-16', endDate: '2026-10-17' });
  assert.equal(corrected.version, 3);

  expectError(
    () => service.confirm(session, { itemId: 'microphone_c', quantity: 1, startDate: '2026-10-14', endDate: '2026-10-15' }),
    'request_changed',
  );
  assert.equal(service.listBookings().length, 1);

  const { booking } = service.confirm(session, {
    itemId: 'microphone_c', quantity: 1, startDate: '2026-10-16', endDate: '2026-10-17',
  });
  assert.equal(booking.startDate, '2026-10-16');
  assert.equal(service.freeUnits('microphone_c', '2026-10-14', '2026-10-15'), 1);
});

test('T3 insufficient stock: the request is unavailable and cannot be confirmed', () => {
  const draft = service.updateDraft(session, {
    itemId: 'camera_a', quantity: 2, startDate: '2026-10-11', endDate: '2026-10-11',
  });
  assert.equal(draft.status, 'unavailable');
  assert.equal(draft.freeUnits, 1);

  expectError(
    () => service.confirm(session, { itemId: 'camera_a', quantity: 2, startDate: '2026-10-11', endDate: '2026-10-11' }),
    'unavailable',
  );
  assert.equal(service.listBookings().length, 1);
});

test('T4 interruption / quantity change: only the latest quantity is saved', () => {
  service.updateDraft(session, { itemId: 'tripod_b', quantity: 2, startDate: '2026-10-20', endDate: '2026-10-22' });
  service.updateDraft(session, { quantity: 3 });
  expectError(
    () => service.confirm(session, { itemId: 'tripod_b', quantity: 2, startDate: '2026-10-20', endDate: '2026-10-22' }),
    'request_changed',
  );
  const { booking } = service.confirm(session, {
    itemId: 'tripod_b', quantity: 3, startDate: '2026-10-20', endDate: '2026-10-22',
  });
  assert.equal(booking.quantity, 3);
  assert.equal(service.listBookings().filter((b) => b.itemId === 'tripod_b').length, 1);
});

test('T5 repeated confirmation returns the same booking and writes nothing', () => {
  const request = { itemId: 'tripod_b', quantity: 1, startDate: '2026-10-05', endDate: '2026-10-07' };
  service.updateDraft(session, request);
  const first = service.confirm(session, request);
  const second = service.confirm(session, request);
  const third = service.confirm(session, request);

  assert.equal(second.alreadyConfirmed, true);
  assert.equal(second.booking.id, first.booking.id);
  assert.equal(third.booking.id, first.booking.id);
  assert.equal(service.listBookings().length, 2);
});

test('a confirmed request cannot be changed; a new request is needed', () => {
  const request = { itemId: 'tripod_b', quantity: 1, startDate: '2026-10-05', endDate: '2026-10-07' };
  service.updateDraft(session, request);
  service.confirm(session, request);
  expectError(() => service.updateDraft(session, { quantity: 2 }), 'already_confirmed');

  service.newDraft(session);
  const next = service.updateDraft(session, { ...request, quantity: 2 });
  assert.equal(next.status, 'awaiting_confirmation');
  assert.equal(next.freeUnits, 2);
});

test('T6 incomplete request cannot be confirmed', () => {
  service.updateDraft(session, { itemId: 'microphone_c', startDate: '2026-10-10' });
  const draft = service.currentDraft(session)!;
  assert.equal(draft.status, 'collecting');
  assert.deepEqual(draft.missing, ['quantity', 'endDate']);
  expectError(
    () => service.confirm(session, { itemId: 'microphone_c', quantity: 1, startDate: '2026-10-10', endDate: '2026-10-10' }),
    'not_ready',
  );
});

test('T7 unknown item is rejected, not mapped to something else', () => {
  expectError(() => service.updateDraft(session, { itemId: 'light_stand' }), 'unknown_item');
});

test('invalid dates are rejected and leave the request unchanged', () => {
  service.updateDraft(session, { itemId: 'tripod_b', quantity: 1, startDate: '2026-10-05', endDate: '2026-10-07' });
  const before = service.currentDraft(session)!;

  expectError(() => service.updateDraft(session, { startDate: '2026-09-20' }), 'date_in_past');
  expectError(() => service.updateDraft(session, { endDate: '2026-10-01' }), 'end_before_start');
  expectError(() => service.updateDraft(session, { startDate: '2026-02-30' }), 'invalid_date');
  expectError(() => service.updateDraft(session, { quantity: 0 }), 'invalid_quantity');
  // A patch with one bad field changes nothing, not even the valid fields.
  expectError(() => service.updateDraft(session, { quantity: 2, startDate: '2026-09-20' }), 'date_in_past');

  assert.deepEqual(service.currentDraft(session), before);
});

test('availability is re-checked at confirmation time', () => {
  const request = { itemId: 'microphone_c', quantity: 1, startDate: '2026-10-20', endDate: '2026-10-21' };
  service.updateDraft(session, request);
  // Another conversation takes the only microphone in between.
  service.updateDraft('session-2', request);
  service.confirm('session-2', request);

  expectError(() => service.confirm(session, request), 'unavailable');
  assert.equal(service.listBookings().length, 2);
});

test('reset restores the seed state', () => {
  const request = { itemId: 'tripod_b', quantity: 1, startDate: '2026-10-05', endDate: '2026-10-07' };
  service.updateDraft(session, request);
  service.confirm(session, request);
  service.reset();
  assert.equal(service.listBookings().length, 1);
  assert.equal(service.currentDraft(session), null);
});
