import dotenv from 'dotenv';
dotenv.config({ quiet: true });
import { z } from 'zod';

const bool = z
  .string()
  .optional()
  .transform((v) => (v ?? '').trim().toLowerCase() === 'true');

const num = (def: number, min: number, max: number) =>
  z.coerce.number().min(min).max(max).optional().default(def);

const EnvSchema = z.object({
  OPENAI_API_KEY: z.string().optional().default(''),
  REALTIME_MODEL: z.string().optional().default('gpt-realtime-2.1'),
  REALTIME_VOICE: z.string().optional().default('marin'),
  VOICE_SPEED: num(1.0, 0.25, 1.5),
  REASONING_EFFORT: z.enum(['minimal', 'low', 'medium', 'high', 'xhigh']).optional().default('low'),
  VAD_EAGERNESS: z.enum(['low', 'medium', 'high', 'auto']).optional().default('low'),
  NOISE_REDUCTION: z.enum(['far_field', 'near_field', 'off']).optional().default('far_field'),
  TRANSCRIBE_MODEL: z.string().optional().default('gpt-4o-mini-transcribe'),
  ZDR_CONFIRMED: bool,
  SHARE_ROSTER_NAMES: z
    .string()
    .optional()
    .transform((v) => (v ?? 'true').trim().toLowerCase() !== 'false'),
  ROSTER_RETENTION_HOURS: num(24, 1, 24 * 7),
  SESSION_WRAPUP_SECONDS: num(360, 60, 1800),
  SESSION_MAX_SECONDS: num(420, 90, 2400),
  SILENCE_NUDGE_SECONDS: num(7, 3, 60),
  BUDDY_NAME: z.string().optional().default('Zuzu'),
  ORG_NAME: z.string().optional().default('Young Leaders'),
  HOST: z.string().optional().default('127.0.0.1'),
  PORT: num(8787, 1, 65535),
  CONSOLE_PIN: z.string().optional(),
  DATA_DIR: z.string().optional().default('data'),
  CORS_ORIGINS: z.string().optional().default(''),
  BUDGET_USD: num(0, 0, 100000),
  SESSION_COST_USD: num(0.6, 0.01, 100),
  SERVE_FRONTEND: bool,
});

export type AppConfig = ReturnType<typeof loadConfig>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  const e = EnvSchema.parse(env);
  const isLoopback = ['127.0.0.1', 'localhost', '::1'].includes(e.HOST);
  if (!isLoopback && !e.CONSOLE_PIN) {
    throw new Error(`HOST=${e.HOST} exposes the app on the network. Set CONSOLE_PIN in .env or use HOST=127.0.0.1.`);
  }
  return {
    openaiApiKey: e.OPENAI_API_KEY,
    realtimeModel: e.REALTIME_MODEL,
    voice: e.REALTIME_VOICE,
    voiceSpeed: e.VOICE_SPEED,
    reasoningEffort: e.REASONING_EFFORT,
    vadEagerness: e.VAD_EAGERNESS,
    noiseReduction: e.NOISE_REDUCTION,
    transcribeModel: e.TRANSCRIBE_MODEL,
    zdrConfirmed: e.ZDR_CONFIRMED,
    shareRosterNames: e.SHARE_ROSTER_NAMES,
    rosterRetentionHours: e.ROSTER_RETENTION_HOURS,
    timings: {
      wrapUpSeconds: e.SESSION_WRAPUP_SECONDS,
      maxSeconds: Math.max(e.SESSION_MAX_SECONDS, e.SESSION_WRAPUP_SECONDS + 30),
      silenceNudgeSeconds: e.SILENCE_NUDGE_SECONDS,
      timeCheckSeconds: Math.min(300, e.SESSION_WRAPUP_SECONDS - 60),
    },
    buddyName: e.BUDDY_NAME,
    orgName: e.ORG_NAME,
    host: e.HOST,
    port: e.PORT,
    consolePin: e.CONSOLE_PIN,
    dataDir: e.DATA_DIR,
    corsOrigins: e.CORS_ORIGINS.split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean),
    serveFrontend: e.SERVE_FRONTEND,
    budgetUsd: e.BUDGET_USD,
    sessionCostUsd: e.SESSION_COST_USD,
  };
}
