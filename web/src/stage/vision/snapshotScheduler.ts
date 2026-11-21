export type SnapshotTrigger = 'speech' | 'gesture' | 'showtime' | 'look';
export type Detail = 'low' | 'high';

export interface SnapshotDeps {
  /** Returns a JPEG data URL, or null if the camera isn't ready. */
  capture(width: number, height: number, quality: number): string | null;
  send(dataUrl: string, detail: Detail, id: string): void;
  remove(id: string): void;
  now(): number;
  maxBytes(): number;
  /** Camera allowed by consent, switched on, and session connected. */
  enabled(): boolean;
}

/**
 * Sends small webcam snapshots to the model only when useful (LLD §11.2):
 * at most one per minGapMs for passive triggers, never asks for a reply,
 * and keeps only the last `keep` images in the conversation.
 */
export class SnapshotScheduler {
  private lastSentAt = -Infinity;
  private sent: string[] = [];
  private counter = 0;
  private total = 0;

  constructor(
    private readonly deps: SnapshotDeps,
    private readonly opts = { minGapMs: 3000, keep: 3 },
  ) {}

  get count(): number {
    return this.total;
  }

  maybeSend(trigger: SnapshotTrigger, detail: Detail = 'low'): boolean {
    if (!this.deps.enabled()) return false;
    const now = this.deps.now();
    if (trigger !== 'look' && now - this.lastSentAt < this.opts.minGapMs) return false;

    const budget = this.deps.maxBytes() - 2048;
    let quality = 0.7;
    let dataUrl = this.deps.capture(512, 384, quality);
    while (dataUrl && dataUrl.length > budget && quality > 0.3) {
      quality -= 0.15;
      dataUrl = this.deps.capture(512, 384, quality);
    }
    if (!dataUrl || dataUrl.length > budget) return false;

    const id = `img_${Date.now().toString(36)}_${++this.counter}`.slice(0, 32);
    this.deps.send(dataUrl, detail, id);
    this.sent.push(id);
    this.total++;
    this.lastSentAt = now;
    while (this.sent.length > this.opts.keep) this.deps.remove(this.sent.shift()!);
    return true;
  }

  reset(): void {
    this.lastSentAt = -Infinity;
    this.sent = [];
    this.total = 0;
  }
}
