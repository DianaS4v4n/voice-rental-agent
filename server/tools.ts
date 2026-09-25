// Turns the model's function calls into booking-service calls, and the results into
// short JSON the model can act on. Every rule lives in booking.ts and confirm-gate.ts.

import { BookingError, type BookingService, type Draft, type InventoryRow } from './booking.ts';
import type { ConfirmationGate } from './confirm-gate.ts';

export interface ToolContext {
  service: BookingService;
  sessionId: string;
  gate: ConfirmationGate;
}

/** What happened, for the UI (system lines, receipt, before/after). */
export type ToolEvent =
  | { kind: 'booked'; bookingId: string; before: InventoryRow[]; after: InventoryRow[] }
  | { kind: 'already_booked'; bookingId: string }
  | { kind: 'refused'; code: string };

export interface ToolResult {
  content: Record<string, unknown>;
  event?: ToolEvent;
}

type Args = Record<string, unknown>;

function describeRequest(draft: Draft) {
  return {
    item: draft.itemName,
    item_id: draft.itemId,
    quantity: draft.quantity,
    start_date: draft.startDate,
    end_date: draft.endDate,
    status: draft.status,
    free_units: draft.freeUnits,
    missing: draft.missing,
    booking_id: draft.bookingId,
  };
}

function guidanceFor(draft: Draft): string {
  switch (draft.status) {
    case 'collecting':
      return `Ask the user for: ${draft.missing.join(', ')}.`;
    case 'unavailable':
      return `Only ${Math.max(draft.freeUnits ?? 0, 0)} ${draft.itemName} free for these dates. Tell the user and offer fewer units or other dates. Do not ask to confirm this request.`;
    case 'awaiting_confirmation':
      return 'Available. Read back item, quantity and dates in one sentence and ask "Shall I book it?". Wait for an explicit yes before confirm_booking.';
    case 'confirmed':
      return `Already booked as ${draft.bookingId}.`;
  }
}

function errorResult(error: unknown): ToolResult {
  if (error instanceof BookingError) {
    return { content: { ok: false, error: error.code, message: error.message }, event: { kind: 'refused', code: error.code } };
  }
  throw error;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

export function runTool(name: string, args: Args, ctx: ToolContext): ToolResult {
  const { service, sessionId, gate } = ctx;
  try {
    switch (name) {
      case 'update_request': {
        const draft = service.updateDraft(sessionId, {
          itemId: optionalString(args.item),
          quantity: typeof args.quantity === 'number' ? args.quantity : undefined,
          startDate: optionalString(args.start_date),
          endDate: optionalString(args.end_date),
        });
        return { content: { ok: true, request: describeRequest(draft), guidance: guidanceFor(draft) } };
      }

      case 'check_availability': {
        const start = optionalString(args.start_date);
        const end = optionalString(args.end_date) ?? start;
        if (!start || !end || end < start) {
          return { content: { ok: false, error: 'invalid_dates', message: 'Give a start and end date, YYYY-MM-DD.' } };
        }
        const rows = service.inventory(start, end).map((row) => ({ item: row.name, free: row.free, total: row.total }));
        return { content: { ok: true, start_date: start, end_date: end, items: rows } };
      }

      case 'confirm_booking': {
        const current = service.currentDraft(sessionId);
        // A repeated yes on a saved booking is answered from the database, not re-checked by the gate.
        if (!current?.bookingId) {
          const verdict = gate.check();
          if (!verdict.ok) {
            return {
              content: { ok: false, error: verdict.code, message: verdict.message },
              event: { kind: 'refused', code: verdict.code },
            };
          }
        }
        const request = {
          itemId: String(args.item ?? ''),
          quantity: Number(args.quantity),
          startDate: String(args.start_date ?? ''),
          endDate: String(args.end_date ?? ''),
        };
        const before = current?.startDate && current.endDate ? service.inventory(current.startDate, current.endDate) : [];
        const { booking, alreadyConfirmed } = service.confirm(sessionId, request);
        if (alreadyConfirmed) {
          return {
            content: {
              ok: true,
              already_booked: true,
              booking_id: booking.id,
              guidance: `This was already booked as ${booking.id}. Tell the user; no duplicate was created.`,
            },
            event: { kind: 'already_booked', bookingId: booking.id },
          };
        }
        const after = service.inventory(booking.startDate, booking.endDate);
        return {
          content: {
            ok: true,
            booking_id: booking.id,
            booking: { item: booking.itemName, quantity: booking.quantity, start_date: booking.startDate, end_date: booking.endDate },
            guidance: `Booked. Tell the user the booking ID ${booking.id} and ask if they need anything else.`,
          },
          event: { kind: 'booked', bookingId: booking.id, before, after },
        };
      }

      case 'start_new_request': {
        const draft = service.newDraft(sessionId);
        return { content: { ok: true, request: describeRequest(draft), guidance: 'Ask what they would like to rent and for which days.' } };
      }

      default:
        return { content: { ok: false, error: 'unknown_function', message: `No function named ${name}.` } };
    }
  } catch (error) {
    return errorResult(error);
  }
}
