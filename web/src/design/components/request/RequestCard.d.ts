import type { RequestStatus } from '../status/StatusBadge';

/**
 * Live draft of the booking the agent has understood so far.
 * @startingPoint section="Board" subtitle="Current request card with corrections" viewport="700x620"
 */
export interface RequestCardProps {
  status: RequestStatus;
  bookingId?: string;
  /** null / undefined renders "—" */
  item?: string | null;
  qty?: number | string | null;
  /** Pre-formatted range, inclusive, e.g. "Oct 5–7" */
  dates?: string | null;
  /** Previous values of corrected fields — shown struck through with a "Changed" mark. */
  previous?: { item?: string; qty?: number | string; dates?: string };
  /** Keys filled or corrected in THIS turn — play the flash/rise animation. */
  fresh?: Array<'item' | 'qty' | 'dates'>;
  /** Footer line, e.g. "Only 1 of 2 Camera A free on Oct 11" */
  note?: string;
  /** Defaults from status: unavailable→danger, available/confirmed→success, awaiting→warning */
  noteTone?: 'danger' | 'success' | 'warning' | 'neutral';
  title?: string;
  className?: string;
}
export declare function RequestCard(props: RequestCardProps): JSX.Element;
