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
  job: trimmed(80).min(1, 'Occupation is required'),
  jobInSimpleWords: optionalText(400),
});

export const ChildInputSchema = z.object({
  firstName: trimmed(40).min(1, 'First name is required'),
  lastName: optionalText(40),
  nickname: optionalText(40),
  className: z.preprocess((v) => (v === '' || v === null ? undefined : v), z.enum(CLASS_LEVELS).optional()),
  age: z.coerce.number().int().min(4).max(14).optional(),
  language: z.enum(LANGUAGES).default('English'),
  grownUps: z.array(GrownUpSchema).max(2).default([]),
  likes: z.array(trimmed(40).min(1)).max(3).default([]),
  avoidTopics: optionalText(200),
  car: optionalText(60),
  favouriteColour: optionalText(30),
  favouriteHolidayPlace: optionalText(60),
  // Consent is taken in person when the session starts, so it defaults to given. An explicit "no" excludes the child.
  consent: z
    .object({
      parentConsent: z.literal(true, { error: 'Parent consent is marked "no" for this child' }),
      verifiedBy: optionalText(60),
      cameraAllowed: z.boolean().default(true),
      noticeVersion: optionalText(20),
    })
    .default({ parentConsent: true, cameraAllowed: true, verifiedBy: undefined, noticeVersion: undefined }),
}) satisfies z.ZodType<ChildInput, unknown>;

export const ChildPatchSchema = z.object({
  status: z.enum(['waiting', 'done']).optional(),
  upNext: z.boolean().optional(),
});
