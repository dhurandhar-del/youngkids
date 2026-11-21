import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApi } from './app';
import { loadConfig } from '../config';
import { JsonRosterStore } from '../roster/rosterStore';
import { OpsLogger } from '../ops/opsLog';
import type { KeyMinter } from '../realtime/keyMinter';

const childBody = {
  firstName: 'Aarav',
  className: 'Class 2',
  language: 'English',
  grownUps: [{ calledBy: 'Mummy', firstName: 'Priya', job: 'doctor' }],
  likes: ['dinosaurs'],
  consent: { parentConsent: true, verifiedBy: 'Asha', cameraAllowed: true },
};

describe('HTTP API', () => {
  let server: Server;
  let base: string;
  let dir: string;
  const minted: object[] = [];

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'zuzu-api-'));
    const config = loadConfig({ OPENAI_API_KEY: 'test', REALTIME_MODEL: 'gpt-realtime-2.1' } as NodeJS.ProcessEnv);
    const minter: KeyMinter = {
      async mint(session) {
        minted.push(session);
        return { value: 'ek_test', expiresAt: 123 };
      },
    };
    const app = express();
    app.use(
      '/api',
      createApi({
        config,
        roster: new JsonRosterStore(join(dir, 'roster.json')),
        minter,
        moderator: { check: async (t) => ({ flagged: t.includes('BAD'), categories: t.includes('BAD') ? ['violence'] : [] }) },
        ops: new OpsLogger(join(dir, 'ops.jsonl')),
      }),
    );
    server = app.listen(0);
    await new Promise((r) => server.once('listening', r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  });

  afterAll(() => {
    server.close();
    rmSync(dir, { recursive: true, force: true });
  });

  const post = (path: string, body: unknown) =>
    fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  it('rejects a child without parent consent', async () => {
    const res = await post('/children', { ...childBody, consent: { ...childBody.consent, parentConsent: false } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.message).toMatch(/consent/i);
  });

  it('creates a child and identifies them by a spoken variant', async () => {
    const created = await (await post('/children', childBody)).json();
    expect(created.id).toBeTruthy();
    const id = await (await post('/children/identify', { spokenName: 'my name is Arav' })).json();
    expect(id.status).toBe('matched');
    expect(id.profile.firstName).toBe('Aarav');
    expect(id.profile).not.toHaveProperty('consent');
  });

  it('bootstraps a session with the same tools and settings the browser will use', async () => {
    const res = await post('/session', {});
    expect(res.status).toBe(200);
    const boot = await res.json();
    expect(boot.clientSecret).toBe('ek_test');
    expect(boot.config.audio.input.turnDetection).toMatchObject({ type: 'semantic_vad', eagerness: 'low' });
    expect(boot.instructions).toContain('Children expected today include: Aarav.');
    const session = minted.at(-1) as { tools: { name: string }[]; tracing: null; model: string };
    expect(session.tracing).toBeNull();
    expect(session.model).toBe('gpt-realtime-2.1');
    expect(session.tools.map((t) => t.name)).toEqual(
      expect.arrayContaining(['identify_child', 'set_activity', 'look_closely', 'ask_grown_up_for_help', 'end_session', 'wait_for_user']),
    );
  });

  it('skips children already on the list when the same CSV is imported twice', async () => {
    const csv = readFileSync(new URL('../../../docs/children-template.csv', import.meta.url), 'utf8');
    const importCsv = () =>
      fetch(base + '/children/import', { method: 'POST', headers: { 'Content-Type': 'text/csv' }, body: csv }).then((r) => r.json());
    const first = await importCsv();
    const second = await importCsv();
    expect(second.created).toBe(0);
    expect(second.duplicates).toBe(first.created + first.duplicates);
    const names = (await (await fetch(base + '/children')).json()).map((c: { firstName: string }) => c.firstName);
    expect(names.filter((n: string) => n === 'Maya')).toHaveLength(1);
  });

  it('moderates text', async () => {
    expect(await (await post('/moderate', { text: 'BAD words', source: 'buddy' })).json()).toEqual({ flagged: true, categories: ['violence'] });
    expect(await (await post('/moderate', { text: 'hello', source: 'child' })).json()).toEqual({ flagged: false, categories: [] });
  });

  it('accepts only anonymous ops stats', async () => {
    const stats = {
      sessionId: 's1', model: 'm', durationMs: 1000, endReason: 'completed', childTurns: 3, buddyTurns: 4, nudges: 0,
      interventions: 0, identify: 'matched', guardrailTrips: 0, alerts: 0, latencyMsP50: 900, latencyMsP95: 1500, images: 2,
    };
    expect((await post('/ops/session', stats)).status).toBe(204);
    expect((await post('/ops/session', { ...stats, childName: 'Aarav' })).status).toBe(400);
    const lines = readFileSync(join(dir, 'ops.jsonl'), 'utf8').trim().split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toContain('Aarav');
  });

  it('starts a self-serve session from a typed name without using the roster', async () => {
    const res = await post('/session', { playerName: '  Riya<script>  ' });
    expect(res.status).toBe(200);
    const boot = await res.json();
    expect(boot.expectedChild).toBeUndefined();
    expect(boot.instructions).toContain('typed their name before starting: Riyascript.');
    expect(boot.instructions).not.toContain('Children expected today include: Aarav');
  });

  it('deletes all children only with explicit confirmation', async () => {
    const del = (body: unknown) =>
      fetch(base + '/children', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    expect((await del({})).status).toBe(400);
    const ok = await (await del({ confirm: 'DELETE' })).json();
    expect(ok.deleted).toBeGreaterThan(0);
    expect(await (await fetch(base + '/children')).json()).toEqual([]);
  });
});

describe('HTTP API with a console PIN', () => {
  let server: Server;
  let base: string;
  let dir: string;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'zuzu-pin-'));
    const config = loadConfig({ OPENAI_API_KEY: 'test', CONSOLE_PIN: '1234', CORS_ORIGINS: 'https://app.example' } as NodeJS.ProcessEnv);
    const app = express();
    app.use(
      '/api',
      createApi({
        config,
        roster: new JsonRosterStore(join(dir, 'roster.json')),
        minter: { mint: async () => ({ value: 'ek_test', expiresAt: 1 }) },
        moderator: { check: async () => ({ flagged: false, categories: [] }) },
        ops: new OpsLogger(join(dir, 'ops.jsonl')),
      }),
    );
    server = app.listen(0);
    await new Promise((r) => server.once('listening', r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  });

  afterAll(() => {
    server.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('keeps health public so the app can tell "PIN needed" from "server down"', async () => {
    const res = await fetch(base + '/health');
    expect(res.status).toBe(200);
    expect((await res.json()).pinRequired).toBe(true);
  });

  it('requires the PIN for everything else', async () => {
    expect((await fetch(base + '/children')).status).toBe(401);
    expect((await fetch(base + '/children', { headers: { 'x-console-pin': '1234' } })).status).toBe(200);
  });

  it('answers CORS preflight for allowed origins only, without a PIN', async () => {
    const pre = (origin: string) =>
      fetch(base + '/session', { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST' } });
    const ok = await pre('https://app.example');
    expect(ok.status).toBe(204);
    expect(ok.headers.get('access-control-allow-origin')).toBe('https://app.example');
    expect((await pre('https://evil.example')).headers.get('access-control-allow-origin')).toBeNull();
  });
});
