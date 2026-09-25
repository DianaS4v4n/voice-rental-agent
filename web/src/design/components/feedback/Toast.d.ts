export interface ToastProps {
  tone?: 'success' | 'neutral' | 'danger';
  icon?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}
export declare function Toast(props: ToastProps): JSX.Element;
