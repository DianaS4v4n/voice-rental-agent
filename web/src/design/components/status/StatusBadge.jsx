import React from 'react';
import { Icon } from '../core/Icon.jsx';

export const STATUS_META = {
  collecting:       { label: 'Collecting details',   tone: 'neutral',       icon: 'dashed' },
  checking:         { label: 'Checking…',            tone: 'info',          icon: 'loader', spin: true },
  available:        { label: 'Available',            tone: 'success',       icon: 'check-circle' },
  unavailable:      { label: 'Not available',        tone: 'danger',        icon: 'x-circle' },
  awaiting:         { label: 'Awaiting confirmation', tone: 'warning',      icon: 'clock' },
  confirmed:        { label: 'Confirmed',            tone: 'success-solid', icon: 'check' },
  'already-booked': { label: 'Already booked',       tone: 'neutral',       icon: 'duplicate' },
};

export function StatusBadge({ status = 'collecting', bookingId, label, className = '' }) {
  const m = STATUS_META[status] || STATUS_META.collecting;
  const withId = bookingId && (status === 'confirmed' || status === 'already-booked');
  return (
    <span key={status} role="status" className={`vr-badge vr-badge--${m.tone} ${className}`}>
      <Icon name={m.icon} size={14} strokeWidth={2} className={m.spin ? 'vr-spin' : ''} />
      <span>{label || m.label}</span>
      {withId && <><span aria-hidden="true">·</span><span className="vr-badge__id">{bookingId}</span></>}
    </span>
  );
}
