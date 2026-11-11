/** Dimensiones únicas del refrigerador (metros). Toda la escena las comparte. */
export const DIM = {
  W: 0.7, // ancho
  H: 1.75, // alto total
  y0: 0.05, // altura de la base (patas)
  zBack: -0.33, // cara trasera del gabinete
  zFront: 0.29, // cara frontal del gabinete (sin puerta)
  doorT: 0.05, // grosor de puerta
  wall: 0.06, // grosor de paredes
  // cavidad interior
  cav: {x: 0.29, y0: 0.4, y1: 1.66, zBack: -0.27, zFront: 0.29},
  // nicho inferior trasero para el compresor
  notch: {y: 0.34, z: -0.17},
  evapZ: -0.262,
  gapZ: -0.357,
  condZ: -0.4,
  comp: {x: 0.08, y: 0.17, z: -0.29, r: 0.1, h: 0.1},
  shelves: [0.66, 1.0],
} as const;
