// Browser audio: microphone capture and gapless playback of the agent's voice.
// One AudioContext at 24 kHz serves both directions, matching the format sent to Deepgram.

export const SAMPLE_RATE = 24000;

/** Loudness of one 0–1 level from an analyser, for the voice button animation. */
function levelOf(analyser, data) {
  analyser.getFloatTimeDomainData(data);
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
  return Math.min(1, Math.sqrt(sum / data.length) * 4);
}

export async function openAudio({ onMicChunk }) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
  });
  const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
  await ctx.audioWorklet.addModule('/mic-worklet.js');

  const mic = ctx.createMediaStreamSource(stream);
  const capture = new AudioWorkletNode(ctx, 'mic-capture');
  capture.port.onmessage = (event) => onMicChunk(event.data.pcm, event.data.rms);
  // The worklet only runs while connected to the output; a muted gain keeps the mic inaudible.
  const mute = ctx.createGain();
  mute.gain.value = 0;
  mic.connect(capture).connect(mute).connect(ctx.destination);

  const micAnalyser = ctx.createAnalyser();
  mic.connect(micAnalyser);

  const output = ctx.createGain();
  output.connect(ctx.destination);
  const outAnalyser = ctx.createAnalyser();
  output.connect(outAnalyser);

  const player = new Player(ctx, output);
  const scratch = new Float32Array(1024);

  return {
    ctx,
    player,
    micLevel: () => levelOf(micAnalyser, scratch),
    agentLevel: () => levelOf(outAnalyser, scratch),
    close() {
      player.flush();
      stream.getTracks().forEach((track) => track.stop());
      ctx.close();
    },
  };
}

/** Plays 16-bit PCM chunks back to back and can cut them off instantly (barge-in). */
class Player {
  constructor(ctx, destination) {
    this.ctx = ctx;
    this.destination = destination;
    this.sources = new Set();
    this.nextStart = 0;
    this.onIdle = null;
  }

  get playing() {
    return this.sources.size > 0;
  }

  /** Queues a chunk; returns the performance.now() time at which it becomes audible. */
  enqueue(arrayBuffer) {
    const pcm = new Int16Array(arrayBuffer);
    if (pcm.length === 0) return null;
    const samples = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) samples[i] = pcm[i] / 0x8000;

    const buffer = this.ctx.createBuffer(1, samples.length, SAMPLE_RATE);
    buffer.copyToChannel(samples, 0);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.destination);

    const start = Math.max(this.ctx.currentTime, this.nextStart);
    source.start(start);
    this.nextStart = start + buffer.duration;
    this.sources.add(source);
    source.onended = () => {
      this.sources.delete(source);
      if (this.sources.size === 0 && this.onIdle) this.onIdle();
    };

    const outputLatency = this.ctx.outputLatency || this.ctx.baseLatency || 0;
    return performance.now() + (start - this.ctx.currentTime + outputLatency) * 1000;
  }

  /** Stops everything queued. Returns true if something was actually playing. */
  flush() {
    const wasPlaying = this.playing;
    for (const source of this.sources) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        // already stopped
      }
    }
    this.sources.clear();
    this.nextStart = 0;
    return wasPlaying;
  }
}
