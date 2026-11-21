import type { BuddyState, Expression } from '@shared/types';
import { useCharacterLife } from './useCharacterLife';

export const PALETTE = {
  body: '#FFB86B',
  belly: '#FFD9AE',
  ink: '#1F2A44',
  cheek: '#FF8FA3',
  mouth: '#7A2E3A',
  tongue: '#FF7A8A',
  listening: '#0072B2',
  thinking: '#E69F00',
  speaking: '#009E73',
  idle: '#FFD166',
};

const STATE_COLOR: Partial<Record<BuddyState, string>> = {
  listening: PALETTE.listening,
  thinking: PALETTE.thinking,
  connecting: PALETTE.thinking,
  speaking: PALETTE.speaking,
  celebrating: PALETTE.speaking,
};

interface Props {
  state: BuddyState;
  expression: Expression;
  reaction: { kind: 'wave' | 'cheer' | 'smile'; at: number } | null;
  sparkleAt: number;
  levels: { mouth: () => number; mic: () => number };
}

/**
 * Zuzu: a round, soft, non-human cartoon creature (PRD §9, LLD §8).
 * Big eyes set slightly low, rosy cheeks, no sharp shapes, an antenna bulb that shows the state.
 */
export function Zuzu({ state, expression, reaction, sparkleAt, levels }: Props) {
  const life = useCharacterLife(state, levels);
  const now = Date.now();
  const waving = reaction && now - reaction.at < 1800 && reaction.kind !== 'smile';
  const sparkling = now - sparkleAt < 1600;
  const asleep = state === 'sleeping' || state === 'resting';

  // Pose
  const lean = state === 'listening' ? 1.03 + life.mic * 0.03 : state === 'connecting' ? 0.98 : 1;
  const hop = state === 'celebrating' ? Math.abs(Math.sin(life.t * 5)) * -18 : waving && reaction?.kind === 'cheer' ? Math.abs(Math.sin(life.t * 8)) * -10 : 0;
  const tilt = state === 'thinking' ? -5 : state === 'listening' ? 3 : life.tilt;

  // Gaze: up-and-away when thinking (research: averted gaze reads as "thinking"), else at the child
  const gaze =
    state === 'thinking' || state === 'connecting'
      ? { x: 9, y: -11 }
      : { x: life.drift.x, y: life.drift.y + (state === 'listening' ? 2 : 0) };

  // Brows
  const browLift =
    state === 'listening' || expression === 'curious' || expression === 'excited' || expression === 'oops' ? -10 : expression === 'sympathetic' ? -4 : 0;

  const eyeScaleY = asleep ? 0 : Math.max(0.06, 1 - life.lid);
  const eyeWide = expression === 'excited' || expression === 'oops' || state === 'listening' ? 1.06 : 1;
  const bulb = STATE_COLOR[state] ?? PALETTE.idle;
  const bulbPulse = state === 'thinking' ? 0.6 + 0.4 * Math.abs(Math.sin(life.t * 3)) : state === 'speaking' ? 0.7 + life.mouth * 0.3 : 0.9;

  return (
    <svg className="zuzu" viewBox="0 0 400 430" role="img" aria-label={`Zuzu is ${state}`}>
      <defs>
        <radialGradient id="bodyShade" cx="40%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#FFD29A" />
          <stop offset="70%" stopColor={PALETTE.body} />
          <stop offset="100%" stopColor="#F59E4C" />
        </radialGradient>
        <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Listening ring pulses with the child's voice */}
      {state === 'listening' && (
        <circle
          cx="200"
          cy="245"
          r={168 + life.mic * 18}
          fill="none"
          stroke={PALETTE.listening}
          strokeWidth={6 + life.mic * 6}
          opacity={0.35 + life.mic * 0.55}
        />
      )}

      {/* Shadow */}
      <ellipse cx="200" cy="405" rx={110 - hop * 0.8} ry="14" fill={PALETTE.ink} opacity="0.12" />

      <g transform={`translate(0 ${hop}) rotate(${tilt} 200 390) translate(200 392) scale(${lean} ${lean * (1 + life.breath)}) translate(-200 -392)`}>
        {/* Antenna */}
        <path d="M200 96 C 198 70, 210 58, 222 46" fill="none" stroke={PALETTE.ink} strokeWidth="6" strokeLinecap="round" />
        <circle cx="224" cy="40" r="15" fill={bulb} stroke={PALETTE.ink} strokeWidth="5" opacity={bulbPulse} filter="url(#glow)" />

        {/* Arms (the right one waves) */}
        <ellipse cx="66" cy="282" rx="22" ry="34" fill={PALETTE.body} stroke={PALETTE.ink} strokeWidth="6" transform="rotate(20 66 282)" />
        <g transform={waving ? `rotate(${-50 + 25 * Math.sin(life.t * 14)} 330 262)` : undefined}>
          <ellipse cx="334" cy="282" rx="22" ry="34" fill={PALETTE.body} stroke={PALETTE.ink} strokeWidth="6" transform="rotate(-20 334 282)" />
        </g>

        {/* Feet */}
        <ellipse cx="158" cy="388" rx="34" ry="16" fill={PALETTE.body} stroke={PALETTE.ink} strokeWidth="6" />
        <ellipse cx="242" cy="388" rx="34" ry="16" fill={PALETTE.body} stroke={PALETTE.ink} strokeWidth="6" />

        {/* Body: soft superellipse */}
        <path
          d="M200 92 C 300 92, 342 160, 342 252 C 342 342, 292 388, 200 388 C 108 388, 58 342, 58 252 C 58 160, 100 92, 200 92 Z"
          fill="url(#bodyShade)"
          stroke={PALETTE.ink}
          strokeWidth="6"
        />
        <ellipse cx="200" cy="318" rx="82" ry="52" fill={PALETTE.belly} opacity="0.75" />

        {/* Cheeks */}
        <ellipse cx="116" cy="280" rx="22" ry="13" fill={PALETTE.cheek} opacity={expression === 'excited' || expression === 'happy' ? 0.6 : 0.35} />
        <ellipse cx="284" cy="280" rx="22" ry="13" fill={PALETTE.cheek} opacity={expression === 'excited' || expression === 'happy' ? 0.6 : 0.35} />

        {/* Brows: soft arcs only */}
        {!asleep && (
          <g transform={`translate(0 ${browLift})`} style={{ transition: 'transform 220ms ease-out' }}>
            <path d={expression === 'sympathetic' ? 'M128 176 Q152 166 178 172' : 'M128 172 Q153 160 178 172'} fill="none" stroke={PALETTE.ink} strokeWidth="6" strokeLinecap="round" />
            <path d={expression === 'sympathetic' ? 'M222 172 Q248 166 272 176' : 'M222 172 Q247 160 272 172'} fill="none" stroke={PALETTE.ink} strokeWidth="6" strokeLinecap="round" />
          </g>
        )}

        {/* Eyes */}
        {asleep ? (
          <g>
            <path d="M124 230 Q153 248 182 230" fill="none" stroke={PALETTE.ink} strokeWidth="6" strokeLinecap="round" />
            <path d="M218 230 Q247 248 276 230" fill="none" stroke={PALETTE.ink} strokeWidth="6" strokeLinecap="round" />
          </g>
        ) : (
          [153, 247].map((cx) => (
            <g key={cx} transform={`translate(${cx} 228) scale(${eyeWide} ${eyeScaleY * eyeWide}) translate(${-cx} -228)`}>
              <ellipse cx={cx} cy="228" rx="34" ry="38" fill="#FFFFFF" stroke={PALETTE.ink} strokeWidth="5" />
              <circle cx={cx + gaze.x} cy={228 + gaze.y} r="20" fill={PALETTE.ink} style={{ transition: 'cx 200ms ease-out, cy 200ms ease-out' }} />
              <circle cx={cx + gaze.x + 7} cy={228 + gaze.y - 8} r="7" fill="#FFFFFF" />
              <circle cx={cx + gaze.x - 6} cy={228 + gaze.y + 7} r="3" fill="#FFFFFF" />
            </g>
          ))
        )}

        {/* Mouth */}
        <Mouth state={state} expression={expression} level={life.mouth} />
      </g>

      {/* Thinking dots */}
      {(state === 'thinking' || state === 'connecting') &&
        [0, 1, 2].map((i) => (
          <circle
            key={i}
            cx={300 + i * 26}
            cy={118 - i * 24 + Math.sin(life.t * 4 + i) * 5}
            r={9 + i * 3}
            fill={PALETTE.thinking}
            stroke={PALETTE.ink}
            strokeWidth="4"
            opacity={0.5 + 0.5 * Math.abs(Math.sin(life.t * 3 + i))}
          />
        ))}

      {/* Sleeping Zzz */}
      {state === 'sleeping' &&
        [0, 1, 2].map((i) => {
          const phase = (life.t * 0.5 + i / 3) % 1;
          return (
            <text
              key={i}
              x={270 + phase * 60}
              y={130 - phase * 90}
              fontSize={26 + i * 8}
              fontWeight="800"
              fill={PALETTE.ink}
              opacity={1 - phase}
              fontFamily="inherit"
            >
              z
            </text>
          );
        })}

      {/* Sparkles at the name reveal */}
      {sparkling &&
        [
          [70, 110],
          [340, 120],
          [60, 340],
          [350, 330],
          [200, 60],
        ].map(([x, y], i) => <Star key={i} x={x} y={y} s={0.6 + 0.6 * Math.abs(Math.sin(life.t * 6 + i))} />)}
    </svg>
  );
}

