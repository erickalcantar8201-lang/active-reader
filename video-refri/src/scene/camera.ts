/**
 * Cámara única y continua (sin cortes). Se define por claves en el tiempo; entre
 * claves se interpola con suavizado. Algunos tramos «siguen la tubería»: el
 * objetivo de la cámara recorre el circuito real entre dos longitudes de arco.
 *
 * La misma función alimenta a three.js y a la capa 2D (etiquetas/flechas), por
 * eso las anotaciones quedan pegadas a las piezas.
 */
import * as THREE from 'three';
import {HEIGHT, L, SCENES, WIDTH, frag} from '../timeline';
import {pointAt, segS} from './circuit';

export type CamState = {
  target: THREE.Vector3;
  yaw: number; // grados; 0 = frente, 90 = lado derecho, 180 = atrás
  pitch: number; // grados
  dist: number;
  fov: number;
};

type Key = {
  t: number;
  target: [number, number, number];
  yaw: number;
  pitch: number;
  dist: number;
  fov?: number;
  /** El tramo que LLEGA a esta clave sigue el circuito entre s0 y s1. */
  follow?: {s0: number; s1: number; blend?: number};
  ease?: 'inOut' | 'out' | 'in' | 'linear';
};

const G = SCENES;

// Encuadre «héroe» (gancho y cierre).
const HERO = {target: [0.03, 1.04, 0.0] as [number, number, number], yaw: 32, pitch: 9, dist: 5.0, fov: 34};

export const KEYS: Key[] = [
  // 1. GANCHO
  {t: 0, ...HERO, dist: 4.8},
  {t: G.gancho.end - 0.3, ...HERO, dist: 5.0, ease: 'linear'},
  // 2. ABSORCIÓN: entra al interior, hacia el evaporador
  {t: L.l2.start + 1.0, target: [0.0, 1.1, -0.05], yaw: 8, pitch: 6, dist: 2.55, fov: 34},
  {t: L.l3.start + 0.5, target: [0.0, 1.25, -0.2], yaw: 2, pitch: 5, dist: 2.2, fov: 34},
  {t: G.absorcion.end - 0.2, target: [0.0, 1.25, -0.2], yaw: 6, pitch: 4, dist: 2.1, fov: 34, ease: 'linear'},
  // 3. COMPRESOR: sigue la succión, rodea el refri y baja al compresor
  {
    t: L.l4.start + 1.2,
    target: [0.06, 0.24, -0.32],
    yaw: 140,
    pitch: 14,
    dist: 0.95,
    fov: 34,
    follow: {s0: segS('succion', 0.0), s1: segS('succion', 1.0), blend: 0.85},
  },
  {t: G.compresor.end - 0.25, target: [0.075, 0.21, -0.3], yaw: 143, pitch: 13, dist: 0.72, fov: 34},
  // 4. CONDENSADOR: sube con la descarga hasta el serpentín trasero
  {
    t: L.l5.start + 1.6,
    target: [0.02, 1.0, -0.42],
    yaw: 150,
    pitch: 8,
    dist: 2.15,
    fov: 34,
    follow: {s0: segS('descarga', 0.0), s1: segS('descarga', 1.0), blend: 0.7},
  },
  {t: G.condensador.end - 0.2, target: [0.0, 0.96, -0.42], yaw: 156, pitch: 7, dist: 2.25, fov: 34, ease: 'linear'},
  // 5. CAPILAR: acercamiento al tubo capilar y regreso al evaporador
  {t: L.l6.start + 0.9, target: [-0.24, 0.36, -0.41], yaw: 162, pitch: 10, dist: 0.78, fov: 34},
  {t: frag('l6', 1) + 1.5, target: [-0.24, 0.36, -0.41], yaw: 157, pitch: 9, dist: 0.72, fov: 34, ease: 'linear'},
  {
    t: G.capilar.end + 0.5,
    target: [0.0, 1.24, -0.22],
    yaw: 64,
    pitch: 8,
    dist: 2.3,
    fov: 34,
    follow: {s0: segS('capilar', 0.45), s1: segS('evap', 0.55), blend: 0.55},
  },
  // 6. REVELACIÓN FINAL: plano completo desde atrás 3/4 (interior visible por el corte lateral)
  {t: frag('l7', 1) + 0.2, target: [0.0, 0.92, -0.2], yaw: 116, pitch: 9, dist: 4.75, fov: 34},
  {t: L.l7.end + 0.3, target: [0.0, 0.92, -0.2], yaw: 112, pitch: 9, dist: 4.85, fov: 34, ease: 'linear'},
  // Cierre: vuelve a la composición inicial
  {t: L.l8.start + 2.2, ...HERO},
  {t: G.final.end, ...HERO, dist: 5.15, ease: 'linear'},
];

