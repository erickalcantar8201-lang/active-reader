/**
 * Circuito sellado de refrigerante: UNA sola trayectoria cerrada en coordenadas
 * del mundo (metros). Todo lo que se mueve por los tubos (partículas, cometa de
 * seguimiento, colores, etiquetas) se calcula a partir de esta curva, de modo que
 * tuberías, flujo y anotaciones conservan siempre las mismas conexiones.
 *
 * Ejes: x → lado derecho del refri, y → arriba, z → hacia el frente (puerta).
 * Orden físico: evaporador → succión → compresor → descarga → condensador →
 *               línea de líquido → tubo capilar → evaporador.
 */
import * as THREE from 'three';
import {DIM} from './dims';

export type Vec3 = [number, number, number];
export type SegmentId =
  | 'evap'
  | 'succion'
  | 'compresor'
  | 'descarga'
  | 'condensador'
  | 'liquido'
  | 'capilar';

const {evapZ, gapZ, condZ, comp} = DIM;

// ---------------------------------------------------------------------------
// Puntos de control (con etiqueta de segmento que inicia en ese punto)
// ---------------------------------------------------------------------------
type Ctrl = {p: Vec3; seg?: SegmentId; dense?: boolean};

const ctrl: Ctrl[] = [];
const push = (p: Vec3, seg?: SegmentId, dense = false) => ctrl.push({p, seg, dense});

// Evaporador: serpentín integrado en la pared trasera interior.
push([-0.25, 1.54, evapZ], 'evap');
const evapRows = [1.54, 1.45, 1.36, 1.27, 1.18, 1.09];
evapRows.forEach((y, i) => {
  const last = i === evapRows.length - 1;
  if (i % 2 === 0) {
    if (i > 0) push([-0.2, y, evapZ]);
    push([0.2, y, evapZ]);
  } else {
    push([0.2, y, evapZ]);
    // el extremo izquierdo de la última fila es el inicio de la succión
    if (!last) push([-0.2, y, evapZ]);
  }
});
// Succión: atraviesa la pared y baja por detrás hasta el compresor.
push([-0.17, 1.09, evapZ], 'succion');
push([-0.17, 1.09, gapZ]);
push([-0.17, 0.215, gapZ]);
push([comp.x - comp.r - 0.005, 0.215, comp.z - 0.02]);
// Compresor (tramo interno, oculto por la carcasa salvo en el corte).
push([comp.x - comp.r + 0.01, 0.215, comp.z], 'compresor');
push([comp.x, 0.215, comp.z]);
push([comp.x + comp.r - 0.01, 0.235, comp.z]);
// Descarga: sale caliente y sube por el costado hasta la parte alta del condensador.
push([comp.x + comp.r + 0.005, 0.235, comp.z], 'descarga');
push([0.27, 0.235, -0.335]);
push([0.3, 0.34, condZ]);
// Condensador trasero: serpentín de arriba hacia abajo.
const condRows = 15;
const condTop = 1.56;
const condStep = 0.0771;
for (let k = 0; k < condRows; k++) {
  const y = condTop - k * condStep;
  const fromX = k % 2 === 0 ? 0.25 : -0.25;
  const toX = -fromX;
  if (k === 0) {
    push([0.3, y, condZ], 'condensador');
  } else {
    push([fromX, y, condZ]);
  }
  push([toX, y, condZ]);
}
// Línea de líquido.
const condBottom = condTop - (condRows - 1) * condStep;
push([-0.3, condBottom, condZ], 'liquido');
push([-0.3, 0.425, condZ]);
// Tubo capilar: espiral compacta y luego sube hasta la entrada del evaporador.
push([-0.3, 0.4, -0.41], 'capilar');
const coil = {x0: -0.3, pitch: 0.021, turns: 4, cy: 0.32, cz: -0.42, r: 0.034};
const coilSteps = 120;
for (let i = 0; i <= coilSteps; i++) {
  const th = (i / coilSteps) * coil.turns * Math.PI * 2;
  push(
    [
      coil.x0 + (coil.pitch * th) / (Math.PI * 2),
      coil.cy + coil.r * Math.cos(th),
      coil.cz + coil.r * Math.sin(th),
    ],
    undefined,
    true,
  );
}
push([-0.25, 0.43, gapZ]);
push([-0.25, 1.54, gapZ]);
// (cierra el circuito en el primer punto: entrada del evaporador)

// ---------------------------------------------------------------------------
// Redondeo de esquinas y muestreo denso
// ---------------------------------------------------------------------------
const v = (p: Vec3) => new THREE.Vector3(...p);

type Sample = {p: THREE.Vector3; seg: SegmentId};

