import React from 'react';
import {interpolate, Easing} from 'remotion';
import {HEIGHT, SAFE, WIDTH} from '../timeline';
import {FONT} from './fonts';

export const C = {
  white: '#ffffff',
  cyan: '#38dcff',
  coral: '#ff6a4d',
  coralLight: '#ffb08a',
  yellow: '#ffd84a',
  navy: '#0a1530',
  ink: 'rgba(8,16,38,0.82)',
};

export type Pt = {x: number; y: number};

const clampOpts = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Opacidad de entrada/salida para un intervalo [a, b] (s). */
export const vis = (t: number, a: number, b: number, fin = 0.35, fout = 0.35) =>
  interpolate(t, [a, a + fin, b - fout, b], [0, 1, 1, 0], clampOpts);

export const easeOut = (t: number, a: number, d: number) =>
  interpolate(t, [a, a + d], [0, 1], {...clampOpts, easing: Easing.out(Easing.cubic)});

// ---------------------------------------------------------------------------
// Título principal (máx. 7 palabras). Segmentos con color opcional.
// ---------------------------------------------------------------------------
export type Seg = {text: string; color?: string; at?: number};

export const Title: React.FC<{t: number; start: number; end: number; segs: Seg[]; size?: number; top?: number}> = ({
  t,
  start,
  end,
  segs,
  size = 86,
  top = SAFE.top + 40,
}) => {
  if (t < start - 0.05 || t > end + 0.05) return null;
  const out = interpolate(t, [end - 0.35, end], [1, 0], clampOpts);
  let wordIndex = 0;
  return (
    <div
      style={{
        position: 'absolute',
        left: SAFE.left,
        top,
        width: WIDTH - SAFE.left - SAFE.right,
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.1,
        letterSpacing: -1,
        color: C.white,
        opacity: out,
        textShadow: '0 4px 18px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.6)',
      }}
    >
      {segs.map((s, si) => {
        const segStart = s.at ?? start;
        return (
          <span key={si} style={{color: s.color ?? C.white}}>
            {s.text.split(' ').map((w, wi, arr) => {
              const k = wordIndex++;
              const a = segStart + (s.at ? wi : k) * 0.07;
              const p = easeOut(t, a, 0.45);
              return (
                <span
                  key={wi}
                  style={{
                    display: 'inline-block',
                    opacity: p,
                    transform: `translateY(${(1 - p) * 34}px)`,
                    marginRight: wi < arr.length - 1 || si < segs.length - 1 ? '0.26em' : 0,
                  }}
                >
                  {w}
                </span>
              );
            })}
          </span>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Etiqueta técnica con línea guía hacia la pieza
// ---------------------------------------------------------------------------
export const clampToSafe = (p: Pt, w: number, h: number): Pt => ({
  x: Math.min(Math.max(p.x, SAFE.left), WIDTH - SAFE.right - w),
  y: Math.min(Math.max(p.y, SAFE.top + 10), HEIGHT - SAFE.bottom - h),
});

export const Label: React.FC<{
  t: number;
  start: number;
  end: number;
  anchor: Pt;
  /** posición de la esquina superior izquierda de la etiqueta (px) */
  at: Pt;
  text: string;
  color?: string;
  size?: number;
  note?: string;
  width?: number;
}> = ({t, start, end, anchor, at, text, color = C.white, size = 44, note, width}) => {
  const o = vis(t, start, end);
  if (o <= 0) return null;
  const w = width ?? text.length * size * 0.64 + 56;
  const h = size * 1.5 + (note ? size * 0.8 : 0);
  const pos = clampToSafe(at, w, h);
  const grow = easeOut(t, start, 0.5);
  // punto de la etiqueta más cercano al ancla
  const lx = Math.min(Math.max(anchor.x, pos.x), pos.x + w);
  const ly = Math.min(Math.max(anchor.y, pos.y), pos.y + size * 1.5);
  const ex = anchor.x + (lx - anchor.x) * grow;
  const ey = anchor.y + (ly - anchor.y) * grow;
  return (
    <>
      <svg width={WIDTH} height={HEIGHT} style={{position: 'absolute', inset: 0, opacity: o}}>
        <line x1={anchor.x} y1={anchor.y} x2={ex} y2={ey} stroke={color} strokeWidth={4} strokeLinecap="round" />
        <circle cx={anchor.x} cy={anchor.y} r={11} fill={C.navy} stroke={color} strokeWidth={5} />
        <circle cx={anchor.x} cy={anchor.y} r={4} fill={color} />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: pos.x,
          top: pos.y,
          width: w,
          opacity: o * interpolate(grow, [0.3, 1], [0, 1], clampOpts),
          transform: `translateY(${(1 - grow) * 12}px)`,
          fontFamily: FONT,
        }}
      >
        <div
          style={{
            display: 'inline-block',
            padding: `${size * 0.18}px ${size * 0.5}px`,
            borderRadius: 999,
            background: C.ink,
            border: `4px solid ${color}`,
            color: C.white,
            fontWeight: 700,
            fontSize: size,
            lineHeight: 1.1,
            whiteSpace: 'nowrap',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          }}
        >
          {text}
        </div>
        {note ? (
          <div style={{marginTop: 8, marginLeft: 10, color: 'rgba(235,242,255,0.9)', fontWeight: 600, fontStyle: 'italic', fontSize: size * 0.62, whiteSpace: 'nowrap', textShadow: '0 2px 8px rgba(0,0,0,0.7)'}}>
            {note}
          </div>
        ) : null}
      </div>
    </>
  );
};

/** Chip pequeño sin línea guía (estado del refrigerante, leyendas). */
export const Chip: React.FC<{t: number; start: number; end: number; at: Pt; text: string; color: string; size?: number; dot?: 'solid' | 'wave' | 'bolt' | 'snow'; center?: boolean}> = ({
  t,
  start,
  end,
  at,
  text,
  color,
  size = 34,
  dot = 'solid',
  center = false,
}) => {
  const o = vis(t, start, end);
  if (o <= 0) return null;
  const p = easeOut(t, start, 0.4);
  const w = text.length * size * 0.62 + size * 2.2;
  const pos = clampToSafe({x: center ? at.x - w / 2 : at.x, y: at.y}, w, size * 1.6);
  return (
    <div
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        opacity: o,
        transform: `scale(${0.85 + 0.15 * p})`,
        transformOrigin: 'left center',
        display: 'flex',
        alignItems: 'center',
        gap: size * 0.35,
        padding: `${size * 0.16}px ${size * 0.45}px ${size * 0.16}px ${size * 0.3}px`,
        borderRadius: 999,
        background: C.ink,
        border: `3px solid ${color}`,
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: size,
        color: C.white,
        whiteSpace: 'nowrap',
        lineHeight: 1.15,
        boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
      }}
    >
      <Icon kind={dot} color={color} size={size * 0.95} />
      {text}
    </div>
  );
};

export const Icon: React.FC<{kind: 'solid' | 'wave' | 'bolt' | 'snow'; color: string; size: number}> = ({kind, color, size}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{flex: 'none'}}>
    {kind === 'solid' ? <circle cx={12} cy={12} r={7} fill={color} /> : null}
    {kind === 'wave' ? (
      <path d="M3 9 q3 -4 6 0 t6 0 t6 0 M3 16 q3 -4 6 0 t6 0 t6 0" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
    ) : null}
    {kind === 'bolt' ? <path d="M13.5 2 L5 13.5 h6 L9.5 22 L19 9.5 h-6 Z" fill={color} /> : null}
    {kind === 'snow' ? (
      <g stroke={color} strokeWidth={2.4} strokeLinecap="round">
        <line x1={12} y1={2.5} x2={12} y2={21.5} />
        <line x1={3.8} y1={7.2} x2={20.2} y2={16.8} />
        <line x1={3.8} y1={16.8} x2={20.2} y2={7.2} />
        <path d="M9 4.5 L12 7 L15 4.5 M9 19.5 L12 17 L15 19.5" fill="none" />
      </g>
    ) : null}
  </svg>
);

// ---------------------------------------------------------------------------
// Ondas de calor (curvas sinuosas que se alejan de la fuente)
// ---------------------------------------------------------------------------
export function wavePath(p0: Pt, p1: Pt, amp: number, cycles: number, phase: number, n = 28): string {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  let d = '';
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const env = Math.sin(Math.PI * u);
    const o = Math.sin(u * cycles * Math.PI * 2 + phase) * amp * env;
    const x = p0.x + dx * u + nx * o;
    const y = p0.y + dy * u + ny * o;
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }
  return d;
}

