import { describe, expect, it } from 'vitest';
import type { AiChildProfile } from '@zuzu/shared/types';
import { hintForActivity, openingPlan } from './profileHints';
import { setActivityResult } from './tools';

const kabir: AiChildProfile = {
  firstName: 'Kabir',
  className: 'Class 3',
  ageBand: '7',
  language: 'English',
  grownUps: [
    { calledBy: 'Papa', firstName: 'Shiv', job: 'Lawyer' },
    { calledBy: 'Mummy', firstName: 'Purnima', job: 'Lawyer', jobInSimpleWords: 'Helps people in court.' },
  ],
  likes: [],
  car: 'Mercedes',
  favouriteColour: 'Red, Blue',
  favouriteHolidayPlace: 'Maldives',
  cameraAllowed: true,
  usage: 'Use naturally.',
};

describe('profile hints', () => {
  it('plans where each of the child\'s details fits', () => {
    const plan = openingPlan(kabir)!;
    expect(plan).toContain('Mercedes');
    expect(plan).toContain('Papa (Shiv) is a Lawyer');
    expect(plan).toContain('Maldives');
  });

  it('reminds Zuzu of the right details for each part of the chat', () => {
    expect(hintForActivity('choices', kabir)).toMatch(/Mercedes.*Red, Blue/);
    expect(hintForActivity('family', kabir)).toContain('Mummy (Purnima) is a Lawyer: "Helps people in court."');
    expect(hintForActivity('show_and_tell', kabir)).toContain('Maldives');
    expect(hintForActivity('what_is_ai', kabir)).toContain('Papa as a Lawyer');
    expect(hintForActivity('hello', kabir)).toBeNull();
  });

  it('skips details that are missing or say there is none', () => {
    const sparse: AiChildProfile = { ...kabir, car: 'No car', favouriteColour: undefined, grownUps: [{ calledBy: 'Mummy', job: 'not given' }], favouriteHolidayPlace: undefined };
    expect(hintForActivity('choices', sparse)).toBeNull();
    expect(hintForActivity('family', sparse)).toBeNull();
    expect(openingPlan(sparse)).toBeNull();
  });

  it('carries the hint in the set_activity result', () => {
    expect(setActivityResult('Let us play!', 'Use the Mercedes.')).toContain('Use the Mercedes.');
    expect(setActivityResult('', null)).toBe('ok. Now say your line for this part (no preamble).');
  });
});
