import type {
  Activity,
  AiChildProfile,
  AlertCode,
  BuddyState,
  ControlCommand,
  EndReason,
  Expression,
  IdentifyResponse,
  SessionBootstrap,
  SessionStats,
  StageEvent,
} from '@zuzu/shared/types';
import type { HelpReason } from '@zuzu/shared/tools';
import { api, ApiError } from '../../shared/api';
import { ControlBus } from '../../shared/controlBus';
import { Store } from '../../shared/store';
import { LevelMeter, audioContext } from '../audio/levelMeter';
import { SoundFx } from '../audio/soundFx';
import { CameraService } from '../vision/cameraService';
import { SnapshotScheduler } from '../vision/snapshotScheduler';
import { VisionReactor, type Reaction } from '../vision/visionReactor';
import { createOutputGuardrails, disclosureHit } from './guardrails';
import { moodFromText } from './moodFromText';
import { RepairCoordinator } from './repairCoordinator';
import { Timekeeper } from './timekeeper';
import { createTools, switchNote } from './tools';
import { hintForActivity, openingPlan } from './profileHints';
import { RealtimeVoiceClient } from './voiceClient';

export interface StageState {
  buddy: BuddyState;
  expression: Expression;
  activity: Activity | null;
  child: { id?: string; firstName: string } | null;
  inSession: boolean;
  cameraOn: boolean;
  micOn: boolean;
  buddyMuted: boolean;
  celebrating: boolean;
  badgeName: string | null;
  sparkleAt: number;
  reaction: { kind: 'wave' | 'cheer' | 'smile'; at: number } | null;
  drawerOpen: boolean;
  needsActivation: boolean;
  mediaError: string | null;
  buddyName: string;
}

export interface FeedItem {
  id: string;
  kind: 'transcript' | 'alert';
  speaker?: 'buddy' | 'child';
  level?: 'info' | 'warn' | 'danger';
  text: string;
  final?: boolean;
  at: number;
}

const SAFEGUARDING_CATEGORIES = /self-harm|sexual\/minors|violence|harassment\/threatening|hate\/threatening/;

/** Owns one child's session from start to wipe (HLD §5.1, LLD §7). */
export class SessionController {
  readonly store = new Store<StageState>({
    buddy: 'sleeping',
    expression: 'sleepy',
    activity: null,
    child: null,
    inSession: false,
    cameraOn: false,
    micOn: true,
    buddyMuted: false,
    celebrating: false,
    badgeName: null,
    sparkleAt: 0,
    reaction: null,
    drawerOpen: false,
    needsActivation: true,
    mediaError: null,
    buddyName: 'Zuzu',
  });
  readonly feed = new Store<{ items: FeedItem[] }>({ items: [] });

  readonly camera = new CameraService();
  readonly mouthMeter = new LevelMeter();
  readonly micMeter = new LevelMeter({ gain: 14, floor: 0.008, release: 0.8, closeAfterMs: 120 });

  private readonly bus = new ControlBus();
  private readonly sfx = new SoundFx();
  private readonly vision = new VisionReactor();
  private voice: RealtimeVoiceClient | null = null;
  private micStream: MediaStream | null = null;
  private bootstrap: SessionBootstrap | null = null;
  private prefetch: { promise: Promise<SessionBootstrap>; at: number } | null = null;
  private profile: AiChildProfile | null = null;
  private expectedChildId: string | undefined;
  /** Self-serve mode: the name typed on this laptop. No roster, no facilitator, no prefetch. */
  private playerName: string | null = null;
  private cameraConsent: boolean | null = null; // null = unknown (no snapshots until known)
  private cameraOffForConsent = false; // camera stopped only because the current child has no camera consent
  private ending: EndReason | false = false;
  private startedAt = 0;
  private finishing = false;
  private disposed = false;
  private pendingNotes: { text: string; reply: boolean }[] = [];
  private showtimeTimer: ReturnType<typeof setInterval> | null = null;
  private endTimer: ReturnType<typeof setTimeout> | null = null;
  private wakeTimer: ReturnType<typeof setTimeout> | null = null;
  private exprTimer: ReturnType<typeof setTimeout> | null = null;
  private broadcastTimer: ReturnType<typeof setInterval> | null = null;
  private lastChildSpeechAt = 0;
  private turnEndAt = 0;
  private responseText = '';
  private buddyText = new Map<string, string>();
  private lastPartialSentAt = 0;
  private moderationDegradedAlerted = false;
  private stats = this.freshStats();
  private latencies: number[] = [];

