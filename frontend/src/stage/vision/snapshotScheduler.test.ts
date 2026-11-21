import { describe, expect, it } from 'vitest';
import { SnapshotScheduler, type SnapshotDeps } from './snapshotScheduler';

function setup(overrides: Partial<SnapshotDeps> = {}) {
  let now = 10_000;
  const sent: { id: string; detail: string; size: number }[] = [];
  const removed: string[] = [];
  const deps: SnapshotDeps = {
    capture: (_w, _h, q) => 'data:image/jpeg;base64,' + 'x'.repeat(Math.round(q * 1000)),
    send: (dataUrl, detail, id) => sent.push({ id, detail, size: dataUrl.length }),
    remove: (id) => removed.push(id),
    now: () => now,
    maxBytes: () => 65536,
    enabled: () => true,
    ...overrides,
  };
  const s = new SnapshotScheduler(deps, { minGapMs: 3000, keep: 3 });
  return { s, sent, removed, advance: (ms: number) => (now += ms) };
}

describe('SnapshotScheduler', () => {
  it('sends a frame and rate-limits passive triggers to one per 3 s', () => {
    const { s, sent, advance } = setup();
    expect(s.maybeSend('speech')).toBe(true);
    advance(1000);
    expect(s.maybeSend('gesture')).toBe(false);
    advance(2500);
    expect(s.maybeSend('speech')).toBe(true);
    expect(sent).toHaveLength(2);
    expect(sent[0].detail).toBe('low');
  });

  it('lets an explicit look bypass the rate limit with high detail', () => {
    const { s, sent } = setup();
    s.maybeSend('speech');
    expect(s.maybeSend('look', 'high')).toBe(true);
    expect(sent.at(-1)?.detail).toBe('high');
  });

  it('keeps only the last 3 images in the conversation', () => {
    const { s, sent, removed, advance } = setup();
    for (let i = 0; i < 5; i++) {
      s.maybeSend('speech');
      advance(3000);
    }
    expect(sent).toHaveLength(5);
    expect(removed).toEqual([sent[0].id, sent[1].id]);
  });

  it('never sends when the camera is not allowed or off', () => {
    const { s, sent } = setup({ enabled: () => false });
    expect(s.maybeSend('look', 'high')).toBe(false);
    expect(sent).toHaveLength(0);
  });

  it('re-encodes at lower quality when a frame is too big for the data channel', () => {
    const { s, sent } = setup({ maxBytes: () => 2600 });
    expect(s.maybeSend('speech')).toBe(true);
    expect(sent[0].size).toBeLessThanOrEqual(2600 - 2048 + 1000);
  });

  it('skips the frame if it cannot be made small enough', () => {
    const { s, sent } = setup({ maxBytes: () => 100 });
    expect(s.maybeSend('speech')).toBe(false);
    expect(sent).toHaveLength(0);
  });

  it('uses unique ids and resets cleanly', () => {
    const { s, sent, advance } = setup();
    s.maybeSend('speech');
    advance(3000);
    s.maybeSend('speech');
    expect(new Set(sent.map((x) => x.id)).size).toBe(2);
    s.reset();
    expect(s.count).toBe(0);
  });
});
