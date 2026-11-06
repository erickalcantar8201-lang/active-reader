/**
 * Refrigerador doméstico original (sin marca), una puerta, condensador trasero.
 * Geometría única: la misma malla se usa en todas las escenas.
 */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {DIM} from './dims';
import {mat} from './materials';
import {Food} from './Food';

type V3 = [number, number, number];
const LAMP = new THREE.MeshBasicMaterial({color: '#ffffff'});

export const RBox: React.FC<{
  size: V3;
  pos: V3;
  r?: number;
  material: THREE.Material;
  cast?: boolean;
  receive?: boolean;
  renderOrder?: number;
}> = ({size, pos, r = 0.012, material, cast = true, receive = true, renderOrder}) => {
  const geo = useMemo(() => new RoundedBoxGeometry(size[0], size[1], size[2], 3, Math.min(r, ...size.map((s) => s / 2 - 1e-4))), [size, r]);
  return <mesh geometry={geo} material={material} position={pos} castShadow={cast} receiveShadow={receive} renderOrder={renderOrder} />;
};

/** Caja definida por sus límites. */
const span = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => ({
  size: [x1 - x0, y1 - y0, z1 - z0] as V3,
  pos: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2] as V3,
});

const Lines: React.FC<{points: V3[][]; color: string; opacity?: number}> = ({points, color, opacity = 1}) => {
  const geo = useMemo(() => {
    const arr: number[] = [];
    points.forEach((poly) => {
      for (let i = 0; i < poly.length - 1; i++) arr.push(...poly[i], ...poly[i + 1]);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    return g;
  }, [points]);
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </lineSegments>
  );
};

export const Fridge: React.FC<{sideOpacity: number; evapCover: number}> = ({sideOpacity, evapCover}) => {
  const {W, H, y0, zBack, zFront, wall, cav, notch, doorT} = DIM;
  const xL = -W / 2;
  const xR = W / 2;

  mat.sideGlass.opacity = sideOpacity;
  mat.linerCover.opacity = evapCover;
  mat.linerCover.visible = evapCover > 0.01;

  // Contorno del corte lateral (siempre preciso, aunque la pared sea transparente).
  const sideOutline: V3[][] = useMemo(
    () => [
      [
        [xR, notch.y, zBack],
        [xR, H - 0.01, zBack],
        [xR, H - 0.01, zFront],
        [xR, y0, zFront],
        [xR, y0, notch.z],
        [xR, notch.y, notch.z],
        [xR, notch.y, zBack],
      ],
      [
        [xR, cav.y0, cav.zBack],
        [xR, cav.y1, cav.zBack],
        [xR, cav.y1, zFront],
      ],
      [
        [xR, cav.y0, zFront],
        [xR, cav.y0, cav.zBack],
      ],
    ],
    [],
  );

  return (
    <group>
      {/* --- Gabinete --- */}
      {/* techo */}
      <RBox {...span(xL, xR, cav.y1, H, zBack, zFront)} material={mat.body} r={0.02} />
      {/* pared izquierda */}
      <RBox {...span(xL, xL + wall, cav.y0 - 0.06, cav.y1 + 0.01, zBack, zFront)} material={mat.body} r={0.012} />
      <RBox {...span(xL, xL + wall, y0, notch.y + 0.01, notch.z, zFront)} material={mat.body} r={0.012} />
      {/* espalda (lámina trasera) */}
      <RBox {...span(xL + 0.002, xR - 0.002, notch.y, cav.y1 + 0.02, zBack, cav.zBack)} material={mat.backPanel} r={0.008} />
      {/* piso aislado del compartimento */}
      <RBox {...span(xL + wall - 0.005, xR - 0.004, notch.y, cav.y0, zBack + 0.005, zFront)} material={mat.insulation} r={0.004} cast={false} />
      {/* zócalo inferior (bajo la puerta) */}
      <RBox {...span(xL + wall - 0.005, xR - 0.004, y0, notch.y, notch.z, zFront)} material={mat.body} r={0.01} />
      <RBox {...span(xL + 0.08, xR - 0.08, y0 + 0.05, notch.y - 0.06, zFront - 0.004, zFront + 0.004)} material={mat.grille} r={0.004} />
      {/* pared del nicho del compresor */}
      <mesh position={[0, (y0 + notch.y) / 2, notch.z - 0.001]} rotation={[0, Math.PI, 0]} receiveShadow>
        <planeGeometry args={[W - 0.01, notch.y - y0]} />
        <meshStandardMaterial color="#3a414d" roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      {/* soporte del compresor */}
      <RBox {...span(xL + 0.03, xR - 0.03, y0, y0 + 0.014, zBack - 0.08, notch.z)} material={mat.steel} r={0.004} />
      {/* patas */}
      {[
        [xL + 0.06, zFront - 0.06],
        [xR - 0.06, zFront - 0.06],
        [xL + 0.06, zBack + 0.08],
        [xR - 0.06, zBack + 0.08],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, y0 / 2, z]} castShadow>
          <cylinderGeometry args={[0.022, 0.026, y0, 16]} />
          <meshStandardMaterial color="#2a2f38" roughness={0.6} />
        </mesh>
      ))}

      {/* pared derecha: corte transparente */}
      <mesh position={[xR - 0.0015, (notch.y + H) / 2, (zBack + zFront) / 2]} rotation={[0, Math.PI / 2, 0]} material={mat.sideGlass} renderOrder={5}>
        <planeGeometry args={[zFront - zBack, H - notch.y]} />
      </mesh>
      <mesh position={[xR - 0.0015, (y0 + notch.y) / 2, (notch.z + zFront) / 2]} rotation={[0, Math.PI / 2, 0]} material={mat.sideGlass} renderOrder={5}>
        <planeGeometry args={[zFront - notch.z, notch.y - y0]} />
      </mesh>
      <Lines points={sideOutline} color="#eef3f8" opacity={0.55 + (1 - sideOpacity) * 0.35} />

      {/* --- Forro interior luminoso --- */}
      <mesh position={[0, (cav.y0 + cav.y1) / 2, cav.zBack + 0.001]} material={mat.liner} receiveShadow>
        <planeGeometry args={[2 * cav.x, cav.y1 - cav.y0]} />
      </mesh>
      <mesh position={[-cav.x, (cav.y0 + cav.y1) / 2, (cav.zBack + cav.zFront) / 2]} rotation={[0, Math.PI / 2, 0]} material={mat.liner} receiveShadow>
        <planeGeometry args={[cav.zFront - cav.zBack, cav.y1 - cav.y0]} />
      </mesh>
      <mesh position={[0, cav.y1 - 0.001, (cav.zBack + cav.zFront) / 2]} rotation={[Math.PI / 2, 0, 0]} material={mat.liner}>
        <planeGeometry args={[2 * cav.x, cav.zFront - cav.zBack]} />
      </mesh>
      <mesh position={[0, cav.y0 + 0.001, (cav.zBack + cav.zFront) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={mat.liner} receiveShadow>
        <planeGeometry args={[2 * cav.x, cav.zFront - cav.zBack]} />
      </mesh>
      {/* lámpara */}
      <RBox {...span(-0.09, 0.09, cav.y1 - 0.025, cav.y1, 0.12, 0.2)} r={0.008} material={LAMP} cast={false} />

      {/* placa del evaporador (pared fría) */}
      <RBox {...span(-0.255, 0.255, 1.035, 1.585, cav.zBack - 0.004, cav.zBack + 0.002)} r={0.004} material={mat.evapPlate} cast={false} />
      {/* tapa del forro sobre el evaporador (se desvanece al revelarlo) */}
      <mesh position={[0, 1.31, cav.zBack + 0.026]} material={mat.linerCover} renderOrder={4}>
        <planeGeometry args={[0.56, 0.6]} />
      </mesh>

      {/* --- Repisas y cajón --- */}
      {DIM.shelves.map((y) => (
        <group key={y}>
          <mesh position={[0, y - 0.004, (cav.zBack + zFront - 0.04) / 2]} material={mat.shelfGlass} renderOrder={6}>
            <boxGeometry args={[2 * cav.x - 0.004, 0.008, zFront - 0.04 - cav.zBack]} />
          </mesh>
          <RBox {...span(-cav.x, cav.x, y - 0.012, y + 0.006, zFront - 0.05, zFront - 0.036)} r={0.004} material={mat.trim} cast={false} />
        </group>
      ))}
      {/* cajón de verduras */}
      <mesh position={[0, 0.505, -0.0]} material={mat.shelfGlass} renderOrder={6}>
        <boxGeometry args={[2 * cav.x - 0.03, 0.19, 0.48]} />
      </mesh>
      <RBox {...span(-cav.x + 0.015, cav.x - 0.015, 0.585, 0.602, 0.23, 0.245)} r={0.004} material={mat.trim} cast={false} />

      <Food />

      {/* --- Puerta: marco con ventana de corte --- */}
      <Door />
    </group>
  );
};