  private readonly snapshots = new SnapshotScheduler({
    capture: (w, h, q) => this.camera.snapshot(w, h, q),
    send: (url, detail, id) => this.voice?.addImage(url, detail, id),
    remove: (id) => this.voice?.deleteItem(id),
    now: () => Date.now(),
    maxBytes: () => this.voice?.maxMessageBytes() ?? 65536,
    enabled: () => Boolean(this.voice?.connected && this.camera.on && this.cameraConsent === true),
  });

  private repair = this.makeRepair(7);

  private makeRepair(nudgeSeconds: number): RepairCoordinator {
    return new RepairCoordinator({
    nudgeSeconds,
    onNudge: (step) => {
      this.stats.nudges++;
      const text = [
        '',
        'The child has been quiet for a little while. Gently and briefly say something like "Take your time!" (no pressure, no new question).',
        'The child is still quiet. Offer an easy two-choice version of your last question.',
        'The child is still quiet. Invite them to answer with a wave or a thumbs-up instead of words.',
      ][step];
      this.voice?.addSystemNote(text, true);
    },
    onGiveUp: () => this.alert('warn', 'child_quiet', 'Child has been quiet through 3 nudges. Step in and help.'),
    });
  }

  private timekeeper: Timekeeper | null = null;

  // ---------------------------------------------------------------- lifecycle

  init(): () => void {
    const offBus = this.bus.onCommand((c) => void this.handle(c));
    const offVision = this.vision.onReaction((r) => this.onReaction(r));
    this.broadcastTimer = setInterval(() => this.broadcastState(), 400);
    void api
      .health()
      .then((h) => this.store.set({ buddyName: h.buddyName }))
      .catch(() => undefined);
    const hasActivation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive;
    if (hasActivation) void this.activate();
    this.disposed = false;
    return () => {
      this.disposed = true;
      offBus();
      offVision();
      if (this.broadcastTimer) clearInterval(this.broadcastTimer);
      this.teardown('ended', false);
      this.vision.dispose();
      this.camera.stop();
    };
  }

  /** First click on the Stage: unlocks audio and starts the camera for wake-on-face. */
  async activate(): Promise<void> {
    audioContext();
    this.store.set({ needsActivation: false });
    await this.startCamera();
    if (!this.vision.ready) {
      try {
        await this.vision.init();
      } catch {
        this.alert('warn', 'media', 'On-device camera reactions could not load (Zuzu still works; press Start).');
      }
    }
    if (this.camera.on && this.vision.ready) this.vision.start(this.camera.video);
  }

  private async startCamera(): Promise<void> {
    if (this.disposed) return;
    try {
      await this.camera.start();
      this.store.set({ cameraOn: true, mediaError: null });
      if (this.vision.ready) this.vision.start(this.camera.video);
    } catch {
      this.store.set({ cameraOn: false, mediaError: 'Camera not available. Allow camera access in Chrome.' });
    }
  }

  private stopCamera(): void {
    this.vision.stop();
    this.camera.stop();
    this.store.set({ cameraOn: false });
  }

  setPlayer(name: string | null): void {
    this.playerName = name;
    this.prefetch = null;
  }

  // ---------------------------------------------------------------- commands

