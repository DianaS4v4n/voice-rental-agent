import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { IconButton } from '../core/IconButton.jsx';

const ICON = { danger: 'warning', warning: 'warning', info: 'info' };

export function Banner({ tone = 'danger', icon, title, children, actions, onDismiss, className = '' }) {
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={`vr-banner vr-banner--${tone} ${className}`}>
      <Icon name={icon || ICON[tone]} size={18} strokeWidth={2} />
      <div className="vr-banner__body">
        {title && <div className="vr-banner__title">{title}</div>}
        {children && <div className="vr-banner__msg">{children}</div>}
      </div>
      {(actions || onDismiss) && (
        <div className="vr-banner__actions">
          {actions}
          {onDismiss && <IconButton icon="x" label="Dismiss" size="sm" onClick={onDismiss} />}
        </div>
      )}
    </div>
  );
}
