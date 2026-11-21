import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { z } from 'zod';

/** Anonymous per-session stats. No names, transcripts or profile fields. */
export const SessionStatsSchema = z
  .object({
    sessionId: z.string().max(64),
    model: z.string().max(64),
    durationMs: z.number().int().min(0),
    endReason: z.enum(['completed', 'ended', 'killed', 'timeout', 'error', 'disconnected']),
    childTurns: z.number().int().min(0),
    buddyTurns: z.number().int().min(0),
    nudges: z.number().int().min(0),
    interventions: z.number().int().min(0),
    identify: z.enum(['matched', 'ambiguous', 'none', 'override', 'unknown']),
    guardrailTrips: z.number().int().min(0),
    alerts: z.number().int().min(0),
    latencyMsP50: z.number().nullable(),
    latencyMsP95: z.number().nullable(),
    images: z.number().int().min(0),
  })
  .strict();

export class OpsLogger {
  constructor(private readonly filePath: string) {
    mkdirSync(dirname(filePath), { recursive: true });
  }

  append(stats: z.infer<typeof SessionStatsSchema>): void {
    appendFileSync(this.filePath, JSON.stringify({ at: new Date().toISOString(), ...stats }) + '\n', { mode: 0o600 });
  }
}
