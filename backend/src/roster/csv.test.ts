import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { csvToChildren, normalizeClass, normalizeLanguage, parseCsv } from './csv';

describe('CSV import', () => {
  it('imports the template in docs/ (paper-form columns)', () => {
    const { ok, errors } = csvToChildren(readFileSync(new URL('../../../docs/children-template.csv', import.meta.url), 'utf8'));
    expect(errors).toEqual([]);
    expect(ok.map((c) => c.firstName)).toEqual(['Aarav', 'Maya']);
    const [aarav, maya] = ok;
    expect(aarav.lastName).toBe('Sharma');
    expect(aarav.grownUps).toEqual([
      expect.objectContaining({ calledBy: 'Papa', firstName: 'Rahul', job: 'Civil engineer' }),
      expect.objectContaining({ calledBy: 'Mummy', firstName: 'Priya', job: 'Doctor' }),
    ]);
    expect(aarav.grownUps[0].jobInSimpleWords).toMatch(/bridges/);
    expect(aarav).toMatchObject({ car: 'White Maruti Swift', favouriteColour: 'Blue', favouriteHolidayPlace: 'Goa' });
    expect(maya.grownUps).toHaveLength(1); // father left blank on the form
    expect(maya.consent.cameraAllowed).toBe(false);
  });

  it('still imports files in the old grownUp1/grownUp2 format', () => {
    const csv =
      'firstName,className,grownUp1CalledBy,grownUp1Job,grownUp1JobSimple,likes,parentConsent,consentVerifiedBy,cameraAllowed\n' +
      'Zoya,Class 2,Nani,teacher,teaches maths,cats;kites,yes,Asha,yes\n';
    const { ok, errors } = csvToChildren(csv);
    expect(errors).toEqual([]);
    expect(ok[0]).toMatchObject({ grownUps: [{ calledBy: 'Nani', job: 'teacher' }], likes: ['cats', 'kites'] });
  });

  it('treats consent as given unless a row says "no", and is lenient about class and language', () => {
    const csv =
      'firstName,className,language,fatherWork,parentConsent\n' +
      'Kabir,2,hindi,"Drives a bus. Takes children to school.",\n' +
      '"Ria, Jr",Class 1,English,,no\n';
    expect(parseCsv(csv)[2][0]).toBe('Ria, Jr');
    const { ok, errors } = csvToChildren(csv);
    expect(ok).toHaveLength(1);
    expect(ok[0]).toMatchObject({ className: 'Class 2', language: 'Hindi', consent: { parentConsent: true, cameraAllowed: true } });
    expect(ok[0].grownUps[0]).toMatchObject({ calledBy: 'Papa', job: 'Drives a bus' });
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/consent/i);
  });

  it('normalises how class and language are written on paper', () => {
    expect(['2', 'class 2', 'Class-2', 'II', '2nd'].map(normalizeClass)).toEqual(Array(5).fill('Class 2'));
    expect(['', 'HINGLISH', 'hin', 'eng'].map(normalizeLanguage)).toEqual(['English', 'Hinglish', 'Hindi', 'English']);
  });
});
