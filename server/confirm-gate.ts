// A deterministic check that runs before the model is allowed to save a booking.
// The model decides *when* to call confirm_booking; this gate decides whether the call counts:
//  1. the user's latest utterance must be an explicit yes, with no hedge or change in it;
//  2. the agent must not have been interrupted in the turn before that utterance,
//     i.e. the user heard the whole read-back before saying yes.

const YES = /\b(yes|yeah|yep|yup|sure|confirm|confirmed|book it|go ahead|correct|that's right|that is right|do it|please do|ok|okay|absolutely|definitely)\b/;
const HOLD = /\b(no|nope|not|don't|do not|wait|hold on|hang on|but|actually|instead|change|think|maybe|later|cancel|stop)\b/;

export function isExplicitYes(text: string): boolean {
  const t = text.toLowerCase().replace(/[’`]/g, "'");
  return YES.test(t) && !HOLD.test(t);
}

export type GateResult = { ok: true } | { ok: false; code: string; message: string };

export class ConfirmationGate {
  lastUserText = '';
  /** Agent audio is still playing in the browser. */
  agentPlaying = false;
  /** The user's latest turn started while the agent was still talking. */
  userInterruptedAgent = false;

  onAgentStartedSpeaking() {
    this.agentPlaying = true;
  }

  onPlaybackFinished() {
    this.agentPlaying = false;
  }

  onPlaybackInterrupted() {
    this.agentPlaying = false;
    this.userInterruptedAgent = true;
  }

  onUserStartedSpeaking() {
    this.userInterruptedAgent = this.agentPlaying;
  }

  onUserText(text: string) {
    this.lastUserText = text;
  }

  check(): GateResult {
    if (this.userInterruptedAgent) {
      return {
        ok: false,
        code: 'readback_interrupted',
        message: 'The user interrupted the read-back, so they may not have heard the full request. Read it back again and ask for a yes.',
      };
    }
    if (!isExplicitYes(this.lastUserText)) {
      return {
        ok: false,
        code: 'no_explicit_yes',
        message: `The user's last words ("${this.lastUserText}") are not an explicit confirmation. Ask them to confirm with a clear yes.`,
      };
    }
    return { ok: true };
  }
}
