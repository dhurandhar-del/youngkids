import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export interface BudgetSummary {
  limitUsd: number;
  spentUsd: number;
  leftUsd: number;
  /** About how many more full-length sessions fit in what is left. */
  sessionsLeft: number;
}

interface LedgerState {
  spentUsd: number;
  /** Sessions started but not yet reported back, with the amount reserved for each. */
  open: Record<string, { reservedUsd: number; at: string }>;
}

export interface BudgetOptions {
  /** Total spend allowed for the whole app, in USD. 0 = no limit. */
  limitUsd: number;
  /** Estimated cost of one full-length session (all of SESSION_MAX_SECONDS). */
  sessionCostUsd: number;
  /** Full session length the estimate is for. */
  maxSessionSeconds: number;
}

/**
 * App-wide spending cap. Audio goes browser ↔ OpenAI directly, so the server cannot see real usage;
 * instead it reserves the full-session estimate when it mints a key, and when the browser reports the
 * session's length it charges the estimate pro rata (never less than 20%). A session that never reports
 * back keeps its full reservation, so the ledger errs on the side of spending less.
 */
export class BudgetLedger {
  private state: LedgerState = { spentUsd: 0, open: {} };

  constructor(
    private readonly filePath: string,
    private readonly opts: BudgetOptions,
  ) {
    mkdirSync(dirname(filePath), { recursive: true });
    if (existsSync(filePath)) {
      try {
        const s = JSON.parse(readFileSync(filePath, 'utf8')) as Partial<LedgerState>;
        this.state = { spentUsd: Number(s.spentUsd) || 0, open: s.open ?? {} };
      } catch {
        // Unreadable ledger: keep counting from zero rather than refuse to start.
      }
    }
  }

  get enabled(): boolean {
    return this.opts.limitUsd > 0;
  }

  canStart(): boolean {
    return !this.enabled || this.state.spentUsd + this.opts.sessionCostUsd <= this.opts.limitUsd + 1e-9;
  }

  /** Reserve the full-session estimate. Call before minting so concurrent starts can't overshoot. */
  reserve(sessionId: string): void {
    if (!this.enabled) return;
    const reservedUsd = this.opts.sessionCostUsd;
    this.state.open[sessionId] = { reservedUsd, at: new Date().toISOString() };
    this.state.spentUsd += reservedUsd;
    this.persist();
  }

  /** Give the reservation back (the key could not be minted). */
  release(sessionId: string): void {
    const o = this.state.open[sessionId];
    if (!o) return;
    this.state.spentUsd = Math.max(0, this.state.spentUsd - o.reservedUsd);
    delete this.state.open[sessionId];
    this.persist();
  }

  /** The session ended: replace its reservation with a charge based on how long it ran. */
  settle(sessionId: string, durationMs: number): void {
    const o = this.state.open[sessionId];
    if (!o) return;
    const fraction = Math.min(1, Math.max(0.2, durationMs / (this.opts.maxSessionSeconds * 1000)));
    const charge = this.opts.sessionCostUsd * fraction;
    this.state.spentUsd = Math.max(0, this.state.spentUsd - o.reservedUsd + charge);
    delete this.state.open[sessionId];
    this.persist();
  }

  summary(): BudgetSummary {
    const spentUsd = round(this.state.spentUsd);
    const leftUsd = this.enabled ? round(Math.max(0, this.opts.limitUsd - this.state.spentUsd)) : Infinity;
    return {
      limitUsd: this.opts.limitUsd,
      spentUsd,
      leftUsd,
      sessionsLeft: this.enabled ? Math.floor((leftUsd + 1e-9) / this.opts.sessionCostUsd) : Infinity,
    };
  }

  private persist(): void {
    const tmp = `${this.filePath}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.state, null, 2), { mode: 0o600 });
    renameSync(tmp, this.filePath);
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
