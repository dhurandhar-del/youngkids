// Matches the name a child says (as heard by speech recognition) against today's roster.
// Tolerant of ASR spelling, extra words ("my name is..."), surnames and common
// Indian-name transliteration variants (Aarav/Arav, Shreya/Sreya, Zoya/Joya...).

export interface MatchableChild {
  id: string;
  firstName: string;
  lastName?: string;
  nickname?: string;
  className?: string;
  status: 'waiting' | 'done';
}

export interface NameMatch<T extends MatchableChild = MatchableChild> {
  status: 'matched' | 'ambiguous' | 'none';
  child?: T;
  /** Labels to read back to the child when ambiguous, e.g. ["Maya", "Mia"] */
  candidates: string[];
  score: number;
}

const FILLER_WORDS = new Set([
  'i', 'im', 'am', 'my', 'name', 'names', 'is', 'its', 'it', 'hi', 'hello', 'hey', 'me', 'call',
  'this', 'the', 'a', 'and', 'yes', 'okay', 'ok',
  // Hindi / Hinglish
  'mera', 'meri', 'naam', 'hai', 'main', 'mai', 'hoon', 'hu', 'hun', 'mujhe', 'kehte', 'bolte', 'ji',
]);

const MATCH_THRESHOLD = 0.88;
const AMBIGUOUS_THRESHOLD = 0.8;
const MARGIN = 0.05;
const EXPECTED_BONUS = 0.05;
const DONE_PENALTY = 0.05;
/** Typed/said last name matches: breaks ties between children with the same first name. */
const LAST_NAME_BONUS = 0.06;

const PHONETIC_RULES: [RegExp, string][] = [
  [/ph/g, 'f'],
  [/w/g, 'v'],
  [/z/g, 'j'],
  [/q/g, 'k'],
  [/ck/g, 'k'],
  [/x/g, 'ks'],
  [/chh/g, 'ch'],
  [/sh/g, 's'],
  [/th/g, 't'],
  [/dh/g, 'd'],
  [/bh/g, 'b'],
  [/kh/g, 'k'],
  [/gh/g, 'g'],
  [/aa/g, 'a'],
  [/ee/g, 'i'],
  [/ii/g, 'i'],
  [/oo/g, 'u'],
  [/ou/g, 'u'],
  [/ey$/, 'i'],
  [/y$/, 'i'],
  [/ie$/, 'i'],
  [/h$/, ''],
  [/(.)\1+/g, '$1'],
];

export class NameMatcher {
  static normalize(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z ]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  static phoneticKey(name: string): string {
    let s = NameMatcher.normalize(name).replace(/ /g, '');
    for (const [pattern, replacement] of PHONETIC_RULES) s = s.replace(pattern, replacement);
    return s;
  }

  /** Jaro-Winkler similarity in [0, 1]. */
  static similarity(a: string, b: string): number {
    if (a === b) return a.length ? 1 : 0;
    if (!a.length || !b.length) return 0;
    const window = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
    const aMatched = new Array<boolean>(a.length).fill(false);
    const bMatched = new Array<boolean>(b.length).fill(false);
    let matches = 0;
    for (let i = 0; i < a.length; i++) {
      const lo = Math.max(0, i - window);
      const hi = Math.min(b.length - 1, i + window);
      for (let j = lo; j <= hi; j++) {
        if (!bMatched[j] && a[i] === b[j]) {
          aMatched[i] = bMatched[j] = true;
          matches++;
          break;
        }
      }
    }
    if (!matches) return 0;
    let k = 0;
    let transpositions = 0;
    for (let i = 0; i < a.length; i++) {
      if (!aMatched[i]) continue;
      while (!bMatched[k]) k++;
      if (a[i] !== b[k]) transpositions++;
      k++;
    }
    const jaro = (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;
    let prefix = 0;
    while (prefix < 4 && prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++;
    return jaro + prefix * 0.1 * (1 - jaro);
  }

  /** Candidate name strings from an utterance: single tokens and adjacent pairs, minus filler words. */
  static candidates(spoken: string): string[] {
    const tokens = NameMatcher.normalize(spoken)
      .split(' ')
      .filter((t) => t.length > 1 && !FILLER_WORDS.has(t));
    const out = new Set<string>(tokens);
    for (let i = 0; i + 1 < tokens.length; i++) out.add(tokens[i] + tokens[i + 1]);
    return [...out];
  }

  private static nameScore(candidate: string, name: string): number {
    const n = NameMatcher.normalize(name).replace(/ /g, '');
    if (!n) return 0;
    return Math.max(
      NameMatcher.similarity(candidate, n),
      NameMatcher.similarity(NameMatcher.phoneticKey(candidate), NameMatcher.phoneticKey(n)),
    );
  }

  match<T extends MatchableChild>(spoken: string, roster: T[], expectedChildId?: string): NameMatch<T> {
    const candidates = NameMatcher.candidates(spoken);
    if (!candidates.length || !roster.length) return { status: 'none', candidates: [], score: 0 };

    const scored = roster
      .map((child) => {
        let best = 0;
        for (const c of candidates) {
          best = Math.max(best, NameMatcher.nameScore(c, child.firstName));
          if (child.nickname) best = Math.max(best, NameMatcher.nameScore(c, child.nickname));
        }
        if (child.id === expectedChildId) best += EXPECTED_BONUS;
        if (child.status === 'done') best -= DONE_PENALTY;
        let score = Math.min(1, best);
        if (child.lastName && candidates.some((c) => NameMatcher.nameScore(c, child.lastName!) >= 0.92)) score += LAST_NAME_BONUS;
        return { child, score };
      })
      .sort((x, y) => y.score - x.score);

    const [top, second] = scored;
    const margin = top.score - (second?.score ?? 0);

    if (top.score >= MATCH_THRESHOLD && margin >= MARGIN) {
      return { status: 'matched', child: top.child, candidates: [top.child.firstName], score: top.score };
    }
    if (top.score >= AMBIGUOUS_THRESHOLD) {
      const close = scored.filter((s) => top.score - s.score < MARGIN && s.score >= AMBIGUOUS_THRESHOLD).slice(0, 3);
      if (close.length === 1) {
        return { status: 'matched', child: top.child, candidates: [top.child.firstName], score: top.score };
      }
      return { status: 'ambiguous', candidates: NameMatcher.labels(close.map((s) => s.child)), score: top.score };
    }
    return { status: 'none', candidates: [], score: top.score };
  }

  /** Read-back labels; adds the class when two children share a first name. */
  private static labels(children: MatchableChild[]): string[] {
    const counts = new Map<string, number>();
    for (const c of children) counts.set(c.firstName.toLowerCase(), (counts.get(c.firstName.toLowerCase()) ?? 0) + 1);
    return children.map((c) =>
      (counts.get(c.firstName.toLowerCase()) ?? 0) > 1 && c.className ? `${c.firstName} from ${c.className}` : c.firstName,
    );
  }
}
