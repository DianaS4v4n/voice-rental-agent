export interface ToggleProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  /** e.g. "Show database" */
  label?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}
export declare function Toggle(props: ToggleProps): JSX.Element;
