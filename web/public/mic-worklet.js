// Runs on the audio thread: converts microphone audio to 16-bit PCM in 40 ms chunks
// and reports each chunk's loudness (RMS), used to find where the user stopped talking.

const CHUNK = 960; // 40 ms at 24 kHz

class MicCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Int16Array(CHUNK);
    this.length = 0;
    this.sumSquares = 0;
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel) return true;
    for (let i = 0; i < channel.length; i++) {
      const s = Math.max(-1, Math.min(1, channel[i]));
      this.buffer[this.length++] = s < 0 ? s * 0x8000 : s * 0x7fff;
      this.sumSquares += s * s;
      if (this.length === CHUNK) {
        const rms = Math.sqrt(this.sumSquares / CHUNK);
        this.port.postMessage({ pcm: this.buffer.buffer, rms }, [this.buffer.buffer]);
        this.buffer = new Int16Array(CHUNK);
        this.length = 0;
        this.sumSquares = 0;
      }
    }
    return true;
  }
}

registerProcessor('mic-capture', MicCapture);
