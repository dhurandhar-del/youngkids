import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ChildInput, ChildProfile, ChildStatus } from '../../shared/types';

export interface RosterStore {
  list(): ChildProfile[];
  get(id: string): ChildProfile | undefined;
  create(input: ChildInput): ChildProfile;
  update(id: string, input: ChildInput): ChildProfile | undefined;
  patch(id: string, patch: { status?: ChildStatus; upNext?: boolean }): ChildProfile | undefined;
  remove(id: string): boolean;
  purgeAll(): number;
  purgeOlderThan(hours: number, now?: Date): number;
}

const ORDER: Record<string, number> = { upNext: 0, waiting: 1, done: 2 };

/** Small JSON-file store. Data lives only on this laptop and is purged within the retention window. */
export class JsonRosterStore implements RosterStore {
  private readonly cache = new Map<string, ChildProfile>();

  constructor(private readonly filePath: string) {
    mkdirSync(dirname(filePath), { recursive: true });
    if (existsSync(filePath)) {
      try {
        const rows = JSON.parse(readFileSync(filePath, 'utf8')) as ChildProfile[];
        for (const row of rows) this.cache.set(row.id, row);
      } catch {
        // Corrupt file: start empty rather than crash at an event. The old file is overwritten on next write.
      }
    }
  }

  list(): ChildProfile[] {
    return [...this.cache.values()].sort((a, b) => {
      const ka = a.upNext ? ORDER.upNext : ORDER[a.status];
      const kb = b.upNext ? ORDER.upNext : ORDER[b.status];
      return ka - kb || a.createdAt.localeCompare(b.createdAt);
    });
  }

  get(id: string): ChildProfile | undefined {
    return this.cache.get(id);
  }

  create(input: ChildInput): ChildProfile {
    const child: ChildProfile = {
      ...input,
      id: randomUUID(),
      status: 'waiting',
      upNext: false,
      createdAt: new Date().toISOString(),
    };
    this.cache.set(child.id, child);
    this.persist();
    return child;
  }

  update(id: string, input: ChildInput): ChildProfile | undefined {
    const existing = this.cache.get(id);
    if (!existing) return undefined;
    const updated: ChildProfile = { ...existing, ...input };
    this.cache.set(id, updated);
    this.persist();
    return updated;
  }

  patch(id: string, patch: { status?: ChildStatus; upNext?: boolean }): ChildProfile | undefined {
    const existing = this.cache.get(id);
    if (!existing) return undefined;
    if (patch.upNext) for (const c of this.cache.values()) c.upNext = false;
    const updated: ChildProfile = { ...existing, ...patch };
    if (patch.status === 'done') updated.upNext = false;
    this.cache.set(id, updated);
    this.persist();
    return updated;
  }

  remove(id: string): boolean {
    const ok = this.cache.delete(id);
    if (ok) this.persist();
    return ok;
  }

  purgeAll(): number {
    const n = this.cache.size;
    this.cache.clear();
    this.persist();
    return n;
  }

  purgeOlderThan(hours: number, now: Date = new Date()): number {
    const cutoff = now.getTime() - hours * 3_600_000;
    let n = 0;
    for (const [id, c] of this.cache) {
      if (Date.parse(c.createdAt) < cutoff) {
        this.cache.delete(id);
        n++;
      }
    }
    if (n) this.persist();
    return n;
  }

  private persist(): void {
    const tmp = `${this.filePath}.tmp`;
    writeFileSync(tmp, JSON.stringify([...this.cache.values()], null, 2), { mode: 0o600 });
    renameSync(tmp, this.filePath);
  }
}
