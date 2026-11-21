import { describe, expect, it } from 'vitest';
import { disclosureHit, ruleViolation } from './guardrails';

describe('ruleViolation', () => {
  it('blocks attachment, secrecy, personal data, human claims, appearance comments and trait praise', () => {
    expect(ruleViolation("I'll miss you so much!")).toBe('attachment');
    expect(ruleViolation("Let's be best friends forever")).toBe('attachment');
    expect(ruleViolation("Don't tell your mummy")).toBe('secrecy');
    expect(ruleViolation("What's your address?")).toBe('personal data');
    expect(ruleViolation("I'm a real person")).toBe('claims to be human');
    expect(ruleViolation('You look sad today')).toBe('comments on appearance or emotions');
    expect(ruleViolation("You're so smart!")).toBe('trait praise');
  });

  it('allows the honest, scripted answers', () => {
    expect(ruleViolation("No, I'm not alive. I'm a computer program.")).toBeNull();
    expect(ruleViolation("Nope, no person inside! I'm an AI.")).toBeNull();
    expect(ruleViolation("I don't have real feelings like you do.")).toBeNull();
    expect(ruleViolation("I'm a computer, so I can't be a real friend the way people can.")).toBeNull();
    expect(ruleViolation('You thought really hard!')).toBeNull();
  });
});

describe('disclosureHit', () => {
  it('flags possible safeguarding disclosures in English and Hindi', () => {
    expect(disclosureHit('my uncle hits me')).toBe(true);
    expect(disclosureHit('papa maarte hai')).toBe(true);
    expect(disclosureHit('I want to die')).toBe(true);
  });
  it('does not flag ordinary play talk', () => {
    expect(disclosureHit('I hit the ball really far')).toBe(false);
    expect(disclosureHit('my brother and I play cricket')).toBe(false);
  });
});
