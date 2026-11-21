import { describe, expect, it } from 'vitest';
import type { AiChildProfile } from '@zuzu/shared/types';
import { switchNote, toModelResult } from './tools';

const aarav: AiChildProfile = {
  firstName: 'Aarav',
  className: 'Class 2',
  ageBand: '7',
  language: 'Hinglish',
  grownUps: [{ calledBy: 'Papa', job: 'engineer' }],
  likes: ['dinosaurs'],
  cameraAllowed: true,
  usage: 'Use these facts naturally.',
};

describe('identify_child result when the name changes', () => {
  it('says nothing about switching on the first identification', () => {
    const r = toModelResult({ status: 'matched', childId: 'a', profile: aarav }, null, 'Aarav');
    expect(r.note).not.toContain('DIFFERENT child');
    expect(r.note).toContain('You are now talking with Aarav');
  });

  it('tells Zuzu to drop the previous child when a different child is matched', () => {
    const r = toModelResult({ status: 'matched', childId: 'a', profile: aarav }, 'Maya', 'Aarav');
    expect(r.note).toContain('This is a DIFFERENT child from Maya. Forget everything about Maya');
    expect(r.note).toContain('You are now talking with Aarav');
  });

  it('also drops the previous child when the new name is not on the list', () => {
    const r = toModelResult({ status: 'none' }, 'Maya', 'Sahil');
    expect(r.note).toContain('DIFFERENT child from Maya');
    expect(r.note).toContain('Do not share any personal facts');
  });

  it('does not treat re-saying the same name as a switch', () => {
    expect(switchNote('Maya', ' maya ')).toBe('');
  });
});

describe('set_activity result', () => {
  it('ends the turn quietly when Zuzu already asked its question', async () => {
    const { isBackgroundResult } = await import('@openai/agents/realtime');
    const { setActivityResult } = await import('./tools');
    expect(isBackgroundResult(setActivityResult('Hold something up! What will you show me?'))).toBe(true);
  });

  it('gives the turn back when Zuzu only announced the activity, or said nothing', async () => {
    const { isBackgroundResult } = await import('@openai/agents/realtime');
    const { setActivityResult } = await import('./tools');
    expect(isBackgroundResult(setActivityResult("Let's play a guessing game."))).toBe(false);
    expect(setActivityResult("Let's play a guessing game.")).toContain('continue straight into the game');
    expect(isBackgroundResult(setActivityResult(''))).toBe(false);
  });
});
