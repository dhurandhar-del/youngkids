import express, { type NextFunction, type Request, type Response } from 'express';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { HealthResponse, IdentifyResponse, SessionBootstrap } from '@zuzu/shared/types';
import type { AppConfig } from '../config';
import { ChildInputSchema, ChildPatchSchema } from '../roster/childSchema';
import type { RosterStore } from '../roster/rosterStore';
import { csvToChildren } from '../roster/csv';
import { NameMatcher } from '../matching/nameMatcher';
import { PromptBuilder } from '../prompt/promptBuilder';
import { SessionConfigFactory } from '../realtime/sessionConfig';
import { MintError, type KeyMinter } from '../realtime/keyMinter';
import type { Moderator } from '../moderation/moderationService';
import { SessionStatsSchema, type OpsLogger } from '../ops/opsLog';
import type { BudgetLedger } from '../budget/budgetLedger';

export interface AppDeps {
  config: AppConfig;
  roster: RosterStore;
  minter: KeyMinter;
  moderator: Moderator;
  ops: OpsLogger;
  budget?: BudgetLedger;
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const asyncRoute =
  (fn: (req: Request, res: Response) => Promise<unknown> | unknown) => (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res)).catch(next);

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const r = schema.safeParse(body);
  if (!r.success) {
    throw new HttpError(400, 'invalid_input', r.error.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`).join('; '));
  }
  return r.data;
}

export function createApi(deps: AppDeps): express.Router {
  const { config, roster, minter, moderator, ops, budget } = deps;
  const matcher = new NameMatcher();
  const prompts = new PromptBuilder({
    buddyName: config.buddyName,
    orgName: config.orgName,
    shareRosterNames: config.shareRosterNames,
  });
  const sessions = new SessionConfigFactory(config);
  const api = express.Router();

  // CORS for a frontend hosted on another origin (e.g. Vercel). Same-origin requests need none of this.
  if (config.corsOrigins.length) {
    const allowAny = config.corsOrigins.includes('*');
    api.use((req, res, next) => {
      const origin = req.header('origin');
      if (origin && (allowAny || config.corsOrigins.includes(origin))) {
        res.set('Access-Control-Allow-Origin', origin);
        res.set('Vary', 'Origin');
        res.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, x-console-pin');
        res.set('Access-Control-Max-Age', '600');
      }
      if (req.method === 'OPTIONS') return res.status(204).end();
      next();
    });
  }

  api.use(express.json({ limit: '200kb' }));
  api.use(express.text({ type: ['text/csv', 'text/plain'], limit: '1mb' }));

  // Health is public (no child data) so the UI can tell "server down" from "PIN needed".
  api.get('/health', (_req, res) => {
    const body: HealthResponse = {
      ok: true,
      zdrConfirmed: config.zdrConfirmed,
      model: config.realtimeModel,
      voice: config.voice,
      buddyName: config.buddyName,
      orgName: config.orgName,
      hasApiKey: Boolean(config.openaiApiKey),
      pinRequired: Boolean(config.consolePin),
      budget: budget?.enabled ? budget.summary() : null,
    };
    res.json(body);
  });

  // Optional PIN (required when the server is exposed beyond localhost).
  if (config.consolePin) {
    const expected = Buffer.from(config.consolePin);
    api.use((req, _res, next) => {
      const got = Buffer.from(String(req.header('x-console-pin') ?? ''));
      if (got.length !== expected.length || !timingSafeEqual(got, expected)) {
        return next(new HttpError(401, 'pin_required', 'Console PIN required'));
      }
      next();
    });
  }

  // ---- Roster ----
  api.get('/children', (_req, res) => {
    res.json(roster.list());
  });

  api.post('/children', (req, res) => {
    const input = parse(ChildInputSchema, req.body);
    res.status(201).json(roster.create(input));
  });

  api.post('/children/import', (req, res) => {
    const text = typeof req.body === 'string' ? req.body : '';
    const { ok, errors } = csvToChildren(text);
    // Skip children already on the list (same first name + class), e.g. when a file is imported twice.
    const key = (c: { firstName: string; className: string }) => `${c.firstName.trim().toLowerCase()}|${c.className}`;
    const existing = new Set(roster.list().map(key));
    let created = 0;
    let duplicates = 0;
    for (const input of ok) {
      if (existing.has(key(input))) {
        duplicates++;
        continue;
      }
      existing.add(key(input));
      roster.create(input);
      created++;
    }
    res.json({ created, duplicates, errors });
  });

  api.post('/children/identify', (req, res) => {
    const { spokenName, expectedChildId } = parse(
      z.object({ spokenName: z.string().max(200), expectedChildId: z.string().max(64).optional() }),
      req.body,
    );
    const result = matcher.match(spokenName, roster.list(), expectedChildId);
    const body: IdentifyResponse =
      result.status === 'matched' && result.child
        ? { status: 'matched', childId: result.child.id, profile: PromptBuilder.toAiProfile(result.child) }
        : result.status === 'ambiguous'
          ? { status: 'ambiguous', candidates: result.candidates }
          : { status: 'none' };
    res.json(body);
  });

  api.get('/children/:id/ai-profile', (req, res) => {
    const child = roster.get(req.params.id);
    if (!child) throw new HttpError(404, 'not_found', 'Child not found');
    res.json(PromptBuilder.toAiProfile(child));
  });

  api.put('/children/:id', (req, res) => {
    const input = parse(ChildInputSchema, req.body);
    const updated = roster.update(req.params.id, input);
    if (!updated) throw new HttpError(404, 'not_found', 'Child not found');
    res.json(updated);
  });

  api.patch('/children/:id', (req, res) => {
    const patch = parse(ChildPatchSchema, req.body);
    const updated = roster.patch(req.params.id, patch);
    if (!updated) throw new HttpError(404, 'not_found', 'Child not found');
    res.json(updated);
  });

  api.delete('/children/:id', (req, res) => {
    if (!roster.remove(req.params.id)) throw new HttpError(404, 'not_found', 'Child not found');
    res.status(204).end();
  });

  api.delete('/children', (req, res) => {
    parse(z.object({ confirm: z.literal('DELETE') }), req.body);
    res.json({ deleted: roster.purgeAll() });
  });

  // ---- Realtime session bootstrap ----
  api.post(
    '/session',
    asyncRoute(async (req, res) => {
      const { expectedChildId, playerName: rawPlayer } = parse(
        z.object({ expectedChildId: z.string().max(64).optional(), playerName: z.string().max(40).optional() }),
        req.body ?? {},
      );
      const playerName = rawPlayer?.replace(/[^\p{L}\p{M}\s'.-]/gu, '').replace(/\s+/g, ' ').trim() || undefined;
      let expected: ReturnType<typeof roster.get>;
      let names: string[];
      let instructions: string;
      if (playerName) {
        // Self-serve: the typed name is matched against today's list (from the CSV). Only a clear match
        // personalises the chat; otherwise Zuzu talks without any personal facts.
        const match = matcher.match(playerName, roster.list());
        expected = match.status === 'matched' ? match.child : undefined;
        const playerProfile = expected ? PromptBuilder.toAiProfile(expected) : undefined;
        names = [playerName, ...(expected ? [expected.firstName] : [])];
        instructions = prompts.buildInstructions({
          rosterFirstNames: names,
          playerName: expected ? expected.firstName : playerName,
          playerProfile,
        });
      } else {
        const children = roster.list();
        expected = expectedChildId ? roster.get(expectedChildId) : children.find((c) => c.upNext);
        names = children.filter((c) => c.status === 'waiting' || c.upNext).flatMap((c) => [c.firstName, ...(c.nickname ? [c.nickname] : [])]);
        instructions = prompts.buildInstructions({
          rosterFirstNames: names,
          expectedChild: expected ? { firstName: expected.firstName, language: expected.language } : undefined,
        });
      }
      const hint = prompts.transcriptionHint(names);
      const sessionId = randomUUID();
      if (budget && !budget.canStart()) {
        throw new HttpError(402, 'budget_exhausted', `The $${config.budgetUsd} OpenAI budget for this app is used up. Ask the organiser to raise it.`);
      }
      budget?.reserve(sessionId); // before the await, so parallel starts can't overshoot the cap
      let minted: Awaited<ReturnType<typeof minter.mint>>;
      try {
        minted = await minter.mint(sessions.apiSession(instructions, hint), sessionId);
      } catch (err) {
        budget?.release(sessionId);
        throw err;
      }
      const body: SessionBootstrap = {
        sessionId,
        clientSecret: minted.value,
        expiresAt: minted.expiresAt,
        model: config.realtimeModel,
        instructions,
        config: sessions.sdkConfig(hint),
        timings: config.timings,
        buddyName: config.buddyName,
        zdrConfirmed: config.zdrConfirmed,
        ...(expected
          ? { expectedChild: { id: expected.id, firstName: expected.firstName, cameraAllowed: expected.consent.cameraAllowed } }
          : {}),
      };
      res.set('Cache-Control', 'no-store').json(body);
    }),
  );

  // ---- Moderation ----
  api.post(
    '/moderate',
    asyncRoute(async (req, res) => {
      const { text } = parse(z.object({ text: z.string().max(8000), source: z.enum(['buddy', 'child']) }), req.body);
      if (!text.trim()) return res.json({ flagged: false, categories: [] });
      try {
        res.json(await moderator.check(text));
      } catch {
        throw new HttpError(502, 'moderation_unavailable', 'Moderation is unavailable');
      }
    }),
  );

  // ---- Anonymous ops log ----
  api.post('/ops/session', (req, res) => {
    const stats = parse(SessionStatsSchema, req.body);
    ops.append(stats);
    budget?.settle(stats.sessionId, stats.durationMs);
    res.status(204).end();
  });

  api.use((_req, _res, next) => next(new HttpError(404, 'not_found', 'Unknown API route')));

  // Errors: never echo request bodies (they may contain child data).
  api.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: { code: err.code, message: err.message } });
    if (err instanceof MintError) {
      const status = err.code === 'no_api_key' ? 500 : 502;
      return res.status(status).json({ error: { code: err.code, message: err.message } });
    }
    if (err && typeof err === 'object' && 'type' in err && (err as { type: string }).type === 'entity.parse.failed') {
      return res.status(400).json({ error: { code: 'invalid_json', message: 'Invalid JSON' } });
    }
    console.error('[api] unexpected error:', err instanceof Error ? err.message : 'unknown');
    res.status(500).json({ error: { code: 'internal', message: 'Something went wrong' } });
  });

  return api;
}
