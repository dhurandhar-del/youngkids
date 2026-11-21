import { useState, type FormEvent } from 'react';
import { CLASS_LEVELS, LANGUAGES, type ChildInput, type ChildProfile, type ClassLevel, type GrownUp, type Language } from '@zuzu/shared/types';

const emptyGrownUp = (calledBy = ''): GrownUp => ({ calledBy, firstName: '', job: '', jobInSimpleWords: '' });

interface Props {
  initial?: ChildProfile;
  onSave(input: ChildInput): Promise<void>;
  onCancel(): void;
}

/** Registration form (PRD FR-1–FR-3). Collects only what Zuzu needs; no surnames, schools or contact details. */
export function ChildForm({ initial, onSave, onCancel }: Props) {
  const [firstName, setFirstName] = useState(initial?.firstName ?? '');
  const [nickname, setNickname] = useState(initial?.nickname ?? '');
  const [className, setClassName] = useState<ClassLevel>(initial?.className ?? 'Class 1');
  const [age, setAge] = useState(initial?.age ? String(initial.age) : '');
  const [language, setLanguage] = useState<Language>(initial?.language ?? 'English');
  const [grownUps, setGrownUps] = useState<GrownUp[]>(
    initial?.grownUps?.length ? initial.grownUps.map((g) => ({ ...emptyGrownUp(), ...g })) : [emptyGrownUp('Mummy')],
  );
  const [likes, setLikes] = useState((initial?.likes ?? []).join(', '));
  const [avoidTopics, setAvoidTopics] = useState(initial?.avoidTopics ?? '');
  const [consent, setConsent] = useState(Boolean(initial?.consent?.parentConsent));
  const [verifiedBy, setVerifiedBy] = useState(initial?.consent?.verifiedBy ?? '');
  const [cameraAllowed, setCameraAllowed] = useState(initial?.consent?.cameraAllowed ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setGrownUp = (i: number, patch: Partial<GrownUp>) => setGrownUps((gs) => gs.map((g, j) => (j === i ? { ...g, ...patch } : g)));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!consent) return setError('Parent consent is required before a child can take part.');
    const input = {
      firstName,
      nickname: nickname || undefined,
      className,
      age: age ? Number(age) : undefined,
      language,
      grownUps: grownUps
        .filter((g) => g.calledBy.trim() || g.job.trim())
        .map((g) => ({
          calledBy: g.calledBy,
          firstName: g.firstName || undefined,
          job: g.job,
          jobInSimpleWords: g.jobInSimpleWords || undefined,
        })),
      likes: likes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 3),
      avoidTopics: avoidTopics || undefined,
      consent: { parentConsent: true as const, verifiedBy, cameraAllowed, noticeVersion: 'v1' },
    } satisfies ChildInput;
    setSaving(true);
    try {
      await onSave(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card form" onSubmit={submit}>
      <h3>{initial ? `Edit ${initial.firstName}` : 'Add a child'}</h3>

      <div className="row">
        <label>
          First name *
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required maxLength={40} autoFocus />
        </label>
        <label>
          Pet name (optional)
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={40} placeholder="e.g. Chintu" />
        </label>
      </div>

      <div className="row">
        <label>
          Class *
          <select value={className} onChange={(e) => setClassName(e.target.value as ClassLevel)}>
            {CLASS_LEVELS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Age
          <input type="number" min={5} max={9} value={age} onChange={(e) => setAge(e.target.value)} />
        </label>
        <label>
          Language
          <select value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
            {LANGUAGES.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
      </div>

      <fieldset>
        <legend>Grown-ups (what Zuzu can talk about)</legend>
        {grownUps.map((g, i) => (
          <div className="row" key={i}>
            <label>
              Child calls them *
              <input value={g.calledBy} onChange={(e) => setGrownUp(i, { calledBy: e.target.value })} placeholder="Mummy / Papa / Nani" maxLength={20} />
            </label>
            <label>
              First name
              <input value={g.firstName ?? ''} onChange={(e) => setGrownUp(i, { firstName: e.target.value })} maxLength={40} />
            </label>
            <label>
              Job *
              <input value={g.job} onChange={(e) => setGrownUp(i, { job: e.target.value })} placeholder="doctor" maxLength={60} />
            </label>
            <label className="grow">
              Job in kid words
              <input
                value={g.jobInSimpleWords ?? ''}
                onChange={(e) => setGrownUp(i, { jobInSimpleWords: e.target.value })}
                placeholder="helps sick people get better"
                maxLength={80}
              />
            </label>
            {grownUps.length > 1 && (
              <button type="button" className="ghost" onClick={() => setGrownUps((gs) => gs.filter((_, j) => j !== i))} aria-label="Remove grown-up">
                ✕
              </button>
            )}
          </div>
        ))}
        {grownUps.length < 2 && (
          <button type="button" className="ghost" onClick={() => setGrownUps((gs) => [...gs, emptyGrownUp('Papa')])}>
            + Add another grown-up
          </button>
        )}
      </fieldset>

      <div className="row">
        <label className="grow">
          Likes (up to 3, comma separated)
          <input value={likes} onChange={(e) => setLikes(e.target.value)} placeholder="dinosaurs, cricket, drawing" />
        </label>
      </div>
      <div className="row">
        <label className="grow">
          Topics Zuzu must NOT bring up (optional, kept short and neutral)
          <input value={avoidTopics} onChange={(e) => setAvoidTopics(e.target.value)} placeholder="e.g. don't ask about grandfather" maxLength={200} />
        </label>
      </div>

      <fieldset className="consent">
        <legend>Consent</legend>
        <label className="check">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          A parent/guardian signed the consent form and I checked who they are
        </label>
        <div className="row">
          <label>
            Checked by (staff name) *
            <input value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} maxLength={60} required />
          </label>
          <label className="check">
            <input type="checkbox" checked={cameraAllowed} onChange={(e) => setCameraAllowed(e.target.checked)} />
            Camera allowed (untick for voice-only)
          </label>
        </div>
      </fieldset>

      {error && <div className="error">{error}</div>}
      <div className="actions">
        <button type="button" className="ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