const Door: React.FC = () => {
  const {W, H, zFront, doorT, notch} = DIM;
  const x0 = -W / 2;
  const x1 = W / 2;
  const y0 = notch.y + 0.012;
  const y1 = H - 0.004;
  const z0 = zFront + 0.004;
  const z1 = zFront + doorT;
  const side = 0.06;
  const tb = 0.075;
  const glassEdge: V3[][] = [
    [
      [x0 + side, y0 + tb, z1],
      [x1 - side, y0 + tb, z1],
      [x1 - side, y1 - tb, z1],
      [x0 + side, y1 - tb, z1],
      [x0 + side, y0 + tb, z1],
    ],
  ];
  return (
    <group>
      {/* burlete (anillo) */}
      <RBox {...span(x0 + 0.01, x1 - 0.01, y1 - 0.03, y1 - 0.01, zFront - 0.001, z0 + 0.002)} r={0.004} material={mat.gasket} cast={false} />
      <RBox {...span(x0 + 0.01, x1 - 0.01, y0 + 0.01, y0 + 0.03, zFront - 0.001, z0 + 0.002)} r={0.004} material={mat.gasket} cast={false} />
      <RBox {...span(x0 + 0.01, x0 + 0.03, y0 + 0.01, y1 - 0.01, zFront - 0.001, z0 + 0.002)} r={0.004} material={mat.gasket} cast={false} />
      <RBox {...span(x1 - 0.03, x1 - 0.01, y0 + 0.01, y1 - 0.01, zFront - 0.001, z0 + 0.002)} r={0.004} material={mat.gasket} cast={false} />
      {/* marco */}
      <RBox {...span(x0, x1, y1 - tb, y1, z0, z1)} r={0.016} material={mat.body} />
      <RBox {...span(x0, x1, y0, y0 + tb, z0, z1)} r={0.016} material={mat.body} />
      <RBox {...span(x0, x0 + side, y0 + tb - 0.02, y1 - tb + 0.02, z0, z1)} r={0.012} material={mat.body} />
      <RBox {...span(x1 - side, x1, y0 + tb - 0.02, y1 - tb + 0.02, z0, z1)} r={0.012} material={mat.body} />
      {/* caras del corte (espesor aislado de la puerta) */}
      <RBox {...span(x0 + side - 0.004, x1 - side + 0.004, y1 - tb, y1 - tb + 0.004, z0 + 0.004, z1 - 0.002)} r={0.001} material={mat.cut} cast={false} />
      <RBox {...span(x0 + side - 0.004, x1 - side + 0.004, y0 + tb - 0.004, y0 + tb, z0 + 0.004, z1 - 0.002)} r={0.001} material={mat.cut} cast={false} />
      <RBox {...span(x0 + side - 0.004, x0 + side, y0 + tb, y1 - tb, z0 + 0.004, z1 - 0.002)} r={0.001} material={mat.cut} cast={false} />
      <RBox {...span(x1 - side, x1 - side + 0.004, y0 + tb, y1 - tb, z0 + 0.004, z1 - 0.002)} r={0.001} material={mat.cut} cast={false} />
      {/* ventana de corte */}
      <mesh position={[0, (y0 + y1) / 2, z1 - 0.004]} material={mat.doorGlass} renderOrder={8}>
        <planeGeometry args={[x1 - x0 - 2 * side, y1 - y0 - 2 * tb]} />
      </mesh>
      <Lines points={glassEdge} color="#bfefff" opacity={0.75} />
      {/* jaladera */}
      <RBox {...span(x0 + 0.018, x0 + 0.04, 0.95, 1.42, z1 + 0.018, z1 + 0.034)} r={0.009} material={mat.trim} />
      <RBox {...span(x0 + 0.02, x0 + 0.038, 0.97, 0.99, z1, z1 + 0.02)} r={0.004} material={mat.trim} />
      <RBox {...span(x0 + 0.02, x0 + 0.038, 1.38, 1.4, z1, z1 + 0.02)} r={0.004} material={mat.trim} />
    </group>
  );
};
