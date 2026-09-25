import React from 'react';

const TEXT = { connected: 'Connected', connecting: 'Connecting…', offline: 'Offline' };

export function ConnectionIndicator({ status = 'connected', label }) {
  return (
    <span className={`vr-conn vr-conn--${status}`} role="status">
      <span className="vr-conn__dot" aria-hidden="true" />
      <span>{label || TEXT[status]}</span>
    </span>
  );
}
