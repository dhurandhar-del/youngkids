import { useEffect, useRef, useState } from 'react';
import type { BuddyState } from '@zuzu/shared/types';

export interface LifeFrame {
  /** 0 = open, 1 = closed */
  lid: number;
  /** breathing scale offset (±0.015) */
  breath: number;
  /** idle head tilt in degrees */
  tilt: number;
  /** tiny pupil drift in px */
  drift: { x: number; y: number };
  /** 0..1 mouth opening from Zuzu's voice */
  mouth: number;
  /** 0..1 child's mic level */
  mic: number;
  /** seconds since mount (for bobbing loops) */
  t: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * Signs of life (LLD §8): blink ~18/min (random 2–6 s, 150 ms, 12% doubles), 3.5 s breathing,
 * idle glances every 4–8 s, pupil drift, plus audio levels for lip-sync and the listening ring.
 */
export function useCharacterLife(
  state: BuddyState,
  levels: { mouth: () => number; mic: () => number },
): LifeFrame {
  const [frame, setFrame] = useState<LifeFrame>({ lid: 0, breath: 0, tilt: 0, drift: { x: 0, y: 0 }, mouth: 0, mic: 0, t: 0 });
  const stateRef = useRef(state);
  stateRef.current = state;
  const levelsRef = useRef(levels);
  levelsRef.current = levels;

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    let nextBlink = start + rand(2000, 6000);
    let blinkStart = -1;
    let doubleBlink = false;
    let nextIdle = start + rand(4000, 8000);
    let tiltTarget = 0;
    let tilt = 0;
    let nextDrift = start + rand(1000, 3000);
    let drift = { x: 0, y: 0 };
    let lastSet = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const st = stateRef.current;
      const t = (now - start) / 1000;

      // Blink
      let lid = 0;
      if (st === 'sleeping') lid = 1;
      else {
        if (blinkStart < 0 && now >= nextBlink) {
          blinkStart = now;
          doubleBlink = Math.random() < 0.12;
        }
        if (blinkStart >= 0) {
          const e = now - blinkStart;
          const one = (x: number) => (x < 50 ? x / 50 : x < 80 ? 1 : x < 150 ? 1 - (x - 80) / 70 : 0);
          lid = e < 150 ? one(e) : doubleBlink && e > 220 && e < 370 ? one(e - 220) : 0;
          if (e > (doubleBlink ? 380 : 160)) {
            blinkStart = -1;
            nextBlink = now + rand(2000, 6000) * (st === 'speaking' ? 0.8 : 1);
          }
        }
      }

      // Breathing (slower and deeper when asleep)
      const period = st === 'sleeping' ? 5 : 3.5;
      const breath = (st === 'sleeping' ? 0.025 : 0.015) * Math.sin((2 * Math.PI * t) / period);

      // Idle micro-actions
      if (now >= nextIdle) {
        nextIdle = now + rand(4000, 8000);
        tiltTarget = st === 'idle' || st === 'waking' ? rand(-6, 6) : 0;
      }
      if (st !== 'idle' && st !== 'waking') tiltTarget = 0;
      tilt += (tiltTarget - tilt) * 0.06;
      if (now >= nextDrift) {
        nextDrift = now + rand(1000, 3000);
        drift = { x: rand(-2, 2), y: rand(-1.5, 1.5) };
      }

      if (now - lastSet > 30) {
        lastSet = now;
        setFrame({
          lid,
          breath,
          tilt,
          drift,
          mouth: st === 'speaking' || st === 'celebrating' ? levelsRef.current.mouth() : 0,
          mic: st === 'listening' ? levelsRef.current.mic() : 0,
          t,
        });
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return frame;
}
