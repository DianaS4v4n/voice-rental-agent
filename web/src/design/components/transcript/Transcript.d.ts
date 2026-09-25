import type { TranscriptLineProps } from './TranscriptLine';

/**
 * Bubble-less conversation feed, top → bottom; recency fading is computed automatically.
 * @startingPoint section="Conversation" subtitle="Transcript feed with all line types" viewport="700x460"
 */
export interface TranscriptProps {
  lines: Array<TranscriptLineProps & { id?: string | number }>;
  /** Keep scrolled to the newest line. Default true. */
  autoScroll?: boolean;
  style?: React.CSSProperties;
  className?: string;
}
export declare function Transcript(props: TranscriptProps): JSX.Element;
