/**
 * Capa 2D: títulos, etiquetas, flechas de calor, ondas y energía eléctrica.
 * Todas las posiciones salen de proyectar puntos 3D con la MISMA cámara de la
 * escena, así que cada anotación queda pegada a su pieza durante el movimiento.
 */
import React from 'react';
import * as THREE from 'three';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {FPS, HEIGHT, L, SCENES, WIDTH, frag} from '../timeline';
import {cameraAt, makeProjector, Projector} from '../scene/camera';
import {segPoint} from '../scene/circuit';
import {DIM} from '../scene/dims';
import {FOOD_ANCHORS} from '../scene/Food';
import {CABLE_CURVE, COMP_ANCHORS} from '../scene/Compressor';
import {heatEmphasis} from '../scene/reveal';
import {C, Chip, HeatArrow, HeatEmitter, Icon, Label, Pt, Title, easeOut, vis} from './primitives';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Silueta proyectada del refrigerador (casco convexo de su caja). */
function fridgeHull(P: Projector): Pt[] {
  const xs = [-DIM.W / 2, DIM.W / 2];
  const ys = [0, DIM.H];
  const zs = [DIM.zBack, DIM.zFront + DIM.doorT];
  const pts: Pt[] = [];
  xs.forEach((x) => ys.forEach((y) => zs.forEach((z) => pts.push(P([x, y, z])))));
  // casco convexo (monotone chain)
  pts.sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Pt[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (const p of [...pts].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** Emisores de calor del condensador (base en el serpentín, punta hacia la cocina). */
const COND_EMITTERS = (() => {
  const out: {base: THREE.Vector3; tip: THREE.Vector3; seed: number}[] = [];
  let k = 0;
  for (const y of [0.62, 0.9, 1.18, 1.46]) {
    for (const x of [-0.17, 0.0, 0.17]) {
      const base = V(x + (k % 2 ? 0.03 : -0.03), y, DIM.condZ - 0.02);
      out.push({base, tip: base.clone().add(V(0.02, 0.2, -0.26)), seed: k++});
    }
  }
  return out;
})();
/** Calor que asciende por detrás (visible por encima/al lado del gabinete). */
const RISING = [-0.22, -0.05, 0.12, 0.27].map((x, i) => {
  const base = V(x, 1.5 + (i % 2) * 0.08, DIM.condZ - 0.05);
  return {base, tip: base.clone().add(V(0.06, 0.62, -0.12)), seed: i + 20};
});
const SIDE_RISING = [0.75, 1.05, 1.35].map((y, i) => {
  const base = V(0.33, y, DIM.condZ - 0.04);
  return {base, tip: base.clone().add(V(0.32, 0.32, -0.08)), seed: i + 40};
});

export const Overlay: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = cameraAt(t);
  const P = makeProjector(cam);
  const S = SCENES;
  const heat = heatEmphasis(t);
  const behind = cam.yaw < 90; // el condensador queda detrás del gabinete
  const hull = fridgeHull(P);
  const hullPath = hull.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('') + 'Z';
  const pscale = 2.0 / cam.dist; // escala aproximada px por cercanía

  // ---------------- Ondas de calor ----------------
  const waveW = Math.max(5, Math.min(12, 9 * pscale));
  const emitters: {base: THREE.Vector3; tip: THREE.Vector3; seed: number; k: number}[] = [];
  const condWaves = interpolate(t, [S.condensador.start + 0.4, S.condensador.start + 1.4, S.capilar.start + 0.6, S.capilar.start + 1.4], [0, 1, 1, 0.0], clamp);
  const finalWaves = interpolate(t, [frag('l7', 2) + 0.8, frag('l7', 2) + 1.8], [0, 1], clamp);
  COND_EMITTERS.forEach((e) => emitters.push({...e, k: Math.max(condWaves, behind ? 0 : finalWaves) * heat}));
  const hookRise = interpolate(t, [0.1, 0.6, S.gancho.end, S.gancho.end + 0.8], [0, 1, 1, 0], clamp);
  const endRise = interpolate(t, [L.l8.start + 0.8, L.l8.start + 2.2], [0, 1], clamp);
  [...RISING, ...SIDE_RISING].forEach((e) => emitters.push({...e, k: Math.max(hookRise, endRise, behind ? 0 : finalWaves * 0.8)}));

  // ---------------- Flechas: calor de los alimentos al evaporador ----------------
  const foodArrows = [
    {from: FOOD_ANCHORS.manzanas, to: segPoint('evap', 0.62), a: L.l2.start + 0.5, bend: -0.22},
    {from: FOOD_ANCHORS.huevos, to: segPoint('evap', 0.86), a: L.l2.start + 0.75, bend: 0.22},
    {from: FOOD_ANCHORS.queso, to: segPoint('evap', 0.95), a: L.l2.start + 1.0, bend: 0.12},
    {from: FOOD_ANCHORS.leche, to: segPoint('evap', 0.5), a: frag('l3', 1) + 0.5, bend: -0.25},
  ];

  // ---------------- Escena final ----------------
  const interior = V(-0.02, 1.06, 0.02);
  const condMid = V(0.0, 1.12, DIM.condZ - 0.02);
  const condLow = V(0.05, 0.72, DIM.condZ - 0.02);
  const cablePts = CABLE_CURVE.getPoints(40).reverse();
  const elecStart = frag('l7', 2) - 0.1;
  const elecOn = vis(t, elecStart, L.l8.start + 0.6, 0.4, 0.6);
  const flow = (t * 140) % 60;

  const P2 = (v: THREE.Vector3) => P(v);
  const cableD = cablePts.map((p, i) => {
    const q = P(p);
    return `${i ? 'L' : 'M'}${q.x.toFixed(1)},${q.y.toFixed(1)}`;
  }).join('');
  const socket = P(COMP_ANCHORS.socket);

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={WIDTH} height={HEIGHT} style={{position: 'absolute', inset: 0}}>
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <mask id="noFridge" maskUnits="userSpaceOnUse" x={0} y={0} width={WIDTH} height={HEIGHT}>
            <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="white" />
            {behind ? <path d={hullPath} fill="black" /> : null}
          </mask>
        </defs>

        {/* Calor saliendo al aire de la cocina */}
        <g mask="url(#noFridge)" filter="url(#glow)">
          {emitters.map((e, i) => (
            <HeatEmitter key={i} t={t} base={P2(e.base)} tip={P2(e.tip)} strength={e.k} width={waveW} seed={e.seed} />
          ))}
        </g>

        {/* Calor de los alimentos → refrigerante del evaporador */}
        <g filter="url(#glow)">
          {foodArrows.map((a, i) => (
            <HeatArrow key={i} t={t} start={a.a} end={S.absorcion.end - 0.1} from={P(a.from)} to={P(a.to)} bend={a.bend} width={9} />
          ))}
        </g>

        {/* Final: calor interior → condensador */}
        <g filter="url(#glow)">
          <HeatArrow t={t} start={frag('l7', 1) + 0.3} end={L.l8.start + 0.6} from={P(interior)} to={P(condMid)} bend={-0.18} width={16} />
          {/* energía eléctrica: compresor → condensador */}
          <HeatArrow t={t} start={frag('l7', 2) + 0.7} end={L.l8.start + 0.6} from={P(COMP_ANCHORS.top)} to={P(condLow)} bend={0.2} width={14} color={C.yellow} wavy={false} />
        </g>
        {/* energía eléctrica por el cable */}
        {elecOn > 0 ? (
          <g opacity={elecOn}>
            <path d={cableD} fill="none" stroke={C.yellow} strokeWidth={7} strokeDasharray="18 24" strokeDashoffset={flow} strokeLinecap="round" filter="url(#glow)" />
          </g>
        ) : null}
      </svg>

      {/* Insignia eléctrica sobre el contacto */}
      {elecOn > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: socket.x - 46,
            top: socket.y - 46,
            width: 92,
            height: 92,
            borderRadius: 999,
            background: C.ink,
            border: `5px solid ${C.yellow}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: elecOn,
            transform: `scale(${0.6 + 0.4 * easeOut(t, elecStart, 0.5)})`,
            boxShadow: `0 0 30px ${C.yellow}88`,
          }}
        >
          <Icon kind="bolt" color={C.yellow} size={58} />
        </div>
      ) : null}

      {/* ================= TÍTULOS ================= */}
      <Title
        t={t}
        start={0.12}
        end={S.gancho.end}
        segs={[
          {text: '¿Enfría…', color: C.cyan},
          {text: 'y también'},
          {text: 'calienta?', color: C.coral},
        ]}
        size={96}
      />
      <Title t={t} start={L.l2.start + 0.15} end={S.absorcion.end} segs={[{text: 'El calor sale de tu'}, {text: 'comida', color: C.coral}]} />
      <Title t={t} start={L.l4.start + 0.5} end={S.compresor.end} segs={[{text: 'Suben'}, {text: 'presión y temperatura', color: C.coral}]} />
      <Title t={t} start={L.l5.start + 0.3} end={S.condensador.end} segs={[{text: 'El calor pasa a la'}, {text: 'cocina', color: C.coral}]} />
      <Title
        t={t}
        start={frag('l6', 1) - 0.1}
        end={S.capilar.end + 0.2}
        segs={[
          {text: 'Baja la presión.', color: C.cyan},
          {text: 'Vuelve a enfriar', at: frag('l6', 1) + 1.4},
        ]}
      />
      <Title
        t={t}
        start={frag('l7', 1) + 0.2}
        end={L.l8.start - 0.05}
        segs={[
          {text: 'Calor interior', color: C.coral},
          {text: '+ energía eléctrica', color: C.yellow, at: frag('l7', 2) + 0.05},
        ]}
      />
      <Title
        t={t}
        start={L.l8.start + 0.15}
        end={S.final.end + 1}
        segs={[
          {text: 'Frío adentro.', color: C.cyan},
          {text: 'Calor afuera', color: C.coral, at: L.l8.start + 1.3},
        ]}
        size={96}
      />

      {/* ================= ETIQUETAS ================= */}
      {/* Gancho */}
      <Chip t={t} start={0.9} end={S.gancho.end} at={{x: P(V(0, 1.2, 0.2)).x - 70, y: P(V(0, 1.2, 0.2)).y}} text="frío" color={C.cyan} dot="snow" />
      <Chip t={t} start={1.4} end={S.gancho.end} at={{x: P(V(0.2, 1.95, -0.5)).x + 20, y: P(V(0.2, 1.95, -0.5)).y - 30}} text="calor" color={C.coral} dot="wave" />

      {/* Evaporador */}
      <Label
        t={t}
        start={L.l3.start + 0.5}
        end={S.absorcion.end}
        anchor={P(segPoint('evap', 0.12))}
        at={{x: P(segPoint('evap', 0.12)).x + 30, y: 418}}
        text="Evaporador"
        color={C.cyan}
      />
      <Chip t={t} start={frag('l3', 1) + 0.3} end={S.absorcion.end} at={{x: P(segPoint('evap', 0.0)).x - 30, y: 424}} text="líquido" color={C.cyan} dot="solid" />
      <Chip t={t} start={frag('l3', 1) + 2.2} end={S.absorcion.end} at={{x: P(segPoint('evap', 0.97)).x - 30, y: P(segPoint('evap', 0.97)).y + 26}} text="vapor" color="#a8f0ff" dot="solid" />

      {/* Compresor */}
      <Label
        t={t}
        start={L.l4.start + 0.9}
        end={S.compresor.end}
        anchor={P(COMP_ANCHORS.top)}
        at={{x: P(COMP_ANCHORS.top).x - 60, y: P(COMP_ANCHORS.top).y - 260}}
        text="Compresor"
        color={C.white}
      />
      <Chip t={t} start={L.l4.start + 1.9} end={S.compresor.end} at={{x: P(segPoint('succion', 0.9)).x - 200, y: P(segPoint('succion', 0.9)).y - 120}} text="entra vapor frío" color={C.cyan} dot="solid" />
      <Chip t={t} start={frag('l4', 1) + 0.1} end={S.compresor.end} at={{x: P(segPoint('descarga', 0.08)).x - 60, y: P(segPoint('descarga', 0.08)).y - 130}} text="sale más caliente" color={C.coral} dot="solid" />

      {/* Condensador */}
      <Label
        t={t}
        start={L.l5.start + 1.4}
        end={S.condensador.end}
        anchor={P(segPoint('condensador', 0.2))}
        at={{x: P(segPoint('condensador', 0.2)).x - 160, y: 440}}
        text="Condensador"
        note="Ubicación según modelo"
        color={C.coral}
      />
      <Chip t={t} start={L.l5.start + 2.6} end={S.condensador.end} at={{x: 110, y: HEIGHT - 250 - 190}} text="Refrigerante: dentro del tubo" color={C.coralLight} dot="solid" size={32} />
      <Chip t={t} start={L.l5.start + 3.1} end={S.condensador.end} at={{x: 110, y: HEIGHT - 250 - 110}} text="Calor: sale al aire" color={C.coral} dot="wave" size={32} />
      <Chip t={t} start={L.l5.end - 1.6} end={S.condensador.end} at={{x: P(segPoint('condensador', 0.97)).x - 60, y: P(segPoint('condensador', 0.97)).y + 40}} text="líquido" color={C.coralLight} dot="solid" />

      {/* Capilar */}
      <Label
        t={t}
        start={L.l6.start + 0.9}
        end={frag('l6', 1) + 1.65}
        anchor={P(segPoint('capilar', 0.2))}
        at={{x: P(segPoint('capilar', 0.2)).x - 330, y: P(segPoint('capilar', 0.2)).y - 330}}
        text="Tubo capilar"
        color={C.cyan}
      />
      <Chip t={t} start={L.l6.start + 1.6} end={frag('l6', 1) + 1.65} at={{x: P(segPoint('capilar', 0.02)).x + 50, y: P(segPoint('capilar', 0.02)).y - 40}} text="alta presión" color={C.coralLight} dot="solid" />
      <Chip t={t} start={frag('l6', 1) + 0.2} end={frag('l6', 1) + 1.65} at={{x: P(segPoint('capilar', 0.42)).x - 120, y: P(segPoint('capilar', 0.42)).y + 120}} text="baja presión" color={C.cyan} dot="solid" />

      {/* Final */}
      <Chip t={t} start={frag('l7', 1) + 0.9} end={L.l8.start + 0.4} at={{x: P(interior).x - 140, y: P(interior).y + 50}} text="calor interior" color={C.coral} dot="wave" />
      <Chip t={t} start={frag('l7', 2) + 0.2} end={L.l8.start + 0.4} at={{x: socket.x - 120, y: socket.y + 64}} text="energía eléctrica" color={C.yellow} dot="bolt" />
      <Chip t={t} start={frag('l7', 2) + 1.8} end={L.l8.start + 0.4} at={{x: P(V(-0.05, 1.25, DIM.condZ - 0.32)).x - 40, y: P(V(-0.05, 1.25, DIM.condZ - 0.32)).y}} text="= calor a la cocina" color={C.coral} dot="wave" />
      <Chip t={t} start={L.l8.start + 0.6} end={S.final.end + 1} at={{x: P(V(0, 1.15, 0.25)).x - 70, y: P(V(0, 1.15, 0.25)).y}} text="frío" color={C.cyan} dot="snow" />
      <Chip t={t} start={L.l8.start + 1.5} end={S.final.end + 1} at={{x: P(V(0.2, 1.95, -0.5)).x + 20, y: P(V(0.2, 1.95, -0.5)).y - 30}} text="calor" color={C.coral} dot="wave" />
    </AbsoluteFill>
  );
};
