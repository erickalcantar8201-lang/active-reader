import React from 'react';
import {Composition} from 'remotion';
import {RefriCalor} from './RefriCalor';
import {DURATION_FRAMES, FPS, HEIGHT, WIDTH} from './timeline';

export const RemotionRoot: React.FC = () => (
  <Composition id="RefriCalor" component={RefriCalor} durationInFrames={DURATION_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
);
