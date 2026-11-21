import type { ChildProfile } from '@zuzu/shared/types';

interface Props {
  items: ChildProfile[];
  inSession: boolean;
  currentChildId?: string;
  onEdit(c: ChildProfile): void;
  onDelete(c: ChildProfile): void;
  onUpNext(c: ChildProfile): void;
  onStart(c: ChildProfile): void;
  onIdentify(c: ChildProfile): void;
  onToggleDone(c: ChildProfile): void;
}

export function RosterList(p: Props) {
  if (!p.items.length) {
    return <p className="muted">No children yet. Add them with the form or import a CSV.</p>;
  }
  return (
    <ul className="roster">
      {p.items.map((c) => (
        <li key={c.id} className={`roster-item ${c.upNext ? 'is-next' : ''} ${c.status === 'done' ? 'is-done' : ''} ${p.currentChildId === c.id ? 'is-current' : ''}`}>
          <div className="roster-main">
            <div className="roster-name">
              {c.firstName}
              {c.nickname && <span className="muted"> “{c.nickname}”</span>}
              {c.upNext && <span className="tag tag--next">Up next</span>}
              {c.status === 'done' && <span className="tag">Done</span>}
              {!c.consent.cameraAllowed && <span className="tag tag--warn">Voice only</span>}
            </div>
            <div className="roster-meta">
              {[c.className, c.language].filter(Boolean).join(' · ')} · {c.grownUps.map((g) => `${g.calledBy}: ${g.job}`).join(' · ')}
            </div>
          </div>
          <div className="roster-actions">
            {p.inSession ? (
              <button onClick={() => p.onIdentify(c)} title="Tell Zuzu this is the child in front of it">
                This is them
              </button>
            ) : (
              <>
                <button className="primary small" onClick={() => p.onStart(c)} title="Mark up next and start">
                  ▶ Start
                </button>
                {!c.upNext && <button onClick={() => p.onUpNext(c)}>Up next</button>}
              </>
            )}
            <button className="ghost" onClick={() => p.onToggleDone(c)}>
              {c.status === 'done' ? 'Undo done' : 'Done'}
            </button>
            <button className="ghost" onClick={() => p.onEdit(c)}>
              Edit
            </button>
            <button className="ghost danger" onClick={() => p.onDelete(c)} aria-label={`Delete ${c.firstName}`}>
              ✕
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
