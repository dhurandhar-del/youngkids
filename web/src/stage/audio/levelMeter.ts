let sharedContext: AudioContext | null = null;

/** One AudioContext for the page; must be created/resumed inside a user gesture (autoplay policy). */
export function audioContext(): AudioContext {
  sharedContext ??= new AudioContext();
  if (sharedContext.state === 'suspended') void sharedContext.resume();
  return sharedContext;
}

/**
 * Loudness meter on a MediaStream (LLD §8). Used for lip-sync (Zuzu's remote audio)
 * and for the listening ring (the child's mic). Not connected to the speakers: the
 * <audio> element plays the remote stream, which also avoids Chromium's silent-remote-stream issue.
 */
export class LevelMeter {
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private buf: Float32Array<ArrayBuffer> = new Float32Array(1024);
  private envelope = 0;
  private quietSince = 0;

  constructor(
    private readonly opts = { gain: 10, floor: 0.01, release: 0.85, closeAfterMs: 120 },
  ) {}

  attach(stream: MediaStream): void {
    this.detach();
    if (!stream.getAudioTracks().length) return;
    const ctx = audioContext();
    this.source = ctx.createMediaStreamSource(stream);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.6;
    this.buf = new Float32Array(this.analyser.fftSize);
    this.source.connect(this.analyser);
  }

  /** 0..1 level with fast attack and slow release. Call once per animation frame. */
  level(): number {
    if (!this.analyser) return 0;
    this.analyser.getFloatTimeDomainData(this.buf);
    let sum = 0;
    for (let i = 0; i < this.buf.length; i++) sum += this.buf[i] * this.buf[i];
    const rms = Math.sqrt(sum / this.buf.length);
    this.envelope = Math.max(rms, this.envelope * this.opts.release);
    const open = Math.min(1, Math.max(0, (this.envelope - this.opts.floor) * this.opts.gain));
    const now = performance.now();
    if (open < 0.05) {
      if (!this.quietSince) this.quietSince = now;
      if (now - this.quietSince > this.opts.closeAfterMs) return 0;
    } else this.quietSince = 0;
    return open;
  }

  detach(): void {
    try {
      this.source?.disconnect();
    } catch {
      /* already disconnected */
    }
    this.source = null;
    this.analyser = null;
    this.envelope = 0;
  }
}
