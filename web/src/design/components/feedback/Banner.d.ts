/**
 * Inline blocking-problem banner (mic blocked, connection lost).
 * @startingPoint section="Feedback" subtitle="Error banners and toasts" viewport="700x360"
 */
export interface BannerProps {
  tone?: 'danger' | 'warning' | 'info';
  /** Defaults to warning / info glyph */
  icon?: string;
  title?: React.ReactNode;
  /** Secondary message line */
  children?: React.ReactNode;
  /** Buttons on the right, e.g. <Button size="sm">Retry</Button> */
  actions?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}
export declare function Banner(props: BannerProps): JSX.Element;
