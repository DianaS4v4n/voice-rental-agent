// One voice conversation: the browser talks to this server, this server talks to Deepgram.
// The API key never reaches the browser, and every function call runs here, next to the database.

import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import WebSocket from 'ws';
import type { BookingService } from './booking.ts';
import { ConfirmationGate } from './confirm-gate.ts';
import { DEEPGRAM_AGENT_URL, buildSettings } from './agent-config.ts';
import { runTool } from './tools.ts';
import { localToday } from './dates.ts';

const LOG_DIR = 'logs';

// Deepgram events the browser needs to drive the UI.
const FORWARDED = new Set([
  'Welcome',
  'SettingsApplied',
  'ConversationText',
  'UserStartedSpeaking',
  'AgentThinking',
  'AgentStartedSpeaking',
  'AgentAudioDone',
  'LatencyReport',
  'Error',
  'Warning',
]);

export function runAgentSession(browser: WebSocket, service: BookingService, apiKey: string) {
  const sessionId = randomUUID();
  const startedAt = new Date();
  const gate = new ConfirmationGate();
  const log: Array<Record<string, unknown>> = [];
  const record = (entry: Record<string, unknown>) => log.push({ t: Date.now() - startedAt.getTime(), ...entry });
  const dbBefore = service.snapshot();
  let settingsApplied = false;

  const toBrowser = (message: Record<string, unknown>) => {
    if (browser.readyState === WebSocket.OPEN) browser.send(JSON.stringify(message));
  };

  const pushState = (event?: unknown) => {
    const request = service.currentDraft(sessionId);
    const inventory =
      request?.startDate && request.endDate ? service.inventory(request.startDate, request.endDate) : null;
    toBrowser({ type: 'state', request, inventory, bookings: service.listBookings(), event: event ?? null });
  };

  const deepgram = new WebSocket(DEEPGRAM_AGENT_URL, { headers: { Authorization: `Token ${apiKey}` } });

  deepgram.on('open', () => {
    deepgram.send(JSON.stringify(buildSettings(localToday())));
    record({ type: 'deepgram_open' });
  });

  deepgram.on('message', (data, isBinary) => {
    if (isBinary) {
      if (browser.readyState === WebSocket.OPEN) browser.send(data, { binary: true });
      return;
    }
    const message = JSON.parse(data.toString());
    record(message);

    switch (message.type) {
      case 'SettingsApplied':
        settingsApplied = true;
        pushState();
        break;
      case 'ConversationText':
        if (message.role === 'user') gate.onUserText(message.content);
        break;
      case 'UserStartedSpeaking':
        gate.onUserStartedSpeaking();
        break;
      case 'AgentStartedSpeaking':
        gate.onAgentStartedSpeaking();
        break;
      case 'FunctionCallRequest':
        for (const call of message.functions ?? []) {
          toBrowser({ type: 'ToolStarted', name: call.name });
          let args: Record<string, unknown> = {};
          try {
            args = call.arguments ? JSON.parse(call.arguments) : {};
          } catch {
            args = {};
          }
          const result = runTool(call.name, args, { service, sessionId, gate });
          record({ type: 'ToolResult', name: call.name, args, result: result.content });
          deepgram.send(
            JSON.stringify({ type: 'FunctionCallResponse', id: call.id, name: call.name, content: JSON.stringify(result.content) }),
          );
          pushState(result.event);
        }
        break;
    }
    if (FORWARDED.has(message.type)) toBrowser(message);
  });

  deepgram.on('close', (code, reason) => {
    record({ type: 'deepgram_close', code, reason: reason.toString() });
    toBrowser({ type: 'Closed', code, reason: reason.toString() });
    browser.close();
  });

  deepgram.on('error', (error) => {
    record({ type: 'deepgram_error', message: error.message });
    toBrowser({ type: 'Error', description: `Voice service connection failed: ${error.message}` });
  });

  browser.on('message', (data, isBinary) => {
    if (isBinary) {
      // Microphone audio. Deepgram rejects audio sent before the settings are applied.
      if (settingsApplied && deepgram.readyState === WebSocket.OPEN) deepgram.send(data, { binary: true });
      return;
    }
    const message = JSON.parse(data.toString());
    record({ from: 'browser', ...message });
    if (message.type === 'playback') {
      if (message.event === 'finished') gate.onPlaybackFinished();
      if (message.event === 'interrupted') gate.onPlaybackInterrupted();
    }
  });

  browser.on('close', () => {
    if (deepgram.readyState === WebSocket.OPEN || deepgram.readyState === WebSocket.CONNECTING) deepgram.close();
    saveLog();
  });

  let saved = false;
  function saveLog() {
    if (saved) return;
    saved = true;
    mkdirSync(LOG_DIR, { recursive: true });
    const name = `${LOG_DIR}/session-${startedAt.toISOString().replace(/[:.]/g, '-')}.json`;
    const durationSeconds = (Date.now() - startedAt.getTime()) / 1000;
    writeFileSync(
      name,
      JSON.stringify({ sessionId, startedAt, durationSeconds, dbBefore, dbAfter: service.snapshot(), events: log }, null, 2),
    );
  }

  pushState();
}
