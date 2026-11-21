import { describe, expect, it } from 'vitest';
import { moodFromText } from './moodFromText';

describe('moodFromText', () => {
  it('detects oops moments first', () => {
    expect(moodFromText('Oops! I guessed wrong. Wow!')).toBe('oops');
    expect(moodFromText('Uh-oh, my computer ears got fuzzy')).toBe('oops');
  });
  it('detects excitement in English and Hindi', () => {
    expect(moodFromText('Wow, a red car!')).toBe('excited');
    expect(moodFromText('Waah! Kya baat hai!')).toBe('excited');
    expect(moodFromText('You caught my mistake! Elephants are huge.')).toBe('excited');
    expect(moodFromText('Bilkul sahi, Brachiosaurus!')).toBe('excited');
  });
  it('detects curiosity', () => {
    expect(moodFromText('Hmm, let me think')).toBe('curious');
    expect(moodFromText('What do you like to eat?')).toBe('curious');
  });
  it('detects sympathy', () => {
    expect(moodFromText("Thank you for telling me. Let's tell your helper, they're a grown-up who can help.")).toBe('sympathetic');
  });
  it('returns null when nothing stands out', () => {
    expect(moodFromText('I like the colour blue.')).toBeNull();
  });
});
