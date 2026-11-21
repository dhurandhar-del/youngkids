export interface RepairOptions {
  nudgeSeconds: number;
  /** step 1: "take your time", 2: two choices, 3: wave / thumbs-up */
  onNudge(step: 1 | 2 | 3): void;
  /** Child stayed quiet through all three nudges: alert the facilitator. */
  onGiveUp(): void;
}

/** Silence ladder (PRD §8.4, LLD §11.4). Patient, escalating, and reset by any child activity. */
export class RepairCoordinator {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private step: 0 | 1 | 2 | 3 = 0;
  private paused = false;

  constructor(private readonly opts: RepairOptions) {}

  onBuddyStoppedSpeaking(): void {
    this.clear();
    if (this.paused || this.step >= 3) return;
    const next = (this.step + 1) as 1 | 2 | 3;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.step = next;
      this.opts.onNudge(next);
      if (next === 3) this.opts.onGiveUp();
    }, this.opts.nudgeSeconds * 1000);
  }

  onBuddyStartedSpeaking(): void {
    this.clear();
  }

  onChildActivity(): void {
    this.clear();
    this.step = 0;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) this.clear();
  }

  cancel(): void {
    this.clear();
    this.step = 0;
  }

  private clear(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
