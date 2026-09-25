// Booking domain logic. The voice model never writes to the database directly:
// it can only call these functions, and every rule below is enforced here in code.

import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { daysInRange, isValidDay, localToday } from './dates.ts';

export const ITEMS = [
  { id: 'camera_a', name: 'Camera A', stock: 2 },
  { id: 'tripod_b', name: 'Tripod B', stock: 3 },
  { id: 'microphone_c', name: 'Microphone C', stock: 1 },
] as const;

export type ItemId = (typeof ITEMS)[number]['id'];

// The brief's existing booking. Its quantity isn't specified; we assume 1.
const SEED_BOOKING = { num: 1000, itemId: 'camera_a', quantity: 1, startDate: '2026-10-10', endDate: '2026-10-12' };

const MAX_RENTAL_DAYS = 60;

export type DraftStatus = 'collecting' | 'unavailable' | 'awaiting_confirmation' | 'confirmed';

export interface DraftFields {
  itemId: ItemId | null;
  quantity: number | null;
  startDate: string | null;
  endDate: string | null;
}

export interface Draft extends DraftFields {
  id: string;
  sessionId: string;
  version: number;
  bookingId: string | null;
  itemName: string | null;
  status: DraftStatus;
  /** Fields the agent still has to ask for. */
  missing: (keyof DraftFields)[];
  /** Free units of the requested item for the requested dates, once both are known. */
  freeUnits: number | null;
}

export interface Booking {
  id: string;
  itemId: ItemId;
  itemName: string;
  quantity: number;
  startDate: string;
  endDate: string;
  draftId: string | null;
  createdAt: string;
}

export interface InventoryRow {
  itemId: ItemId;
  name: string;
  total: number;
  booked: number;
  free: number;
}

export type DraftPatch = Partial<{ itemId: string; quantity: number; startDate: string; endDate: string }>;

export type ConfirmRequest = { itemId: string; quantity: number; startDate: string; endDate: string };

