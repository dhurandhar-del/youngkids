import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RepairCoordinator } from './repairCoordinator';

describe('RepairCoordinator (silence ladder)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('nudges at n, 2n and 3n seconds of silence, then gives up', () => {
    const steps: number[] = [];
    const giveUp = vi.fn();
    const r = new RepairCoordinator({ nudgeSeconds: 7, onNudge: (s) => steps.push(s), onGiveUp: giveUp });
    r.onBuddyStoppedSpeaking();
    vi.advanceTimersByTime(6999);
    expect(steps).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(steps).toEqual([1]);
    // the nudge makes Zuzu speak; when it stops, the ladder continues from step 2
    r.onBuddyStoppedSpeaking();
    vi.advanceTimersByTime(7000);
    expect(steps).toEqual([1, 2]);
    r.onBuddyStoppedSpeaking();
    vi.advanceTimersByTime(7000);
    expect(steps).toEqual([1, 2, 3]);
    expect(giveUp).toHaveBeenCalledTimes(1);
    r.onBuddyStoppedSpeaking();
    vi.advanceTimersByTime(60_000);
    expect(steps).toEqual([1, 2, 3]);
  });

  it('resets the ladder whenever the child speaks or gestures', () => {
    const steps: number[] = [];
    const r = new RepairCoordinator({ nudgeSeconds: 5, onNudge: (s) => steps.push(s), onGiveUp: () => {} });
    r.onBuddyStoppedSpeaking();
    vi.advanceTimersByTime(5000);
    r.onChildActivity();
    r.onBuddyStoppedSpeaking();
    vi.advanceTimersByTime(5000);
    expect(steps).toEqual([1, 1]);
  });

  it('does nothing while paused or after cancel', () => {
    const onNudge = vi.fn();
    const r = new RepairCoordinator({ nudgeSeconds: 5, onNudge, onGiveUp: () => {} });
    r.setPaused(true);
    r.onBuddyStoppedSpeaking();
    vi.advanceTimersByTime(20_000);
    r.setPaused(false);
    r.onBuddyStoppedSpeaking();
    r.cancel();
    vi.advanceTimersByTime(20_000);
    expect(onNudge).not.toHaveBeenCalled();
  });

  it('a buddy turn starting cancels the pending timer', () => {
    const onNudge = vi.fn();
    const r = new RepairCoordinator({ nudgeSeconds: 5, onNudge, onGiveUp: () => {} });
    r.onBuddyStoppedSpeaking();
    vi.advanceTimersByTime(3000);
    r.onBuddyStartedSpeaking();
    vi.advanceTimersByTime(10_000);
    expect(onNudge).not.toHaveBeenCalled();
  });
});
