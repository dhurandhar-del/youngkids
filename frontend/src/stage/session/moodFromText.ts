import type { Expression } from '@zuzu/shared/types';

// Zuzu's transcript arrives slightly ahead of the audio, so it can drive the face.
// Highest-priority match wins (see LLD §7.4).
const RULES: [RegExp, Expression][] = [
  [/\b(oops|uh[- ]?oh|guessed wrong|wrong guess)\b/i, 'oops'],
  [/\b(thank you for telling me|that sounds sad|i'?m sorry|it'?s okay|grown-?up who can help)\b/i, 'sympathetic'],
  [/\b(wow|yay|amazing|hooray|woo-?hoo|awesome|waah|wah|kya baat|shabash|so cool|you got it|you caught|you found|that'?s right|exactly|bilkul sahi|sahi jawab)\b/i, 'excited'],
  [/\b(hmm+|let me think|i wonder)\b/i, 'curious'],
  [/\?\s*$/, 'curious'],
];

export function moodFromText(text: string): Expression | null {
  for (const [pattern, mood] of RULES) if (pattern.test(text)) return mood;
  return null;
}
