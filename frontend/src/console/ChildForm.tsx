import { useState, type FormEvent } from 'react';
import { CLASS_LEVELS, LANGUAGES, type ChildInput, type ChildProfile, type ClassLevel, type GrownUp, type Language } from '@zuzu/shared/types';

interface Props {
  initial?: ChildProfile;
  onSave(input: ChildInput): Promise<void>;
  onCancel(): void;
}

interface Parent {
  name: string;
  occupation: string;
  work: string;
}

const fromGrownUp = (g?: GrownUp): Parent => ({ name: g?.firstName ?? '', occupation: g?.job ?? '', work: g?.jobInSimpleWords ?? '' });

/** Same fields as the paper form (docs/registration-form.pdf). Consent is taken in person when the session starts. */
export function ChildForm({ initial, onSave, onCancel }: Props) {
  const findParent = (calledBy: string) => initial?.grownUps.find((g) => g.calledBy.toLowerCase() === calledBy);
  const [firstName, setFirstName] = useState(initial?.firstName ?? '');
  const [lastName, setLastName] = useState(initial?.lastName ?? '');
  const [className, setClassName] = useState<ClassLevel>(initial?.className ?? 'Class 1');
  const [age, setAge] = useState(initial?.age ? String(initial.age) : '');
  const [language, setLanguage] = useState<Language>(initial?.language ?? 'English');
  const [father, setFather] = useState<Parent>(fromGrownUp(findParent('papa') ?? initial?.grownUps[1]));
  const [mother, setMother] = useState<Parent>(fromGrownUp(findParent('mummy') ?? initial?.grownUps[0]));
  const [car, setCar] = useState(initial?.car ?? '');
  const [colour, setColour] = useState(initial?.favouriteColour ?? '');
  const [holiday, setHoliday] = useState(initial?.favouriteHolidayPlace ?? '');
  const [cameraAllowed, setCameraAllowed] = useState(initial?.consent?.cameraAllowed ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toGrownUp = (calledBy: string, p: Parent): GrownUp | null =>
    p.name.trim() || p.occupation.trim() || p.work.trim()
      ? {
          calledBy,
          firstName: p.name.trim() || undefined,
          job: p.occupation.trim() || p.work.trim().split(/[.\n]/)[0].slice(0, 80) || 'not given',
          jobInSimpleWords: p.work.trim() || undefined,
        }
      : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const input = {
      firstName,
      lastName: lastName || undefined,
      ...(initial?.nickname ? { nickname: initial.nickname } : {}),
      className,
      age: age ? Number(age) : undefined,
      language,
      grownUps: [toGrownUp('Papa', father), toGrownUp('Mummy', mother)].filter((g): g is GrownUp => g !== null),
      likes: initial?.likes ?? [],
      ...(initial?.avoidTopics ? { avoidTopics: initial.avoidTopics } : {}),
      car: car || undefined,
      favouriteColour: colour || undefined,
      favouriteHolidayPlace: holiday || undefined,
      consent: { parentConsent: true as const, cameraAllowed },
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

  const parentFields = (label: string, p: Parent, set: (p: Parent) => void) => (
    <fieldset>
      <legend>{label}</legend>
      <div className="row">
        <label>
          Name
          <input value={p.name} onChange={(e) => set({ ...p, name: e.target.value })} maxLength={40} />
        </label>
        <label>
          Occupation
          <input value={p.occupation} onChange={(e) => set({ ...p, occupation: e.target.value })} placeholder="e.g. doctor" maxLength={80} />
        </label>
      </div>
      <div className="row">
        <label className="grow">
          What does {label === "Father's details" ? 'he' : 'she'} do? (up to 3 lines)
          <textarea rows={3} value={p.work} onChange={(e) => set({ ...p, work: e.target.value })} maxLength={400} />
        </label>
      </div>
    </fieldset>
  );

  return (
    <form className="card form" onSubmit={submit}>
      <h3>{initial ? `Edit ${initial.firstName}` : 'Add a child'}</h3>

      <div className="row">
        <label>
          First name *
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required maxLength={40} autoFocus />
        </label>
        <label>
          Last name
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={40} />
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

      {parentFields("Father's details", father, setFather)}
      {parentFields("Mother's details", mother, setMother)}

      <div className="row">
        <label>
          Which car do you have?
          <input value={car} onChange={(e) => setCar(e.target.value)} placeholder="e.g. white Swift" maxLength={60} />
        </label>
        <label>
          Favourite colour
          <input value={colour} onChange={(e) => setColour(e.target.value)} maxLength={30} />
        </label>
        <label>
          Favourite holiday place
          <input value={holiday} onChange={(e) => setHoliday(e.target.value)} placeholder="e.g. Goa" maxLength={60} />
        </label>
      </div>

      <label className="check">
        <input type="checkbox" checked={cameraAllowed} onChange={(e) => setCameraAllowed(e.target.checked)} />
        Camera allowed (untick for voice-only)
      </label>

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
