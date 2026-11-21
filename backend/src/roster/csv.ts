import type { ChildInput } from '@zuzu/shared/types';
import { ChildInputSchema } from './childSchema';

export const CSV_HEADER = [
  'firstName',
  'nickname',
  'className',
  'age',
  'language',
  'grownUp1CalledBy',
  'grownUp1FirstName',
  'grownUp1Job',
  'grownUp1JobSimple',
  'grownUp2CalledBy',
  'grownUp2FirstName',
  'grownUp2Job',
  'grownUp2JobSimple',
  'likes',
  'avoidTopics',
  'parentConsent',
  'consentVerifiedBy',
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

export function csvToChildren(text: string): { ok: ChildInput[]; errors: { row: number; message: string }[] } {
  const rows = parseCsv(text.replace(/^﻿/, ''));
  const ok: ChildInput[] = [];
  const errors: { row: number; message: string }[] = [];
  if (!rows.length) return { ok, errors: [{ row: 0, message: 'The file is empty' }] };
  const header = rows[0].map((h) => h.trim());
  const idx = (name: string) => header.indexOf(name);
  if (idx('firstName') < 0) return { ok, errors: [{ row: 1, message: `Header row must include: ${CSV_HEADER.join(', ')}` }] };

  rows.slice(1).forEach((r, i) => {
    const get = (name: string) => {
      const j = idx(name);
      return j >= 0 ? (r[j] ?? '').trim() : '';
    };
    const grownUps = [1, 2]
      .map((n) => ({
        calledBy: get(`grownUp${n}CalledBy`),
        firstName: get(`grownUp${n}FirstName`) || undefined,
        job: get(`grownUp${n}Job`),
        jobInSimpleWords: get(`grownUp${n}JobSimple`) || undefined,
      }))
      .filter((g) => g.calledBy || g.job);
    const candidate = {
      firstName: get('firstName'),
      nickname: get('nickname') || undefined,
      className: get('className'),
      age: get('age') || undefined,
      language: get('language') || 'English',
      grownUps,
      likes: get('likes')
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean),
      avoidTopics: get('avoidTopics') || undefined,
      consent: {
        parentConsent: yes(get('parentConsent')) ? true : false,
        verifiedBy: get('consentVerifiedBy'),
        cameraAllowed: yes(get('cameraAllowed')),
      },
    };
    const parsed = ChildInputSchema.safeParse(candidate);
    if (parsed.success) ok.push(parsed.data as ChildInput);
    else errors.push({ row: i + 2, message: parsed.error.issues.map((x) => x.message).join('; ') });
  });
  return { ok, errors };
}
