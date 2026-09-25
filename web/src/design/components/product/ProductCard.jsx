import React from 'react';
import { Icon } from '../core/Icon.jsx';

const GLYPH = { camera: 'camera', tripod: 'tripod', microphone: 'microphone' };

// One number carries the stock ("2 / 2"); the caption says what it means; the status line
// appears only when there is something to say about this item.
export function ProductCard({ name, kind = 'camera', total, free, requested = 0, className = '' }) {
  const hasDates = free !== null && free !== undefined;
  const avail = hasDates ? free : total;
  const inRequest = requested > 0;
  const short = inRequest && hasDates && requested > free;
  const soldOut = hasDates && free === 0;

  let status = null;
  if (short) status = { tone: 'danger', icon: 'x-circle', text: `Needs ${requested} · only ${free} free` };
  else if (inRequest && hasDates) status = { tone: 'success', icon: 'check-circle', text: 'In your request' };
  else if (inRequest) status = { tone: 'accent', icon: 'chevron-right', text: 'In request · pick dates' };
  else if (soldOut) status = { tone: 'danger', icon: 'x-circle', text: 'Fully booked' };

  const cls = ['vr-card', 'vr-product', inRequest && !short && 'is-selected', short && 'is-short', soldOut && 'is-soldout', className].filter(Boolean).join(' ');
  return (
    <article className={cls} aria-label={name}>
      <div className="vr-product__top">
        <div className="vr-product__glyph"><Icon name={GLYPH[kind] || 'camera'} size={22} /></div>
        <div className="vr-product__count" aria-label={`${avail} of ${total} ${hasDates ? 'free' : 'in stock'}`}>
          <span key={avail} className="vr-product__free">{avail}</span>
          <span className="vr-product__of">/ {total}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span className="vr-product__name">{name}</span>
        <span className="vr-product__sub">{hasDates ? 'free' : 'in stock'}</span>
      </div>
      {status && (
        <div className={`vr-product__status is-${status.tone}`}>
          <Icon name={status.icon} size={14} strokeWidth={2} />
          <span>{status.text}</span>
        </div>
      )}
    </article>
  );
}
