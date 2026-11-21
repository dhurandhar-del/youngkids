import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChildInput, ChildProfile, ControlCommand, HealthResponse, SessionStats } from '@zuzu/shared/types';
import { api, ApiError, setPin } from '../shared/api';
import { ControlBus } from '../shared/controlBus';
import { ChildForm } from './ChildForm';
import { RosterList } from './RosterList';
import { LivePanel, type Alert, type Line, type LiveState } from './LivePanel';

export function ConsoleApp() {
  const bus = useMemo(() => new ControlBus(), []);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [editing, setEditing] = useState<ChildProfile | 'new' | null>(null);
  const [live, setLive] = useState<LiveState | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [lastStats, setLastStats] = useState<SessionStats | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [, forceTick] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      setChildren(await api.listChildren());
    } catch (e) {
      if (e instanceof ApiError && e.code === 'pin_required') {
        const pin = window.prompt('Console PIN');
        if (pin) {
          setPin(pin);
          void refresh();
        }
      }
    }
  }, []);

  useEffect(() => {
    document.title = 'Zuzu · Console';
    api
      .health()
      .then((h) => {
        setHealth(h);
        document.title = `${h.buddyName} · Console`;
      })
      .catch(() => setHealthError('Cannot reach the server. Is `npm run dev` / `npm start` running?'));
    void refresh();
  }, [refresh]);

  // Stage → Console events
  useEffect(() => {
    const off = bus.onEvent((e) => {
      if (e.kind === 'state') setLive({ ...e, seenAt: Date.now() });
      else if (e.kind === 'transcript')
        setLines((ls) => {
          const rest = ls.filter((l) => l.id !== e.id);
          return [...rest, { id: e.id, speaker: e.speaker, text: e.text, final: e.final }].slice(-120);
        });
      else if (e.kind === 'alert')
        setAlerts((as) => [...as, { id: `${e.at}-${Math.random()}`, level: e.level, message: e.message, at: e.at }].slice(-50));
      else if (e.kind === 'session-ended') {
        setLastStats(e.stats);
        setLines([]); // wipe transcript at session end (FR-43)
        void refresh();
      } else if (e.kind === 'clear') setLines([]);
    });
    bus.sendCommand({ kind: 'ping' });
    const t = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => {
      off();
      clearInterval(t);
    };
  }, [bus, refresh]);

  const send = (c: ControlCommand) => bus.sendCommand(c);

  const openStage = () => {
    window.open('/stage', 'zuzu-stage', 'popup,width=1280,height=800');
  };

  const save = async (input: ChildInput) => {
    if (editing && editing !== 'new') await api.updateChild(editing.id, input);
    else await api.createChild(input);
    setEditing(null);
    await refresh();
  };

  const startWith = async (c?: ChildProfile) => {
    const target = c ?? children.find((x) => x.upNext);
    if (target && !target.upNext) await api.patchChild(target.id, { upNext: true });
    setAlerts([]);
    send({ kind: 'start', expectedChildId: target?.id });
    void refresh();
  };

  const importCsv = async (file: File) => {
    const text = await file.text();
    const r = await api.importCsv(text);
    setNotice(
      `Imported ${r.created} child${r.created === 1 ? '' : 'ren'}` +
        (r.duplicates ? `; ${r.duplicates} already on the list (skipped)` : '') +
        (r.errors.length ? `; ${r.errors.length} row(s) with problems: ${r.errors.map((e) => `row ${e.row}: ${e.message}`).join(' | ')}` : '') +
        '.',
    );
    await refresh();
  };

  const deleteAll = async () => {
    if (!window.confirm("Delete ALL children's data from this laptop? This cannot be undone.")) return;
    const r = await api.deleteAll();
    setNotice(`Deleted ${r.deleted} record(s).`);
    await refresh();
  };

  const inSession = Boolean(live?.inSession && Date.now() - live.seenAt < 2500);
  const upNext = children.find((c) => c.upNext);

  return (
    <div className="console">
      <header className="console-head">
        <div className="brand">
          <span className="brand-dot" />
          <div>
            <h1>{health?.buddyName ?? 'Zuzu'} · Facilitator Console</h1>
            <span className="muted">
              {health?.orgName ?? ''} {health ? `· ${health.model} · voice ${health.voice}` : ''}
            </span>
          </div>
        </div>
      </header>

      {healthError && <div className="banner banner--danger">{healthError}</div>}
      {health && !health.hasApiKey && <div className="banner banner--danger">OPENAI_API_KEY is missing in .env. Sessions cannot start.</div>}
      {health && !health.zdrConfirmed && (
        <div className="banner banner--warn">
          <b>Rehearsal mode.</b> Zero Data Retention is not confirmed (ZDR_CONFIRMED=false). Rehearse with adults only. Do not run sessions with
          real children until OpenAI has approved ZDR for this project.
        </div>
      )}
      {notice && (
        <div className="banner banner--info" onClick={() => setNotice(null)}>
          {notice}
        </div>
      )}

      <div className="console-grid">
        <section className="roster-col">
          <div className="card">
            <div className="section-head">
              <h2>Today's children ({children.length})</h2>
              <div className="section-actions">
                <button className="primary small" onClick={() => setEditing('new')}>
                  + Add child
                </button>
                <button className="small" onClick={() => fileRef.current?.click()}>
                  Import CSV
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void importCsv(f);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>
            {upNext && !inSession && (
              <p className="muted">
                Up next: <b>{upNext.firstName}</b>. Ask them: “Do you want to talk to the computer helper? You can stop whenever you want.”
              </p>
            )}
            {editing && (
              <ChildForm initial={editing === 'new' ? undefined : editing} onSave={save} onCancel={() => setEditing(null)} />
            )}
            <RosterList
              items={children}
              inSession={inSession}
              currentChildId={live?.child?.id}
              onEdit={(c) => setEditing(c)}
              onDelete={async (c) => {
                if (window.confirm(`Delete ${c.firstName}?`)) {
                  await api.deleteChild(c.id);
                  await refresh();
                }
              }}
              onUpNext={async (c) => {
                await api.patchChild(c.id, { upNext: true });
                await refresh();
              }}
              onStart={(c) => void startWith(c)}
              onIdentify={(c) => send({ kind: 'identify', childId: c.id })}
              onToggleDone={async (c) => {
                await api.patchChild(c.id, { status: c.status === 'done' ? 'waiting' : 'done' });
                await refresh();
              }}
            />
          </div>
          <div className="card privacy">
            <strong>Privacy</strong>
            <p className="muted">
              Children's details stay on this laptop and are deleted automatically within 24 hours. No audio, video or transcript is ever saved.
            </p>
            <button className="danger small" onClick={() => void deleteAll()}>
              Delete all children's data now
            </button>
          </div>
        </section>

        <LivePanel
          buddyName={health?.buddyName ?? 'Zuzu'}
          live={live}
          lines={lines}
          alerts={alerts}
          lastStats={lastStats}
          send={send}
          onOpenStage={openStage}
          onStart={() => void startWith()}
          onClearAlerts={() => setAlerts([])}
        />
      </div>
    </div>
  );
}
