import { useEffect, useMemo, useRef } from 'react';
import type { Activity, ControlCommand } from '@shared/types';
import { useStore } from '../shared/store';
import { SessionController } from './session/sessionController';
import { Zuzu } from './character/Zuzu';
import { Celebration } from './character/Celebration';

const SKIP_KEYS: Record<string, Activity> = { '1': 'choices', '2': 'family', '3': 'show_and_tell', '4': 'what_is_ai' };

export function StageApp() {
  const controller = useMemo(() => new SessionController(), []);
  const s = useStore(controller.store);
  const feed = useStore(controller.feed);
  const camHolder = useRef<HTMLDivElement>(null);

  useEffect(() => controller.init(), [controller]);

  useEffect(() => {
    document.title = `${s.buddyName} · Stage`;
  }, [s.buddyName]);

  // Mount the shared camera <video> as Zuzu's little "eye" preview.
  useEffect(() => {
    const holder = camHolder.current;
    if (holder && !holder.contains(controller.camera.video)) holder.appendChild(controller.camera.video);
  }, [controller]);

  // Facilitator hotkeys (LLD §13.2)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const st = controller.store.get();
      let cmd: ControlCommand | null = null;
      if (e.code === 'Space') cmd = st.inSession ? { kind: 'nudge' } : { kind: 'start' };
      else if (e.key === 'Escape') cmd = { kind: 'kill' };
      else if (e.key === 'e' || e.key === 'E') cmd = { kind: 'end' };
      else if (e.key === 'm' || e.key === 'M') cmd = { kind: 'mute-buddy', muted: !st.buddyMuted };
      else if (e.key === 'c' || e.key === 'C') cmd = { kind: 'camera', enabled: !st.cameraOn };
      else if (e.key === 'r' || e.key === 'R') cmd = { kind: 'reset' };
      else if (SKIP_KEYS[e.key]) cmd = { kind: 'skip-to', activity: SKIP_KEYS[e.key] };
      else if (e.key === '`') {
        controller.toggleDrawer();
        e.preventDefault();
        return;
      }
      if (cmd) {
        e.preventDefault();
        void controller.handle(cmd);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [controller]);

  const levels = useMemo(
    () => ({ mouth: () => controller.mouthMeter.level(), mic: () => controller.micMeter.level() }),
    [controller],
  );

  const greeting =
    s.child && s.inSession && (s.activity === 'name' || s.activity === 'choices') ? `Hi, ${s.child.firstName}!` : null;

  const canStart = !s.inSession && !s.celebrating && (s.buddy === 'sleeping' || s.buddy === 'waking' || s.buddy === 'resting');
  const startFromStage = () => {
    if (canStart) void controller.handle({ kind: 'start' });
  };

  return (
    <div className={`stage stage--${s.buddy}`}>
      <div className="stage-sky" aria-hidden />

      <div className={`cam-eye ${s.cameraOn ? '' : 'cam-eye--off'}`} title="Zuzu's camera">
        <div ref={camHolder} className="cam-eye-video" />
        {!s.cameraOn && <span className="cam-eye-off">📷</span>}
      </div>

      <main className={`stage-center ${canStart ? 'can-start' : ''}`} onClick={startFromStage}>
        <Zuzu state={s.buddy} expression={s.expression} reaction={s.reaction} sparkleAt={s.sparkleAt} levels={levels} />
        <div className="stage-caption" aria-live="polite">
          {greeting ?? (s.buddy === 'resting' ? `${s.buddyName} is resting` : s.buddy === 'connecting' ? '…' : ' ')}
        </div>
      </main>

      {canStart && !s.needsActivation && (
        <div className="stage-hint">Facilitator: press Space or click {s.buddyName} to start · ` for the transcript</div>
      )}

      <Celebration active={s.celebrating} name={s.badgeName} />

      {s.needsActivation && (
        <button className="activate" onClick={() => void controller.activate()}>
          <span className="activate-title">Click to get {s.buddyName} ready</span>
          <span className="activate-sub">(for the facilitator: this turns on the speaker and camera)</span>
        </button>
      )}

      {s.mediaError && !s.needsActivation && <div className="stage-note">{s.mediaError}</div>}

      {s.drawerOpen && (
        <aside className="drawer">
          <div className="drawer-head">
            <strong>Facilitator</strong>
            <span>
              {s.buddy} · {s.activity ?? '—'} · {s.child?.firstName ?? 'no child yet'}
            </span>
            <span className="drawer-keys">Space start/nudge · Esc stop · E end · M mute · C camera · 1–4 skip · R reset · ` hide</span>
          </div>
          <div className="drawer-feed">
            {feed.items.map((i) =>
              i.kind === 'alert' ? (
                <div key={i.id} className={`feed-alert feed-alert--${i.level}`}>
                  {i.text}
                </div>
              ) : (
                <div key={i.id} className={`feed-line feed-line--${i.speaker}`}>
                  <b>{i.speaker === 'buddy' ? s.buddyName : 'Child'}:</b> {i.text}
                </div>
              ),
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
