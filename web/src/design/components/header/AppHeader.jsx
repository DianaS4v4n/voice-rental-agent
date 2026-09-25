import React from 'react';
import { Button } from '../core/Button.jsx';
import { Toggle } from '../core/Toggle.jsx';
import { ConnectionIndicator } from './ConnectionIndicator.jsx';

export function AppHeader({ productName = 'Rental Desk', subtitle = 'Voice booking', connection = 'connected', showDatabase = false, onToggleDatabase, onReset, compact = false, className = '' }) {
  return (
    <header className={`vr-header ${className}`}>
      <div className="vr-header__brand">
        <span className="vr-header__name">{productName}</span>
        {subtitle && !compact && <><span className="vr-header__sep" /><span className="vr-header__hide-sm" style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>{subtitle}</span></>}
        <span className="vr-header__sep" />
        <ConnectionIndicator status={connection} />
      </div>
      <div className="vr-header__actions">
        <Toggle label={compact ? 'DB' : 'Show database'} checked={showDatabase} onChange={onToggleDatabase} />
        <Button variant="secondary" size="sm" icon="reset" onClick={onReset}>{compact ? 'Reset' : 'Reset demo'}</Button>
      </div>
    </header>
  );
}
