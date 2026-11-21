import { z } from 'zod';
import { CLASS_LEVELS, LANGUAGES, type ChildInput } from '@zuzu/shared/types';

const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  trimmed(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const GrownUpSchema = z.object({
  calledBy: trimmed(20).min(1, 'What does the child call this grown-up?'),
  firstName: optionalText(40),
  job: trimmed(60).min(1, 'Job is required'),
  jobInSimpleWords: optionalText(80),
});

export const ChildInputSchema = z.object({
  firstName: trimmed(40).min(1, 'First name is required'),
  nickname: optionalText(40),
  className: z.enum(CLASS_LEVELS),
  age: z.coerce.number().int().min(5).max(9).optional(),
  language: z.enum(LANGUAGES).default('English'),
  grownUps: z.array(GrownUpSchema).min(1, 'Add at least one grown-up').max(2),
  likes: z.array(trimmed(40).min(1)).max(3).default([]),
  avoidTopics: optionalText(200),
  consent: z.object({
    parentConsent: z.literal(true, { error: 'Parent consent is required before a child can take part' }),
    verifiedBy: trimmed(60).min(1, 'Who checked the consent form?'),
    cameraAllowed: z.boolean(),
    noticeVersion: optionalText(20),
  }),
}) satisfies z.ZodType<ChildInput, unknown>;

export const ChildPatchSchema = z.object({
  status: z.enum(['waiting', 'done']).optional(),
  upNext: z.boolean().optional(),
});
