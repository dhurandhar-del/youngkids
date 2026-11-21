import { audioContext } from './levelMeter';

type Note = { freq: number; at: number; dur: number; gain?: number; type?: OscillatorType };

/**
 * Soft, short synthesised sound effects (marimba/bell-like). No assets, no buzzers.
 * Kept quiet (peak ≈ -18 dBFS) and never played while Zuzu is speaking.
 */
export class SoundFx {
  enabled = true;
  private master: GainNode | null = null;

  private out(): GainNode {
    const ctx = audioContext();
    if (!this.master) {
      this.master = ctx.createGain();
      this.master.gain.value = 0.12;
      this.master.connect(ctx.destination);
    }
    return this.master;
  }

  private play(notes: Note[]): void {
    if (!this.enabled) return;
    const ctx = audioContext();
    const out = this.out();
    const t0 = ctx.currentTime + 0.01;
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = n.type ?? 'sine';
      osc.frequency.value = n.freq;
      const start = t0 + n.at;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(n.gain ?? 1, start + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, start + n.dur);
      osc.connect(g).connect(out);
      osc.start(start);
      osc.stop(start + n.dur + 0.05);
    }
  }

  wake(): void {
    this.play([
      { freq: 523.25, at: 0, dur: 0.35 },
      { freq: 783.99, at: 0.12, dur: 0.45 },
    ]);
  }

  listen(): void {
    this.play([
      { freq: 659.25, at: 0, dur: 0.18, gain: 0.5 },
      { freq: 880, at: 0.08, dur: 0.22, gain: 0.5 },
    ]);
  }

  sparkle(): void {
    this.play([
      { freq: 1046.5, at: 0, dur: 0.3, gain: 0.6, type: 'triangle' },
      { freq: 1318.5, at: 0.07, dur: 0.3, gain: 0.6, type: 'triangle' },
      { freq: 1568, at: 0.14, dur: 0.45, gain: 0.6, type: 'triangle' },
    ]);
  }

  celebrate(): void {
    const scale = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    this.play([
      ...scale.map((freq, i) => ({ freq, at: i * 0.11, dur: 0.4, gain: 0.8, type: 'triangle' as const })),
      { freq: 1046.5, at: 0.65, dur: 1.2, gain: 0.7 },
      { freq: 1318.5, at: 0.65, dur: 1.2, gain: 0.5 },
      { freq: 1568, at: 0.65, dur: 1.2, gain: 0.4 },
    ]);
  }

  sleep(): void {
    this.play([
      { freq: 587.33, at: 0, dur: 0.4, gain: 0.5 },
      { freq: 440, at: 0.2, dur: 0.6, gain: 0.5 },
    ]);
  }
}
