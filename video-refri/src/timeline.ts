/**
 * Línea de tiempo maestra. Todo se deriva de la duración REAL de cada línea de
 * narración (src/narracion.json, generado por tools/narracion.py), así que si se
 * cambia la voz, las escenas se reajustan solas.
 */
import narracion from './narracion.json';

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

/** Zonas seguras para la interfaz de redes sociales (px). */
export const SAFE = {top: 160, bottom: 250, right: 140, left: 64};

type Linea = {
  id: string;
  texto: string;
  duracion: number;
  fragmentos: {texto: string; inicio: number; duracion: number}[];
};
const lineas = narracion as Linea[];

// Inicio de la primera línea y pausas entre líneas (s). Las pausas más largas
// van antes de las revelaciones (l7 «el detalle», l8 conclusión).
const PRIMERA = 0.5;
const PAUSAS = [0.6, 0.5, 0.7, 0.7, 0.65, 0.8, 0.85];
const COLA = 3.3; // tiempo final para leer la conclusión

export type LineaTiempo = Linea & {start: number; end: number};

export const VOZ: LineaTiempo[] = (() => {
  const out: LineaTiempo[] = [];
  let t = PRIMERA;
  lineas.forEach((l, i) => {
    out.push({...l, start: t, end: t + l.duracion});
    t += l.duracion + (PAUSAS[i] ?? 0.6);
  });
  return out;
})();

export const L = Object.fromEntries(VOZ.map((v) => [v.id, v])) as Record<string, LineaTiempo>;

/** Inicio absoluto (s) del fragmento n de una línea. */
export const frag = (id: string, n: number) => L[id].start + L[id].fragmentos[n].inicio;

export const DURATION_S = Math.ceil((L.l8.end + COLA) * FPS) / FPS;
export const DURATION_FRAMES = Math.round(DURATION_S * FPS);

/** Escenas (s). Los cortes caen en las pausas entre frases. */
export const SCENES = {
  gancho: {start: 0, end: L.l1.end + 0.25},
  absorcion: {start: L.l1.end + 0.25, end: L.l3.end + 0.3},
  compresor: {start: L.l3.end + 0.3, end: L.l4.end + 0.35},
  condensador: {start: L.l4.end + 0.35, end: L.l5.end + 0.3},
  capilar: {start: L.l5.end + 0.3, end: L.l6.end + 0.35},
  final: {start: L.l6.end + 0.35, end: DURATION_S},
};

export const sec = (frame: number) => frame / FPS;
