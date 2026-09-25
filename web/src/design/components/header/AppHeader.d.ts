/**
 * App top bar: product name, connection, Show database, Reset demo.
 * @startingPoint section="Shell" subtitle="Header with connection + demo controls" viewport="1200x200"
 */
export interface AppHeaderProps {
  /** Product name in plain type (no logo exists). */
  productName?: string;
  subtitle?: string;
  connection?: 'connected' | 'connecting' | 'offline';
  showDatabase?: boolean;
  onToggleDatabase?: (on: boolean) => void;
  onReset?: () => void;
  /** Mobile (390) — shortens labels. */
  compact?: boolean;
  className?: string;
}
export declare function AppHeader(props: AppHeaderProps): JSX.Element;
