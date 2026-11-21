import type { AiChildProfile, ChildProfile } from '@zuzu/shared/types';
import {
  aiLessonBlock,
  cameraBlock,
  conversationStyleBlock,
  honestAnswersBlock,
  identifyBlock,
  identityBlock,
  languageBlock,
  nameUseBlock,
  noFillerBlock,
  personalFactsBlock,
  personalizeBlock,
  planBlock,
  praiseGoodbyeBlock,
  repairBlock,
  roleBlock,
  safetyBlock,
  speakingBlock,
  systemNotesBlock,
  teachingBlock,
} from './persona';

export interface PromptConfig {
  buddyName: string;
  orgName: string;
  shareRosterNames: boolean;
}

export interface InstructionContext {
  rosterFirstNames: string[];
  expectedChild?: Pick<ChildProfile, 'firstName' | 'language'>;
  /** Self-serve mode: the name the player typed on their own laptop before starting. */
  playerName?: string;
}

export class PromptBuilder {
  constructor(private readonly cfg: PromptConfig) {}

  buildInstructions(ctx: InstructionContext): string {
    const { buddyName, orgName } = this.cfg;
    // Language and no-filler rules come first: they apply to every single turn.
    const blocks = [
      roleBlock(buddyName, orgName),
      identityBlock(buddyName),
      languageBlock,
      noFillerBlock,
      speakingBlock,
      nameUseBlock,
      teachingBlock,
      personalizeBlock,
      conversationStyleBlock,
      planBlock,
      identifyBlock,
      personalFactsBlock,
      aiLessonBlock,
      cameraBlock,
      repairBlock,
      honestAnswersBlock,
      praiseGoodbyeBlock,
      safetyBlock,
      systemNotesBlock,
    ].map((b) => b.replaceAll('ZUZU', buddyName));

    const today: string[] = [];
    const names = this.cfg.shareRosterNames ? uniqueNames(ctx.rosterFirstNames) : [];
    if (names.length) {
      today.push(`Children expected today include: ${names.join(', ')}. (First names only. Use this list only to hear names correctly.)`);
    }
    if (ctx.playerName) {
      today.push(
        `The person in front of you typed their name before starting: ${ctx.playerName}. Use that name from the start. Do NOT ask their name and do NOT call identify_child, unless they clearly tell you a different name (then call identify_child with it).`,
      );
      today.push('There is no profile for them: do not invent personal facts. Ask what they like and use their answers.');
      today.push('Say your very first hello in English. After that, always reply in the language they speak.');
    } else if (ctx.expectedChild) {
      today.push(
        `The facilitator marked ${ctx.expectedChild.firstName} as up next, but a different child may come. Always ask their name, call identify_child, and use the name the child actually says.`,
      );
      today.push(
        `Say your very first hello in ${ctx.expectedChild.language === 'English' ? 'English' : ctx.expectedChild.language + ' (simple and friendly)'}. After that, always reply in the language the child speaks.`,
      );
    } else {
      today.push('Say your very first hello in English. After that, always reply in the language the child speaks.');
    }
    today.push("Every turn: reply in the language of the child's latest words, with no filler words, in at most 3 short sentences.");
    blocks.push(`# Today\n${today.map((t) => `- ${t}`).join('\n')}`);
    return blocks.join('\n\n');
  }

  /** Minimise a roster entry to what the AI needs. This is the only child data sent to OpenAI. */
  static toAiProfile(child: ChildProfile): AiChildProfile {
    const ageFromClass: Record<string, string> = { 'Class 1': '6', 'Class 2': '7', 'Class 3': '8' };
    return {
      firstName: child.firstName,
      ...(child.nickname ? { nickname: child.nickname } : {}),
      className: child.className,
      ageBand: child.age ? String(child.age) : ageFromClass[child.className] ?? '6-8',
      language: child.language,
      grownUps: child.grownUps.map((g) => ({
        calledBy: g.calledBy,
        ...(g.firstName ? { firstName: g.firstName } : {}),
        job: g.job,
        ...(g.jobInSimpleWords ? { jobInSimpleWords: g.jobInSimpleWords } : {}),
      })),
      likes: child.likes,
      ...(child.avoidTopics ? { avoidTopics: child.avoidTopics } : {}),
      cameraAllowed: child.consent.cameraAllowed,
      usage:
        'Use these facts naturally in examples and questions, one at a time. Do not say where they came from (no "I heard..."): the helper explains that after the chat.',
    };
  }

  transcriptionHint(rosterFirstNames: string[]): string {
    const names = this.cfg.shareRosterNames ? uniqueNames(rosterFirstNames) : [];
    return [
      `A young child (age 6-8) talking to a friendly cartoon AI called ${this.cfg.buddyName}. English, Hindi or Hinglish.`,
      names.length ? `Names you may hear: ${names.join(', ')}.` : '',
    ]
      .filter(Boolean)
      .join(' ');
  }
}

function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) {
    const key = n.trim().toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(n.trim());
    }
  }
  return out.slice(0, 80);
}
