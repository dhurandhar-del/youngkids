import { useEffect, useState, type FormEvent } from 'react';
import type { HealthResponse } from '@zuzu/shared/types';
import { api, ApiError, hasPin, setPin } from '../shared/api';
import { StageApp } from '../stage/StageApp';

/**
 * Self-serve entry: each player types their name on their own laptop and Zuzu starts.
 * Laptops are independent (each runs its own realtime session), so many can play at once.
 */
export function PlayApp() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [offline, setOffline] = useState(false);
  const [name, setName] = useState('');
  const [pin, setPinInput] = useState('');
  const [needPin, setNeedPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [player, setPlayer] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Zuzu';
    api
      .health()
      .then((h) => {
        setHealth(h);
        document.title = h.buddyName;
        if (!h.pinRequired) return;
        if (!hasPin()) return setNeedPin(true);
        // A saved PIN may be out of date (PIN changed on the server): check it once and ask again if needed.
        api.listChildren().catch((err) => {
          if (err instanceof ApiError && err.code === 'pin_required') {
            setPin(null);
            setNeedPin(true);
          }
        });
      })
      .catch(() => setOffline(true));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const clean = name.replace(/\s+/g, ' ').trim();
    if (!clean) return setError('Please type your name.');
    setError(null);
    if (needPin) {
      if (!pin.trim()) return setError('Please enter the PIN.');
      setChecking(true);
      setPin(pin.trim());
      try {
        await api.listChildren(); // any PIN-protected call: checks the PIN once
        setNeedPin(false);
      } catch {
        setPin(null);
        setChecking(false);
        return setError('That PIN is not right. Ask the grown-up in charge.');
      }
      setChecking(false);
    }
    setPlayer(clean);
  };

  if (player) {
    return (
      <StageApp
        key={player}
        player={{
          name: player,
          onDone: () => {
            setPlayer(null);
            setName('');
          },
        }}
      />
    );
  }

  const buddy = health?.buddyName ?? 'Zuzu';
  return (
    <div className="stage stage--sleeping play">
      <div className="stage-sky" aria-hidden />
      <form className="play-card" onSubmit={submit}>
        <span className="brand-dot play-dot" aria-hidden />
        <h1>Hi! I'm {buddy}.</h1>
        <label htmlFor="player-name">What's your name?</label>
        <input
          id="player-name"
          autoFocus
          autoComplete="off"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Type your name"
        />
        {needPin && (
          <>
            <label htmlFor="player-pin" className="play-pin-label">
              PIN <span className="muted">(only the first time on this laptop)</span>
            </label>
            <input id="player-pin" type="password" autoComplete="off" value={pin} onChange={(e) => setPinInput(e.target.value)} />
          </>
        )}
        {error && <p className="play-error">{error}</p>}
        {health?.budget && health.budget.sessionsLeft < 1 && (
          <p className="play-error">{buddy}'s budget for today is used up. Ask the organiser.</p>
        )}
        {offline && <p className="play-error">Can't reach {buddy}'s server right now. Check the internet and reload.</p>}
        <button className="primary play-go" type="submit" disabled={checking || offline}>
          {checking ? 'Checking…' : "Let's talk!"}
        </button>
        <p className="muted play-note">
          {buddy} will use the microphone and camera. Click "Allow" when the browser asks.
          {health && !health.zdrConfirmed ? ' Rehearsal mode: adults only.' : ''}
        </p>
      </form>
    </div>
  );
}
