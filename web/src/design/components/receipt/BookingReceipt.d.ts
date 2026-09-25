/**
 * "Your booking" — receipt-style card for the saved booking.
 * @startingPoint section="Board" subtitle="Booking receipt: new, repeat, empty" viewport="700x480"
 */
export interface BookingReceiptProps {
  /** e.g. "BK-1001". Omit (or empty) to show the dashed empty slot. */
  bookingId?: string;
  item?: string;
  qty?: number | string;
  /** Inclusive range, e.g. "Oct 5–7, 2026" */
  dates?: string;
  days?: number;
  /** e.g. "Sep 25, 14:02" */
  createdAt?: string;
  /** new = reveal + stamp animation; repeat = small nod + "Already booked" note */
  mode?: 'new' | 'repeat';
  /** Change to replay the animation for the same booking (e.g. each repeated "yes"). */
  animKey?: string | number;
  empty?: boolean;
  className?: string;
}
export declare function BookingReceipt(props: BookingReceiptProps): JSX.Element;
