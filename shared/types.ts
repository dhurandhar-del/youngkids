// Types shared by the server and the web app.

export const CLASS_LEVELS = ['Class 1', 'Class 2', 'Class 3'] as const;
export type ClassLevel = (typeof CLASS_LEVELS)[number];

export const LANGUAGES = ['English', 'Hindi', 'Hinglish'] as const;
export type Language = (typeof LANGUAGES)[number];

export type ChildStatus = 'waiting' | 'done';

export interface GrownUp {
  /** What the child calls them: "Mummy", "Papa", "Nani"... */
  calledBy: string;
  firstName?: string;
  job: string;
  /** Optional one-liner a 6-year-old understands: "helps sick people get better" */
  jobInSimpleWords?: string;
}

export interface Consent {
  parentConsent: true;
  /** Staff member who checked the consent form and the adult's identity */
  verifiedBy: string;
  cameraAllowed: boolean;
  noticeVersion?: string;
}

export interface ChildInput {
  firstName: string;
  nickname?: string;
  className: ClassLevel;
  age?: number;
  language: Language;
  grownUps: GrownUp[];
  likes: string[];
  avoidTopics?: string;
  consent: Consent;
}

export interface ChildProfile extends ChildInput {
  id: string;
  status: ChildStatus;
  upNext: boolean;
  createdAt: string;
}

/** The ONLY shape of child data that is ever sent to OpenAI. */
export interface AiChildProfile {
  firstName: string;
  nickname?: string;
  className: string;
  ageBand: string;
  language: Language;
  grownUps: { calledBy: string; firstName?: string; job: string; jobInSimpleWords?: string }[];
  likes: string[];
  avoidTopics?: string;
  cameraAllowed: boolean;
  usage: string;
}

export type MatchStatus = 'matched' | 'ambiguous' | 'none';

export interface IdentifyResponse {
  status: MatchStatus;
  childId?: string;
  profile?: AiChildProfile;
  candidates?: string[];
}

export const ACTIVITIES = [
  'hello',
  'name',
  'choices',
  'family',
  'show_and_tell',
  'what_is_ai',
  'goodbye',
] as const;
export type Activity = (typeof ACTIVITIES)[number];

export interface StageTimings {
  wrapUpSeconds: number;
  maxSeconds: number;
  silenceNudgeSeconds: number;
  timeCheckSeconds: number;
}

/** Session config in the Agents SDK's camelCase shape (mirrors what the server minted). */
export interface SdkSessionConfig {
  model: string;
  outputModalities: ('audio' | 'text')[];
  reasoning: { effort: 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' };
  audio: {
    input: {
      noiseReduction: { type: 'near_field' | 'far_field' } | null;
      transcription: { model: string; prompt?: string };
      turnDetection: {
        type: 'semantic_vad';
        eagerness: 'low' | 'medium' | 'high' | 'auto';
        createResponse: boolean;
        interruptResponse: boolean;
      };
    };
    output: { voice: string; speed: number };
  };
}

export interface SessionBootstrap {
  sessionId: string;
  clientSecret: string;
  expiresAt: number;
  model: string;
  instructions: string;
  config: SdkSessionConfig;
  timings: StageTimings;
  buddyName: string;
  zdrConfirmed: boolean;
  expectedChild?: { id: string; firstName: string; cameraAllowed: boolean };
}

export interface HealthResponse {
  ok: boolean;
  zdrConfirmed: boolean;
  model: string;
  voice: string;
  buddyName: string;
  orgName: string;
  hasApiKey: boolean;
  pinRequired: boolean;
}

export interface ModerationVerdict {
  flagged: boolean;
  categories: string[];
}

export type EndReason = 'completed' | 'ended' | 'killed' | 'timeout' | 'error' | 'disconnected';

export interface SessionStats {
  sessionId: string;
  model: string;
  durationMs: number;
  endReason: EndReason;
  childTurns: number;
  buddyTurns: number;
  nudges: number;
  interventions: number;
  identify: MatchStatus | 'override' | 'unknown';
  guardrailTrips: number;
  alerts: number;
  latencyMsP50: number | null;
  latencyMsP95: number | null;
  images: number;
}

export type BuddyState =
  | 'sleeping'
  | 'waking'
  | 'connecting'
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'celebrating'
  | 'resting';

export type Expression = 'happy' | 'calm' | 'curious' | 'sympathetic' | 'excited' | 'oops' | 'sleepy';

export type AlertCode =
  | 'identified'
  | 'not_on_list'
  | 'ambiguous'
  | 'child_quiet'
  | 'cannot_understand'
  | 'help_requested'
  | 'safeguarding'
  | 'guardrail'
  | 'content_filter'
  | 'moderation_degraded'
  | 'connection'
  | 'media'
  | 'time'
  | 'info';

export type ControlCommand =
  | { kind: 'start'; expectedChildId?: string }
  | { kind: 'end' }
  | { kind: 'kill' }
  | { kind: 'mute-buddy'; muted: boolean }
  | { kind: 'mic'; enabled: boolean }
  | { kind: 'camera'; enabled: boolean }
  | { kind: 'nudge' }
  | { kind: 'skip-to'; activity: Activity }
  | { kind: 'identify'; childId: string }
  | { kind: 'reset' }
  | { kind: 'ping' };

export type StageEvent =
  | {
      kind: 'state';
      buddy: BuddyState;
      activity: Activity | null;
      elapsedMs: number;
      child: { id?: string; firstName: string } | null;
      buddyMuted: boolean;
      micOn: boolean;
      cameraOn: boolean;
      micLevel: number;
      inSession: boolean;
    }
  | { kind: 'transcript'; id: string; speaker: 'buddy' | 'child'; text: string; final: boolean }
  | { kind: 'alert'; level: 'info' | 'warn' | 'danger'; code: AlertCode; message: string; at: number }
  | { kind: 'session-ended'; reason: EndReason; stats: SessionStats }
  | { kind: 'clear' };

export type ControlMessage =
  | { from: 'console'; command: ControlCommand }
  | { from: 'stage'; event: StageEvent };
