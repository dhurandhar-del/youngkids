import express from 'express';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config';
import { createApi } from './http/app';
import { JsonRosterStore } from './roster/rosterStore';
import { SessionKeyMinter } from './realtime/keyMinter';
import { ModerationService } from './moderation/moderationService';
import { OpsLogger } from './ops/opsLog';
import { BudgetLedger } from './budget/budgetLedger';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = loadConfig();
const dataDir = resolve(root, config.dataDir);

const roster = new JsonRosterStore(join(dataDir, 'roster.json'));
const app = express();
app.disable('x-powered-by');

// Request log: method, path, status, time. Never bodies (they can contain child data).
app.use('/api', (req, res, next) => {
  const t0 = Date.now();
  res.on('finish', () => {
    if (req.path === '/health') return;
    const path = req.path.replace(/\/[0-9a-f-]{36}/g, '/:id');
    console.log(`[api] ${req.method} ${path} → ${res.statusCode} (${Date.now() - t0} ms)`);
  });
  next();
});

app.use(
  '/api',
  createApi({
    config,
    roster,
    minter: new SessionKeyMinter(config.openaiApiKey),
    moderator: new ModerationService(config.openaiApiKey),
    ops: new OpsLogger(join(dataDir, 'ops-log.jsonl')),
    budget: new BudgetLedger(join(dataDir, 'budget.json'), {
      limitUsd: config.budgetUsd,
      sessionCostUsd: config.sessionCostUsd,
      maxSessionSeconds: config.timings.maxSeconds,
    }),
  }),
);

// Optional: serve the built frontend from this server (single-box deploy, `npm start` at the repo root).
// When the frontend is hosted elsewhere (e.g. Vercel), leave SERVE_FRONTEND unset and set CORS_ORIGINS instead.
const dist = resolve(root, '..', 'frontend', 'dist');
const servingFrontend = config.serveFrontend && existsSync(dist);
if (servingFrontend) {
  app.use(express.static(dist, { index: false }));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(join(dist, 'index.html')));
}

// Auto-purge the roster (privacy): check every 10 minutes.
const purge = () => {
  const n = roster.purgeOlderThan(config.rosterRetentionHours);
  if (n) console.log(`[privacy] purged ${n} roster entr${n === 1 ? 'y' : 'ies'} older than ${config.rosterRetentionHours} h`);
};
purge();
setInterval(purge, 10 * 60_000).unref();

app.listen(config.port, config.host, () => {
  const base = `http://${config.host === '127.0.0.1' ? 'localhost' : config.host}:${config.port}`;
  console.log(`\n  ${config.buddyName} server running`);
  console.log(servingFrontend ? `  Console: ${base}/console` : `  API: ${base}/api (frontend served separately)`);
  if (config.corsOrigins.length) console.log(`  CORS allowed for: ${config.corsOrigins.join(', ')}`);
  console.log(`  Model: ${config.realtimeModel} · voice: ${config.voice}`);
  if (config.budgetUsd) console.log(`  Budget: $${config.budgetUsd} (about $${config.sessionCostUsd} per full session)`);
  if (!config.openaiApiKey) console.log('  ⚠  OPENAI_API_KEY is missing in .env');
  if (!config.zdrConfirmed) console.log('  ⚠  ZDR_CONFIRMED is not true: REHEARSAL MODE. Do not run sessions with real children.');
  console.log('');
});