  async handle(c: ControlCommand): Promise<void> {
    switch (c.kind) {
      case 'start':
        return this.start(c.expectedChildId);
      case 'end':
        return this.endGracefully();
      case 'kill':
        return this.kill();
      case 'mute-buddy':
        this.voice?.muteBuddy(c.muted);
        this.store.set({ buddyMuted: c.muted });
        return;
      case 'mic':
        this.voice?.muteMic(!c.enabled);
        this.store.set({ micOn: c.enabled });
        return;
      case 'camera':
        if (c.enabled) await this.startCamera();
        else {
          this.stopCamera();
          if (this.voice?.connected) this.queueNote("The camera is now off. Don't mention seeing anything new.", false);
        }
        return;
      case 'nudge':
        if (!this.store.get().inSession) return this.start();
        this.stats.interventions++;
        this.voice?.requestReply();
        return;
      case 'skip-to':
        if (!this.store.get().inSession) return;
        this.stats.interventions++;
        this.queueNote(`The facilitator asks you to move to the "${c.activity}" part now. Do it naturally.`, true);
        return;
      case 'identify':
        return this.identifyOverride(c.childId);
      case 'reset':
        if (this.store.get().inSession) this.kill();
        this.store.set({ buddy: 'sleeping', expression: 'sleepy', celebrating: false, badgeName: null, child: null, activity: null });
        this.bus.sendEvent({ kind: 'clear' });
        this.feed.set({ items: [] });
        if (!this.camera.on) await this.startCamera();
        return;
      case 'ping':
        this.broadcastState();
        return;
    }
  }

