import type { IconName } from './Icon';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  /** Required: used as aria-label and tooltip. */
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  /** Toggle-button state (e.g. drawer open). */
  pressed?: boolean;
}
export declare function IconButton(props: IconButtonProps): JSX.Element;
