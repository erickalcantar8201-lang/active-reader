/** Parámetros de revelado (cortes transparentes) en función del tiempo. */
import {interpolate} from 'remotion';
import {L, SCENES, frag} from '../timeline';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Opacidad de la pared lateral derecha (corte transparente). */
export const sideWallOpacity = (t: number) =>
  interpolate(t, [0, SCENES.compresor.start - 0.2, SCENES.compresor.start + 0.9], [0.5, 0.5, 0.13], clamp);

/** 1 = el forro interior tapa el evaporador; 0 = evaporador revelado. */
export const evapCover = (t: number) => interpolate(t, [L.l3.start - 0.1, L.l3.start + 0.9], [1, 0], clamp);

/** Corte del compresor: 0 cerrado, 1 abierto. Breve, durante la línea 4. */
export const compCut = (t: number) =>
  interpolate(
    t,
    [L.l4.start + 1.1, L.l4.start + 1.8, SCENES.compresor.end - 0.35, SCENES.compresor.end + 0.35],
    [0, 1, 1, 0],
    clamp,
  );

/** Intensidad del calor que sale por el condensador (siempre funciona; se enfatiza). */
export const heatEmphasis = (t: number) =>
  interpolate(
    t,
    [0, 0.6, SCENES.gancho.end, SCENES.absorcion.start + 1, SCENES.condensador.start, frag('l5', 0) + 1.5, SCENES.capilar.start + 1, SCENES.final.start, SCENES.final.start + 2],
    [0.4, 1, 1, 0.45, 0.45, 1, 0.55, 0.55, 1],
    clamp,
  );

/** Visibilidad de la pared de la cocina según el ángulo de cámara (no estorba al rodear). */
export const kitchenWallOpacity = (yaw: number) => interpolate(yaw, [70, 95], [1, 0], clamp);