function build(): Sample[] {
  const out: Sample[] = [];
  const n = ctrl.length;
  let seg: SegmentId = 'evap';
  for (let i = 0; i < n; i++) {
    const prev = v(ctrl[(i - 1 + n) % n].p);
    const cur = v(ctrl[i].p);
    const next = v(ctrl[(i + 1) % n].p);
    const prevSeg = seg;
    if (ctrl[i].seg) seg = ctrl[i].seg!;
    if (ctrl[i].dense) {
      out.push({p: cur, seg});
      continue;
    }
    const d1 = cur.clone().sub(prev);
    const d2 = next.clone().sub(cur);
    const l1 = d1.length();
    const l2 = d2.length();
    const r = Math.min(0.04, l1 * 0.5, l2 * 0.5);
    const a = cur.clone().sub(d1.normalize().multiplyScalar(r));
    const b = cur.clone().add(d2.normalize().multiplyScalar(r));
    const steps = 10;
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      // Bézier cuadrática a–cur–b
      const p = a
        .clone()
        .multiplyScalar((1 - t) * (1 - t))
        .add(cur.clone().multiplyScalar(2 * (1 - t) * t))
        .add(b.clone().multiplyScalar(t * t));
      // el cambio de tramo ocurre justo en el vértice
      out.push({p, seg: t < 0.5 ? prevSeg : seg});
    }
  }
  return out;
}

const raw = build();
// Remuestreo uniforme por longitud de arco.
const cum: number[] = [0];
for (let i = 1; i < raw.length; i++) {
  cum.push(cum[i - 1] + raw[i].p.distanceTo(raw[i - 1].p));
}
const closing = raw[0].p.distanceTo(raw[raw.length - 1].p);
export const LOOP_LENGTH = cum[cum.length - 1] + closing;

const STEP = 0.004;
const NS = Math.ceil(LOOP_LENGTH / STEP);
const pts: THREE.Vector3[] = [];
const segAt: SegmentId[] = [];
{
  let j = 0;
  for (let i = 0; i < NS; i++) {
    const s = (i / NS) * LOOP_LENGTH;
    while (j < raw.length - 1 && cum[j + 1] < s) j++;
    if (j >= raw.length - 1) {
      // tramo de cierre
      const t = (s - cum[raw.length - 1]) / closing;
      pts.push(raw[raw.length - 1].p.clone().lerp(raw[0].p, t));
      segAt.push(raw[raw.length - 1].seg);
    } else {
      const t = (s - cum[j]) / Math.max(1e-9, cum[j + 1] - cum[j]);
      pts.push(raw[j].p.clone().lerp(raw[j + 1].p, t));
      segAt.push(raw[j].seg);
    }
  }
}

/** Rango [inicio, fin) de cada segmento en longitud de arco. */
export const SEGMENTS: Record<SegmentId, {s0: number; s1: number}> = (() => {
  const r = {} as Record<SegmentId, {s0: number; s1: number}>;
  for (let i = 0; i < NS; i++) {
    const id = segAt[i];
    const s = (i / NS) * LOOP_LENGTH;
    if (!r[id]) r[id] = {s0: s, s1: s};
    r[id].s1 = s + LOOP_LENGTH / NS;
  }
  return r;
})();

const wrap = (s: number) => ((s % LOOP_LENGTH) + LOOP_LENGTH) % LOOP_LENGTH;

/** Punto del circuito en la longitud de arco s (metros). */
export function pointAt(s: number, target = new THREE.Vector3()): THREE.Vector3 {
  const x = (wrap(s) / LOOP_LENGTH) * NS;
  const i = Math.floor(x) % NS;
  const t = x - Math.floor(x);
  return target.copy(pts[i]).lerp(pts[(i + 1) % NS], t);
}

export function segmentAt(s: number): SegmentId {
  const x = Math.floor((wrap(s) / LOOP_LENGTH) * NS) % NS;
  return segAt[x];
}

/** Posición relativa (0–1) dentro del segmento. */
export function segU(s: number): {id: SegmentId; u: number} {
  const id = segmentAt(s);
  const {s0, s1} = SEGMENTS[id];
  return {id, u: THREE.MathUtils.clamp((wrap(s) - s0) / (s1 - s0), 0, 1)};
}

/** Curva de three.js para un tramo [s0, s1] (para TubeGeometry). */
export class CircuitCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private s0: number,
    private s1: number,
  ) {
    super();
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    return pointAt(this.s0 + (this.s1 - this.s0) * t, target);
  }
}

// ---------------------------------------------------------------------------
// Estado explicativo del refrigerante a lo largo del circuito
// ---------------------------------------------------------------------------
export const COLORS = {
  frio: new THREE.Color('#2fd3f5'),
  frioVapor: new THREE.Color('#8be9ff'),
  caliente: new THREE.Color('#ff5f45'),
  tibio: new THREE.Color('#ff9a5c'),
};

const smooth = (a: number, b: number, x: number) => THREE.MathUtils.smoothstep(x, a, b);

