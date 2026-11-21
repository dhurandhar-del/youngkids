import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { csvToChildren, parseCsv } from './csv';

describe('CSV import', () => {
  it('imports the template in docs/', () => {
    const { ok, errors } = csvToChildren(readFileSync(new URL('../../../docs/children-template.csv', import.meta.url), 'utf8'));
    expect(errors).toEqual([]);
    expect(ok.map((c) => c.firstName)).toEqual(['Aarav', 'Maya']);
    expect(ok[0].grownUps).toHaveLength(2);
    expect(ok[0].likes).toEqual(['dinosaurs', 'cricket']);
    expect(ok[1].consent.cameraAllowed).toBe(false);
  });

  it('rejects rows without parent consent and handles quoted commas', () => {
    const csv = 'firstName,className,grownUp1CalledBy,grownUp1Job,parentConsent,consentVerifiedBy,cameraAllowed\n"Ria, Jr",Class 1,Mummy,"nurse, night shift",no,Asha,yes\n';
    expect(parseCsv(csv)[1][0]).toBe('Ria, Jr');
    const { ok, errors } = csvToChildren(csv);
    expect(ok).toHaveLength(0);
    expect(errors[0].message).toMatch(/consent/i);
  });
});
