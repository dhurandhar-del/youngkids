import { describe, expect, it } from 'vitest';
import { NameMatcher, type MatchableChild } from './nameMatcher';

const kid = (id: string, firstName: string, extra: Partial<MatchableChild> = {}): MatchableChild => ({
  id,
  firstName,
  status: 'waiting',
  ...extra,
});

const roster: MatchableChild[] = [
  kid('1', 'Aarav'),
  kid('2', 'Ishaan'),
  kid('3', 'Shreya'),
  kid('4', 'Vihaan'),
  kid('5', 'Zoya'),
  kid('6', 'Maya'),
  kid('7', 'Mia'),
  kid('8', 'Rohan', { nickname: 'Chintu' }),
];

const matcher = new NameMatcher();

describe('NameMatcher.normalize / phoneticKey', () => {
  it('normalizes case, accents and punctuation', () => {
    expect(NameMatcher.normalize("  ÁaRav!! ")).toBe('aarav');
  });
  it('collapses common Indian transliteration variants to the same key', () => {
    expect(NameMatcher.phoneticKey('Aarav')).toBe(NameMatcher.phoneticKey('Arav'));
    expect(NameMatcher.phoneticKey('Ishaan')).toBe(NameMatcher.phoneticKey('Ishan'));
    expect(NameMatcher.phoneticKey('Shreya')).toBe(NameMatcher.phoneticKey('Sreya'));
    expect(NameMatcher.phoneticKey('Vihaan')).toBe(NameMatcher.phoneticKey('Vihan'));
    expect(NameMatcher.phoneticKey('Zoya')).toBe(NameMatcher.phoneticKey('Joya'));
  });
});

describe('NameMatcher.match', () => {
  it('matches an exact name', () => {
    const r = matcher.match('Aarav', roster);
    expect(r.status).toBe('matched');
    expect(r.child?.id).toBe('1');
  });

  it('ignores filler words and surnames', () => {
    expect(matcher.match("Hi, my name is aarav sharma", roster).child?.id).toBe('1');
    expect(matcher.match('mera naam Ishan hai', roster).child?.id).toBe('2');
  });

  it('matches transliteration variants', () => {
    expect(matcher.match('Arav', roster).child?.id).toBe('1');
    expect(matcher.match('Sreya', roster).child?.id).toBe('3');
    expect(matcher.match('Vihan', roster).child?.id).toBe('4');
    expect(matcher.match('Joya', roster).child?.id).toBe('5');
  });

  it('matches a nickname', () => {
    const r = matcher.match("I'm Chintu", roster);
    expect(r.status).toBe('matched');
    expect(r.child?.id).toBe('8');
  });

  it('reports ambiguity between close names', () => {
    const r = matcher.match('Maia', roster);
    expect(r.status).toBe('ambiguous');
    expect(r.candidates).toEqual(expect.arrayContaining(['Maya', 'Mia']));
  });

  it('uses the expected child to break a tie', () => {
    const r = matcher.match('Maia', roster, '6');
    expect(r.status).toBe('matched');
    expect(r.child?.id).toBe('6');
  });

  it('returns none for an unknown name', () => {
    expect(matcher.match('Krishnamurthy', roster).status).toBe('none');
  });

  it('returns none for empty input or an empty roster', () => {
    expect(matcher.match('', roster).status).toBe('none');
    expect(matcher.match('Aarav', []).status).toBe('none');
  });

  it('prefers children who have not had their turn yet', () => {
    const withDone: MatchableChild[] = [kid('a', 'Ananya', { status: 'done' }), kid('b', 'Anaya')];
    expect(matcher.match('Anaya', withDone).child?.id).toBe('b');
  });
});

describe('NameMatcher.similarity', () => {
  it('is 1 for identical strings and lower for different ones', () => {
    expect(NameMatcher.similarity('aarav', 'aarav')).toBe(1);
    expect(NameMatcher.similarity('aarav', 'rohan')).toBeLessThan(0.7);
  });
});

describe('NameMatcher with last names', () => {
  it('uses a typed last name to pick between two children with the same first name', () => {
    const twins = [kid('1', 'Aarav', { lastName: 'Sharma', className: 'Class 1' }), kid('2', 'Aarav', { lastName: 'Mehta', className: 'Class 2' })];
    expect(matcher.match('Aarav Mehta', twins)).toMatchObject({ status: 'matched', child: { id: '2' } });
    expect(matcher.match('Aarav', twins).status).toBe('ambiguous');
  });
});
