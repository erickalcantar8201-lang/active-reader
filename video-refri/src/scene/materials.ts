import * as THREE from 'three';

/** Paleta de la pieza (recurso visual, no datos físicos). */
export const PALETTE = {
  navy: '#0a1530',
  navy2: '#13244a',
  fridge: '#dfe4ea',
  fridgeDark: '#9aa3b1',
  backPanel: '#58606d',
  interior: '#f1f8ff',
  cyan: '#2fd3f5',
  coral: '#ff6a4d',
  amber: '#ffb347',
  yellow: '#ffd84a',
  white: '#ffffff',
};

export const mat = {
  body: new THREE.MeshPhysicalMaterial({
    color: PALETTE.fridge,
    roughness: 0.34,
    metalness: 0.04,
    clearcoat: 0.55,
    clearcoatRoughness: 0.28,
  }),
  trim: new THREE.MeshStandardMaterial({color: '#aab2bf', roughness: 0.4, metalness: 0.3}),
  gasket: new THREE.MeshStandardMaterial({color: '#4a5260', roughness: 0.8}),
  grille: new THREE.MeshStandardMaterial({color: '#3b4250', roughness: 0.7, metalness: 0.2}),
  backPanel: new THREE.MeshStandardMaterial({color: PALETTE.backPanel, roughness: 0.62, metalness: 0.25}),
  insulation: new THREE.MeshStandardMaterial({color: '#cfd6df', roughness: 0.9}),
  liner: new THREE.MeshStandardMaterial({
    color: PALETTE.interior,
    roughness: 0.55,
    emissive: new THREE.Color('#bfe3ff'),
    emissiveIntensity: 0.2,
  }),
  linerCover: new THREE.MeshStandardMaterial({
    color: PALETTE.interior,
    roughness: 0.55,
    emissive: new THREE.Color('#bfe3ff'),
    emissiveIntensity: 0.2,
    transparent: true,
  }),
  sideGlass: new THREE.MeshPhysicalMaterial({
    color: PALETTE.fridge,
    roughness: 0.3,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
  doorGlass: new THREE.MeshPhysicalMaterial({
    color: '#cfefff',
    roughness: 0.08,
    metalness: 0,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
  shelfGlass: new THREE.MeshPhysicalMaterial({
    color: '#d8f2ff',
    roughness: 0.1,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  }),
  evapPlate: new THREE.MeshStandardMaterial({
    color: '#9fcde6',
    roughness: 0.4,
    metalness: 0.45,
    emissive: new THREE.Color('#4fa9d6'),
    emissiveIntensity: 0.12,
  }),
  steel: new THREE.MeshStandardMaterial({color: '#2d333d', roughness: 0.45, metalness: 0.6}),
  cut: new THREE.MeshStandardMaterial({color: '#f0dfb6', roughness: 0.9}),
  rubber: new THREE.MeshStandardMaterial({color: '#1d2129', roughness: 0.9}),
};

/** Textura de sombra de contacto (degradado radial suave). */
export function contactShadowTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  grd.addColorStop(0, 'rgba(0,0,0,0.75)');
  grd.addColorStop(0.45, 'rgba(0,0,0,0.42)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Losetas sutiles para el piso de la cocina. */
export function floorTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#1a2b52';
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = 'rgba(120,150,210,0.16)';
  g.lineWidth = 4;
  for (let i = 0; i <= 512; i += 128) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i, 512);
    g.stroke();
    g.beginPath();
    g.moveTo(0, i);
    g.lineTo(512, i);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 10);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Degradado vertical para la pared (más claro abajo, cálido si hay calor). */
export function wallTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, '#0d1a3a');
  grd.addColorStop(1, '#1b2f5c');
  g.fillStyle = grd;
  g.fillRect(0, 0, 8, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
