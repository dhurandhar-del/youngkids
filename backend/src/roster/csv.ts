import type { ChildInput } from '@zuzu/shared/types';
import { ChildInputSchema } from './childSchema';

/** Columns of the paper form, in order (docs/children-template.csv). Older files with grownUp1… columns still import. */
export const CSV_HEADER = [
  'firstName',
  'lastName',
  'className',
  'age',
  'language',
  'fatherName',
  'fatherOccupation',
  'fatherWork',
  'motherName',
  'motherOccupation',
  'motherWork',
  'car',
  'favouriteColour',
  'favouriteHolidayPlace',
  'parentConsent',
  'cameraAllowed',
] as const;

/** RFC-4180-ish CSV parser: quoted fields, escaped quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

const yes = (v: string | undefined) => ['yes', 'y', 'true', '1'].includes((v ?? '').trim().toLowerCase());
const no = (v: string | undefined) => ['no', 'n', 'false', '0'].includes((v ?? '').trim().toLowerCase());

/** "2", "Class 2", "class-2", "II", "2nd" -> "Class 2". Anything else is passed through (and rejected by the schema). */
export function normalizeClass(v: string): string {
  const t = v.trim().toLowerCase();
  const digit = t.match(/\d+/)?.[0];
  if (digit) return `Class ${Number(digit)}`;
  const roman = t.match(/\b(iii|ii|i)\b/)?.[1];
  if (roman) return `Class ${roman.length}`;
  return v.trim();
}

/** "hindi", "HINGLISH", "eng" -> canonical language; blank -> English. */
export function normalizeLanguage(v: string): string {
  const t = v.trim().toLowerCase();
  if (!t) return 'English';
  if (t.startsWith('hing')) return 'Hinglish';
  if (t.startsWith('hin')) return 'Hindi';
  if (t.startsWith('eng')) return 'English';
  return v.trim();
}

export function csvToChildren(text: string): { ok: ChildInput[]; errors: { row: number; message: string }[] } {
  const rows = parseCsv(text.replace(/^﻿/, ''));
  const ok: ChildInput[] = [];
  const errors: { row: number; message: string }[] = [];
  if (!rows.length) return { ok, errors: [{ row: 0, message: 'The file is empty' }] };
  const header = rows[0].map((h) => h.trim());
  const idx = (name: string) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  if (idx('firstName') < 0) return { ok, errors: [{ row: 1, message: `Header row must include: ${CSV_HEADER.join(', ')}` }] };

  rows.slice(1).forEach((r, i) => {
    const get = (name: string) => {
      const j = idx(name);
      return j >= 0 ? (r[j] ?? '').trim() : '';
    };
    // New form: father/mother columns. Old files: grownUp1…/grownUp2… columns.
    const parents = [
      { calledBy: 'Papa', firstName: get('fatherName'), job: get('fatherOccupation'), jobInSimpleWords: get('fatherWork') },
      { calledBy: 'Mummy', firstName: get('motherName'), job: get('motherOccupation'), jobInSimpleWords: get('motherWork') },
    ].filter((g) => g.firstName || g.job || g.jobInSimpleWords);
    const legacy = [1, 2]
      .map((n) => ({
        calledBy: get(`grownUp${n}CalledBy`),
        firstName: get(`grownUp${n}FirstName`),
        job: get(`grownUp${n}Job`),
        jobInSimpleWords: get(`grownUp${n}JobSimple`),
      }))
      .filter((g) => g.calledBy || g.job);
    const grownUps = (parents.length ? parents : legacy).map((g) => ({
      calledBy: g.calledBy || 'Grown-up',
      firstName: g.firstName || undefined,
      // Occupation left blank but "what they do" filled in: use the description as the job.
      job: g.job || g.jobInSimpleWords.split(/[.\n]/)[0].slice(0, 80) || 'not given',
      jobInSimpleWords: g.jobInSimpleWords.replace(/\s*\n\s*/g, ' ') || undefined,
    }));
    const candidate = {
      firstName: get('firstName'),
      lastName: get('lastName') || undefined,
      nickname: get('nickname') || undefined,
      className: normalizeClass(get('className') || get('class')),
      age: get('age').match(/\d+/)?.[0] || undefined,
      language: normalizeLanguage(get('language')),
      grownUps,
      likes: get('likes')
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean),
      avoidTopics: get('avoidTopics') || undefined,
      car: get('car') || undefined,
      favouriteColour: get('favouriteColour') || get('favoriteColor') || get('favouriteColor') || undefined,
      favouriteHolidayPlace: get('favouriteHolidayPlace') || get('favoriteHolidayPlace') || undefined,
      consent: {
        // Consent is taken in person; only an explicit "no" excludes the child.
        parentConsent: no(get('parentConsent')) ? false : true,
        verifiedBy: get('consentVerifiedBy') || undefined,
        cameraAllowed: get('cameraAllowed') ? yes(get('cameraAllowed')) : true,
      },
    };
    const parsed = ChildInputSchema.safeParse(candidate);
    if (parsed.success) ok.push(parsed.data as ChildInput);
    else errors.push({ row: i + 2, message: parsed.error.issues.map((x) => `${x.path.join('.') || 'row'}: ${x.message}`).join('; ') });
  });
  return { ok, errors };
}
