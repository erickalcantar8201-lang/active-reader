/** Cocina sencilla en azul marino: piso, pared, mueble bajo y alacena. */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {RBox} from './Fridge';
import {contactShadowTexture, floorTexture, wallTexture} from './materials';

export const WALL_Z = -0.64;

export const Kitchen: React.FC<{wallOpacity: number; warm: number}> = ({wallOpacity, warm}) => {
  const tex = useMemo(() => ({floor: floorTexture(), wall: wallTexture(), shadow: contactShadowTexture()}), []);
  const m = useMemo(
    () => ({
      floor: new THREE.MeshStandardMaterial({map: tex.floor, roughness: 0.75, metalness: 0.05}),
      wall: new THREE.MeshStandardMaterial({map: tex.wall, roughness: 0.95, transparent: true}),
      cab: new THREE.MeshStandardMaterial({color: '#25396a', roughness: 0.6}),
      cabDoor: new THREE.MeshStandardMaterial({color: '#2c4378', roughness: 0.5}),
      top: new THREE.MeshStandardMaterial({color: '#4a5f93', roughness: 0.35}),
      knob: new THREE.MeshStandardMaterial({color: '#9fb0d0', roughness: 0.3, metalness: 0.6}),
      splash: new THREE.MeshStandardMaterial({color: '#1d3062', roughness: 0.4, transparent: true}),
      pot: new THREE.MeshStandardMaterial({color: '#d77a4f', roughness: 0.7}),
      plant: new THREE.MeshStandardMaterial({color: '#3f9a6a', roughness: 0.7}),
      socket: new THREE.MeshStandardMaterial({color: '#cfd6e2', roughness: 0.5}),
      upper: new THREE.MeshStandardMaterial({color: '#25396a', roughness: 0.6, transparent: true}),
      upperDoor: new THREE.MeshStandardMaterial({color: '#2c4378', roughness: 0.5, transparent: true}),
      shadow: new THREE.MeshBasicMaterial({map: tex.shadow, transparent: true, depthWrite: false, opacity: 0.85}),
    }),
    [tex],
  );
  m.wall.opacity = wallOpacity;
  m.wall.visible = wallOpacity > 0.01;
  m.splash.opacity = wallOpacity;
  m.splash.visible = wallOpacity > 0.01;
  m.upper.opacity = m.upperDoor.opacity = wallOpacity;
  m.upper.visible = m.upperDoor.visible = wallOpacity > 0.01;
  m.wall.emissive = new THREE.Color('#ff7a4a');
  m.wall.emissiveIntensity = 0;
  void warm;

  const cx0 = -1.75;
  const cx1 = -0.42;
  const cz0 = WALL_Z;
  const cz1 = WALL_Z + 0.6;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={m.floor} receiveShadow>
        <planeGeometry args={[14, 14]} />
      </mesh>
      {/* sombra de contacto bajo el refri */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, -0.02]} material={m.shadow} renderOrder={1}>
        <planeGeometry args={[1.25, 1.15]} />
      </mesh>
      <mesh position={[-0.6, 2, WALL_Z]} material={m.wall} receiveShadow>
        <planeGeometry args={[7, 4]} />
      </mesh>
      {/* contacto (alimentación eléctrica) */}
      <RBox size={[0.08, 0.12, 0.012]} pos={[0.52, 0.32, WALL_Z + 0.006]} r={0.006} material={m.socket} cast={false} />

      {/* mueble bajo */}
      <RBox size={[cx1 - cx0, 0.84, cz1 - cz0 - 0.02]} pos={[(cx0 + cx1) / 2, 0.42 + 0.04, (cz0 + cz1) / 2 - 0.01]} r={0.01} material={m.cab} />
      <RBox size={[cx1 - cx0, 0.08, cz1 - cz0 - 0.06]} pos={[(cx0 + cx1) / 2, 0.04, (cz0 + cz1) / 2 - 0.03]} r={0.004} material={m.cab} />
      {[0, 1].map((i) => {
        const w = (cx1 - cx0 - 0.03) / 2;
        const x = cx0 + 0.015 + w * i + w / 2;
        return (
          <group key={i}>
            <RBox size={[w - 0.012, 0.72, 0.02]} pos={[x, 0.48, cz1 - 0.01]} r={0.008} material={m.cabDoor} />
            <RBox size={[0.016, 0.12, 0.02]} pos={[x + (i === 0 ? w / 2 - 0.06 : -w / 2 + 0.06), 0.7, cz1 + 0.012]} r={0.006} material={m.knob} />
          </group>
        );
      })}
      <RBox size={[cx1 - cx0 + 0.04, 0.04, cz1 - cz0 + 0.03]} pos={[(cx0 + cx1) / 2, 0.9, (cz0 + cz1) / 2 + 0.015]} r={0.008} material={m.top} />
      {/* salpicadero y alacena */}
      <mesh position={[(cx0 + cx1) / 2, 1.18, WALL_Z + 0.004]} material={m.splash}>
        <planeGeometry args={[cx1 - cx0, 0.52]} />
      </mesh>
      <RBox size={[cx1 - cx0, 0.62, 0.34]} pos={[(cx0 + cx1) / 2, 1.82, WALL_Z + 0.17]} r={0.01} material={m.upper} />
      {[0, 1].map((i) => {
        const w = (cx1 - cx0 - 0.03) / 2;
        const x = cx0 + 0.015 + w * i + w / 2;
        return <RBox key={i} size={[w - 0.012, 0.56, 0.02]} pos={[x, 1.82, WALL_Z + 0.35]} r={0.008} material={m.upperDoor} />;
      })}
      {/* planta */}
      <group position={[-0.72, 0.92, WALL_Z + 0.3]}>
        <mesh material={m.pot} position={[0, 0.06, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.045, 0.12, 24]} />
        </mesh>
        {[
          [0, 0.17, 0, 0.07],
          [0.05, 0.2, 0.02, 0.05],
          [-0.045, 0.21, -0.01, 0.05],
          [0.01, 0.25, -0.02, 0.045],
        ].map(([x, y, z, r], i) => (
          <mesh key={i} material={m.plant} position={[x, y, z]} castShadow>
            <icosahedronGeometry args={[r, 1]} />
          </mesh>
        ))}
      </group>
    </group>
  );
};
