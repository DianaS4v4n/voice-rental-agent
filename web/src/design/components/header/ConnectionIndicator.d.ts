export interface ConnectionIndicatorProps {
  status: 'connected' | 'connecting' | 'offline';
  label?: string;
}
export declare function ConnectionIndicator(props: ConnectionIndicatorProps): JSX.Element;
