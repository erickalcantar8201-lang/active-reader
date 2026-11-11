/** Alimentos con apariencia natural (no se tiñen con los colores explicativos). */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {DIM} from './dims';

const std = (color: string, roughness = 0.5, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness, ...extra});

const M = {
  milk: std('#f7f7f2', 0.35),
  cap: std('#2f6fd6', 0.4),
  carton: std('#f39a2b', 0.55),
  cartonTop: std('#fbe3b4', 0.6),
  jar: new THREE.MeshPhysicalMaterial({color: '#c9302c', roughness: 0.15, transmission: 0, clearcoat: 0.8}),
  lid: std('#d8b04a', 0.3, {metalness: 0.7}),
  apple: new THREE.MeshPhysicalMaterial({color: '#d0262d', roughness: 0.32, clearcoat: 0.6}),
  stem: std('#5b3a1e', 0.8),
  bowl: std('#f4f1ea', 0.3),
  cheese: std('#f5c842', 0.6),
  egg: std('#f3e6d3', 0.55),
  tray: std('#c8b89a', 0.9),
  lettuce: std('#58b04a', 0.7),
  lettuce2: std('#86cc5a', 0.7),
  tomato: new THREE.MeshPhysicalMaterial({color: '#e2412f', roughness: 0.25, clearcoat: 0.7}),
  carrot: std('#f07a1d', 0.6),
  leaf: std('#3f8f35', 0.7),
  box: new THREE.MeshPhysicalMaterial({color: '#e9f6ff', roughness: 0.2, transparent: true, opacity: 0.55}),
  boxLid: std('#4bb38a', 0.5),
  leftovers: std('#c98b3a', 0.7),
};

const Mesh: React.FC<{geo: THREE.BufferGeometry; m: THREE.Material; p: [number, number, number]; r?: [number, number, number]; s?: [number, number, number]}> = ({geo, m, p, r, s}) => (
  <mesh geometry={geo} material={m} position={p} rotation={r} scale={s} castShadow receiveShadow />
);

