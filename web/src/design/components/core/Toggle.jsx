import React from 'react';

export function Toggle({ checked = false, onChange, label, disabled = false, className = '' }) {
  return (
    <label className={`vr-toggle ${checked ? 'is-on' : ''} ${disabled ? 'is-disabled' : ''} ${className}`}>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled}
        onChange={(e) => onChange && onChange(e.target.checked)} />
      <span className="vr-toggle__track"><span className="vr-toggle__thumb" /></span>
      {label && <span>{label}</span>}
    </label>
  );
}
