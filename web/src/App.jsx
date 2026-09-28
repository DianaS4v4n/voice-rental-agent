import React, { useEffect, useRef, useState } from 'react';
import { AppHeader } from './design/components/header/AppHeader.jsx';
import { VoiceButton } from './design/components/voice/VoiceButton.jsx';
import { Transcript } from './design/components/transcript/Transcript.jsx';
import { RequestCard } from './design/components/request/RequestCard.jsx';
import { ProductCard } from './design/components/product/ProductCard.jsx';
import { BookingReceipt } from './design/components/receipt/BookingReceipt.jsx';
import { DemoPanel } from './design/components/demo/DemoPanel.jsx';
import { Banner } from './design/components/feedback/Banner.jsx';
import { Toast } from './design/components/feedback/Toast.jsx';
import { Button } from './design/components/core/Button.jsx';
import { useVoiceAgent, PRICE_PER_MINUTE } from './voice/useVoiceAgent.js';
import { daysBetween, formatCreated, formatRange } from './format.js';
import { PREVIEW } from './preview.js';

const PRODUCTS = [
  { id: 'camera_a', name: 'Camera A', kind: 'camera', total: 2, image: '/products/camera-a.png' },
  { id: 'tripod_b', name: 'Tripod B', kind: 'tripod', total: 3, image: '/products/tripod-b.png' },
  { id: 'microphone_c', name: 'Microphone C', kind: 'microphone', total: 1, image: '/products/microphone-c.png' },
];

const STATUS = { collecting: 'collecting', unavailable: 'unavailable', awaiting_confirmation: 'awaiting', confirmed: 'confirmed' };

/** Which fields changed since the previous version of the same request. */
function useCorrections(request) {
  const last = useRef(null);
  const [diff, setDiff] = useState({ previous: {}, fresh: [] });
  useEffect(() => {
    const prev = last.current;
    last.current = request;
    if (!request) return setDiff({ previous: {}, fresh: [] });
    if (!prev || prev.id !== request.id || prev.version === request.version) {
      if (!prev || prev.id !== request.id) setDiff({ previous: {}, fresh: [] });
      return;
    }
    const fields = {
      item: [prev.itemName, request.itemName],
      qty: [prev.quantity, request.quantity],
      dates: [formatRange(prev.startDate, prev.endDate), formatRange(request.startDate, request.endDate)],
    };
    const previous = {};
    const fresh = [];
    for (const [key, [before, after]] of Object.entries(fields)) {
      if (before === after) continue;
      fresh.push(key);
      if (before != null) previous[key] = before;
    }
    setDiff({ previous, fresh });
  }, [request]);
  return diff;
}

function requestCardProps(request, checking, lastEvent, corrections) {
  if (!request) return { status: checking ? 'checking' : 'collecting' };
  const dates = formatRange(request.startDate, request.endDate);
  let status = checking ? 'checking' : STATUS[request.status];
  let note;
  let noteTone;
  if (request.status === 'unavailable') {
    note = `Only ${Math.max(request.freeUnits, 0)} of ${request.quantity} ${request.itemName} available on ${dates}`;
  } else if (request.status === 'awaiting_confirmation') {
    note = 'Waiting for your “yes”';
  } else if (request.status === 'confirmed') {
    const repeat = lastEvent?.kind === 'already_booked' && lastEvent.bookingId === request.bookingId;
    if (repeat && !checking) {
      status = 'already-booked';
      note = `Already booked as ${request.bookingId} — no duplicate created`;
      noteTone = 'neutral';
    } else {
      note = `Booked · ${request.bookingId}`;
    }
  }
  return {
    status,
    bookingId: request.bookingId ?? undefined,
    item: request.itemName,
    qty: request.quantity,
    dates,
    note,
    noteTone,
    ...corrections,
  };
}

