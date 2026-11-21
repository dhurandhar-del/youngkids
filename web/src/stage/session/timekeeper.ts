import type { StageTimings } from '@shared/types';

export interface TimekeeperHandlers {
  onTick(elapsedMs: number): void;
  onTimeCheck(): void;
  onWrapUp(): void;
  onMax(): void;
}

/** Session clock (LLD §11.5): time-check note, wrap-up nudge, hard stop. */
export class Timekeeper {
  private startedAt = 0;
  private interval: ReturnType<typeof setInterval> | null = null;
  private fired = { check: false, wrap: false, max: false };

  constructor(
    private readonly timings: StageTimings,
    private readonly h: TimekeeperHandlers,
  ) {}

  start(): void {
    this.stop();
    this.startedAt = Date.now();
    this.fired = { check: false, wrap: false, max: false };
    this.interval = setInterval(() => this.tick(), 1000);
  }

  elapsedMs(): number {
    return this.startedAt ? Date.now() - this.startedAt : 0;
  }

  private tick(): void {
    const s = this.elapsedMs() / 1000;
    this.h.onTick(this.elapsedMs());
    if (!this.fired.check && s >= this.timings.timeCheckSeconds) {
      this.fired.check = true;
      this.h.onTimeCheck();
    }
    if (!this.fired.wrap && s >= this.timings.wrapUpSeconds) {
      this.fired.wrap = true;
      this.h.onWrapUp();
    }
    if (!this.fired.max && s >= this.timings.maxSeconds) {
      this.fired.max = true;
      this.h.onMax();
    }
  }

  stop(): void {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    this.startedAt = 0;
  }
}
