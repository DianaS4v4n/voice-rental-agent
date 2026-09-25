import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../core/Icon.jsx';

const LABELS = {
  idle: 'Tap to start',
  connecting: 'Connecting…',
  listening: 'Listening',
  'user-speaking': 'Listening',
  thinking: 'Thinking…',
  'agent-speaking': 'Speaking · tap to interrupt',
  interrupted: 'Listening',
  'mic-blocked': 'Microphone access is blocked',
  error: 'Connection lost',
};
const ARIA = {
  idle: 'Start conversation', connecting: 'Connecting', listening: 'Stop listening', 'user-speaking': 'Stop listening',
  thinking: 'Agent is thinking', 'agent-speaking': 'Interrupt agent', interrupted: 'Stop listening',
  'mic-blocked': 'Microphone blocked', error: 'Retry connection',
};
const BAR_W = [0.55, 0.85, 1, 0.8, 0.5];

// One continuous filled wave around the disc. Every state only sets targets;
// the shape eases between them, so state changes never jump.
// amp: px beyond the disc edge · agent: 0 = user shape (quick, many lobes), 1 = agent shape (slow, round)
// op: fill opacity of the two layers
const TARGET = {
  idle:             { amp: () => 0, agent: 0, op: 0 },
  connecting:       { amp: () => 5, agent: 1, op: 0.1, pulse: true },
  listening:        { amp: () => 6, agent: 0, op: 0.12, breathe: true },
  'user-speaking':  { amp: (lv) => 7 + lv * 22, agent: 0, op: 0.2 },
  thinking:         { amp: () => 0, agent: 1, op: 0 },
  'agent-speaking': { amp: (lv) => 6 + lv * 20, agent: 1, op: 0.2 },
  interrupted:      { amp: () => 6, agent: 0, op: 0.12, fast: true },
  'mic-blocked':    { amp: () => 0, agent: 0, op: 0 },
  error:            { amp: () => 0, agent: 0, op: 0 },
};
const C = 84, R0 = 40;
const SHAPES = {
  user:  [{ a: 5, sa: 3.4, b: 7, sb: 2.6, seed: 0, k: 1 }, { a: 6, sa: 2.9, b: 4, sb: 3.8, seed: 2.1, k: 0.62 }],
  agent: [{ a: 2, sa: 1.3, b: 3, sb: 0.9, seed: 0.6, k: 1 }, { a: 3, sa: 1.0, b: 2, sb: 1.5, seed: 2.9, k: 0.6 }],
};

function radius(th, t, L) {
  return Math.sin(L.a * th + t * L.sa + L.seed) * 0.55 + Math.sin(L.b * th - t * L.sb + L.seed * 1.7) * 0.45;
}
function wavePath(t, amp, mixAgent, i) {
  const U = SHAPES.user[i], A = SHAPES.agent[i];
  const k = U.k + (A.k - U.k) * mixAgent;
  let d = '';
  const n = 144;
  for (let j = 0; j <= n; j++) {
    const th = (j / n) * Math.PI * 2;
    const w = radius(th, t, U) * (1 - mixAgent) + radius(th, t, A) * mixAgent;
    const r = R0 + amp * k * (0.55 + 0.45 * w);
    d += (j ? 'L' : 'M') + (C + r * Math.cos(th)).toFixed(1) + ' ' + (C + r * Math.sin(th)).toFixed(1);
  }
  return d + 'Z';
}

function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    if (!window.matchMedia) return;
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    setR(m.matches);
    const f = (e) => setR(e.matches);
    m.addEventListener && m.addEventListener('change', f);
    return () => m.removeEventListener && m.removeEventListener('change', f);
  }, []);
  return r;
}