export class BookingError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS items (
    id    TEXT PRIMARY KEY,
    name  TEXT NOT NULL,
    stock INTEGER NOT NULL CHECK (stock >= 0)
  );
  CREATE TABLE IF NOT EXISTS bookings (
    num        INTEGER PRIMARY KEY,
    item_id    TEXT NOT NULL REFERENCES items(id),
    quantity   INTEGER NOT NULL CHECK (quantity > 0),
    start_date TEXT NOT NULL,
    end_date   TEXT NOT NULL CHECK (end_date >= start_date),
    draft_id   TEXT UNIQUE,  -- one draft can never produce two bookings
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS drafts (
    id         TEXT PRIMARY KEY,
    seq        INTEGER NOT NULL,
    session_id TEXT NOT NULL,
    version    INTEGER NOT NULL DEFAULT 1,
    item_id    TEXT,
    quantity   INTEGER,
    start_date TEXT,
    end_date   TEXT,
    booking_id TEXT
  );
`;

interface DraftRow {
  id: string;
  session_id: string;
  version: number;
  item_id: ItemId | null;
  quantity: number | null;
  start_date: string | null;
  end_date: string | null;
  booking_id: string | null;
}

interface BookingRow {
  num: number;
  item_id: ItemId;
  quantity: number;
  start_date: string;
  end_date: string;
  draft_id: string | null;
  created_at: string;
}

function itemById(id: string) {
  return ITEMS.find((item) => item.id === id);
}

function toBooking(row: BookingRow): Booking {
  return {
    id: `BK-${row.num}`,
    itemId: row.item_id,
    itemName: itemById(row.item_id)!.name,
    quantity: row.quantity,
    startDate: row.start_date,
    endDate: row.end_date,
    draftId: row.draft_id,
    createdAt: row.created_at,
  };
}

export function openBookingService(options: { path?: string; today?: () => string } = {}) {
  const db = new DatabaseSync(options.path ?? ':memory:');
  const today = options.today ?? localToday;
  db.exec(SCHEMA);

  function reset() {
    db.exec('BEGIN');
    db.exec('DELETE FROM drafts; DELETE FROM bookings; DELETE FROM items;');
    const insertItem = db.prepare('INSERT INTO items (id, name, stock) VALUES (?, ?, ?)');
    for (const item of ITEMS) insertItem.run(item.id, item.name, item.stock);
    db.prepare(
      'INSERT INTO bookings (num, item_id, quantity, start_date, end_date, draft_id, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?)',
    ).run(SEED_BOOKING.num, SEED_BOOKING.itemId, SEED_BOOKING.quantity, SEED_BOOKING.startDate, SEED_BOOKING.endDate, 'seed');
    db.exec('COMMIT');
  }

  const itemCount = db.prepare('SELECT COUNT(*) AS n FROM items').get() as { n: number };
  if (itemCount.n === 0) reset();

  function stockOf(itemId: ItemId): number {
    return (db.prepare('SELECT stock FROM items WHERE id = ?').get(itemId) as { stock: number }).stock;
  }

  /** Most units of the item booked on any single day of the range. */
  function peakBooked(itemId: ItemId, start: string, end: string): number {
    const bookedOn = db.prepare(
      'SELECT COALESCE(SUM(quantity), 0) AS n FROM bookings WHERE item_id = ? AND start_date <= ? AND end_date >= ?',
    );
    let peak = 0;
    for (const day of daysInRange(start, end)) {
      peak = Math.max(peak, (bookedOn.get(itemId, day, day) as { n: number }).n);
    }
    return peak;
  }

  function freeUnits(itemId: ItemId, start: string, end: string): number {
    return stockOf(itemId) - peakBooked(itemId, start, end);
  }

  function inventory(start: string = today(), end: string = start): InventoryRow[] {
    return ITEMS.map((item) => {
      const booked = peakBooked(item.id, start, end);
      const total = stockOf(item.id);
      return { itemId: item.id, name: item.name, total, booked, free: total - booked };
    });
  }

  function toDraft(row: DraftRow): Draft {
    const missing: (keyof DraftFields)[] = [];
    if (!row.item_id) missing.push('itemId');
    if (!row.quantity) missing.push('quantity');
    if (!row.start_date) missing.push('startDate');
    if (!row.end_date) missing.push('endDate');

    const free =
      row.item_id && row.start_date && row.end_date ? freeUnits(row.item_id, row.start_date, row.end_date) : null;

    let status: DraftStatus;
    if (row.booking_id) status = 'confirmed';
    else if (missing.length > 0) status = 'collecting';
    else if (free !== null && free >= row.quantity!) status = 'awaiting_confirmation';
    else status = 'unavailable';

    return {
      id: row.id,
      sessionId: row.session_id,
      version: row.version,
      itemId: row.item_id,
      itemName: row.item_id ? itemById(row.item_id)!.name : null,
      quantity: row.quantity,
      startDate: row.start_date,
      endDate: row.end_date,
      bookingId: row.booking_id,
      status,
      missing,
      // Once confirmed, the units are part of our own booking; "free" would read as a misleading 0.
      freeUnits: row.booking_id ? null : free,
    };
  }

  function currentRow(sessionId: string): DraftRow | undefined {
    return db.prepare('SELECT * FROM drafts WHERE session_id = ? ORDER BY seq DESC LIMIT 1').get(sessionId) as
      | DraftRow
      | undefined;
  }

  function requireCurrent(sessionId: string): DraftRow {
    const row = currentRow(sessionId);
    if (!row) throw new BookingError('no_active_request', 'There is no booking request in this conversation yet.');
    return row;
  }

  /** Starts a fresh, empty booking request for the session. */
  function newDraft(sessionId: string): Draft {
    const id = randomUUID();
    const seq = (db.prepare('SELECT COALESCE(MAX(seq), 0) + 1 AS n FROM drafts').get() as { n: number }).n;
    db.prepare('INSERT INTO drafts (id, seq, session_id) VALUES (?, ?, ?)').run(id, seq, sessionId);
    return toDraft(requireCurrent(sessionId));
  }

  function currentDraft(sessionId: string): Draft | null {
    const row = currentRow(sessionId);
    return row ? toDraft(row) : null;
  }

  function validatePatch(patch: DraftPatch, base: DraftRow): DraftFields {
    const next: DraftFields = {
      itemId: base.item_id,
      quantity: base.quantity,
      startDate: base.start_date,
      endDate: base.end_date,
    };

    if (patch.itemId !== undefined) {
      const item = itemById(patch.itemId);
      if (!item) {
        throw new BookingError(
          'unknown_item',
          `We don't rent "${patch.itemId}". Available items: ${ITEMS.map((i) => i.name).join(', ')}.`,
        );
      }
      next.itemId = item.id;
    }
    if (patch.quantity !== undefined) {
      if (!Number.isInteger(patch.quantity) || patch.quantity < 1) {
        throw new BookingError('invalid_quantity', 'Quantity must be a whole number of at least 1.');
      }
      next.quantity = patch.quantity;
    }
    for (const key of ['startDate', 'endDate'] as const) {
      const value = patch[key];
      if (value === undefined) continue;
      if (!isValidDay(value)) throw new BookingError('invalid_date', `"${value}" is not a valid date (YYYY-MM-DD).`);
      if (value < today()) throw new BookingError('date_in_past', `${value} is in the past. Today is ${today()}.`);
      next[key] = value;
    }
    if (next.startDate && next.endDate) {
      if (next.endDate < next.startDate) {
        throw new BookingError('end_before_start', 'The end date is before the start date.');
      }
      if (daysInRange(next.startDate, next.endDate).length > MAX_RENTAL_DAYS) {
        throw new BookingError('range_too_long', `Rentals are limited to ${MAX_RENTAL_DAYS} days.`);
      }
    }
    return next;
  }

  /**
   * Applies a correction to the current request. The patch is validated as a whole:
   * if any field is invalid, nothing changes.
   */
  function updateDraft(sessionId: string, patch: DraftPatch): Draft {
    let row = currentRow(sessionId);
    if (!row) {
      newDraft(sessionId);
      row = requireCurrent(sessionId);
    }
    if (row.booking_id) {
      throw new BookingError(
        'already_confirmed',
        `This request is already booked as ${row.booking_id}. Confirmed bookings can't be changed; start a new request instead.`,
      );
    }

    const next = validatePatch(patch, row);
    const changed =
      next.itemId !== row.item_id ||
      next.quantity !== row.quantity ||
      next.startDate !== row.start_date ||
      next.endDate !== row.end_date;
    if (changed) {
      db.prepare(
        'UPDATE drafts SET item_id = ?, quantity = ?, start_date = ?, end_date = ?, version = version + 1 WHERE id = ?',
      ).run(next.itemId, next.quantity, next.startDate, next.endDate, row.id);
    }
    return toDraft(requireCurrent(sessionId));
  }

  /**
   * Saves the booking. `request` must be exactly what the agent read back to the user:
   * if the request changed since then, the confirmation is for an obsolete choice and is refused.
   * Confirming an already-confirmed request returns the existing booking and writes nothing.
   */
  function confirm(sessionId: string, request: ConfirmRequest): { booking: Booking; alreadyConfirmed: boolean } {
    const row = requireCurrent(sessionId);
    if (row.booking_id) return { booking: getBooking(row.booking_id)!, alreadyConfirmed: true };

    const draft = toDraft(row);
    if (draft.status === 'collecting') {
      throw new BookingError('not_ready', `The request is incomplete. Still needed: ${draft.missing.join(', ')}.`);
    }
    const matches =
      request.itemId === row.item_id &&
      request.quantity === row.quantity &&
      request.startDate === row.start_date &&
      request.endDate === row.end_date;
    if (!matches) {
      throw new BookingError(
        'request_changed',
        `The confirmation doesn't match the current request (${draft.itemName} x${draft.quantity}, ` +
          `${draft.startDate} to ${draft.endDate}). Read the current request back and ask again.`,
      );
    }

    // Re-check availability inside the same transaction that writes the booking.
    let bookingId: string;
    db.exec('BEGIN IMMEDIATE');
    try {
      const free = freeUnits(row.item_id!, row.start_date!, row.end_date!);
      if (free < row.quantity!) {
        throw new BookingError(
          'unavailable',
          `Only ${Math.max(free, 0)} ${draft.itemName} free for ${row.start_date} to ${row.end_date}.`,
        );
      }
      const result = db
        .prepare(
          'INSERT INTO bookings (item_id, quantity, start_date, end_date, draft_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run(row.item_id, row.quantity, row.start_date, row.end_date, row.id, new Date().toISOString());
      bookingId = `BK-${result.lastInsertRowid}`;
      db.prepare('UPDATE drafts SET booking_id = ? WHERE id = ?').run(bookingId, row.id);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    return { booking: getBooking(bookingId)!, alreadyConfirmed: false };
  }

  function getBooking(id: string): Booking | null {
    const num = Number(id.replace(/^BK-/, ''));
    const row = db.prepare('SELECT * FROM bookings WHERE num = ?').get(num) as BookingRow | undefined;
    return row ? toBooking(row) : null;
  }

  function listBookings(): Booking[] {
    return (db.prepare('SELECT * FROM bookings ORDER BY num').all() as unknown as BookingRow[]).map(toBooking);
  }

  /** The whole database state, for the before/after evidence. */
  function snapshot() {
    return { takenAt: new Date().toISOString(), inventory: inventory(), bookings: listBookings() };
  }

  return {
    reset,
    inventory,
    freeUnits,
    newDraft,
    currentDraft,
    updateDraft,
    confirm,
    getBooking,
    listBookings,
    snapshot,
    close: () => db.close(),
  };
}

export type BookingService = ReturnType<typeof openBookingService>;
