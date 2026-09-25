import React from 'react';
import { Icon } from '../core/Icon.jsx';

const WHO = { user: 'You', agent: 'Agent' };

export function TranscriptLine({ speaker = 'agent', text, interim = false, interrupted = false, recency = 'latest', tone, icon }) {
  const cls = ['vr-line', `vr-line--${speaker}`, `is-${recency}`, interim && 'is-interim', interrupted && 'is-interrupted', tone && `is-${tone}`].filter(Boolean).join(' ');
  if (speaker === 'system') {
    return (
      <div className={cls} role="note">
        <p className="vr-line__text"><Icon name={icon || (tone === 'success' ? 'check' : 'edit')} size={13} strokeWidth={2} /><span>{text}</span></p>
      </div>
    );
  }
  return (
    <div className={cls}>
      <p className="vr-line__text">
        <span className="vr-sr">{WHO[speaker]}: </span>
        {text}
        {interrupted && <span className="vr-line__cut">…</span>}
        {interim && <span className="vr-line__caret" aria-hidden="true" />}
      </p>
      {interrupted && <span className="vr-line__tag">Interrupted</span>}
    </div>
  );
}
