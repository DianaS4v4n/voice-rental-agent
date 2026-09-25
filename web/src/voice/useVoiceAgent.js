// The live conversation: WebSocket to our server, microphone, agent playback,
// barge-in, per-turn latency and the board state pushed by the server.

import { useCallback, useEffect, useRef, useState } from 'react';
import { openAudio } from './audio.js';

// Published Deepgram Voice Agent price, Standard tier, pay-as-you-go (billed on connection time).
export const PRICE_PER_MINUTE = 0.075;
// Mic chunk loudness above which we count the user as speaking (for the latency start point).
const VOICE_RMS = 0.02;

export function useVoiceAgent() {
  const [voice, setVoice] = useState('idle');
  const [lines, setLines] = useState([]);
  const [board, setBoard] = useState({ request: null, inventory: null, bookings: [] });
  const [checking, setChecking] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const [latencies, setLatencies] = useState([]);
  const [banner, setBanner] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [endedAt, setEndedAt] = useState(null);
  const [, setTick] = useState(0);

  const ws = useRef(null);
  const audio = useRef(null);
  const live = useRef({});
  const lineId = useRef(0);

  const addLine = useCallback((line) => {
    setLines((prev) => [...prev, { id: ++lineId.current, ...line }]);
  }, []);

  const send = (message) => {
    if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify(message));
  };

  const markLastAgentLineInterrupted = () => {
    setLines((prev) => {
      const index = prev.findLastIndex((line) => line.speaker === 'agent');
      if (index < 0) return prev;
      return prev.map((line, i) => (i === index ? { ...line, interrupted: true } : line));
    });
  };

  /** Cuts the agent off, locally and for the confirmation gate on the server. */
  const cutAgent = () => {
    const wasPlaying = audio.current?.player.flush();
    live.current.dropAudio = true;
    if (wasPlaying) {
      send({ type: 'playback', event: 'interrupted' });
      markLastAgentLineInterrupted();
    }
    return wasPlaying;
  };

  const handleEvent = (message) => {
    const s = live.current;
    switch (message.type) {
      case 'SettingsApplied':
        s.ready = true;
        setVoice('listening');
        setStartedAt(Date.now());
        setEndedAt(null);
        break;
      case 'state':
        setBoard({ request: message.request, inventory: message.inventory, bookings: message.bookings });
        setChecking(false);
        if (message.event) setLastEvent({ ...message.event, at: Date.now() });
        if (message.event?.kind === 'booked') addLine({ speaker: 'system', text: `Booking ${message.event.bookingId} saved`, tone: 'success' });
        break;
      case 'ToolStarted':
        if (message.name === 'update_request' || message.name === 'confirm_booking') setChecking(true);
        break;
      case 'UserStartedSpeaking':
        s.userTurnOpen = true;
        if (cutAgent()) {
          setVoice('interrupted');
          setTimeout(() => setVoice((v) => (v === 'interrupted' ? 'user-speaking' : v)), 220);
        } else {
          setVoice('user-speaking');
        }
        break;
      case 'ConversationText':
        if (message.role === 'user') {
          addLine({ speaker: 'user', text: message.content });
          s.userSpoke = true;
          setVoice((v) => (v === 'user-speaking' || v === 'listening' ? 'thinking' : v));
        } else {
          addLine({ speaker: 'agent', text: message.content });
        }
        break;
      case 'AgentThinking':
        setVoice((v) => (v === 'agent-speaking' ? v : 'thinking'));
        break;
      case 'AgentStartedSpeaking':
        s.dropAudio = false;
        s.audioDone = false;
        s.firstChunkPending = true;
        s.deepgramLatency = message.total_latency;
        break;
      case 'AgentAudioDone':
        s.audioDone = true;
        if (!audio.current?.player.playing) onPlaybackIdle();
        break;
      case 'Error':
        console.error('Voice agent error', message);
        setBanner({ kind: 'error', text: message.description || 'The voice service reported an error.' });
        break;
      case 'Warning':
        console.warn('Voice agent warning', message);
        break;
      case 'Closed':
        if (message.code !== 1000) setBanner({ kind: 'net', text: message.reason || `Connection closed (${message.code})` });
        break;
    }
  };

  const onAgentAudio = (data) => {
    const s = live.current;
    if (s.dropAudio || !audio.current) return;
    const audibleAt = audio.current.player.enqueue(data);
    if (audibleAt == null) return;
    setVoice('agent-speaking');
    if (s.firstChunkPending) {
      s.firstChunkPending = false;
      // Latency = end of the user's speech → first audible sample of the reply.
      if (s.userSpoke && s.lastVoiceAt) {
        const ms = Math.round(audibleAt - s.lastVoiceAt);
        const entry = { turn: 0, ms, deepgramMs: s.deepgramLatency != null ? Math.round(s.deepgramLatency * 1000) : null };
        setLatencies((prev) => [...prev, { ...entry, turn: prev.length + 1 }]);
        send({ type: 'metric', latencyMs: ms, deepgramLatencyMs: entry.deepgramMs });
      }
      s.userSpoke = false;
    }
  };

  function onPlaybackIdle() {
    const s = live.current;
    if (!s.audioDone) return; // a gap inside one reply, more audio is on its way
    send({ type: 'playback', event: 'finished' });
    setVoice((v) => (v === 'agent-speaking' ? 'listening' : v));
  }

  const stop = useCallback(() => {
    ws.current?.close(1000);
    ws.current = null;
    audio.current?.close();
    audio.current = null;
    live.current = {};
    setVoice('idle');
    setEndedAt((end) => end ?? Date.now());
  }, []);

  const start = useCallback(async () => {
    setBanner(null);
    setVoice('connecting');
    live.current = {};
    try {
      audio.current = await openAudio({
        onMicChunk: (pcm, rms) => {
          const s = live.current;
          if (rms > VOICE_RMS && !audio.current?.player.playing) s.lastVoiceAt = performance.now();
          if (s.ready && ws.current?.readyState === WebSocket.OPEN) ws.current.send(pcm);
        },
      });
    } catch (error) {
      console.error(error);
      setVoice('mic-blocked');
      setBanner({ kind: 'mic' });
      return;
    }
    audio.current.player.onIdle = onPlaybackIdle;

    const socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/agent`);
    socket.binaryType = 'arraybuffer';
    socket.onmessage = (event) => {
      if (typeof event.data === 'string') handleEvent(JSON.parse(event.data));
      else onAgentAudio(event.data);
    };
    socket.onclose = (event) => {
      if (ws.current !== socket) return;
      audio.current?.close();
      audio.current = null;
      ws.current = null;
      setEndedAt((end) => end ?? Date.now());
      setVoice(event.code === 1000 ? 'idle' : 'error');
      if (event.code !== 1000) setBanner((b) => b ?? { kind: 'net' });
    };
    ws.current = socket;
  }, []);

  /** The voice button: start, interrupt, or stop depending on the state. */
  const press = useCallback(() => {
    if (voice === 'idle' || voice === 'error' || voice === 'mic-blocked') return start();
    if (voice === 'agent-speaking') {
      cutAgent();
      setVoice('listening');
      return;
    }
    stop();
  }, [voice, start, stop]);

  const reset = useCallback(async () => {
    stop();
    await fetch('/api/reset', { method: 'POST' });
    const snapshot = await (await fetch('/api/state')).json();
    setBoard({ request: null, inventory: null, bookings: snapshot.bookings });
    setLines([]);
    setLatencies([]);
    setLastEvent(null);
    setBanner(null);
    setStartedAt(null);
    setEndedAt(null);
  }, [stop]);

  // Initial database state, before any conversation.
  useEffect(() => {
    fetch('/api/state')
      .then((res) => res.json())
      .then((snapshot) => setBoard((b) => ({ ...b, bookings: snapshot.bookings })));
    return () => stop();
  }, [stop]);

  // Re-render once a second while connected, for the running session cost.
  useEffect(() => {
    if (!startedAt || endedAt) return;
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [startedAt, endedAt]);

  const sessionSeconds = startedAt ? ((endedAt ?? Date.now()) - startedAt) / 1000 : 0;

  return {
    voice,
    lines,
    board,
    checking,
    lastEvent,
    latencies,
    banner,
    sessionSeconds,
    level: () => (voice === 'agent-speaking' ? audio.current?.agentLevel() : audio.current?.micLevel()) ?? 0,
    press,
    start,
    stop,
    reset,
  };
}