export const Food: React.FC = () => {
  const [s1, s2] = DIM.shelves;
  const g = useMemo(
    () => ({
      bottle: new THREE.LatheGeometry(
        [
          [0.0, 0],
          [0.034, 0],
          [0.036, 0.006],
          [0.036, 0.14],
          [0.026, 0.17],
          [0.016, 0.185],
          [0.016, 0.2],
          [0, 0.2],
        ].map(([x, y]) => new THREE.Vector2(x, y)),
        40,
      ),
      cap: new THREE.CylinderGeometry(0.018, 0.018, 0.018, 24),
      carton: new RoundedBoxGeometry(0.075, 0.18, 0.075, 2, 0.004),
      cartonTop: new THREE.CylinderGeometry(0.0001, 0.0375 * Math.SQRT2, 0.035, 4, 1),
      jar: new THREE.CylinderGeometry(0.036, 0.036, 0.085, 32),
      lid: new THREE.CylinderGeometry(0.038, 0.038, 0.018, 32),
      apple: new THREE.SphereGeometry(0.034, 32, 24),
      stem: new THREE.CylinderGeometry(0.002, 0.003, 0.018, 6),
      bowl: new THREE.LatheGeometry(
        [
          [0.0, 0.0],
          [0.05, 0.0],
          [0.085, 0.035],
          [0.095, 0.055],
          [0.09, 0.056],
          [0.08, 0.04],
          [0.0, 0.01],
        ].map(([x, y]) => new THREE.Vector2(x, y)),
        40,
      ),
      cheese: (() => {
        const sh = new THREE.Shape();
        sh.moveTo(0, 0);
        sh.lineTo(0.11, 0);
        sh.lineTo(0.0, 0.065);
        sh.closePath();
        const e = new THREE.ExtrudeGeometry(sh, {depth: 0.055, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 2});
        return e;
      })(),
      egg: new THREE.SphereGeometry(0.02, 24, 16),
      tray: new RoundedBoxGeometry(0.1, 0.02, 0.1, 2, 0.004),
      leaf: new THREE.IcosahedronGeometry(0.05, 1),
      tomato: new THREE.SphereGeometry(0.03, 28, 20),
      carrot: new THREE.ConeGeometry(0.014, 0.13, 16),
      box: new RoundedBoxGeometry(0.13, 0.065, 0.11, 2, 0.008),
      boxLid: new RoundedBoxGeometry(0.135, 0.012, 0.115, 2, 0.005),
      fill: new RoundedBoxGeometry(0.12, 0.04, 0.1, 2, 0.006),
    }),
    [],
  );

  return (
    <group>
      {/* Repisa baja */}
      <Mesh geo={g.bottle} m={M.milk} p={[-0.19, s1, 0.04]} />
      <Mesh geo={g.cap} m={M.cap} p={[-0.19, s1 + 0.205, 0.04]} />
      <group position={[-0.07, s1, -0.08]}>
        <Mesh geo={g.carton} m={M.carton} p={[0, 0.09, 0]} />
        <Mesh geo={g.cartonTop} m={M.cartonTop} p={[0, 0.1975, 0]} r={[0, Math.PI / 4, 0]} s={[1, 1, 0.12]} />
      </group>
      <Mesh geo={g.jar} m={M.jar} p={[0.06, s1 + 0.0425, 0.07]} />
      <Mesh geo={g.lid} m={M.lid} p={[0.06, s1 + 0.094, 0.07]} />
      <group position={[0.19, s1, -0.04]}>
        <Mesh geo={g.box} m={M.box} p={[0, 0.0325, 0]} />
        <Mesh geo={g.fill} m={M.leftovers} p={[0, 0.024, 0]} />
        <Mesh geo={g.boxLid} m={M.boxLid} p={[0, 0.07, 0]} />
      </group>

      {/* Repisa alta */}
      <group position={[-0.14, s2, 0.06]}>
        <Mesh geo={g.bowl} m={M.bowl} p={[0, 0, 0]} />
        {[
          [-0.03, 0.05, 0.01],
          [0.035, 0.05, -0.012],
          [0.0, 0.06, 0.035],
        ].map(([x, y, z], i) => (
          <group key={i} position={[x, y, z]}>
            <Mesh geo={g.apple} m={M.apple} p={[0, 0, 0]} s={[1, 0.9, 1]} />
            <Mesh geo={g.stem} m={M.stem} p={[0.002, 0.034, 0]} r={[0, 0, 0.3]} />
          </group>
        ))}
      </group>
      <Mesh geo={g.cheese} m={M.cheese} p={[0.02, s2 + 0.003, 0.11]} r={[0, -0.5, 0]} />
      <group position={[0.17, s2, 0.05]}>
        <Mesh geo={g.tray} m={M.tray} p={[0, 0.01, 0]} />
        {[
          [-0.024, -0.024],
          [0.024, -0.024],
          [-0.024, 0.024],
          [0.024, 0.024],
        ].map(([x, z], i) => (
          <Mesh key={i} geo={g.egg} m={M.egg} p={[x, 0.036, z]} s={[1, 1.28, 1]} />
        ))}
      </group>

      {/* Cajón de verduras */}
      <group position={[0, 0.41, 0]}>
        <Mesh geo={g.leaf} m={M.lettuce} p={[-0.15, 0.06, -0.05]} s={[1.3, 1.0, 1.2]} />
        <Mesh geo={g.leaf} m={M.lettuce2} p={[-0.11, 0.07, 0.02]} s={[1.0, 0.9, 1.0]} />
        <Mesh geo={g.tomato} m={M.tomato} p={[0.03, 0.03, 0.06]} s={[1, 0.85, 1]} />
        <Mesh geo={g.tomato} m={M.tomato} p={[0.09, 0.03, 0.02]} s={[1, 0.85, 1]} />
        <Mesh geo={g.carrot} m={M.carrot} p={[0.18, 0.02, -0.02]} r={[Math.PI / 2, 0, 0.4]} />
        <Mesh geo={g.carrot} m={M.carrot} p={[0.2, 0.035, 0.03]} r={[Math.PI / 2, 0, 0.2]} />
      </group>
    </group>
  );
};

/** Puntos de referencia de los alimentos (para flechas de calor). */
export const FOOD_ANCHORS = {
  manzanas: new THREE.Vector3(-0.14, DIM.shelves[1] + 0.07, 0.06),
  leche: new THREE.Vector3(-0.19, DIM.shelves[0] + 0.12, 0.04),
  frasco: new THREE.Vector3(0.06, DIM.shelves[0] + 0.05, 0.07),
  huevos: new THREE.Vector3(0.17, DIM.shelves[1] + 0.04, 0.05),
  queso: new THREE.Vector3(0.05, DIM.shelves[1] + 0.03, 0.11),
  verduras: new THREE.Vector3(-0.12, 0.48, 0.0),
};
