import { describe, expect, it } from 'vitest';
import { PromptBuilder } from './promptBuilder';
import type { ChildProfile } from '@zuzu/shared/types';

const child: ChildProfile = {
  id: 'abc',
  firstName: 'Aarav',
  nickname: 'Chintu',
  className: 'Class 2',
  language: 'Hinglish',
  grownUps: [
    { calledBy: 'Mummy', firstName: 'Priya', job: 'doctor', jobInSimpleWords: 'helps sick people' },
    { calledBy: 'Papa', job: 'engineer' },
  ],
  likes: ['dinosaurs'],
  avoidTopics: 'grandfather',
  consent: { parentConsent: true, verifiedBy: 'Asha', cameraAllowed: false, noticeVersion: 'v1' },
  status: 'waiting',
  upNext: true,
  createdAt: '2026-11-20T10:00:00.000Z',
};

describe('PromptBuilder.buildInstructions', () => {
  const builder = new PromptBuilder({ buddyName: 'Zuzu', orgName: 'Young Leaders', shareRosterNames: true });

  it('includes the persona, AI disclosure and hard safety rules', () => {
    const text = builder.buildInstructions({ rosterFirstNames: [] });
    expect(text).toContain('You are Zuzu');
    expect(text).toContain("I'm an AI");
    expect(text).toContain('NOT alive');
    expect(text).toContain('Hard safety rules');
    expect(text).toContain('ask_grown_up_for_help');
    expect(text).toContain('NEVER comment on the child');
    expect(text).toContain('When we finish, the computer will forget our chat.');
  });

  it('includes first names only as hints, de-duplicated', () => {
    const text = builder.buildInstructions({ rosterFirstNames: ['Aarav', 'Maya', 'aarav'] });
    expect(text).toContain('Children expected today include: Aarav, Maya.');
  });

  it('omits names when sharing is disabled', () => {
    const noShare = new PromptBuilder({ buddyName: 'Zuzu', orgName: 'YL', shareRosterNames: false });
    expect(noShare.buildInstructions({ rosterFirstNames: ['Aarav'] })).not.toContain('Aarav');
  });

  it('mentions the expected child and their language without other profile data', () => {
    const text = builder.buildInstructions({ rosterFirstNames: ['Aarav'], expectedChild: child });
    expect(text).toContain('marked Aarav as up next, but a different child may come');
    expect(text).toContain('first hello in Hinglish');
    expect(text).toContain('always reply in the language the child speaks');
    expect(text).not.toContain('Priya');
    expect(text).not.toContain('grandfather');
  });
});

describe('PromptBuilder.toAiProfile', () => {
  it('drops ids, consent details and timestamps, and derives an age band from the class', () => {
    const p = PromptBuilder.toAiProfile(child);
    expect(p).not.toHaveProperty('id');
    expect(p).not.toHaveProperty('consent');
    expect(p).not.toHaveProperty('createdAt');
    expect(JSON.stringify(p)).not.toContain('Asha');
    expect(p.ageBand).toBe('7');
    expect(p.cameraAllowed).toBe(false);
    expect(p.grownUps[0]).toEqual({ calledBy: 'Mummy', firstName: 'Priya', job: 'doctor', jobInSimpleWords: 'helps sick people' });
    expect(p.grownUps[1]).toEqual({ calledBy: 'Papa', job: 'engineer' });
    expect(p.usage).toMatch(/Do not say where they came from/);
  });
});

describe('PromptBuilder.transcriptionHint', () => {
  it('lists names when sharing is enabled', () => {
    const builder = new PromptBuilder({ buddyName: 'Zuzu', orgName: 'YL', shareRosterNames: true });
    expect(builder.transcriptionHint(['Aarav'])).toContain('Names you may hear: Aarav.');
  });
});

describe('conversation style (Young Leaders feedback, 21 Nov 2026)', () => {
  const text = new PromptBuilder({ buddyName: 'Zuzu', orgName: 'YL', shareRosterNames: false }).buildInstructions({ rosterFirstNames: [] });
  const indexOf = (heading: string) => text.indexOf(heading);

  it('replaces the buddy name everywhere', () => {
    expect(text).toContain("I'm Zuzu. I'm an AI");
    expect(text).not.toContain('ZUZU');
  });

  it("mirrors the language of the child's latest turn, before any other style rule", () => {
    expect(text).toContain('reply in the language the child used in their most recent turn');
    expect(text).toContain('If the child switches language, switch on that very turn');
    expect(indexOf('# Language')).toBeLessThan(indexOf('# How you speak'));
  });

  it('bans filler openers and generic praise', () => {
    expect(text).toContain('# No filler words');
    expect(text).toMatch(/no "Ooh", "Oh", "Wow"/);
    expect(text).toContain('"Great question!"');
    expect(text).not.toMatch(/boing|whoosh|super-duper happy|Hi hi!/);
  });

  it('teaches real things, personalised, with the name used sparingly', () => {
    expect(text).toContain('# Teach something real');
    expect(text).toContain('# Make it about THIS child');
    expect(text).toContain('Never in two turns in a row');
    expect(text).not.toMatch(/Cats or dogs\?", "Ice cream or mango/);
  });

  it('teaches AI pros, real limits and using AI as a helper, not a homework machine', () => {
    expect(text).toContain('# Teaching about AI');
    expect(text).toContain('It can sound very sure even when it is wrong');
    expect(text).toContain("Don't let AI do your whole homework");
    expect(text).toContain('ask AI for a hint, the steps, or an example, not the whole answer');
  });

  it('switches to a new child whenever a different name is said', () => {
    expect(text).toContain('# When the name changes');
    expect(text).toContain('call identify_child again straight away with the new name');
    expect(text).toContain('Forget every fact about the earlier child');
  });

  it('still never says where personal facts came from', () => {
    expect(text).toContain('Do NOT explain or hint where you learned anything');
    expect(text).toContain('Never say "I hear...", "I heard..."');
  });
});