export function App() {
  const live = useVoiceAgent();
  // In development, /?preview=<state> replaces the live data with a fixture (see preview.js).
  const agent = PREVIEW ? { ...live, ...PREVIEW } : live;
  const [showDb, setShowDb] = useState(false);
  const [compact, setCompact] = useState(window.innerWidth < 640);
  const [toast, setToast] = useState(null);
  const { request, inventory, bookings } = agent.board;
  const corrections = useCorrections(request);

  useEffect(() => {
    const onResize = () => setCompact(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Toast for the two moments that matter: saved, and "already saved".
  useEffect(() => {
    const e = agent.lastEvent;
    if (!e || (e.kind !== 'booked' && e.kind !== 'already_booked')) return;
    setToast(e.kind === 'booked' ? { tone: 'success', text: 'Booked · ', id: e.bookingId } : { tone: 'neutral', icon: 'duplicate', text: 'Already booked as ', id: e.bookingId });
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [agent.lastEvent]);

  const booking = request?.bookingId ? bookings.find((b) => b.id === request.bookingId) : null;
  const receipt = booking
    ? {
        bookingId: booking.id,
        item: booking.itemName,
        qty: booking.quantity,
        dates: formatRange(booking.startDate, booking.endDate, true),
        days: daysBetween(booking.startDate, booking.endDate),
        createdAt: formatCreated(booking.createdAt),
        mode: agent.lastEvent?.kind === 'already_booked' ? 'repeat' : 'new',
        animKey: agent.lastEvent?.at,
      }
    : null;

  const dates = request ? formatRange(request.startDate, request.endDate) : null;
  const freeById = Object.fromEntries((inventory ?? []).map((row) => [row.itemId, row.free]));

  const booked = agent.lastEvent?.kind === 'booked' ? agent.lastEvent : null;
  const snapshot = booked
    ? booked.before.map((row, i) => ({ item: row.name, before: row.free, after: booked.after[i].free }))
    : [];

  const connection = agent.voice === 'connecting' ? 'connecting' : agent.voice === 'idle' ? 'ready' : agent.voice === 'error' || agent.voice === 'mic-blocked' ? 'offline' : 'connected';

  return (
    <div className="kit-app">
      <AppHeader compact={compact} connection={connection} showDatabase={showDb} onToggleDatabase={setShowDb} onReset={agent.reset} className="kit-header" />
      <main className="kit-main">
        <section className="kit-conv" aria-label="Conversation">
          {agent.banner?.kind === 'mic' && (
            <Banner tone="danger" icon="mic-off" title="Microphone access is blocked" actions={<Button size="sm" variant="secondary" onClick={agent.start}>Try again</Button>}>
              Allow microphone access to talk to the agent
            </Banner>
          )}
          {(agent.banner?.kind === 'net' || agent.banner?.kind === 'error') && (
            <Banner tone="danger" icon="wifi-off" title="Connection lost" actions={<Button size="sm" onClick={agent.start}>Retry</Button>}>
              {agent.banner.text || 'Reconnect to continue.'}
            </Banner>
          )}
          {agent.lines.length === 0 ? (
            <div className="kit-conv__empty">
              <span className="vr-eyebrow">Rent a camera, tripod or microphone</span>
              <p>Say what you need and for which days. You can change your mind at any point. Nothing is booked until you say “yes”.</p>
            </div>
          ) : (
            <Transcript lines={agent.lines} className="kit-conv__feed" />
          )}
          <div className="kit-conv__voice">
            <VoiceButton state={agent.voice} level={agent.level} onPress={agent.press} onRetry={agent.start} />
          </div>
        </section>

        <section className="kit-board" aria-label="Your order">
          <div className="kit-board__top">
            {/* After a booking the request card clears for the next request; the receipt holds the result. */}
            {request?.status === 'confirmed' ? (
              <RequestCard title="Next request" status="collecting" note="Anything else? Say what you need next." noteTone="neutral" />
            ) : (
              <RequestCard {...requestCardProps(request, agent.checking, agent.lastEvent, corrections)} />
            )}
            <BookingReceipt {...(receipt ?? { empty: true })} />
          </div>
          <div className="kit-board__inventory">
            <div className="kit-board__label">
              <span className="vr-eyebrow">Inventory</span>
            </div>
            <div className="kit-board__products">
              {PRODUCTS.map((p) => (
                <ProductCard
                  key={p.id}
                  name={p.name}
                  kind={p.kind}
                  image={p.image}
                  total={p.total}
                  free={inventory ? freeById[p.id] : null}
                  requested={request?.itemId === p.id && request.status !== 'confirmed' ? request.quantity ?? 1 : 0}
                />
              ))}
            </div>
          </div>
        </section>
      </main>

      {showDb && (
        <div className="kit-drawer">
          <DemoPanel
            bookings={bookings.map((b) => ({
              id: b.id,
              item: b.itemName,
              qty: b.quantity,
              dates: formatRange(b.startDate, b.endDate),
              created: formatCreated(b.createdAt),
              isNew: b.id === booked?.bookingId,
            }))}
            snapshot={snapshot}
            latencies={agent.latencies}
            cost={(agent.sessionSeconds / 60) * PRICE_PER_MINUTE}
            onClose={() => setShowDb(false)}
          />
        </div>
      )}

      {toast && (
        <div className="kit-toast">
          <Toast tone={toast.tone} icon={toast.icon}>
            {toast.text}
            <span className="vr-toast__id">{toast.id}</span>
          </Toast>
        </div>
      )}
    </div>
  );
}
