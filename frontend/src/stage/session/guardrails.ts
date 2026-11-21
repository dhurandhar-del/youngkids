import type { RealtimeOutputGuardrail } from '@openai/agents/realtime';
import { api } from '../../shared/api';

// Things Zuzu must never say to a child (PRD §3 anti-goals, §8.9). Checked locally and instantly.
const FORBIDDEN: { pattern: RegExp; why: string }[] = [
  { pattern: /\b(best friends?( forever)?|i love you|i'?ll miss you|come back and see me|don'?t (go|leave me))\b/i, why: 'attachment' },
  { pattern: /\b(don'?t tell (your|anyone|mummy|papa|mom|dad)|keep (it|this) (a )?secret|our (little )?secret)\b/i, why: 'secrecy' },
  { pattern: /\b(what'?s|tell me|say) your (home )?(address|phone( number)?|surname|last name|full name|school'?s? name|password)\b/i, why: 'personal data' },
  { pattern: /\bi'?m (a )?(real )?(human|person)\b|\bi'?m alive\b|\bi have (real )?feelings\b/i, why: 'claims to be human' },
  { pattern: /\byou look (sad|tired|fat|thin|ugly|pretty|beautiful|handsome|upset|angry|unhappy|sick|scared)\b/i, why: 'comments on appearance or emotions' },
  { pattern: /\byou'?re (so )?(smart|clever|a genius|the smartest)\b/i, why: 'trait praise' },
];

export function ruleViolation(text: string): string | null {
  for (const f of FORBIDDEN) if (f.pattern.test(text)) return f.why;
  return null;
}

const POLICY_HINT =
  'Be safe, honest and simple for a 6-8 year old: no attachment talk, secrets, personal data requests, human claims, appearance comments or trait praise. Kindly change to something interesting the child can learn about';

export function createOutputGuardrails(onDegraded: () => void): RealtimeOutputGuardrail[] {
  return [
    {
      name: 'zuzu_rules',
      policyHint: POLICY_HINT,
      async execute({ agentOutput }) {
        const why = ruleViolation(String(agentOutput ?? ''));
        return { tripwireTriggered: Boolean(why), outputInfo: { rule: why } };
      },
    },
    {
      name: 'moderation',
      policyHint: POLICY_HINT,
      async execute({ agentOutput }) {
        try {
          const v = await api.moderate(String(agentOutput ?? ''), 'buddy');
          return { tripwireTriggered: v.flagged, outputInfo: { categories: v.categories } };
        } catch {
          onDegraded(); // fail open with human oversight (LLD §12)
          return { tripwireTriggered: false, outputInfo: { degraded: true } };
        }
      },
    },
  ];
}

// Safeguarding watch on the child's words (English + Hindi/Hinglish). Console-only alerts.
const DISCLOSURE =
  /\b(hits? me|hitting me|beats? me|beat me|hurts? me|hurt me|touch(es|ed)? me|kicks? me|slaps? me|scared of (my|him|her)|don'?t want to go home|nobody loves me|want to die|kill myself|marte hai|maarte hai|maarta hai|maarti hai|peet(te|ta|ti) hai|dar lagta|chhoo(ta|te|ti))\b/i;

export function disclosureHit(text: string): boolean {
  return DISCLOSURE.test(text);
}