/**
 * Un emisor de calor: varias ondas que nacen en `base` y viajan hacia `tip`.
 * `rate` = ondas por segundo; `strength` 0–1 controla opacidad.
 */
export const HeatEmitter: React.FC<{t: number; base: Pt; tip: Pt; strength: number; width?: number; seed?: number; rate?: number}> = ({
  t,
  base,
  tip,
  strength,
  width = 7,
  seed = 0,
  rate = 0.9,
}) => {
  if (strength <= 0.01) return null;
  const waves = [];
  const life = 1.6;
  const count = 3;
  const dx = tip.x - base.x;
  const dy = tip.y - base.y;
  for (let i = 0; i < count; i++) {
    const ph = ((t * rate + i / count + seed * 0.37) % 1 + 1) % 1; // 0..1
    const a = ph;
    const segLen = 0.42;
    const s0 = a * (1 - segLen);
    const p0 = {x: base.x + dx * s0, y: base.y + dy * s0};
    const p1 = {x: base.x + dx * (s0 + segLen), y: base.y + dy * (s0 + segLen)};
    const len = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const o = Math.sin(Math.PI * a) * strength;
    waves.push(
      <path
        key={i}
        d={wavePath(p0, p1, Math.max(5, len * 0.09), 1.5, t * 5 + seed + i)}
        fill="none"
        stroke={i % 2 ? C.coralLight : C.coral}
        strokeWidth={width}
        strokeLinecap="round"
        opacity={o}
      />,
    );
    void life;
  }
  return <g>{waves}</g>;
};

