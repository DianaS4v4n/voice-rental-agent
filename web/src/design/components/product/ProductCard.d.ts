/**
 * Inventory tile for one rentable item (the board shows three).
 * @startingPoint section="Board" subtitle="Product cards: default, selected, short, sold out" viewport="700x520"
 */
export interface ProductCardProps {
  name: string;
  kind: 'camera' | 'tripod' | 'microphone';
  /** Total units owned */
  total: number;
  /** Units free on the requested dates. null/undefined = no dates yet → shows total stock. */
  free?: number | null;
  /** Units of this item in the current request (0 = not in request). */
  requested?: number;
  /** Caption when dates are known, e.g. "Oct 5–7" */
  dateLabel?: string;
  className?: string;
}
export declare function ProductCard(props: ProductCardProps): JSX.Element;
