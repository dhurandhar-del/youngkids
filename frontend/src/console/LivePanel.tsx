import { useEffect, useRef } from 'react';
import type { Activity, ControlCommand, SessionStats, StageEvent } from '@zuzu/shared/types';

export type LiveState = Extract<StageEvent, { kind: 'state' }> & { seenAt: number };
export interface Line {
  id: string;
  speaker: 'buddy' | 'child';
  text: string;
  final: boolean;
}
export interface Alert {
  id: string;
  level: 'info' | 'warn' | 'danger';
  message: string;
  at: number;
}

interface Props {
  buddyName: string;
  live: LiveState | null;
  lines: Line[];
  alerts: Alert[];
  lastStats: SessionStats | null;
  send(c: ControlCommand): void;
  onOpenStage(): void;
  onStart(): void;
  onClearAlerts(): void;
}

const SKIPS: { a: Activity; label: string }[] = [
  { a: 'choices', label: 'Think game' },
  { a: 'family', label: 'Family' },
  { a: 'show_and_tell', label: 'Show & tell' },
  { a: 'what_is_ai', label: 'AI: what & how to use' },
  { a: 'goodbye', label: 'Goodbye' },
];

const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;

export function LivePanel({ buddyName, live, lines, alerts, lastStats, send, onOpenStage, onStart, onClearAlerts }: Props) {
  const stageConnected = Boolean(live && Date.now() - live.seenAt < 2500);
  const inSession = Boolean(live?.inSession);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight });
  }, [lines]);

  return (
    <section className="live">
      <div className="card live-status">
        <div className="live-row">
          <span className={`dot ${stageConnected ? 'dot--ok' : 'dot--off'}`} />
          <strong>{stageConnected ? 'Stage connected' : 'Stage not open'}</strong>
          {!stageConnected && (
            <button className="primary small" onClick={onOpenStage}>
              Open Stage
            </button>
          )}
          {live && stageConnected && (
            <span className="muted">
              {buddyName} is <b>{live.buddy}</b>
              {live.activity ? ` · ${live.activity.replaceAll('_', ' ')}` : ''}
              {live.child ? ` · with ${live.child.firstName}` : ''}
              {inSession ? ` · ${fmt(live.elapsedMs)}` : ''}
            </span>
          )}
        </div>
        {inSession && (
          <div className="meter" title="Child's mic level">
            <div className="meter-fill" style={{ width: `${Math.round((live?.micLevel ?? 0) * 100)}%` }} />
          </div>
        )}

        <div className="controls">
          {!inSession ? (
            <button className="primary big" disabled={!stageConnected} onClick={onStart}>
              ▶ Start session
            </button>
          ) : (
            <>
              <button className="danger big" onClick={() => send({ kind: 'kill' })} title="Stops instantly (Esc on Stage)">
                ■ STOP NOW
              </button>
              <button onClick={() => send({ kind: 'end' })}>Say goodbye</button>
              <button onClick={() => send({ kind: 'nudge' })}>Nudge reply</button>
            </>
          )}
          <button disabled={!stageConnected} onClick={() => send({ kind: 'mute-buddy', muted: !live?.buddyMuted })}>
            {live?.buddyMuted ? 'Unmute Zuzu' : 'Mute Zuzu'}
          </button>
          <button disabled={!stageConnected} onClick={() => send({ kind: 'mic', enabled: !live?.micOn })}>
            {live?.micOn === false ? 'Mic on' : 'Pause mic'}
          </button>
          <button disabled={!stageConnected} onClick={() => send({ kind: 'camera', enabled: !live?.cameraOn })}>
            {live?.cameraOn ? 'Camera off' : 'Camera on'}
          </button>
          <button className="ghost" disabled={!stageConnected || inSession} onClick={() => send({ kind: 'reset' })}>
            Reset Stage
          </button>
        </div>
        {inSession && (
          <div className="controls skips">
            <span className="muted">Skip to:</span>
            {SKIPS.map((s) => (
              <button key={s.a} className="small" onClick={() => send({ kind: 'skip-to', activity: s.a })}>
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {alerts.length > 0 && (
        <div className="card alerts">
          <div className="alerts-head">
            <strong>Alerts</strong>
            <button className="ghost small" onClick={onClearAlerts}>
              Clear
            </button>
          </div>
          {alerts
            .slice()
            .reverse()
            .map((a) => (
              <div key={a.id} className={`feed-alert feed-alert--${a.level}`}>
                <span className="muted">{new Date(a.at).toLocaleTimeString()}</span> {a.message}
              </div>
            ))}
        </div>
      )}

      <div className="card transcript" ref={feedRef}>
        <strong>Live transcript</strong>
        <p className="muted small-print">Kept in memory only and wiped when the session ends.</p>
        {lines.length === 0 && <p className="muted">Nothing yet.</p>}
        {lines.map((l) => (
          <div key={l.id} className={`feed-line feed-line--${l.speaker} ${l.final ? '' : 'is-partial'}`}>
            <b>{l.speaker === 'buddy' ? buddyName : 'Child'}:</b> {l.text}
          </div>
        ))}
      </div>

      {lastStats && !inSession && (
        <div className="card stats">
          <strong>Last session</strong>
          <span>
            {fmt(lastStats.durationMs)} · ended: {lastStats.endReason} · child turns {lastStats.childTurns} · nudges {lastStats.nudges} · name:{' '}
            {lastStats.identify} · latency p50 {lastStats.latencyMsP50 ?? '—'} ms · snapshots {lastStats.images}
          </span>
          <span>
            <b>Your turn to explain:</b> “How did {buddyName} know your name? I typed it into the computer before you came! {buddyName} is an AI, a
            computer program people made.”
          </span>
          <span className="muted">Then ask: “Is {buddyName} alive?” and “Can {buddyName} make mistakes?”</span>
        </div>
      )}
    </section>
  );
}