  async start(expectedChildId?: string): Promise<void> {
    const s = this.store.get();
    if (s.inSession || s.buddy === 'connecting' || this.finishing) return;
    audioContext();
    this.clearTimers();
    this.expectedChildId = expectedChildId;
    this.stats = this.freshStats();
    this.startedAt = Date.now();
    this.latencies = [];
    this.profile = null;
    this.cameraConsent = null;
    this.ending = false;
    this.pendingNotes = [];
    this.buddyText.clear();
    this.feed.set({ items: [] });
    this.bus.sendEvent({ kind: 'clear' });
    this.store.set({
      buddy: 'connecting',
      expression: 'happy',
      activity: null,
      child: null,
      celebrating: false,
      badgeName: null,
      buddyMuted: false,
      micOn: true,
    });

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      this.micMeter.attach(this.micStream);

      const player = this.playerName;
      const boot = player ? await api.session(undefined, player) : await this.takeBootstrap(expectedChildId);
      this.bootstrap = boot;
      this.stats.sessionId = boot.sessionId;
      this.stats.model = boot.model;
      if (boot.expectedChild) this.expectedChildId = boot.expectedChild.id;
      this.cameraConsent = boot.expectedChild ? boot.expectedChild.cameraAllowed : null;
      if (player) {
        // Matched on today's list: use that child's consent. Not on the list: the player chose to start and
        // allowed the camera in the browser on their own laptop.
        const known = boot.expectedChild;
        this.cameraConsent = known ? known.cameraAllowed : true;
        this.store.set({ child: known ? { id: known.id, firstName: known.firstName } : { firstName: player } });
        this.profile = boot.profile ?? null;
      }
      if (boot.expectedChild && !boot.expectedChild.cameraAllowed && this.camera.on) {
        this.stopCamera();
        this.cameraOffForConsent = true;
      }

      this.voice = new RealtimeVoiceClient();
      this.repair.cancel();
      this.repair = this.makeRepair(boot.timings.silenceNudgeSeconds);
      await this.voice.connect({
        bootstrap: boot,
        micStream: this.micStream,
        tools: createTools({
          currentChildName: () => this.store.get().child?.firstName ?? null,
          identify: (name) => (player ? Promise.resolve({ status: 'none' as const }) : api.identify(name, this.expectedChildId)),
          onIdentified: (r, name) =>
            player ? this.store.set({ child: { firstName: cleanName(name) }, activity: 'name' }) : this.onIdentified(r, name),
          setActivity: (a) => this.setActivity(a),
          activityHint: (a) => (this.profile ? hintForActivity(a, this.profile) : null),
          textThisResponse: () => this.responseText,
          lookClosely: async () => this.snapshots.maybeSend('look', 'high'),
          askForHelp: (reason, note) => this.onHelpRequested(reason, note),
          endSession: () => this.onEndSessionTool(),
        }),
        guardrails: createOutputGuardrails(() => this.onModerationDegraded()),
        handlers: {
          onTransportEvent: (ev) => this.onTransportEvent(ev),
          onGuardrailTripped: () => this.onGuardrailTripped(),
          onError: (msg) => this.alert('warn', 'connection', msg),
          onRemoteStream: (stream) => this.mouthMeter.attach(stream),
          onConnectionState: (st) => {
            if ((st === 'failed' || st === 'disconnected') && this.store.get().inSession && !this.finishing) {
              this.alert('danger', 'connection', 'Connection lost. Zuzu is resting. Press Start to begin again.');
              this.teardown('disconnected', false);
              this.store.set({ buddy: 'resting', expression: 'sleepy' });
            }
          },
        },
      });

      this.store.set({ inSession: true, buddy: 'thinking', activity: 'hello' });
      this.timekeeper = new Timekeeper(boot.timings, {
        onTick: () => undefined,
        onTimeCheck: () => {
          const a = this.store.get().activity;
          if (a !== 'what_is_ai' && a !== 'goodbye') {
            this.queueNote(
              'Time check: if you have not started the what_is_ai part yet, move to it soon (skip or shorten show and tell). It is the most important part.',
              false,
            );
          }
        },
        onWrapUp: () => {
          this.alert('info', 'time', 'Wrap-up time: Zuzu has been asked to finish.');
          this.queueNote(
            'Time is almost up. If you have not talked about AI yet, say in two short sentences what AI is and that it is for hints and ideas, while their own brain does the thinking. Then say goodbye and call end_session.',
            false,
          );
        },
        onMax: () => this.onEndSessionTool(true),
      });
      this.timekeeper.start();
      this.voice.addSystemNote(
        player
          ? `${this.store.get().child?.firstName ?? player} is now in front of you. Say hello warmly using their name (no filler words), say in one short sentence that you are an AI, and start with a fun question${
              this.profile ? ' linked to one of their details' : ''
            }. Do not ask their name.${this.profile ? ` ${openingPlan(this.profile) ?? ''}` : ''}`
          : 'The child is now standing in front of you. Say hello warmly (no filler words), say in one short sentence that you are an AI, and ask their name.',
        true,
      );
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof DOMException && err.name === 'NotAllowedError'
            ? 'Microphone permission denied. Allow the microphone in Chrome.'
            : err instanceof Error
              ? err.message
              : 'Could not start the session';
      this.alert('danger', 'connection', `Could not start: ${msg}`);
      this.teardown('error', false);
      this.store.set({ buddy: 'resting', expression: 'sleepy', ...(this.playerName ? { mediaError: msg } : {}) });
    }
  }

  /**
   * Reuse the session prefetched when Zuzu woke up, but only if it was made for the child who is
   * up next right now. The facilitator may have picked a different child since then.
   */
  private async takeBootstrap(expectedChildId?: string): Promise<SessionBootstrap> {
    const p = this.prefetch;
    this.prefetch = null;
    if (p && Date.now() - p.at < 8 * 60_000) {
      try {
        const [boot, children] = await Promise.all([p.promise, api.listChildren()]);
        const wanted = expectedChildId ?? children.find((c) => c.upNext)?.id;
        if (boot.expectedChild?.id === wanted) return boot;
      } catch {
        // fall through to a fresh session
      }
    }
    return api.session(expectedChildId);
  }

  private prefetchBootstrap(): void {
    if (this.playerName) return;
    if (this.prefetch && Date.now() - this.prefetch.at < 8 * 60_000) return;
    const promise = api.session(undefined);
    promise.catch(() => {
      if (this.prefetch?.promise === promise) this.prefetch = null;
    });
    this.prefetch = { promise, at: Date.now() };
  }

  endGracefully(): void {
    if (!this.store.get().inSession) return;
    this.stats.interventions++;
    this.queueNote('The facilitator asks you to finish now: say a warm, short goodbye and then call end_session.', true);
    this.endTimer ??= setTimeout(() => void this.finish('ended'), 20_000);
  }

  kill(): void {
    this.voice?.muteBuddy(true);
    const wasInSession = this.store.get().inSession || this.store.get().buddy === 'connecting';
    this.teardown('killed', wasInSession);
    this.store.set({ buddy: 'resting', expression: 'sleepy', celebrating: false });
    this.alert('warn', 'info', 'Session stopped by the facilitator.');
  }

  private async identifyOverride(childId: string): Promise<void> {
    if (!this.store.get().inSession) return;
    try {
      const profile = await api.aiProfile(childId);
      const previous = this.store.get().child;
      this.stats.identify = 'override';
      this.stats.interventions++;
      this.expectedChildId = childId;
      this.applyProfile(childId, profile);
      const isSwitch = previous && previous.id !== childId ? switchNote(previous.firstName, profile.firstName) : '';
      this.queueNote(
        `${isSwitch}The facilitator says this child is ${profile.firstName}. Their profile: ${JSON.stringify(profile)}. Greet them by name in one short sentence and carry on with something real to think about, using their facts naturally in examples. Do not say where you learned about them.`,
        true,
      );
    } catch {
      this.alert('warn', 'info', 'Could not load that child.');
    }
  }

  // ---------------------------------------------------------------- realtime events

  private onTransportEvent(ev: { type: string } & Record<string, any>): void {
    const s = this.store.get();
    switch (ev.type) {
      case 'input_audio_buffer.speech_started':
        this.lastChildSpeechAt = Date.now();
        this.repair.onChildActivity();
        this.store.set({ buddy: 'listening', expression: 'calm' });
        this.snapshots.maybeSend('speech');
        break;
      case 'input_audio_buffer.speech_stopped':
        this.turnEndAt = performance.now();
        this.store.set({ buddy: 'thinking', expression: 'curious' });
        break;
      case 'response.created':
        this.responseText = '';
        if (s.buddy === 'idle') this.store.set({ buddy: 'thinking' });
        break;
      case 'output_audio_buffer.started':
        if (this.turnEndAt) {
          this.latencies.push(performance.now() - this.turnEndAt);
          this.turnEndAt = 0;
        }
        this.stats.buddyTurns++;
        this.repair.onBuddyStartedSpeaking();
        this.store.set({ buddy: 'speaking', expression: s.expression === 'curious' || s.expression === 'calm' ? 'happy' : s.expression });
        break;
      case 'output_audio_buffer.stopped':
        this.onBuddyStopped();
        break;
      case 'output_audio_buffer.cleared':
        this.store.set({ buddy: 'listening', expression: 'calm' });
        break;
      case 'response.output_audio_transcript.delta': {
        this.responseText += String(ev.delta ?? '');
        const key = String(ev.item_id ?? ev.response_id ?? 'buddy');
        const text = (this.buddyText.get(key) ?? '') + String(ev.delta ?? '');
        this.buddyText.set(key, text);
        const mood = moodFromText(text.slice(-80));
        if (mood) this.setExpression(mood);
        if (Date.now() - this.lastPartialSentAt > 250) {
          this.lastPartialSentAt = Date.now();
          this.transcript(key, 'buddy', text, false);
        }
        break;
      }
      case 'response.output_audio_transcript.done': {
        const key = String(ev.item_id ?? ev.response_id ?? 'buddy');
        const text = String(ev.transcript ?? this.buddyText.get(key) ?? '');
        this.buddyText.delete(key);
        if (text.trim()) this.transcript(key, 'buddy', text, true);
        break;
      }
      case 'conversation.item.input_audio_transcription.completed': {
        const text = String(ev.transcript ?? '').trim();
        if (!text) break;
        this.stats.childTurns++;
        this.transcript(String(ev.item_id), 'child', text, true);
        void this.watchChildWords(text);
        break;
      }
      case 'response.done': {
        const r = ev.response ?? {};
        if (r.status === 'incomplete' && r.status_details?.reason === 'content_filter') {
          this.stats.guardrailTrips++;
          this.alert('warn', 'content_filter', "OpenAI's safety filter stopped one of Zuzu's replies.");
        }
        const hadAudio = (r.output ?? []).some((o: any) => o.type === 'message');
        if (!hadAudio && this.store.get().buddy === 'thinking') {
          this.store.set({ buddy: 'idle' });
          this.flushNotes();
        }
        break;
      }
      case 'error':
        if (ev.error?.code !== 'conversation_already_has_active_response') {
          this.alert('warn', 'connection', `Realtime: ${ev.error?.message ?? 'error'}`);
        }
        break;
    }
  }

  private onBuddyStopped(): void {
    this.store.set({ buddy: 'idle', expression: 'happy' });
    if (this.ending) {
      void this.finish(this.ending);
      return;
    }
    if (this.pendingNotes.length) {
      this.flushNotes();
      return;
    }
    this.repair.onBuddyStoppedSpeaking();
  }

  private queueNote(text: string, reply: boolean): void {
    if (!this.voice?.connected) return;
    const busy = this.store.get().buddy === 'speaking' || this.store.get().buddy === 'thinking';
    if (busy) this.pendingNotes.push({ text, reply });
    else this.voice.addSystemNote(text, reply);
  }

  private flushNotes(): void {
    const notes = this.pendingNotes;
    this.pendingNotes = [];
    notes.forEach((n, i) => this.voice?.addSystemNote(n.text, n.reply && i === notes.length - 1));
    if (notes.some((n) => n.reply)) this.repair.cancel();
  }

  // ---------------------------------------------------------------- tools

  private onIdentified(result: IdentifyResponse, spokenName: string): void {
    const previous = this.store.get().child;
    if (result.status === 'matched' && result.profile && result.childId) {
      if (this.stats.identify !== 'override') this.stats.identify = 'matched';
      // A different child (or a corrected name): from now on, match against this child.
      this.expectedChildId = result.childId;
      this.applyProfile(result.childId, result.profile);
      const switched = previous && previous.id !== result.childId ? ` Switched from ${previous.firstName}.` : '';
      this.alert('info', 'identified', `Identified ${result.profile.firstName} (${result.profile.className}).${switched}`);
    } else if (result.status === 'ambiguous') {
      if (this.stats.identify === 'unknown') this.stats.identify = 'ambiguous';
      this.alert('info', 'ambiguous', `Zuzu is asking: ${(result.candidates ?? []).join(' or ')}? You can also pick the child.`);
    } else {
      if (this.stats.identify === 'unknown') this.stats.identify = 'none';
      this.profile = null;
      this.expectedChildId = undefined;
      this.store.set({ child: { firstName: cleanName(spokenName) } });
      this.cameraConsent = false;
      this.alert('warn', 'not_on_list', `"${cleanName(spokenName)}" is not on today's list. Pick the child in the Console if they are registered. Camera snapshots stay off.`);
    }
  }

  private applyProfile(childId: string, profile: AiChildProfile): void {
    this.profile = profile;
    this.cameraConsent = profile.cameraAllowed;
    if (!profile.cameraAllowed) {
      if (this.camera.on) {
        this.stopCamera();
        this.cameraOffForConsent = true;
      }
      this.alert('info', 'info', 'Camera turned off: no camera consent for this child.');
    } else if (this.cameraOffForConsent) {
      // Switched to a child who has camera consent: turn back on what we turned off for the previous child.
      this.cameraOffForConsent = false;
      void this.startCamera();
    }
    this.store.set({ child: { id: childId, firstName: profile.firstName }, sparkleAt: Date.now(), activity: 'name' });
    this.setExpression('excited');
    this.sfx.sparkle();
  }

  private setActivity(activity: Activity): void {
    this.store.set({ activity });
    if (this.showtimeTimer) clearInterval(this.showtimeTimer);
    this.showtimeTimer = null;
    if (activity === 'show_and_tell') {
      this.showtimeTimer = setInterval(() => this.snapshots.maybeSend('showtime'), 4000);
    }
    if (activity === 'goodbye') this.repair.setPaused(true);
  }

  private onHelpRequested(reason: HelpReason, note: string): void {
    const level = reason === 'safety' || reason === 'child_upset' ? 'danger' : 'warn';
    const code: AlertCode = reason === 'safety' ? 'safeguarding' : reason === 'cannot_understand' ? 'cannot_understand' : 'help_requested';
    const label = {
      safety: 'Possible safeguarding concern. Follow the safeguarding procedure.',
      child_upset: 'The child may be upset. Please step in.',
      cannot_understand: "Zuzu can't understand the child. Please help.",
      other: 'Zuzu asked for help.',
    }[reason];
    this.alert(level, code, note ? `${label} (${note})` : label);
  }

  private onEndSessionTool(timeout = false): void {
    if (this.ending || !this.store.get().inSession) return;
    const finishReason: EndReason = timeout ? 'timeout' : 'completed';
    this.ending = finishReason;
    this.repair.cancel();
    this.setActivity('goodbye');
    if (this.store.get().buddy !== 'speaking') {
      this.endTimer = setTimeout(() => {
        if (this.store.get().buddy !== 'speaking') void this.finish(finishReason);
      }, 1500);
    }
    // Safety net if the audio never reports stopping.
    setTimeout(() => void this.finish(finishReason), timeout ? 8000 : 12_000);
  }

  // ---------------------------------------------------------------- safety

  private onGuardrailTripped(): void {
    this.stats.guardrailTrips++;
    this.setExpression('oops');
    this.alert('danger', 'guardrail', "A safety check stopped one of Zuzu's replies before it finished. Zuzu is changing the topic.");
  }

  private onModerationDegraded(): void {
    if (this.moderationDegradedAlerted) return;
    this.moderationDegradedAlerted = true;
    this.alert('warn', 'moderation_degraded', 'Live moderation is unavailable. Watch the transcript closely.');
  }

  private async watchChildWords(text: string): Promise<void> {
    if (disclosureHit(text)) {
      this.alert('danger', 'safeguarding', 'The child said something that may need attention. Follow the safeguarding procedure.');
      return;
    }
    try {
      const v = await api.moderate(text, 'child');
      if (v.flagged && v.categories.some((c) => SAFEGUARDING_CATEGORIES.test(c))) {
        this.alert('danger', 'safeguarding', `Check what the child said (${v.categories.join(', ')}).`);
      }
    } catch {
      this.onModerationDegraded();
    }
  }

  // ---------------------------------------------------------------- vision

  private onReaction(r: Reaction): void {
    const s = this.store.get();
    if (r.kind === 'face') {
      if (r.present && s.buddy === 'sleeping' && !s.inSession) {
        this.store.set({ buddy: 'waking', expression: 'happy' });
        this.sfx.wake();
        this.prefetchBootstrap();
      }
      if (this.wakeTimer) clearTimeout(this.wakeTimer);
      this.wakeTimer = null;
      if (!r.present && s.buddy === 'waking') {
        this.wakeTimer = setTimeout(() => {
          if (this.store.get().buddy === 'waking') {
            this.store.set({ buddy: 'sleeping', expression: 'sleepy' });
            this.sfx.sleep();
          }
        }, 20_000);
      }
      return;
    }
    if (r.kind === 'smile') {
      // Neutral "smile back" only. Never logged, never sent to the model.
      if (r.on && (s.buddy === 'idle' || s.buddy === 'listening' || s.buddy === 'waking')) {
        this.store.set({ reaction: { kind: 'smile', at: Date.now() } });
        this.setExpression('happy');
      }
      return;
    }
    // gestures
    this.store.set({ reaction: { kind: r.name === 'thumbs_up' ? 'cheer' : 'wave', at: Date.now() } });
    if (!s.inSession) return;
    this.repair.onChildActivity();
    this.snapshots.maybeSend('gesture');
    const label = { wave: 'wave', thumbs_up: 'thumbs-up', point: 'pointing finger', victory: 'peace sign' }[r.name];
    if (s.buddy === 'idle' && Date.now() - this.lastChildSpeechAt > 2000) {
      this.voice?.addSystemNote(`(Camera) The child just showed you a ${label}. React warmly to it as their answer.`, true);
    }
  }

  // ---------------------------------------------------------------- ending

  private async finish(reason: EndReason): Promise<void> {
    if (this.finishing || !this.store.get().inSession) return;
    this.finishing = true;
    const name = this.store.get().child?.firstName ?? null;
    const childId = this.store.get().child?.id;
    this.teardown(reason, true);
    if (childId && (reason === 'completed' || reason === 'ended' || reason === 'timeout')) {
      void api.patchChild(childId, { status: 'done' }).catch(() => undefined);
    }
    this.store.set({ buddy: 'celebrating', expression: 'excited', celebrating: true, badgeName: name });
    this.sfx.celebrate();
    await new Promise((r) => setTimeout(r, 6500));
    this.store.set({ celebrating: false, badgeName: null, buddy: 'sleeping', expression: 'sleepy', child: null, activity: null });
    this.finishing = false;
    if (!this.camera.on) await this.startCamera();
  }

  /** Close everything and wipe all child data from memory. */
  private teardown(reason: EndReason, logStats: boolean): void {
    const wasActive = Boolean(this.voice) || this.store.get().inSession;
    this.clearTimers();
    this.repair.cancel();
    this.repair.setPaused(false);
    this.timekeeper?.stop();
    this.voice?.close();
    this.voice = null;
    this.micMeter.detach();
    this.mouthMeter.detach();
    this.micStream?.getTracks().forEach((t) => t.stop());
    this.micStream = null;

    if (wasActive && logStats && this.bootstrap) {
      const stats: SessionStats = {
        ...this.stats,
        durationMs: Math.max(0, Date.now() - this.startedAt),
        endReason: reason,
        images: this.snapshots.count,
        latencyMsP50: percentile(this.latencies, 0.5),
        latencyMsP95: percentile(this.latencies, 0.95),
      };
      void api.logSession(stats).catch(() => undefined);
      this.bus.sendEvent({ kind: 'session-ended', reason, stats });
    }

    // Wipe (FR-43/44)
    this.snapshots.reset();
    this.profile = null;
    this.bootstrap = null;
    this.cameraConsent = null;
    this.cameraOffForConsent = false;
    this.pendingNotes = [];
    this.buddyText.clear();
    this.ending = false;
    this.feed.set({ items: this.feed.get().items.filter((i) => i.kind === 'alert') });
    this.store.set({ inSession: false, activity: null, buddyMuted: false, micOn: true });
  }

  private clearTimers(): void {
    for (const t of [this.endTimer, this.exprTimer]) if (t) clearTimeout(t);
    if (this.showtimeTimer) clearInterval(this.showtimeTimer);
    this.endTimer = this.exprTimer = null;
    this.showtimeTimer = null;
  }

  // ---------------------------------------------------------------- outputs

  private setExpression(expression: Expression): void {
    this.store.set({ expression });
    if (this.exprTimer) clearTimeout(this.exprTimer);
    this.exprTimer = setTimeout(() => {
      const s = this.store.get();
      if (s.buddy === 'speaking' || s.buddy === 'idle') this.store.set({ expression: 'happy' });
    }, 1600);
  }

  private transcript(id: string, speaker: 'buddy' | 'child', text: string, final: boolean): void {
    this.bus.sendEvent({ kind: 'transcript', id, speaker, text, final });
    const items = this.feed.get().items.filter((i) => i.id !== id);
    items.push({ id, kind: 'transcript', speaker, text, final, at: Date.now() });
    this.feed.set({ items: items.slice(-80) });
  }

  private alert(level: 'info' | 'warn' | 'danger', code: AlertCode, message: string): void {
    if (level !== 'info') this.stats.alerts++;
    const event: StageEvent = { kind: 'alert', level, code, message, at: Date.now() };
    this.bus.sendEvent(event);
    const items = [...this.feed.get().items, { id: `a${Date.now()}${Math.random()}`, kind: 'alert' as const, level, text: message, at: Date.now() }];
    this.feed.set({ items: items.slice(-80) });
  }

  private broadcastState(): void {
    const s = this.store.get();
    this.bus.sendEvent({
      kind: 'state',
      buddy: s.buddy,
      activity: s.activity,
      elapsedMs: this.timekeeper?.elapsedMs() ?? 0,
      child: s.child,
      buddyMuted: s.buddyMuted,
      micOn: s.micOn,
      cameraOn: s.cameraOn,
      micLevel: s.inSession ? this.micMeter.level() : 0,
      inSession: s.inSession,
    });
  }

  toggleDrawer(): void {
    this.store.set({ drawerOpen: !this.store.get().drawerOpen });
  }

  private freshStats(): SessionStats {
    return {
      sessionId: 'pending',
      model: 'unknown',
      durationMs: 0,
      endReason: 'completed',
      childTurns: 0,
      buddyTurns: 0,
      nudges: 0,
      interventions: 0,
      identify: 'unknown',
      guardrailTrips: 0,
      alerts: 0,
      latencyMsP50: null,
      latencyMsP95: null,
      images: 0,
    };
  }
}

function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return Math.round(sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]);
}

function cleanName(s: string): string {
  return s.replace(/[^\p{L}\s'-]/gu, '').trim().slice(0, 40) || 'friend';
}
