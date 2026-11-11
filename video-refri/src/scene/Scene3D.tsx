import React, {useLayoutEffect} from 'react';
import * as THREE from 'three';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {useCurrentFrame} from 'remotion';
import {FPS, HEIGHT, L, SCENES, WIDTH} from '../timeline';
import {applyCamera, cameraAt, followS} from './camera';
import {Fridge} from './Fridge';
import {Kitchen} from './Kitchen';
import {CondenserRods, Comet, Particles, Tubes} from './Circuit';
import {Compressor, PowerCable} from './Compressor';
import {compCut, evapCover, heatEmphasis, kitchenWallOpacity, sideWallOpacity} from './reveal';
import {SegmentId} from './circuit';
import {PALETTE} from './materials';

const CameraRig: React.FC<{t: number}> = ({t}) => {
  const {camera, gl, scene} = useThree();
  useLayoutEffect(() => {
    applyCamera(camera as THREE.PerspectiveCamera, cameraAt(t));
    gl.localClippingEnabled = true;
    scene.background = new THREE.Color(PALETTE.navy);
    scene.fog = new THREE.Fog(PALETTE.navy, 7, 16);
  }, [t, camera, gl, scene]);
  return null;
};

const range = (t: number, a: number, b: number, fade = 0.4) =>
  Math.max(0, Math.min(1, (t - a) / fade, (b - t) / fade));

export const Scene3D: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = cameraAt(t);
  const heat = heatEmphasis(t);

  // pieza activa: el tubo correspondiente brilla un poco más
  const glow: Partial<Record<SegmentId, number>> = {
    evap: range(t, L.l3.start, SCENES.absorcion.end),
    succion: range(t, SCENES.compresor.start, SCENES.compresor.start + 2.5),
    descarga: range(t, SCENES.condensador.start - 0.4, SCENES.condensador.start + 1.6),
    condensador: range(t, SCENES.condensador.start + 0.6, SCENES.condensador.end),
    capilar: range(t, SCENES.capilar.start, SCENES.capilar.end + 0.4),
  };
  const fs = followS(t);
  const cometI = fs === null ? 0 : 1;

  return (
    <ThreeCanvas
      width={WIDTH}
      height={HEIGHT}
      shadows="soft"
      gl={{antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05}}
      camera={{fov: 34, near: 0.02, far: 60, position: [2, 1.5, 4]}}
      style={{position: 'absolute', inset: 0}}
    >
      <CameraRig t={t} />
      <hemisphereLight args={['#9fb2d8', '#0b1430', 0.9]} />
      <directionalLight
        position={[-2.6, 4.6, 3.6]}
        intensity={2.8}
        color="#f4f7ff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-2.2}
        shadow-camera-right={2.2}
        shadow-camera-top={2.6}
        shadow-camera-bottom={-0.6}
        shadow-camera-near={0.5}
        shadow-camera-far={12}
        shadow-bias={-0.0008}
        shadow-normalBias={0.025}
        shadow-radius={6}
      />
      <directionalLight position={[3.5, 1.8, 2.5]} intensity={0.75} color="#9cc0ff" />
      <directionalLight position={[2.5, 2.5, -3.5]} intensity={0.9} color="#8fb0ff" />
      {/* luz interior fría */}
      <pointLight position={[0, 1.52, 0.12]} intensity={0.9} distance={1.5} decay={1.6} color="#e3f3ff" />
      <pointLight position={[0, 0.7, 0.15]} intensity={0.45} distance={1.0} decay={1.6} color="#e3f3ff" />
      {/* calor del condensador: luz cálida detrás */}
      <pointLight position={[0, 1.05, -0.58]} intensity={1.4 * heat} distance={2.6} decay={1.4} color="#ff7a4e" />
      <pointLight position={[0, 1.95, -0.55]} intensity={0.9 * heat} distance={1.8} decay={1.4} color="#ff8a5a" />

      <Kitchen wallOpacity={kitchenWallOpacity(cam.yaw)} warm={heat} />
      <Fridge sideOpacity={sideWallOpacity(t)} evapCover={evapCover(t)} />
      <CondenserRods />
      <Tubes glow={glow} />
      <Particles t={t} showInsideCompressor={false} />
      <Compressor t={t} cut={compCut(t)} />
      <PowerCable />
      <Comet s={fs} intensity={cometI} />
    </ThreeCanvas>
  );
};
