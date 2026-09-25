export type IconName =
  | 'mic' | 'mic-off' | 'stop' | 'camera' | 'tripod' | 'microphone' | 'calendar' | 'check' | 'x'
  | 'warning' | 'database' | 'reset' | 'check-circle' | 'x-circle' | 'loader' | 'clock' | 'info'
  | 'wifi' | 'wifi-off' | 'retry' | 'duplicate' | 'dashed' | 'edit' | 'chevron-right' | 'panel';

export interface IconProps {
  /** Glyph key. Lucide outline glyphs, 24px grid. */
  name: IconName;
  /** px, default 20 */
  size?: number;
  /** default 1.75 */
  strokeWidth?: number;
  color?: string;
  /** Accessible label; omit for decorative icons (aria-hidden). */
  title?: string;
  style?: React.CSSProperties;
  className?: string;
}
export declare function Icon(props: IconProps): JSX.Element | null;
export declare const ICON_NAMES: IconName[];