function Mouth({ state, expression, level }: { state: BuddyState; expression: Expression; level: number }) {
  const ink = PALETTE.ink;
  if (state === 'sleeping' || state === 'resting') {
    return <path d="M186 296 Q200 302 214 296" fill="none" stroke={ink} strokeWidth="6" strokeLinecap="round" />;
  }
  if ((state === 'speaking' || state === 'celebrating') && level > 0.04) {
    // Jaw opening quantised to 4 levels so it reads like cartoon visemes
    const q = Math.ceil(level * 4) / 4;
    const w = 24 + q * 8;
    const h = 12 + q * 34;
    const round = expression === 'oops' ? 0.6 : 1;
    return (
      <g>
        <path
          d={`M${200 - w * round} 290 Q200 284 ${200 + w * round} 290 Q200 ${290 + h * 2} ${200 - w * round} 290 Z`}
          fill={PALETTE.mouth}
          stroke={ink}
          strokeWidth="5"
          strokeLinejoin="round"
        />
        {q >= 0.5 && <ellipse cx="200" cy={290 + h * 0.8} rx={w * 0.45 * round} ry={h * 0.22} fill={PALETTE.tongue} />}
      </g>
    );
  }
  switch (expression) {
    case 'oops':
      return <ellipse cx="200" cy="300" rx="13" ry="16" fill={PALETTE.mouth} stroke={ink} strokeWidth="5" />;
    case 'curious':
      return <path d="M182 300 Q200 292 218 298" fill="none" stroke={ink} strokeWidth="6" strokeLinecap="round" />;
    case 'sympathetic':
      return <path d="M178 298 Q200 310 222 298" fill="none" stroke={ink} strokeWidth="6" strokeLinecap="round" />;
    case 'excited':
      return (
        <path d="M168 288 Q200 288 232 288 Q228 326 200 326 Q172 326 168 288 Z" fill={PALETTE.mouth} stroke={ink} strokeWidth="5" strokeLinejoin="round" />
      );
    case 'calm':
      return <path d="M178 292 Q200 306 222 292" fill="none" stroke={ink} strokeWidth="6" strokeLinecap="round" />;
    default:
      return <path d="M170 288 Q200 318 230 288" fill="none" stroke={ink} strokeWidth="6" strokeLinecap="round" />;
  }
}

function Star({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 -16 C 3 -4, 4 -3, 16 0 C 4 3, 3 4, 0 16 C -3 4, -4 3, -16 0 C -4 -3, -3 -4, 0 -16 Z"
      fill={PALETTE.idle}
      stroke={PALETTE.ink}
      strokeWidth="3"
      strokeLinejoin="round"
    />
  );
}
