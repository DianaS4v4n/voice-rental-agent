export type VoiceState =
  | 'idle' | 'connecting' | 'listening' | 'user-speaking' | 'thinking'
  | 'agent-speaking' | 'interrupted' | 'mic-blocked' | 'error';

/**
 * The single voice control — replaces Mute / End session. One button, nine states.
 * @startingPoint section="Voice" subtitle="Voice button, all states animated" viewport="700x520"
 */
export interface VoiceButtonProps {
  state: VoiceState;
  /** 0–1 live input/output volume. Drives the wave amplitude (and agent bars). */
  level?: number;
  /** Demo only: synthesise a speech-like level curve instead of reading `level`. */
  simulate?: boolean;
  /** Override the caption under the button. */
  label?: string;
  /** Tap: start / stop / interrupt, depending on state. */
  onPress?: () => void;
  /** Called by the inline "Retry" link in the `error` state. */
  onRetry?: () => void;
  className?: string;
}
export declare function VoiceButton(props: VoiceButtonProps): JSX.Element;
