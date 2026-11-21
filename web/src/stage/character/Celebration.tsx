import { useEffect } from 'react';
import confetti from 'canvas-confetti';

const OKABE_ITO = ['#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7'];

/** End-of-session finale: ~2 s of confetti and an unannounced "AI Explorer" badge (same for every child). */
export function Celebration({ active, name }: { active: boolean; name: string | null }) {
  useEffect(() => {
    if (!active) return;
    const end = Date.now() + 2000;
    let raf = 0;
    const frame = () => {
      confetti({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors: OKABE_ITO, disableForReducedMotion: true });
      confetti({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors: OKABE_ITO, disableForReducedMotion: true });
      if (Date.now() < end) raf = requestAnimationFrame(frame);
    };
    frame();
    return () => {
      cancelAnimationFrame(raf);
      confetti.reset();
    };
  }, [active]);

  if (!active) return null;
  return (
    <div className="badge" role="status">
      <div className="badge-star">★</div>
      <div className="badge-title">AI Explorer</div>
      {name && <div className="badge-name">{name}</div>}
    </div>
  );
}
