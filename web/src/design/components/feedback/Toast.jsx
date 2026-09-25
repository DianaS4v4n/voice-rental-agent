import React from 'react';
import { Icon } from '../core/Icon.jsx';

const ICON = { success: 'check-circle', neutral: 'info', danger: 'warning' };

export function Toast({ tone = 'success', icon, children, className = '', style }) {
  return (
    <div role="status" className={`vr-toast vr-toast--${tone} ${className}`} style={style}>
      <Icon name={icon || ICON[tone]} size={16} strokeWidth={2} className="vr-toast__icon" />
      <span>{children}</span>
    </div>
  );
}
