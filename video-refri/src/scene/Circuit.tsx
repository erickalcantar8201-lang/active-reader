/** Tuberías (tubo translúcido) + refrigerante (partículas dentro del tubo). */
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {
  CircuitCurve,
  PARTICLE_COUNT,
  SEGMENTS,
  TUBE_SEGMENTS,
  colorAt,
  hash01,
  particleS,
  pointAt,
  segmentAt,
  tubeRadius,
  vaporAt,
  SegmentId,
} from './circuit';
import {DIM} from './dims';

const white = new THREE.Color('#ffffff');

const Tube: React.FC<{id: SegmentId; glow: number}> = ({id, glow}) => {
  const {s0, s1} = SEGMENTS[id];
  const r = tubeRadius(id);
  const geo = useMemo(() => {
    const len = s1 - s0;
    const segs = Math.max(8, Math.ceil(len / 0.006));
    const radial = id === 'capilar' ? 8 : 14;
    const g = new THREE.TubeGeometry(new CircuitCurve(s0, s1), segs, r, radial, false);
    // color por anillo según el estado del refrigerante
    const colors: number[] = [];
    const c = new THREE.Color();
    for (let i = 0; i <= segs; i++) {
      colorAt(s0 + (len * i) / segs, c);
      for (let j = 0; j <= radial; j++) colors.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return g;
  }, [id, s0, s1, r]);
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.42,
        roughness: 0.18,
        metalness: 0.0,
        clearcoat: 1,
        depthWrite: false,
        side: THREE.FrontSide,
      }),
    [],
  );
  material.opacity = 0.4 + glow * 0.25;
  material.emissive = new THREE.Color('#ffffff');
  material.emissiveIntensity = 0.04 + glow * 0.12;
  return <mesh geometry={geo} material={material} renderOrder={3} />;
};

/** Contorno sólido muy fino para que el tubo se lea en planos abiertos. */
const TubeCore: React.FC<{id: SegmentId}> = ({id}) => {
  const {s0, s1} = SEGMENTS[id];
  const geo = useMemo(() => {
    const len = s1 - s0;
    const segs = Math.max(8, Math.ceil(len / 0.008));
    return new THREE.TubeGeometry(new CircuitCurve(s0, s1), segs, tubeRadius(id) * 0.28, 6, false);
  }, [id, s0, s1]);
  const material = useMemo(() => {
    const colors: number[] = [];
    const g = geo;
    const segs = (g.parameters as {tubularSegments: number}).tubularSegments;
    const c = new THREE.Color();
    for (let i = 0; i <= segs; i++) {
      colorAt(s0 + ((s1 - s0) * i) / segs, c);
      for (let j = 0; j <= 6; j++) colors.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return new THREE.MeshBasicMaterial({vertexColors: true, transparent: true, opacity: 0.35, depthWrite: false});
  }, [geo, s0, s1]);
  return <mesh geometry={geo} material={material} renderOrder={2} />;
};

export const Particles: React.FC<{t: number; showInsideCompressor: boolean}> = ({t, showInsideCompressor}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.SphereGeometry(1, 10, 8), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({toneMapped: false}), []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    const c = new THREE.Color();
    const q = new THREE.Quaternion();
    for (let k = 0; k < PARTICLE_COUNT; k++) {
      const s = particleS(k, t);
      const id = segmentAt(s);
      pointAt(s, p);
      colorAt(s, c);
      const isVapor = hash01(k) < vaporAt(s);
      const tubeR = tubeRadius(id);
      let r = isVapor ? Math.min(0.0052, tubeR * 0.5) : Math.min(0.0085, tubeR * 0.78);
      if (id === 'compresor' && !showInsideCompressor) r = 0;
      if (isVapor) c.lerp(white, 0.38);
      // pequeña dispersión dentro del tubo para el vapor
      if (isVapor && tubeR > 0.008) {
        p.x += (hash01(k + 17) - 0.5) * tubeR * 0.6;
        p.y += (hash01(k + 31) - 0.5) * tubeR * 0.6;
        p.z += (hash01(k + 53) - 0.5) * tubeR * 0.6;
      }
      m.compose(p, q, new THREE.Vector3(r, r, r));
      mesh.setMatrixAt(k, m);
      mesh.setColorAt(k, c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [t, showInsideCompressor]);
  return <instancedMesh ref={ref} args={[geo, material, PARTICLE_COUNT]} frustumCulled={false} renderOrder={1} />;
};

/** «Cometa» luminoso que guía la mirada a lo largo del circuito. */
export const Comet: React.FC<{s: number | null; intensity: number}> = ({s, intensity}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const N = 14;
  const geo = useMemo(() => new THREE.SphereGeometry(1, 16, 12), []);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false}),
    [],
  );
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const si = (s ?? 0) - i * 0.012;
      pointAt(si, p);
      colorAt(si, c).lerp(white, 0.2).multiplyScalar(intensity * 0.9 * (1 - i / N));
      const r = s === null || intensity <= 0 ? 0 : (0.015 - i * 0.0008) * (segmentAt(si) === 'capilar' ? 0.55 : 1);
      m.compose(p, new THREE.Quaternion(), new THREE.Vector3(r, r, r));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [s, intensity]);
  return <instancedMesh ref={ref} args={[geo, material, N]} frustumCulled={false} renderOrder={20} />;
};

export const Tubes: React.FC<{glow: Partial<Record<SegmentId, number>>}> = ({glow}) => (
  <group>
    {TUBE_SEGMENTS.map((id) => (
      <React.Fragment key={id}>
        <TubeCore id={id} />
        <Tube id={id} glow={glow[id] ?? 0} />
      </React.Fragment>
    ))}
  </group>
);

/** Varillas de acero del condensador de alambre y tubo + soportes. */
export const CondenserRods: React.FC = () => {
  const {condZ, zBack} = DIM;
  const {s0, s1} = SEGMENTS.condensador;
  const yTop = pointAt(s0 + 0.05).y + 0.03;
  const yBot = pointAt(s1 - 0.05).y - 0.03;
  const rods = useMemo(() => {
    const xs: number[] = [];
    for (let x = -0.27; x <= 0.2701; x += 0.03) xs.push(x);
    return xs;
  }, []);
  const steel = useMemo(() => new THREE.MeshStandardMaterial({color: '#2b3038', roughness: 0.5, metalness: 0.7}), []);
  return (
    <group>
      {rods.map((x) => (
        <mesh key={x} position={[x, (yTop + yBot) / 2, condZ - 0.016]} material={steel} castShadow>
          <cylinderGeometry args={[0.0022, 0.0022, yTop - yBot, 6]} />
        </mesh>
      ))}
      {[yTop + 0.01, yBot - 0.01].map((y) => (
        <group key={y}>
          {[-0.3, 0.3].map((x) => (
            <mesh key={x} position={[x, y, (condZ + zBack) / 2 - 0.006]} material={steel} castShadow>
              <boxGeometry args={[0.02, 0.012, zBack - condZ + 0.03]} />
            </mesh>
          ))}
          <mesh position={[0, y, condZ - 0.016]} material={steel}>
            <boxGeometry args={[0.6, 0.008, 0.008]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};