// ---------------------------------------------------------------------------
// Flecha de calor sinuosa (de A a B) con punta
// ---------------------------------------------------------------------------
export const HeatArrow: React.FC<{t: number; start: number; end: number; from: Pt; to: Pt; bend?: number; width?: number; color?: string; wavy?: boolean}> = ({
  t,
  start,
  end,
  from,
  to,
  bend = 0.25,
  width = 10,
  color = C.coral,
  wavy = true,
}) => {
  const o = vis(t, start, end, 0.3, 0.4);
  if (o <= 0) return null;
  const draw = easeOut(t, start, 0.8);
  // curva cuadrática con control perpendicular
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const cx = mx - (dy / len) * len * bend;
  const cy = my + (dx / len) * len * bend;
  const q = (u: number) => ({
    x: (1 - u) * (1 - u) * from.x + 2 * (1 - u) * u * cx + u * u * to.x,
    y: (1 - u) * (1 - u) * from.y + 2 * (1 - u) * u * cy + u * u * to.y,
  });
  const n = 40;
  const uMax = draw;
  let d = '';
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * uMax * 0.94;
    const p = q(u);
    const p2 = q(Math.min(1, u + 0.01));
    const tx = p2.x - p.x;
    const ty = p2.y - p.y;
    const tl = Math.hypot(tx, ty) || 1;
    const amp = wavy ? Math.min(14, len * 0.03) * Math.sin(Math.PI * Math.min(1, u / 0.94)) : 0;
    const off = Math.sin(u * len * 0.045 - t * 9) * amp;
    d += `${i === 0 ? 'M' : 'L'}${(p.x - (ty / tl) * off).toFixed(1)},${(p.y + (tx / tl) * off).toFixed(1)}`;
  }
  const tip = q(uMax);
  const pre = q(Math.max(0, uMax - 0.06));
  const ang = Math.atan2(tip.y - pre.y, tip.x - pre.x);
  const hs = width * 2.6;
  const head = `M${tip.x},${tip.y} L${tip.x - Math.cos(ang - 0.5) * hs},${tip.y - Math.sin(ang - 0.5) * hs} L${tip.x - Math.cos(ang + 0.5) * hs},${tip.y - Math.sin(ang + 0.5) * hs} Z`;
  return (
    <g opacity={o}>
      <path d={d} fill="none" stroke="rgba(10,21,48,0.55)" strokeWidth={width + 8} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
      <path d={head} fill={color} stroke="rgba(10,21,48,0.55)" strokeWidth={3} strokeLinejoin="round" />
    </g>
  );
};
