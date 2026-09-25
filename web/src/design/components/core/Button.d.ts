import type { IconName } from './Icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary = ink; accent = burgundy (use sparingly, e.g. confirm); secondary = outlined; ghost = text-only */
  variant?: 'primary' | 'accent' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  iconRight?: IconName;
  children?: React.ReactNode;
}
export declare function Button(props: ButtonProps): JSX.Element;
