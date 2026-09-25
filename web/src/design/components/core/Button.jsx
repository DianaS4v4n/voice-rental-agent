import React from 'react';
import { Icon } from './Icon.jsx';

export function Button({ variant = 'primary', size = 'md', icon, iconRight, children, className = '', type = 'button', ...rest }) {
  const is = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;
  return (
    <button type={type} className={`vr-btn vr-btn--${variant} vr-btn--${size} ${icon ? 'has-icon-left' : ''} ${iconRight ? 'has-icon-right' : ''} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={is} />}
      {children}
      {iconRight && <Icon name={iconRight} size={is} />}
    </button>
  );
}
