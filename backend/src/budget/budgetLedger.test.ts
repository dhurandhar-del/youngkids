import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BudgetLedger } from './budgetLedger';

describe('BudgetLedger', () => {
  const dirs: string[] = [];
  const make = (limitUsd = 3, file?: string) => {
    const dir = mkdtempSync(join(tmpdir(), 'zuzu-budget-'));
    dirs.push(dir);
    const path = file ?? join(dir, 'budget.json');
    return { path, ledger: new BudgetLedger(path, { limitUsd, sessionCostUsd: 0.6, maxSessionSeconds: 420 }) };
  };
  afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

  it('reserves the full estimate and refuses once the cap would be passed', () => {
    const { ledger } = make(3);
    for (let i = 0; i < 5; i++) {
      expect(ledger.canStart()).toBe(true);
      ledger.reserve(`s${i}`);
    }
    expect(ledger.summary().spentUsd).toBe(3);
    expect(ledger.canStart()).toBe(false);
  });

  it('charges a finished session by its length (at least 20%)', () => {
    const { ledger } = make(3);
    ledger.reserve('a');
    ledger.settle('a', 210_000); // half of 420 s
    expect(ledger.summary().spentUsd).toBe(0.3);
    ledger.reserve('b');
    ledger.settle('b', 5_000);
    expect(ledger.summary().spentUsd).toBe(0.42);
    ledger.settle('b', 400_000); // second report is ignored
    expect(ledger.summary().spentUsd).toBe(0.42);
  });

  it('gives the reservation back when the key cannot be minted, and survives a restart', () => {
    const { ledger, path } = make(3);
    ledger.reserve('a');
    ledger.reserve('b');
    ledger.release('b');
    const again = new BudgetLedger(path, { limitUsd: 3, sessionCostUsd: 0.6, maxSessionSeconds: 420 });
    expect(again.summary().spentUsd).toBe(0.6);
  });

  it('does nothing when no limit is set', () => {
    const { ledger } = make(0);
    ledger.reserve('a');
    expect(ledger.enabled).toBe(false);
    expect(ledger.canStart()).toBe(true);
  });
});
