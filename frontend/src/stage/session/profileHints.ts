import type { Activity, AiChildProfile } from '@zuzu/shared/types';

/**
 * Keeps the child's own details (from the CSV) in play for the whole chat. The profile is in the
 * session instructions, but models drift away from it after the first minute, so each time the chat
 * moves to a new part we remind Zuzu which of THIS child's facts fit that part.
 */

const grownUpLine = (g: AiChildProfile['grownUps'][number]) =>
  `${g.calledBy}${g.firstName ? ` (${g.firstName})` : ''}${g.job && g.job !== 'not given' ? ` is a ${g.job}` : ''}${
    g.jobInSimpleWords ? `: "${g.jobInSimpleWords}"` : ''
  }`;

function facts(p: AiChildProfile) {
  const parents = p.grownUps.filter((g) => (g.job && g.job !== 'not given') || g.jobInSimpleWords);
  return {
    parents,
    car: p.car && !/^(no|none|no car)$/i.test(p.car.trim()) ? p.car : undefined,
    colour: p.favouriteColour,
    holiday: p.favouriteHolidayPlace,
    likes: p.likes.length ? p.likes.join(', ') : undefined,
  };
}

/** One-time plan sent with the first hello. */
export function openingPlan(p: AiChildProfile): string | null {
  const f = facts(p);
  const parts = [
    f.car || f.colour || f.likes
      ? `thinking game: build riddles or puzzles around ${[f.car && `their car (${f.car})`, f.colour && `their favourite colour (${f.colour})`, f.likes]
          .filter(Boolean)
          .join(' and ')}`
      : null,
    f.parents.length ? `family: ${f.parents.map(grownUpLine).join('; ')}` : null,
    f.holiday ? `show and tell / any time: their favourite holiday place (${f.holiday})` : null,
    f.parents.length ? `what is AI: how AI helps in ${f.parents.map((g) => `${g.calledBy}'s work`).join(' or ')}, and what they still decide themselves` : null,
  ].filter(Boolean);
  if (!parts.length) return null;
  return (
    `Use ${p.firstName}'s own details all through the chat, one at a time and turned into learning (never as a list, never say how you know): ` +
    parts.join(' | ') +
    '.'
  );
}

/** Reminder for the part of the chat that has just started (null when nothing fits). */
export function hintForActivity(activity: Activity, p: AiChildProfile): string | null {
  const f = facts(p);
  const name = p.firstName;
  switch (activity) {
    case 'choices': {
      const hooks = [f.car && `their family car, a ${f.car}`, f.colour && `their favourite colour, ${f.colour}`, f.likes && `things they like: ${f.likes}`].filter(Boolean);
      return hooks.length
        ? `For this thinking game, use ${name}'s world: ${hooks.join('; ')}. Example: a riddle or "true or false" about how a car's wheels or engine work, or where ${f.colour ?? 'their colour'} shows up in nature. Teach one real fact.`
        : null;
    }
    case 'family':
      return f.parents.length
        ? `Now talk about ${name}'s family using what you know: ${f.parents.map(grownUpLine).join('; ')}. Let ${name} be the expert: ask what that job is like, add one real fact about it, and how AI could help in that job.`
        : null;
    case 'show_and_tell':
      return f.holiday
        ? `If it fits during show and tell, bring in ${name}'s favourite holiday place, ${f.holiday}: what it looks like, its weather, animals or food, and ask what they did there.`
        : null;
    case 'what_is_ai': {
      const g = f.parents[0];
      return g
        ? `In the AI part, use ${name}'s family for the examples: how AI could help ${g.calledBy}${g.job && g.job !== 'not given' ? ` as a ${g.job}` : ''}, and what ${g.calledBy} still has to think about and decide with their own brain.`
        : null;
    }
    case 'goodbye':
      return f.holiday || f.parents.length
        ? `In the goodbye, link the memory line to something of ${name}'s (${[f.parents[0] && `${f.parents[0].calledBy}'s work`, f.holiday].filter(Boolean).join(' or ')}).`
        : null;
    default:
      return null;
  }
}
