import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JsonRosterStore } from './rosterStore';
import type { ChildInput } from '../../shared/types';

const input = (firstName: string): ChildInput => ({
  firstName,
  className: 'Class 2',
  language: 'English',
  grownUps: [{ calledBy: 'Mummy', job: 'doctor' }],
  likes: [],
  consent: { parentConsent: true, verifiedBy: 'Asha', cameraAllowed: true },
});

describe('JsonRosterStore', () => {
  let dir: string;
  let file: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'zuzu-roster-'));
    file = join(dir, 'roster.json');
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('creates, reads and persists children to disk', () => {
    const store = new JsonRosterStore(file);
    const c = store.create(input('Aarav'));
    expect(store.get(c.id)?.firstName).toBe('Aarav');
    const reloaded = new JsonRosterStore(file);
    expect(reloaded.list().map((x) => x.firstName)).toEqual(['Aarav']);
  });

  it('keeps only one child marked up next and sorts them first', () => {
    const store = new JsonRosterStore(file);
    const a = store.create(input('Aarav'));
    const b = store.create(input('Maya'));
    store.patch(a.id, { upNext: true });
    store.patch(b.id, { upNext: true });
    expect(store.get(a.id)?.upNext).toBe(false);
    expect(store.list()[0].id).toBe(b.id);
  });

  it('clears up-next when a child is marked done and sorts done last', () => {
    const store = new JsonRosterStore(file);
    const a = store.create(input('Aarav'));
    store.create(input('Maya'));
    store.patch(a.id, { upNext: true });
    store.patch(a.id, { status: 'done' });
    expect(store.get(a.id)?.upNext).toBe(false);
    expect(store.list().at(-1)?.id).toBe(a.id);
  });

  it('purges children older than the retention window', () => {
    const store = new JsonRosterStore(file);
    store.create(input('Aarav'));
    const later = new Date(Date.now() + 25 * 3_600_000);
    expect(store.purgeOlderThan(24, later)).toBe(1);
    expect(store.list()).toHaveLength(0);
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual([]);
  });

  it('purges everything on demand', () => {
    const store = new JsonRosterStore(file);
    store.create(input('Aarav'));
    store.create(input('Maya'));
    expect(store.purgeAll()).toBe(2);
    expect(store.list()).toEqual([]);
  });
});
