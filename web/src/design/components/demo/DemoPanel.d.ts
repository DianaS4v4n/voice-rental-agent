export interface BookingRow {
  id: string;
  item: string;
  qty: number;
  dates: string;
  created: string;
  /** Highlight as the row just inserted */
  isNew?: boolean;
}
export interface BookingsTableProps {
  rows: BookingRow[];
}
export declare function BookingsTable(props: BookingsTableProps): JSX.Element;

/**
 * Hideable drawer for reviewers: database table, before/after, latency, cost.
 * @startingPoint section="Demo" subtitle="Reviewer drawer with DB and metrics" viewport="700x760"
 */
export interface DemoPanelProps {
  bookings: BookingRow[];
  /** Free units per item on the requested dates, before and after the last write. */
  snapshot?: Array<{ item: string; before: number | string; after: number | string }>;
  /** One entry per agent turn. */
  latencies?: Array<{ turn?: number; ms: number }>;
  /** Session cost in USD */
  cost?: number;
  /** Bars above this are drawn in warning yellow. Default 1500. */
  slowMs?: number;
  onClose?: () => void;
  /** Extra reviewer controls rendered at the end of the drawer body. */
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}
export declare function DemoPanel(props: DemoPanelProps): JSX.Element;