export function VoiceButton({ state = 'idle', level = 0, simulate = false, label, onPress, onRetry, className = '' }) {
  const reduced = useReducedMotion();
  const pathRefs = useRef([]);
  const barRefs = useRef([]);
  const levelRef = useRef(level);
  levelRef.current = level;
  const stateRef = useRef(state);
  stateRef.current = state;
  const anim = useRef({ amp: 0, agent: 0, op: 0, lv: 0.3 });

  useEffect(() => {
    let raf, t0 = performance.now(), last = t0;
    const loop = (now) => {
      const t = (now - t0) / 1000;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const st = stateRef.current;
      const g = TARGET[st] || TARGET.idle;
      // `level` may be a function, read every frame, so live audio doesn't re-render the app.
      let lv = typeof levelRef.current === 'function' ? levelRef.current() : levelRef.current;
      if (simulate) {
        const syll = Math.max(0, Math.sin(t * 7.3) * 0.6 + Math.sin(t * 3.1 + 1) * 0.4);
        const phrase = Math.sin(t * 0.9) > -0.6 ? 1 : 0.15;
        lv = Math.min(1, (0.25 + syll * 0.75) * phrase);
      }
      const a = anim.current;
      a.lv += (lv - a.lv) * 0.25;
      let tAmp = g.amp(a.lv);
      if (g.breathe && !reduced) tAmp += 2.5 * Math.sin(t * 2.2);
      let tOp = g.op;
      if (g.pulse && !reduced) tOp *= 0.6 + 0.4 * Math.sin(t * 4);
      const rate = g.fast ? 0.35 : 0.12;
      a.amp += (tAmp - a.amp) * rate;
      a.agent += (g.agent - a.agent) * 0.06;
      a.op += (tOp - a.op) * (g.fast ? 0.3 : 0.1);
      const tt = reduced ? 0 : t;
      pathRefs.current.forEach((el, i) => {
        if (!el) return;
        el.setAttribute('d', wavePath(tt, a.amp, a.agent, i));
        el.style.opacity = String(a.op * (i === 0 ? 1 : 1.6));
      });
      if (st === 'agent-speaking') {
        barRefs.current.forEach((el, i) => {
          if (!el) return;
          const jitter = 0.7 + 0.3 * Math.sin(t * (9 + i * 2.3) + i);
          const h = reduced ? 6 + a.lv * 12 : 6 + a.lv * 24 * BAR_W[i] * jitter;
          el.style.height = `${h.toFixed(1)}px`;
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [simulate, reduced]);

  const isError = state === 'mic-blocked' || state === 'error';
  const live = state === 'listening' || state === 'user-speaking' || state === 'interrupted' || state === 'agent-speaking';
  const text = label || LABELS[state];

  let inner;
  if (state === 'thinking') inner = <span className="vr-voice__dots" aria-hidden="true"><span className="vr-voice__dot" /><span className="vr-voice__dot" /><span className="vr-voice__dot" /></span>;
  else if (state === 'agent-speaking') inner = <span className="vr-voice__bars" aria-hidden="true">{BAR_W.map((_, i) => <span key={i} ref={(el) => (barRefs.current[i] = el)} className="vr-voice__bar" />)}</span>;
  else if (state === 'mic-blocked') inner = <Icon name="mic-off" size={28} />;
  else if (state === 'error') inner = <Icon name="wifi-off" size={28} />;
  else inner = <Icon name="mic" size={28} />;

  return (
    <div className={`vr-voice ${className}`} data-state={state}>
      <div className="vr-voice__stage">
        <svg viewBox="0 0 168 168" aria-hidden="true" className="vr-voice__wave">
          {[0, 1].map((i) => <path key={i} ref={(el) => (pathRefs.current[i] = el)} d="" style={{ opacity: 0 }} />)}
        </svg>
        <button type="button" className="vr-voice__btn" aria-label={ARIA[state]} onClick={onPress}>
          {inner}
          {state === 'interrupted' && (
            <span className="vr-voice__cutlayer" aria-hidden="true">
              <span className="vr-voice__bars vr-voice__bars--cut">{BAR_W.map((w, i) => <span key={i} className="vr-voice__bar" style={{ height: 6 + 20 * w }} />)}</span>
            </span>
          )}
        </button>
      </div>
      <div key={state} className={`vr-voice__label ${live ? 'is-live' : ''} ${isError ? 'is-error' : ''}`} aria-live="polite">
        {(state === 'listening' || state === 'user-speaking' || state === 'interrupted') && <span className="vr-voice__rec" aria-hidden="true" />}
        {isError && <Icon name="warning" size={14} strokeWidth={2} />}
        <span>{text}</span>
        {state === 'error' && <><span aria-hidden="true">·</span><button type="button" className="vr-voice__retry" onClick={onRetry}>Retry</button></>}
      </div>
    </div>
  );
}
