import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function BookingReceipt({ bookingId, item, qty, dates, days, createdAt, mode = 'new', animKey, empty = false, className = '' }) {
  if (empty || !bookingId) {
    return <section className={`vr-receipt vr-receipt--empty ${className}`} aria-label="Your booking"><span>Nothing booked yet.</span><span>Say “yes” when the agent reads back your request.</span></section>;
  }
  return (
    <section key={`${bookingId}-${mode}-${animKey ?? ''}`} className={`vr-receipt is-${mode} ${className}`} aria-label="Your booking">
      <div className="vr-receipt__head">
        <div>
          <div className="vr-eyebrow">Your booking</div>
          <div className="vr-receipt__id">{bookingId}</div>
        </div>
        <span className="vr-receipt__stamp"><Icon name="check" size={14} strokeWidth={2.25} />{mode === 'repeat' ? 'Booked' : 'Confirmed'}</span>
      </div>
      <div className="vr-receipt__rule" />
      <div className="vr-receipt__row"><span>Item</span><span>{item}</span></div>
      <div className="vr-receipt__row"><span>Qty</span><span>{qty}</span></div>
      {/* Rental length joins the dates line instead of taking a row of its own. */}
      <div className="vr-receipt__row"><span>Dates</span><span>{dates}{days != null && ` · ${days} ${days === 1 ? 'day' : 'days'}`}</span></div>
      <div className="vr-receipt__foot"><span>Created</span><span>{createdAt}</span></div>
      {mode === 'repeat' && (
        <div className="vr-receipt__note"><Icon name="duplicate" size={16} strokeWidth={2} /><span>Already booked as {bookingId} — no duplicate created</span></div>
      )}
    </section>
  );
}
