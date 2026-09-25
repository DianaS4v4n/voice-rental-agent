export interface TranscriptLineProps {
  speaker: 'user' | 'agent' | 'system';
  text: React.ReactNode;
  /** Recognition still running — faint text + blinking caret; text may change. */
  interim?: boolean;
  /** Agent was cut off — appends "…", mutes, adds "interrupted" tag. */
  interrupted?: boolean;
  /** latest = largest/fullest; recent ≈ 72%; old ≈ 42% opacity. */
  recency?: 'latest' | 'recent' | 'old';
  /** system lines only: success = green (booking saved). */
  tone?: 'success' | 'neutral';
  /** system lines only: override icon (default edit / check). */
  icon?: string;
}
export declare function TranscriptLine(props: TranscriptLineProps): JSX.Element;
