import React, { useEffect, useRef } from 'react';
import { TranscriptLine } from './TranscriptLine.jsx';

export function Transcript({ lines = [], autoScroll = true, style, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (autoScroll && ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines, autoScroll]);
  const spoken = lines.map((l, i) => (l.speaker === 'system' ? null : i)).filter((i) => i !== null);
  const recencyOf = (i) => {
    const pos = spoken.length - 1 - spoken.indexOf(i);
    if (lines[i].speaker === 'system') {
      const after = spoken.filter((s) => s > i).length;
      return after === 0 ? 'latest' : after <= 2 ? 'recent' : 'old';
    }
    return pos === 0 ? 'latest' : pos <= 2 ? 'recent' : 'old';
  };
  return (
    <div ref={ref} className={`vr-transcript ${className}`} style={{ overflowY: 'auto', ...style }} aria-live="polite">
      {lines.map((l, i) => <TranscriptLine key={l.id ?? i} {...l} recency={l.recency || recencyOf(i)} />)}
    </div>
  );
}
