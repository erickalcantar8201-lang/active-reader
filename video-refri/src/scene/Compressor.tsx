/**
 * Compresor hermético (carcasa) con corte transparente breve que deja ver un
 * mecanismo de pistón simplificado: entra vapor frío a baja presión, el pistón
 * reduce su volumen y sale más comprimido y caliente.
 */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {DIM} from './dims';
import {COLORS} from './circuit';
import {WALL_Z} from './Kitchen';

const {comp} = DIM;

/** Dirección horizontal desde el compresor hacia la cámara durante el corte. */
const CUT_YAW = THREE.MathUtils.degToRad(142);
const toCam = new THREE.Vector3(Math.sin(CUT_YAW), 0, Math.cos(CUT_YAW));
/** Lado de la caja de terminales (hacia el contacto de la pared, sin tapar el corte). */
const TERM_YAW = THREE.MathUtils.degToRad(80);
const toTerm = new THREE.Vector3(Math.sin(TERM_YAW), 0, Math.cos(TERM_YAW));
/** Eje del cilindro: perpendicular a la vista, para que el pistón se mueva de lado. */
const bore = new THREE.Vector3(-toCam.z, 0, toCam.x);

export const PISTON_HZ = 1.1;

export const Compressor: React.FC<{t: number; cut: number}> = ({t, cut}) => {
  const plane = useMemo(() => new THREE.Plane(), []);
  // corta la mitad más cercana a la cámara: δ va de r (nada) a -0.01 (mitad)
  const delta = THREE.MathUtils.lerp(comp.r + 0.02, -0.012, cut);
  plane.normal.copy(toCam).negate();
  plane.constant = toCam.dot(new THREE.Vector3(comp.x, comp.y, comp.z)) + delta;

  const shell = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#2a303b',
        roughness: 0.3,
        metalness: 0.55,
        clearcoat: 0.6,
        side: THREE.DoubleSide,
        clippingPlanes: [],
        clipShadows: true,
      }),
    [],
  );
  shell.clippingPlanes = cut > 0.001 ? [plane] : [];

  const m = useMemo(
    () => ({
      copper: new THREE.MeshStandardMaterial({color: '#8a5530', roughness: 0.45, metalness: 0.6}),
      iron: new THREE.MeshStandardMaterial({color: '#7c8796', roughness: 0.4, metalness: 0.7}),
      piston: new THREE.MeshStandardMaterial({color: '#d9dee6', roughness: 0.2, metalness: 0.9}),
      glass: new THREE.MeshPhysicalMaterial({color: '#bfe9ff', roughness: 0.1, transparent: true, opacity: 0.28, depthWrite: false}),
      gas: new THREE.MeshBasicMaterial({toneMapped: false}),
      term: new THREE.MeshStandardMaterial({color: '#151820', roughness: 0.7}),
      cable: new THREE.MeshStandardMaterial({color: '#1a1d24', roughness: 0.6}),
      foot: new THREE.MeshStandardMaterial({color: '#151820', roughness: 0.9}),
    }),
    [],
  );

  // Mecanismo (biela-manivela)
  const theta = 2 * Math.PI * PISTON_HZ * t;
  const crankR = 0.016;
  const rodL = 0.05;
  const xPin = crankR * Math.cos(theta) + Math.sqrt(rodL * rodL - Math.pow(crankR * Math.sin(theta), 2));
  // posición del pistón a lo largo del eje (0 = centro del cigüeñal)
  const headX = 0.088; // culata
  const pistonLen = 0.022;
  const pistonFace = xPin + pistonLen / 2 + 0.006;
  const chamber = Math.max(0.004, headX - pistonFace);
  const chamberMax = headX - (crankR * -1 + Math.sqrt(rodL * rodL) + pistonLen / 2 + 0.006);
  const compression = THREE.MathUtils.clamp(1 - chamber / chamberMax, 0, 1);
  const mechY = 0.03;
  const basis = useMemo(() => {
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), bore);
    return q;
  }, []);
  const crankPin = new THREE.Vector3(crankR * Math.cos(theta), 0, crankR * Math.sin(theta));
  // el pasador gira en el plano (eje, vertical-proyectado): usamos el plano horizontal girado
  const pinWorld = bore.clone().multiplyScalar(crankPin.x).add(toCam.clone().multiplyScalar(crankPin.z));
  const pistonPin = bore.clone().multiplyScalar(xPin);
  const rodMid = pinWorld.clone().add(pistonPin).multiplyScalar(0.5);
  const rodDir = pistonPin.clone().sub(pinWorld);
  const rodQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), rodDir.clone().normalize());

  const gasColor = COLORS.frioVapor.clone().lerp(COLORS.caliente, compression);
  const gas = Array.from({length: 12}, (_, i) => {
    const a = (i * 2.399) % (2 * Math.PI);
    const rr = 0.012 * Math.sqrt(((i * 7) % 12) / 12 + 0.05);
    const fx = ((i * 5) % 12) / 11;
    const x = pistonFace + 0.003 + fx * (chamber - 0.006);
    const off = toCam.clone().multiplyScalar(Math.cos(a) * rr);
    const p = bore.clone().multiplyScalar(x).add(off);
    return [p.x, mechY + Math.sin(a) * rr, p.z] as [number, number, number];
  });

  return (
    <group position={[comp.x, comp.y, comp.z]}>
      {/* carcasa */}
      <mesh material={shell} castShadow>
        <cylinderGeometry args={[comp.r, comp.r, comp.h, 48, 1, true]} />
      </mesh>
      <mesh material={shell} position={[0, comp.h / 2, 0]} scale={[1, 0.55, 1]} castShadow>
        <sphereGeometry args={[comp.r, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh material={shell} position={[0, -comp.h / 2, 0]} scale={[1, 0.45, 1]} castShadow>
        <sphereGeometry args={[comp.r, 48, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
      </mesh>
      {/* base y gomas */}
      <mesh position={[0, -comp.h / 2 - 0.04, 0]} material={m.iron} castShadow>
        <boxGeometry args={[0.2, 0.006, 0.16]} />
      </mesh>
      {[
        [-0.08, -0.06],
        [0.08, -0.06],
        [-0.08, 0.06],
        [0.08, 0.06],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, -comp.h / 2 - 0.05, z]} material={m.foot}>
          <cylinderGeometry args={[0.012, 0.012, 0.022, 12]} />
        </mesh>
      ))}
      {/* caja de terminales (alimentación eléctrica) */}
      <group position={toTerm.clone().multiplyScalar(comp.r + 0.008).add(new THREE.Vector3(0, -0.005, 0)).toArray()} rotation={[0, TERM_YAW, 0]}>
        <mesh material={m.term} castShadow>
          <boxGeometry args={[0.05, 0.045, 0.018]} />
        </mesh>
      </group>

      {/* --- Mecanismo interno (visible con el corte) --- */}
      <group visible={cut > 0.01}>
        {/* motor: estator de cobre y rotor */}
        <mesh position={[0, -0.045, 0]} material={m.copper}>
          <cylinderGeometry args={[0.062, 0.062, 0.04, 40]} />
        </mesh>
        <mesh position={[0, -0.045, 0]} material={m.iron}>
          <cylinderGeometry args={[0.032, 0.032, 0.042, 32]} />
        </mesh>
        {/* cigüeñal */}
        <mesh position={[0, 0.0, 0]} material={m.iron}>
          <cylinderGeometry args={[0.007, 0.007, 0.07, 16]} />
        </mesh>
        <mesh position={[pinWorld.x, mechY, pinWorld.z]} material={m.iron}>
          <cylinderGeometry args={[0.006, 0.006, 0.014, 12]} />
        </mesh>
        {/* biela */}
        <mesh position={[rodMid.x, mechY, rodMid.z]} quaternion={rodQ} material={m.piston}>
          <cylinderGeometry args={[0.0045, 0.0045, rodDir.length(), 10]} />
        </mesh>
        {/* cilindro transparente y culata */}
        <group quaternion={basis}>
          <mesh position={[(headX + 0.02) / 2, mechY, 0]} rotation={[0, 0, Math.PI / 2]} material={m.glass} renderOrder={9}>
            <cylinderGeometry args={[0.027, 0.027, headX - 0.02, 32, 1, true]} />
          </mesh>
          <mesh position={[headX + 0.004, mechY, 0]} rotation={[0, 0, Math.PI / 2]} material={m.iron}>
            <cylinderGeometry args={[0.03, 0.03, 0.01, 32]} />
          </mesh>
          {/* pistón */}
          <mesh position={[xPin + 0.006, mechY, 0]} rotation={[0, 0, Math.PI / 2]} material={m.piston}>
            <cylinderGeometry args={[0.0245, 0.0245, pistonLen, 32]} />
          </mesh>
        </group>
        {/* gas dentro de la cámara */}
        {gas.map((p, i) => (
          <mesh key={i} position={p} scale={0.0042 + 0.0006 * compression}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshBasicMaterial color={gasColor} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

/** Cable de alimentación: de la caja de terminales al contacto de la pared. */
export const CABLE_CURVE = (() => {
    const start = new THREE.Vector3(comp.x, comp.y - 0.005, comp.z).add(toTerm.clone().multiplyScalar(comp.r + 0.018));
    const pts = [
      start,
      start.clone().add(new THREE.Vector3(0.05, -0.05, 0.0)),
      new THREE.Vector3(0.3, 0.06, -0.3),
      new THREE.Vector3(0.4, 0.012, -0.45),
      new THREE.Vector3(0.46, 0.012, WALL_Z + 0.05),
      new THREE.Vector3(0.52, 0.05, WALL_Z + 0.03),
      new THREE.Vector3(0.52, 0.27, WALL_Z + 0.025),
    ];
    return new THREE.CatmullRomCurve3(pts, false, 'centripetal');
})();

export const PowerCable: React.FC = () => {
  const geo = useMemo(() => new THREE.TubeGeometry(CABLE_CURVE, 80, 0.006, 8, false), []);
  return (
    <mesh geometry={geo} castShadow>
      <meshStandardMaterial color="#14171d" roughness={0.6} />
    </mesh>
  );
};

/** Puntos útiles para anotaciones. */
export const COMP_ANCHORS = {
  top: new THREE.Vector3(comp.x, comp.y + comp.h / 2 + comp.r * 0.55, comp.z),
  terminal: new THREE.Vector3(comp.x, comp.y - 0.005, comp.z).add(toTerm.clone().multiplyScalar(comp.r + 0.02)),
  center: new THREE.Vector3(comp.x, comp.y + 0.02, comp.z),
  socket: new THREE.Vector3(0.52, 0.32, WALL_Z + 0.02),
};