/** Fracción de la espiral dentro del capilar (el resto es el tramo que sube). */
export const CAP_COIL_FRACTION = (() => {
  const {s0, s1} = SEGMENTS.capilar;
  // la espiral termina en el punto de x máxima del capilar
  let best = s0;
  let bx = -Infinity;
  for (let s = s0; s < s1; s += 0.002) {
    const p = pointAt(s);
    if (p.x > bx) {
      bx = p.x;
      best = s;
    }
  }
  return (best - s0) / (s1 - s0);
})();

/** Color (recurso explicativo, no una temperatura medida). */
export function colorAt(s: number, target = new THREE.Color()): THREE.Color {
  const {id, u} = segU(s);
  switch (id) {
    case 'evap':
      return target.copy(COLORS.frio).lerp(COLORS.frioVapor, smooth(0.2, 1, u) * 0.6);
    case 'succion':
      return target.copy(COLORS.frioVapor);
    case 'compresor':
      return target.copy(COLORS.frioVapor).lerp(COLORS.caliente, smooth(0.3, 0.8, u));
    case 'descarga':
      return target.copy(COLORS.caliente);
    case 'condensador':
      return target.copy(COLORS.caliente).lerp(COLORS.tibio, smooth(0.1, 0.95, u));
    case 'liquido':
      return target.copy(COLORS.tibio);
    case 'capilar': {
      const k = smooth(0.08, CAP_COIL_FRACTION * 0.95, u);
      return target.copy(COLORS.tibio).lerp(COLORS.frio, k);
    }
  }
}

/** Fracción de vapor (0 = todo líquido, 1 = todo vapor). */
export function vaporAt(s: number): number {
  const {id, u} = segU(s);
  switch (id) {
    case 'evap':
      return 0.25 + 0.75 * smooth(0.0, 0.85, u);
    case 'succion':
    case 'compresor':
    case 'descarga':
      return 1;
    case 'condensador':
      return 1 - smooth(0.08, 0.85, u);
    case 'liquido':
      return 0;
    case 'capilar':
      return 0.25 * smooth(0.1, CAP_COIL_FRACTION, u);
  }
}

/** Velocidad visual del flujo (m/s). Más lenta y densa donde es líquido. */
export function speedAt(s: number): number {
  const {id, u} = segU(s);
  switch (id) {
    case 'evap':
      return 0.1 + 0.14 * u;
    case 'succion':
      return 0.26;
    case 'compresor':
      return 0.22;
    case 'descarga':
      return 0.22;
    case 'condensador':
      return 0.22 - 0.15 * smooth(0.05, 0.9, u);
    case 'liquido':
      return 0.07;
    case 'capilar':
      return u < CAP_COIL_FRACTION ? 0.12 : 0.15;
  }
}

/** Radio visual del tubo por tramo. */
export function tubeRadius(id: SegmentId): number {
  if (id === 'capilar') return 0.0048;
  if (id === 'evap') return 0.0115;
  return 0.0125;
}

// ---------------------------------------------------------------------------
// Partículas: espaciado proporcional a la velocidad (flujo continuo)
// ---------------------------------------------------------------------------
const TAU_N = 4000;
const tauTable: number[] = [0];
for (let i = 1; i <= TAU_N; i++) {
  const s = ((i - 0.5) / TAU_N) * LOOP_LENGTH;
  tauTable.push(tauTable[i - 1] + LOOP_LENGTH / TAU_N / speedAt(s));
}
export const CYCLE_TIME = tauTable[TAU_N];

function sFromTau(tau: number): number {
  const t = ((tau % CYCLE_TIME) + CYCLE_TIME) % CYCLE_TIME;
  let lo = 0;
  let hi = TAU_N;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (tauTable[mid] <= t) lo = mid;
    else hi = mid;
  }
  const f = (t - tauTable[lo]) / (tauTable[hi] - tauTable[lo]);
  return ((lo + f) / TAU_N) * LOOP_LENGTH;
}

export const PARTICLE_DT = 0.115; // s entre partículas
export const PARTICLE_COUNT = Math.floor(CYCLE_TIME / PARTICLE_DT);

/** Longitud de arco de la partícula k en el tiempo t (s). */
export function particleS(k: number, t: number): number {
  return sFromTau(k * (CYCLE_TIME / PARTICLE_COUNT) + t);
}

/** Pseudoaleatorio determinista por partícula (0–1). */
export function hash01(k: number): number {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Tramos visibles como tubo (el interno del compresor no se dibuja). */
export const TUBE_SEGMENTS: SegmentId[] = [
  'evap',
  'succion',
  'descarga',
  'condensador',
  'liquido',
  'capilar',
];

/** Utilidades para anotar: punto a una fracción u de un tramo. */
export function segPoint(id: SegmentId, u: number): THREE.Vector3 {
  const {s0, s1} = SEGMENTS[id];
  return pointAt(s0 + (s1 - s0) * u);
}
export function segS(id: SegmentId, u: number): number {
  const {s0, s1} = SEGMENTS[id];
  return s0 + (s1 - s0) * u;
}
export const COIL = coil;
