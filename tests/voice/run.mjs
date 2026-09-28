// Voice test runner. Plays each test case into the running app as if it were a browser:
// streams "microphone" audio in real time (speech and silence), simulates playback of the
// agent's voice (so the confirmation gate sees finished / interrupted read-backs), and records
// everything: a WAV of the whole conversation, transcript, DB before/after, latency per turn.
//
// Usage (the app must be running, see README):
//   node --env-file=.env tests/voice/run.mjs            all cases
//   node --env-file=.env tests/voice/run.mjs T1 T4      selected cases
// Env: APP_URL (default http://localhost:3000), DEEPGRAM_API_KEY (only to synthesise missing audio).

import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { CASES } from './cases.mjs';

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';
const WS_URL = APP_URL.replace(/^http/, 'ws') + '/agent';
const RATE = 24000;
const CHUNK = 960; // 40 ms, same as the browser
const CHUNK_MS = 40;
const VOICE = 'aura-2-apollo-en'; // customer voice; the agent uses a different one
const PRICE_PER_MINUTE = 0.075; // Deepgram Voice Agent, Standard tier, pay-as-you-go
const REPLY_TIMEOUT_MS = 25000;
const QUIET_AFTER_REPLY_MS = 1500;

const HERE = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const AUDIO_DIR = join(HERE, 'audio');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Synthetic customer speech (cached, committed with the repo) ----------