const easeFn = {
  inOut: (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  out: (x: number) => 1 - Math.pow(1 - x, 3),
  in: (x: number) => x * x * x,
  linear: (x: number) => x,
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function cameraAt(t: number): CamState {
  let i = 0;
  while (i < KEYS.length - 1 && KEYS[i + 1].t <= t) i++;
  const a = KEYS[i];
  const b = KEYS[Math.min(i + 1, KEYS.length - 1)];
  // Antes de la primera clave, o justo en una clave (o después de la última): estado de esa clave.
  if (a === b || t <= a.t) {
    const k = t < KEYS[0].t ? KEYS[0] : a;
    return {target: new THREE.Vector3(...k.target), yaw: k.yaw, pitch: k.pitch, dist: k.dist, fov: k.fov ?? 34};
  }
  const raw = (t - a.t) / (b.t - a.t);
  const u = easeFn[b.ease ?? 'inOut'](THREE.MathUtils.clamp(raw, 0, 1));
  const target = new THREE.Vector3(...a.target).lerp(new THREE.Vector3(...b.target), u);
  if (b.follow) {
    // el objetivo se acerca al punto del circuito que recorre el «cometa»
    const p = pointAt(lerp(b.follow.s0, b.follow.s1, u));
    const w = (b.follow.blend ?? 0.7) * Math.sin(Math.PI * u);
    target.lerp(p, w);
  }
  return {
    target,
    yaw: lerp(a.yaw, b.yaw, u),
    pitch: lerp(a.pitch, b.pitch, u),
    dist: lerp(a.dist, b.dist, u),
    fov: lerp(a.fov ?? 34, b.fov ?? 34, u),
  };
}

/** Si el tramo actual sigue el circuito, devuelve la s del «cometa». */
export function followS(t: number): number | null {
  for (let i = 0; i < KEYS.length - 1; i++) {
    const a = KEYS[i];
    const b = KEYS[i + 1];
    if (b.follow && t >= a.t && t <= b.t) {
      const u = easeFn[b.ease ?? 'inOut']((t - a.t) / (b.t - a.t));
      return lerp(b.follow.s0, b.follow.s1, u);
    }
  }
  return null;
}

export function camPosition(c: CamState): THREE.Vector3 {
  const yaw = THREE.MathUtils.degToRad(c.yaw);
  const pitch = THREE.MathUtils.degToRad(c.pitch);
  return new THREE.Vector3(
    c.target.x + c.dist * Math.cos(pitch) * Math.sin(yaw),
    c.target.y + c.dist * Math.sin(pitch),
    c.target.z + c.dist * Math.cos(pitch) * Math.cos(yaw),
  );
}

export function applyCamera(cam: THREE.PerspectiveCamera, c: CamState) {
  cam.fov = c.fov;
  cam.aspect = WIDTH / HEIGHT;
  cam.near = 0.02;
  cam.far = 60;
  cam.position.copy(camPosition(c));
  cam.up.set(0, 1, 0);
  cam.lookAt(c.target);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);
}

/** Proyector 3D → píxeles de pantalla, idéntico a la cámara de three.js. */
export function makeProjector(c: CamState) {
  const cam = new THREE.PerspectiveCamera();
  applyCamera(cam, c);
  return (p: THREE.Vector3 | [number, number, number]) => {
    const v = Array.isArray(p) ? new THREE.Vector3(...p) : p.clone();
    const behind = v.clone().applyMatrix4(cam.matrixWorldInverse).z > 0;
    v.project(cam);
    return {x: (v.x * 0.5 + 0.5) * WIDTH, y: (-v.y * 0.5 + 0.5) * HEIGHT, behind};
  };
}
export type Projector = ReturnType<typeof makeProjector>;
