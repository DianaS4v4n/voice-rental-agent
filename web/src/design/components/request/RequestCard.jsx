import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { StatusBadge } from '../status/StatusBadge.jsx';

const FIELDS = [
  { key: 'item', label: 'Item', mono: false },
  { key: 'qty', label: 'Qty', mono: true },
  { key: 'dates', label: 'Dates', mono: true },
];
const NOTE_TONE = { unavailable: 'danger', available: 'success', awaiting: 'warning', confirmed: 'success' };
const NOTE_ICON = { danger: 'x-circle', success: 'check-circle', warning: 'clock', neutral: 'info' };

export function RequestCard({ status = 'collecting', bookingId, item, qty, dates, previous = {}, fresh = [], note, noteTone, title = 'Current request', className = '' }) {
  const vals = { item, qty, dates };
  const tone = noteTone || NOTE_TONE[status] || 'neutral';
  return (
    <section className={`vr-card vr-request ${className}`} aria-label={title}>
      <div className="vr-request__head">
        <span className="vr-eyebrow">{title}</span>
        <StatusBadge status={status} bookingId={bookingId} />
      </div>
      <div className="vr-request__rows">
        {FIELDS.map(({ key, label, mono }) => {
          const v = vals[key];
          const empty = v === null || v === undefined || v === '';
          const old = previous[key];
          const isFresh = fresh.includes(key);
          const cls = ['vr-field', old != null && 'is-changed', isFresh && (old != null ? 'is-fresh' : 'is-filled')].filter(Boolean).join(' ');
          return (
            <div key={key + String(v)} className={cls}>
              <span className="vr-field__label">{label}</span>
              <span className={`vr-field__value ${mono ? 'is-mono' : ''} ${empty ? 'is-empty' : ''}`}>
                {old != null && <span className="vr-field__old" aria-label={`was ${old}`}>{old}</span>}
                <span className={isFresh ? 'vr-field__new' : ''}>{empty ? '—' : v}</span>
              </span>
              {old != null ? <span className="vr-field__mark"><Icon name="edit" size={12} strokeWidth={2} />Changed</span> : <span />}
            </div>
          );
        })}
      </div>
      {note && (
        <div key={note} className={`vr-request__note is-${tone}`}>
          <Icon name={NOTE_ICON[tone]} size={16} strokeWidth={2} style={{ marginTop: 1 }} />
          <span>{note}</span>
        </div>
      )}
    </section>
  );
}
