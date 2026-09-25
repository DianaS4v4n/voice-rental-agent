import React from 'react';
import { Icon } from './Icon.jsx';

export function IconButton({ icon, label, variant = 'ghost', size = 'md', pressed, className = '', type = 'button', ...rest }) {
  const is = size === 'sm' ? 14 : size === 'lg' ? 20 : 18;
  return (
    <button type={type} aria-label={label} title={label} aria-pressed={pressed}
      className={`vr-btn vr-iconbtn vr-btn--${variant} vr-btn--${size} ${pressed ? 'is-pressed' : ''} ${className}`} {...rest}>
      <Icon name={icon} size={is} />
    </button>
  );
}
