// Drives the real web app in a visible Chrome window with a synthetic customer voice, for the video walkthrough.
// The page's microphone is replaced by a WebAudio stream the script speaks into; the customer's voice is also played
// through the speakers, so a screen recorder capturing desktop audio records both sides of the conversation.
//
// Usage: node --env-file=.env tests/voice/demo-driver.mjs [app URL]   (default: the deployed demo)
// Start the screen recording, then run this; it counts down 5 s before it begins.

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const APP_URL = process.argv[2] ?? 'https://voice-rental-agent.onrender.com';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const VOICE = 'aura-2-apollo-en';
const RATE = 24000;
const HERE = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const AUDIO_DIR = join(HERE, 'audio');

const SCRIPT = [
  { say: 'I need two cameras for October eleventh.' },
  { say: 'Okay, then a tripod from October fourteenth to fifteenth.', noWait: true },
  { interrupt: 'Wait, make it October sixteenth to seventeenth.', afterMs: 1500 },
  { say: 'Yes, please.' },
  { say: 'Yes, book it.' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const timeline = [];
const mark = (label) => {
  const s = ((Date.now() - t0) / 1000).toFixed(1);
  timeline.push({ s: Number(s), label });
  console.log(`${s.padStart(6)} s  ${label}`);
};

async function speechBase64(text) {
  mkdirSync(AUDIO_DIR, { recursive: true });
  const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
  const hash = createHash('sha1').update(VOICE + text).digest('hex').slice(0, 6);
  const file = join(AUDIO_DIR, `${slug}-${hash}.wav`);
  if (!existsSync(file)) {
    const res = await fetch(`https://api.deepgram.com/v1/speak?model=${VOICE}&encoding=linear16&sample_rate=${RATE}&container=wav`, {
      method: 'POST',
      headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return readFileSync(file).subarray(44).toString('base64');
}

// Injected before the app loads: getUserMedia returns a stream the driver can speak into.
const INJECT = `(() => {
  const demo = (window.__demo = {});
  navigator.mediaDevices.getUserMedia = async () => {
    demo.ctx = new AudioContext({ sampleRate: ${RATE} });
    demo.dest = demo.ctx.createMediaStreamDestination();
    return demo.dest.stream;
  };
  demo.say = (b64) => new Promise((resolve) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const pcm = new Int16Array(bytes.buffer, 0, bytes.length >> 1);
    const buffer = demo.ctx.createBuffer(1, pcm.length, ${RATE});
    const data = buffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) data[i] = pcm[i] / 32768;
    const src = demo.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(demo.dest);
    src.connect(demo.ctx.destination); // audible for the screen recording
    src.onended = () => resolve(buffer.duration);
    src.start();
  });
})();`;

const chrome = spawn(CHROME, [
  `--app=about:blank`, '--start-fullscreen', '--remote-debugging-port=9336', '--autoplay-policy=no-user-gesture-required',
  '--use-fake-ui-for-media-stream', `--user-data-dir=${process.env.TEMP}\\demo-driver-profile`, '--no-first-run',
]);
let targets;
for (let i = 0; i < 60; i++) {
  try { targets = await (await fetch('http://127.0.0.1:9336/json')).json(); if (targets.some((t) => t.type === 'page')) break; } catch {}
  await sleep(250);
}
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => {
  const m = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (m.result?.exceptionDetails) throw new Error(m.result.exceptionDetails.exception?.description ?? 'evaluate failed');
  return m.result?.result?.value;
};
const voiceState = () => ev(`document.querySelector('.vr-voice')?.dataset.state`);
const toggleDb = () => ev(`document.querySelector('.vr-toggle input').click()`);
const pressVoice = () => ev(`document.querySelector('.vr-voice__btn').click()`);

/** Waits until the agent has spoken and then stayed quiet (listening) for quietMs. */
async function waitForReply(quietMs = 1200, timeoutMs = 30000) {
  const start = Date.now();
  let spoke = false;
  let quietSince = null;
  while (Date.now() - start < timeoutMs) {
    const s = await voiceState();
    if (s === 'agent-speaking' || s === 'thinking') { spoke = spoke || s === 'agent-speaking'; quietSince = null; }
    else if (spoke && s === 'listening') { quietSince ??= Date.now(); if (Date.now() - quietSince >= quietMs) return; }
    await sleep(100);
  }
  mark('(reply wait timed out)');
}

/** Waits until the agent has been speaking continuously for ms (past a short "Let me check."). */
async function waitSpeakingFor(ms, timeoutMs = 30000) {
  const start = Date.now();
  let since = null;
  while (Date.now() - start < timeoutMs) {
    const s = await voiceState();
    if (s === 'agent-speaking') { since ??= Date.now(); if (Date.now() - since >= ms) return; } else since = null;
    await sleep(50);
  }
}

await send('Page.enable');
await send('Page.addScriptToEvaluateOnNewDocument', { source: INJECT });
await fetch(`${APP_URL}/api/reset`, { method: 'POST' });
await send('Page.navigate', { url: APP_URL });
await sleep(3000);
const audio = [];
for (const step of SCRIPT) audio.push(await speechBase64(step.say ?? step.interrupt));

for (let i = 5; i > 0; i--) { console.log(`starting in ${i}…`); await sleep(1000); }
mark('start: home screen');
await sleep(2500);
await toggleDb(); mark('database before: one existing booking');
await sleep(4500);
await toggleDb();
await sleep(1000);
await pressVoice(); mark('conversation starts');
await waitForReply();

for (const [i, step] of SCRIPT.entries()) {
  if (step.interrupt) await waitSpeakingFor(step.afterMs);
  mark(`customer: ${step.say ?? step.interrupt}`);
  await ev(`window.__demo.say(${JSON.stringify(audio[i])})`);
  if (!step.noWait) await waitForReply();
}

await sleep(1500);
await pressVoice(); mark('conversation stopped');
await sleep(1000);
await toggleDb(); mark('database after + latency + cost');
await sleep(8000);
mark('end');
writeFileSync(join(HERE, 'demo-timeline.json'), JSON.stringify(timeline, null, 2));
ws.close();
chrome.kill();
process.exit(0);
