import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConfirmationGate, isExplicitYes } from './confirm-gate.ts';

test('explicit confirmations are accepted', () => {
  for (const text of ['Yes.', 'Yes, please.', 'Yes, confirm.', 'Yes, yes, book it.', "That's right.", 'Sure, go ahead.', 'Okay.']) {
    assert.equal(isExplicitYes(text), true, text);
  }
});

test('hedges, refusals and changes are not confirmations', () => {
  for (const text of [
    'Hmm, let me think about it.',
    'No thanks, that’s all.',
    'Yes, but make it three.',
    'Wait — make it three tripods.',
    'Actually, change the dates.',
    "I don't know.",
    'Two tripods from October 20th to 22nd.',
  ]) {
    assert.equal(isExplicitYes(text), false, text);
  }
});

test('a yes after hearing the full read-back passes', () => {
  const gate = new ConfirmationGate();
  gate.onAgentStartedSpeaking();
  gate.onPlaybackFinished();
  gate.onUserStartedSpeaking();
  gate.onUserText('Yes, please.');
  assert.deepEqual(gate.check(), { ok: true });
});

test('a yes that cut the read-back short is refused', () => {
  const gate = new ConfirmationGate();
  gate.onAgentStartedSpeaking();
  gate.onUserStartedSpeaking();
  gate.onPlaybackInterrupted();
  gate.onUserText('Yes, book it.');
  const result = gate.check();
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.code, 'readback_interrupted');
});

test('the next full read-back clears the interruption', () => {
  const gate = new ConfirmationGate();
  gate.onAgentStartedSpeaking();
  gate.onUserStartedSpeaking();
  gate.onPlaybackInterrupted();
  gate.onUserText('Yes');
  gate.onAgentStartedSpeaking();
  gate.onPlaybackFinished();
  gate.onUserStartedSpeaking();
  gate.onUserText('Yes');
  assert.deepEqual(gate.check(), { ok: true });
});