async function speech(text) {
  mkdirSync(AUDIO_DIR, { recursive: true });
  const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
  const hash = createHash('sha1').update(VOICE + text).digest('hex').slice(0, 6);
  const file = join(AUDIO_DIR, `${slug}-${hash}.wav`);
  if (!existsSync(file)) {
    const key = process.env.DEEPGRAM_API_KEY;
    if (!key) throw new Error(`Missing ${file} and no DEEPGRAM_API_KEY to synthesise it.`);
    const res = await fetch(`https://api.deepgram.com/v1/speak?model=${VOICE}&encoding=linear16&sample_rate=${RATE}&container=wav`, {
      method: 'POST',
      headers: { Authorization: `Token ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`TTS failed (${res.status}): ${await res.text()}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  const wav = readFileSync(file);
  const pcm = new Int16Array(wav.buffer.slice(wav.byteOffset + 44, wav.byteOffset + wav.length));
  return toChunks(pcm);
}

function toChunks(pcm) {
  const chunks = [];
  for (let i = 0; i < pcm.length; i += CHUNK) {
    const c = new Int16Array(CHUNK);
    c.set(pcm.subarray(i, i + CHUNK));
    chunks.push(c);
  }
  return chunks;
}

const silence = (ms) => Array.from({ length: Math.round(ms / CHUNK_MS) }, () => new Int16Array(CHUNK));

// ---------- One conversation ----------

async function runCase(testCase) {
  await fetch(`${APP_URL}/api/reset`, { method: 'POST' });
  const before = await (await fetch(`${APP_URL}/api/state`)).json();

  const ws = new WebSocket(WS_URL);
  ws.binaryType = 'arraybuffer';
  const t0 = performance.now();
  const now = () => performance.now() - t0;

  const events = [];
  const transcript = [];
  const latencies = [];
  const userAudio = []; // { at, pcm }
  const agentAudio = []; // { at, pcm } at simulated play time
  const mic = []; // queued chunks; silence when empty
  let lastState = null;
  let ready = false;
  let closed = false;

  // Simulated playback of the agent's voice.
  const play = { end: 0, playing: false, audioDone: false, dropping: false, replyStartedAt: null };
  // Latency: end of the customer's speech → first agent audio of the reply.
  const turn = { speechEndedAt: null, waitingFirstAudio: false };
  // Useful answer: end of speech → first audio of the agent's text that follows the turn's tool result
  // (or simply the first audio when no tool ran). A "let me check" filler counts for latency, not here.
  let lastActivity = 0;

  const log = (e) => events.push({ t: Math.round(now()), ...e });

  ws.onmessage = (event) => {
    lastActivity = now();
    if (typeof event.data !== 'string') {
      if (play.dropping) return;
      const pcm = new Int16Array(event.data);
      const start = Math.max(now(), play.end);
      play.end = start + (pcm.length / RATE) * 1000;
      if (!play.playing) {
        play.playing = true;
        play.replyStartedAt = start;
      }
      agentAudio.push({ at: start, recvAt: now(), pcm });
      if (turn.waitingFirstAudio && turn.speechEndedAt != null) {
        latencies.push({ turn: latencies.length + 1, ms: Math.round(start - turn.speechEndedAt) });
        turn.waitingFirstAudio = false;
      }
      return;
    }
    const m = JSON.parse(event.data);
    if (m.type !== 'state') log({ type: m.type, ...(m.role ? { role: m.role, content: m.content } : {}), ...(m.name ? { name: m.name } : {}), ...(m.description ? { description: m.description } : {}) });
    switch (m.type) {
      case 'SettingsApplied':
        ready = true;
        break;
      case 'state':
        lastState = m;
        log({ type: 'state_update' });
        if (m.event) log({ type: 'board', event: m.event.kind, bookingId: m.event.bookingId, code: m.event.code });
        break;
      case 'ConversationText':
        transcript.push({ t: Math.round(now()), role: m.role, text: m.content });
        if (m.role === 'user') {
          // Same boundary the browser uses: the user's turn is complete, the next audio is a new reply.
          play.dropping = false;
          play.audioDone = false;
          turn.waitingFirstAudio = true;
          log({ type: 'speech_end', at: turn.speechEndedAt });
        }
        break;
      case 'UserStartedSpeaking':
        if (play.playing && now() < play.end) {
          // Barge-in: the browser cuts playback and tells the server.
          play.playing = false;
          play.end = now();
          play.dropping = true;
          ws.send(JSON.stringify({ type: 'playback', event: 'interrupted' }));
          log({ type: 'client_interrupted_playback' });
        }
        break;
      case 'AgentAudioDone':
        play.audioDone = true;
        break;
    }
  };
  ws.onclose = () => (closed = true);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = () => reject(new Error(`Cannot connect to ${WS_URL}. Is the app running?`));
  });

  // Microphone loop: one 40 ms chunk every 40 ms, speech from the queue or silence.
  let micTick = 0;
  const micStart = performance.now();
  const micLoop = (async () => {
    while (!closed) {
      micTick++;
      if (ready && ws.readyState === WebSocket.OPEN) {
        const chunk = mic.shift() ?? new Int16Array(CHUNK);
        ws.send(chunk.buffer);
        // Recorded at its ideal slot (not the jittery send time) so the WAV has no clicks between chunks.
        const at = micStart - t0 + (micTick - 1) * CHUNK_MS;
        if (chunk.speech) {
          userAudio.push({ at, pcm: chunk });
          turn.speechEndedAt = at + CHUNK_MS;
        }
      }
      // Playback "finishes" once all agent audio has been played out.
      if (play.playing && play.audioDone && now() >= play.end) {
        play.playing = false;
        ws.send(JSON.stringify({ type: 'playback', event: 'finished' }));
      }
      const next = micStart + micTick * CHUNK_MS;
      await sleep(Math.max(0, next - performance.now()));
    }
  })();

  const enqueue = (chunks, isSpeech = true) => {
    for (const c of chunks) {
      if (isSpeech) c.speech = true;
      mic.push(c);
    }
  };
  const micDrained = async () => {
    while (mic.length > 0) await sleep(20);
  };
  // A reply is over when its audio has played out and nothing has arrived for a while.
  const waitForReply = async () => {
    const started = now();
    while (now() - started < REPLY_TIMEOUT_MS) {
      await sleep(100);
      const quiet = now() - lastActivity > QUIET_AFTER_REPLY_MS;
      if (play.audioDone && !play.playing && quiet && now() >= play.end) return true;
    }
    log({ type: 'reply_timeout' });
    return false;
  };

  while (!ready) await sleep(50);
  await waitForReply(); // greeting

  for (const step of testCase.steps) {
    if (step.say) {
      enqueue(await speech(step.say));
      if (step.pauseMs) {
        enqueue(silence(step.pauseMs), false);
        enqueue(await speech(step.then));
      }
      await micDrained();
      play.audioDone = false;
      if (!step.noWait) await waitForReply();
    } else if (step.interrupt) {
      // The previous step already produced a reply; barge in on the *next* reply after afterMs.
      const replyAudio = await speech(step.interrupt);
      const waitStart = now();
      while (!(play.playing && play.replyStartedAt != null && now() - play.replyStartedAt >= step.afterMs)) {
        if (now() - waitStart > REPLY_TIMEOUT_MS) break;
        await sleep(20);
      }
      enqueue(replyAudio);
      await micDrained();
      play.audioDone = false;
      await waitForReply();
    }
  }

  await sleep(500);
  const durationSeconds = now() / 1000;
  ws.close(1000);
  await micLoop;
  const after = await (await fetch(`${APP_URL}/api/state`)).json();
  const useful = usefulAnswers(events, agentAudio);

  return { before, after, events, transcript, latencies, userAudio, agentAudio, finalRequest: lastState?.request ?? null, durationSeconds };
}

// A `say` followed by an `interrupt` must not wait for the agent's reply to finish:
// the interrupt has to land while that reply (the read-back) is still playing.
function prepare(testCase) {
  const steps = testCase.steps.map((s, i) => ({ ...s, noWait: Boolean(testCase.steps[i + 1]?.interrupt) }));
  return { ...testCase, steps };
}

// Useful answer per turn: end of the customer's speech → first agent audio that arrives after the
// agent's first text following the turn's last tool result (or its first text if no tool ran).
// A 'let me check' filler therefore counts for first-audio latency but not for the useful answer.
function usefulAnswers(events, agentAudio) {
  const ends = events.filter((e) => e.type === 'speech_end');
  return ends.map((end, i) => {
    const from = end.t;
    const to = ends[i + 1]?.t ?? Infinity;
    const inTurn = events.filter((e) => e.t >= from && e.t < to);
    const lastTool = inTurn.filter((e) => e.type === 'state_update').at(-1);
    const text = inTurn.find((e) => e.type === 'ConversationText' && e.role === 'assistant' && (!lastTool || e.t >= lastTool.t));
    const audio = text && agentAudio.find((a) => a.recvAt >= text.t && a.recvAt < to);
    return audio ? { turn: i + 1, ms: Math.round(audio.at - end.at) } : null;
  }).filter(Boolean);
}

// ---------- Checks ----------

const bookingKey = (b) => `${b.itemId}|${b.quantity}|${b.startDate}|${b.endDate}`;

function check(testCase, result) {
  const checks = [];
  const beforeIds = new Set(result.before.bookings.map((b) => b.id));
  const created = result.after.bookings.filter((b) => !beforeIds.has(b.id));
  const expected = testCase.expect.newBookings;
  checks.push({
    name: `New bookings: ${expected.length ? expected.map(bookingKey).join(', ') : 'none'}`,
    pass: created.length === expected.length && expected.every((e, i) => created[i] && bookingKey(created[i]) === bookingKey(e)),
    actual: created.length ? created.map(bookingKey).join(', ') : 'none',
  });
  const agentText = result.transcript.filter((l) => l.role === 'assistant').slice(1).map((l) => l.text).join(' ');
  if (testCase.expect.agentSays) {
    checks.push({ name: `Agent says ${testCase.expect.agentSays}`, pass: testCase.expect.agentSays.test(agentText), actual: agentText.slice(0, 160) });
  }
  if (testCase.expect.agentAsks) {
    checks.push({ name: 'Agent asks a clarifying question', pass: /\?/.test(agentText), actual: agentText.slice(0, 160) });
  }
  if (testCase.expect.interrupted) {
    const cut = result.events.some((e) => e.type === 'client_interrupted_playback');
    checks.push({ name: 'Agent was interrupted and stopped talking', pass: cut, actual: cut ? 'playback cut on barge-in' : 'no barge-in happened' });
  }
  if (testCase.expect.noReplyDuringPause) {
    const lines = result.transcript;
    const firstUser = lines.findIndex((l) => l.role === 'user');
    const answeredMidPause = firstUser >= 0 && lines[firstUser + 1]?.role === 'assistant' && lines.slice(firstUser + 2).some((l) => l.role === 'user');
    checks.push({ name: 'Agent stays silent during the mid-sentence pause', pass: !answeredMidPause, actual: answeredMidPause ? `answered in the pause: "${lines[firstUser + 1].text}"` : 'waited for the full request' });
  }
  if (testCase.expect.finalRequest) {
    const r = result.finalRequest ?? {};
    const want = testCase.expect.finalRequest;
    const pass = Object.entries(want).every(([k, v]) => r[k] === v);
    checks.push({ name: `Final request ${Object.values(want).join(' ')}`, pass, actual: `${r.itemId} ${r.startDate} ${r.endDate}` });
  }
  return checks;
}

// ---------- Recording ----------

function writeWav(file, parts, durationSeconds) {
  const length = Math.ceil((durationSeconds + 1) * RATE);
  const mix = new Int32Array(length);
  for (const { at, pcm } of parts) {
    const offset = Math.round((at / 1000) * RATE);
    for (let i = 0; i < pcm.length && offset + i < length; i++) mix[offset + i] += pcm[i];
  }
  const out = Buffer.alloc(44 + length * 2);
  out.write('RIFF', 0); out.writeUInt32LE(36 + length * 2, 4); out.write('WAVE', 8);
  out.write('fmt ', 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22);
  out.writeUInt32LE(RATE, 24); out.writeUInt32LE(RATE * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34);
  out.write('data', 36); out.writeUInt32LE(length * 2, 40);
  for (let i = 0; i < length; i++) out.writeInt16LE(Math.max(-32768, Math.min(32767, mix[i])), 44 + i * 2);
  writeFileSync(file, out);
}

// ---------- Main ----------

const selected = process.argv.slice(2);
const cases = CASES.filter((c) => selected.length === 0 || selected.includes(c.id)).map(prepare);
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const variant = process.env.VARIANT ? `-${process.env.VARIANT}` : '';
const outDir = join(HERE, 'results', stamp + variant);
mkdirSync(outDir, { recursive: true });

const summary = [];
for (const testCase of cases) {
  process.stdout.write(`${testCase.id} ${testCase.title} … `);
  const result = await runCase(testCase);
  const checks = check(testCase, result);
  const pass = checks.every((c) => c.pass);
  console.log(pass ? 'PASS' : 'FAIL');
  for (const c of checks) console.log(`   ${c.pass ? '✓' : '✗'} ${c.name}  →  ${c.actual}`);

  writeWav(join(outDir, `${testCase.id}.wav`), [...result.userAudio, ...result.agentAudio], result.durationSeconds);
  const { userAudio, agentAudio, ...rest } = result;
  writeFileSync(join(outDir, `${testCase.id}.json`), JSON.stringify({ id: testCase.id, title: testCase.title, steps: testCase.steps, expect: testCase.expect, checks, ...rest }, (k, v) => (v instanceof RegExp ? String(v) : v), 2));
  summary.push({ testCase, checks, pass, result });
}

// Summary report
const allUseful = summary.flatMap((s) => s.result.useful.map((l) => l.ms)).sort((a, b) => a - b);
const stats = (xs) => (xs.length ? `${xs.length} turns · median ${xs[Math.floor(xs.length / 2)]} ms · p90 ${xs[Math.min(xs.length - 1, Math.floor(0.9 * xs.length))]} ms · max ${xs.at(-1)} ms` : 'none');
const allLatencies = summary.flatMap((s) => s.result.latencies.map((l) => l.ms)).sort((a, b) => a - b);
const pct = (p) => allLatencies[Math.min(allLatencies.length - 1, Math.floor((p / 100) * allLatencies.length))];
const totalMinutes = summary.reduce((sum, s) => sum + s.result.durationSeconds, 0) / 60;
const lines = [
  `# Voice test run ${stamp}${variant}`,
  '',
  `App: ${APP_URL} · customer voice: Deepgram ${VOICE} (synthetic) · ${summary.filter((s) => s.pass).length}/${summary.length} passed`,
  '',
  '| Test | Result | Checks | First audio / useful answer per turn (ms) | Duration |',
  '|---|---|---|---|---|',
  ...summary.map((s) => `| ${s.testCase.id} ${s.testCase.title} | ${s.pass ? 'PASS' : '**FAIL**'} | ${s.checks.map((c) => `${c.pass ? '✓' : '✗'} ${c.name} → ${c.actual}`).join('<br>')} | ${s.result.latencies.map((l) => l.ms).join(', ') || '—'}<br>useful: ${s.result.useful.map((l) => l.ms).join(', ') || '—'} | ${s.result.durationSeconds.toFixed(0)} s |`),
  '',
  '## Latency (end of customer speech → first agent audio received)',
  '',
  allLatencies.length ? `${allLatencies.length} turns · median ${pct(50)} ms · p90 ${pct(90)} ms · max ${allLatencies.at(-1)} ms` : 'No turns measured.',
  '',
  `**Useful answer** (first audio of the reply that carries the tool result): ${stats(allUseful)}`,
  '',
  'Measured at the WebSocket client, so it excludes browser playback buffering (the browser adds its output latency, typically 10–50 ms).',
  '',
  '## Cost of this run',
  '',
  `${totalMinutes.toFixed(1)} min of agent connection × $${PRICE_PER_MINUTE}/min = $${(totalMinutes * PRICE_PER_MINUTE).toFixed(3)} (list price, not free credits).`,
  '',
  '## Transcripts',
  '',
  ...summary.flatMap((s) => [`### ${s.testCase.id} ${s.testCase.title}`, '', ...s.result.transcript.map((l) => `- **${l.role === 'user' ? 'Customer' : 'Agent'}** (${(l.t / 1000).toFixed(1)} s): ${l.text}`), '']),
];
writeFileSync(join(outDir, 'summary.md'), lines.join('\n'));
console.log(`\nResults: ${outDir}`);
