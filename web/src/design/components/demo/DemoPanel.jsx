import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { IconButton } from '../core/IconButton.jsx';

export function BookingsTable({ rows = [] }) {
  return (
    <table className="vr-table">
      <thead><tr><th>ID</th><th>Item</th><th>Qty</th><th>Dates</th><th>Created</th></tr></thead>
      <tbody>
        {rows.length === 0 && <tr className="vr-table__empty"><td colSpan={5}>No bookings in the database.</td></tr>}
        {rows.map((r) => (
          <tr key={r.id} className={r.isNew ? 'is-new' : ''}>
            <td>{r.id}</td><td>{r.item}</td><td>{r.qty}</td><td>{r.dates}</td><td>{r.created}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function median(a) {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

export function DemoPanel({ bookings = [], snapshot = [], latencies = [], cost = 0, slowMs = 1500, onClose, children, className = '', style }) {
  const ms = latencies.map((l) => l.ms);
  const med = median(ms);
  const max = Math.max(slowMs * 1.2, ...ms, 1);
  return (
    <aside className={`vr-drawer ${className}`} style={style} aria-label="Demo panel">
      <div className="vr-drawer__head">
        <span className="vr-drawer__title"><Icon name="database" size={16} />Demo panel</span>
        {onClose && <IconButton icon="x" label="Close demo panel" size="sm" onClick={onClose} />}
      </div>
      <div className="vr-drawer__body">
        <div className="vr-metrics">
          <div><span className="vr-eyebrow">Median latency</span><span className="vr-metric">{med}<small>ms</small></span></div>
          <div><span className="vr-eyebrow">Session cost</span><span className="vr-metric">${cost.toFixed(4)}</span></div>
        </div>
        <section className="vr-section">
          <div className="vr-section__head"><span className="vr-eyebrow">bookings</span><span className="vr-eyebrow">{bookings.length} rows</span></div>
          <BookingsTable rows={bookings} />
        </section>
        {snapshot.length > 0 && (
          <section className="vr-section">
            <div className="vr-section__head"><span className="vr-eyebrow">Stock on requested dates</span></div>
            <div className="vr-snap">
              <span className="vr-snap__h">Item</span><span className="vr-snap__h">Before</span><span className="vr-snap__h" aria-hidden="true"></span><span className="vr-snap__h">After</span>
              {snapshot.map((s) => (
                <React.Fragment key={s.item}>
                  <span className="vr-snap__item">{s.item}</span>
                  <span>{s.before}</span>
                  <span style={{ color: 'var(--text-faint)' }}>→</span>
                  <span className={s.before !== s.after ? 'vr-snap__changed' : ''}>{s.after}</span>
                </React.Fragment>
              ))}
            </div>
          </section>
        )}
        <section className="vr-section">
          <div className="vr-section__head"><span className="vr-eyebrow">Response latency by turn</span><span className="vr-eyebrow" style={{ color: 'var(--accent)' }}>┆ median {med} ms</span></div>
          <div className="vr-lat">
            {latencies.length === 0 && <span style={{ color: 'var(--text-faint)', fontSize: 'var(--text-sm)' }}>No turns yet.</span>}
            {latencies.map((l, i) => (
              <div key={i} className="vr-lat__row">
                <span>#{l.turn ?? i + 1}</span>
                <span className="vr-lat__track">
                  <span className={`vr-lat__fill ${l.ms > slowMs ? 'is-slow' : ''}`} style={{ width: `${(l.ms / max) * 100}%` }} />
                  <span className="vr-lat__median" style={{ left: `${(med / max) * 100}%` }} />
                </span>
                <span className="vr-lat__ms">{l.ms} ms</span>
              </div>
            ))}
          </div>
        </section>
        {children}
      </div>
    </aside>
  );
}
