import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Scene3D} from './scene/Scene3D';
import {Overlay} from './overlay/Overlay';
import {Soundtrack} from './audio/Soundtrack';
import {FontLoader} from './overlay/fonts';

export const RefriCalor: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: '#0a1530'}}>
    <FontLoader />
    <Scene3D />
    {/* viñeta suave para dar profundidad y contraste a los textos */}
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(ellipse 85% 70% at 50% 55%, rgba(10,21,48,0) 55%, rgba(6,12,30,0.55) 100%), linear-gradient(180deg, rgba(6,12,30,0.55) 0%, rgba(6,12,30,0) 22%)',
        pointerEvents: 'none',
      }}
    />
    <Overlay />
    <Soundtrack />
  </AbsoluteFill>
);
