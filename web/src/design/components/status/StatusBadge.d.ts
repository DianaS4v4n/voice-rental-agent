export type RequestStatus =
  | 'collecting' | 'checking' | 'available' | 'unavailable' | 'awaiting' | 'confirmed' | 'already-booked';

/**
 * Request status pill — icon + text, never colour alone.
 * @startingPoint section="Board" subtitle="All seven request statuses" viewport="700x220"
 */
export interface StatusBadgeProps {
  status: RequestStatus;
  /** Shown after "Confirmed" / "Already booked", e.g. "BK-1001" */
  bookingId?: string;
  /** Override the default label text */
  label?: string;
  className?: string;
}
export declare function StatusBadge(props: StatusBadgeProps): JSX.Element;
export declare const STATUS_META: Record<RequestStatus, { label: string; tone: string; icon: string; spin?: boolean }>;
