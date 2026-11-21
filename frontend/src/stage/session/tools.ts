import { backgroundResult, tool } from '@openai/agents/realtime';
import { TOOL_SPECS, type HelpReason } from '@zuzu/shared/tools';
import type { Activity, AiChildProfile, IdentifyResponse } from '@zuzu/shared/types';

export interface ToolDeps {
  /** First name of the child Zuzu is talking with right now, if known. */
  currentChildName(): string | null;
  identify(spokenName: string): Promise<IdentifyResponse>;
  onIdentified(result: IdentifyResponse, spokenName: string): void;
  setActivity(activity: Activity): void;
  /** What Zuzu has said so far in the current model response. */
  textThisResponse(): string;
  lookClosely(): Promise<boolean>;
  askForHelp(reason: HelpReason, note: string): void;
  endSession(): void;
}

/** Zuzu's function tools. Schemas come from shared/tools.ts so they match the server-minted session. */
export function createTools(deps: ToolDeps) {
  const identify_child = tool({
    name: 'identify_child',
    description: TOOL_SPECS.identify_child.description,
    parameters: TOOL_SPECS.identify_child.parameters,
    async execute({ spoken_name }) {
      const previous = deps.currentChildName();
      try {
        const result = await deps.identify(spoken_name);
        deps.onIdentified(result, spoken_name);
        return JSON.stringify(toModelResult(result, previous, spoken_name));
      } catch {
        deps.onIdentified({ status: 'none' }, spoken_name);
        return JSON.stringify({
          status: 'none',
          note: `Could not check the list right now. ${switchNote(previous, spoken_name)}Carry on warmly without personal facts.`,
        });
      }
    },
  });

  const set_activity = tool({
    name: 'set_activity',
    description: TOOL_SPECS.set_activity.description,
    parameters: TOOL_SPECS.set_activity.parameters,
    async execute({ activity }) {
      deps.setActivity(activity);
      // A background result doesn't give the model another turn. That's right when Zuzu already asked
      // its question in this response. If it called set_activity first, or only announced the activity
      // ("Let's play a game!"), the child would be left waiting, so give the turn back.
      return setActivityResult(deps.textThisResponse());
    },
  });

  const look_closely = tool({
    name: 'look_closely',
    description: TOOL_SPECS.look_closely.description,
    parameters: TOOL_SPECS.look_closely.parameters,
    async execute() {
      const ok = await deps.lookClosely();
      return ok
        ? 'Here is a fresh camera picture (the latest image). Describe only what the child is showing.'
        : 'The camera is off or not ready, so there is no new picture. Ask the child to describe it instead.';
    },
  });

  const ask_grown_up_for_help = tool({
    name: 'ask_grown_up_for_help',
    description: TOOL_SPECS.ask_grown_up_for_help.description,
    parameters: TOOL_SPECS.ask_grown_up_for_help.parameters,
    async execute({ reason, note }) {
      deps.askForHelp(reason, note);
      return backgroundResult('The helper has been told.');
    },
  });

  const end_session = tool({
    name: 'end_session',
    description: TOOL_SPECS.end_session.description,
    parameters: TOOL_SPECS.end_session.parameters,
    async execute() {
      deps.endSession();
      return backgroundResult('ok');
    },
  });

  const wait_for_user = tool({
    name: 'wait_for_user',
    description: TOOL_SPECS.wait_for_user.description,
    parameters: TOOL_SPECS.wait_for_user.parameters,
    async execute() {
      return backgroundResult('');
    },
  });

  return [identify_child, set_activity, look_closely, ask_grown_up_for_help, end_session, wait_for_user];
}

export function toModelResult(
  r: IdentifyResponse,
  previousName: string | null = null,
  spokenName = '',
): { status: string; profile?: AiChildProfile; candidates?: string[]; note?: string } {
  if (r.status === 'matched' && r.profile) {
    return {
      status: 'matched',
      profile: r.profile,
      note: `${switchNote(previousName, r.profile.firstName)}You are now talking with ${r.profile.firstName}. Greet them by name in one short sentence and connect to something real about them, with a question. Use their facts naturally in examples, one at a time. Never say "I heard", "I know" or anything about how you know: just use the fact.`,
    };
  }
  if (r.status === 'ambiguous') {
    return { status: 'ambiguous', candidates: r.candidates, note: 'Ask which name is right as a choice, then call identify_child again.' };
  }
  return {
    status: 'none',
    note: `${switchNote(previousName, spokenName)}Say nice to meet you with the name you heard. Do not share any personal facts.`,
  };
}

export function setActivityResult(textSoFar: string) {
  if (textSoFar.includes('?')) return backgroundResult('ok');
  return textSoFar.trim()
    ? 'ok. Now continue straight into the game or question for this part, in one or two short sentences. Do not repeat what you just said.'
    : 'ok. Now say your line for this part (no preamble).';
}

/** Tells the model to drop the previous child's details when the name changes mid-session. */
export function switchNote(previousName: string | null, newName: string): string {
  if (!previousName) return '';
  const same = previousName.trim().toLowerCase() === newName.trim().toLowerCase();
  if (same) return '';
  return `This is a DIFFERENT child from ${previousName}. Forget everything about ${previousName} (their name, family, likes and what they told you) and never mention it again. `;
}
