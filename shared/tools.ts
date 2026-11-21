// Zuzu's function tools: names, descriptions and parameter schemas.
// Shared so the server mints the session with the same tools the browser registers with the Agents SDK.
import { z } from 'zod';
import { ACTIVITIES } from './types';

export const HELP_REASONS = ['cannot_understand', 'child_upset', 'safety', 'other'] as const;
export type HelpReason = (typeof HELP_REASONS)[number];

export const TOOL_SPECS = {
  identify_child: {
    description:
      "Call when the child says their name, to load the details a grown-up entered for them. Also call it again any time someone says a DIFFERENT name later in the chat (a new child, or a correction), then switch to that child. Call it immediately and silently: say nothing before it. Pass exactly the name you heard (just the name). Returns status 'matched' with a profile, 'ambiguous' with candidate names to choose between, or 'none'.",
    parameters: z.object({
      spoken_name: z.string().describe('The name the child said, as you heard it'),
    }),
  },
  set_activity: {
    description:
      'Tell the app which part of the chat you are starting, so the screen can match it. Call when you move to choices, family, show_and_tell, what_is_ai and goodbye. Say your full line for that part first, then call it at the end of the same turn. Never mention it out loud.',
    parameters: z.object({ activity: z.enum(ACTIVITIES) }),
  },
  look_closely: {
    description:
      'Get a fresh, sharper camera picture of what the child is showing right now. Call when the child says "look", holds something up, or asks what you see.',
    parameters: z.object({}),
  },
  ask_grown_up_for_help: {
    description:
      "Quietly alert the grown-up helper sitting with the child. Use reason 'cannot_understand' after three misunderstandings in a row, 'child_upset' if the child seems upset or wants to stop, 'safety' if the child says anything suggesting they are hurt or unsafe, 'other' otherwise.",
    parameters: z.object({
      reason: z.enum(HELP_REASONS),
      note: z.string().describe('A few words for the helper, e.g. "child mentioned being hit". Empty string if nothing to add.'),
    }),
  },
  end_session: {
    description: 'Call right after you have said goodbye, to finish the session with a celebration.',
    parameters: z.object({}),
  },
  wait_for_user: {
    description:
      'Call this when the latest audio does not need a spoken response: silence, background noise, other people talking, or speech not addressed to you. Say nothing.',
    parameters: z.object({}),
  },
} as const;

export type ToolName = keyof typeof TOOL_SPECS;
export const TOOL_NAMES = Object.keys(TOOL_SPECS) as ToolName[];

/** Realtime API (snake_case) function tool definitions. */
export function apiToolDefinitions() {
  return TOOL_NAMES.map((name) => {
    const spec = TOOL_SPECS[name];
    const { $schema: _ignored, ...parameters } = z.toJSONSchema(spec.parameters) as Record<string, unknown>;
    return { type: 'function' as const, name, description: spec.description, parameters };
  });
}
