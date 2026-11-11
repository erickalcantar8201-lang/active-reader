/**
 * Mezcla: narración (prioridad), música baja con «ducking» bajo la voz, y
 * efectos discretos sincronizados con la línea de tiempo.
 */
import React from 'react';
import {Audio, Sequence, interpolate, staticFile} from 'remotion';
import {DURATION_FRAMES, FPS, L, SCENES, VOZ, frag} from '../timeline';

const f = (s: number) => Math.round(s * FPS);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** 1 mientras hay voz, 0 en silencios (con rampas suaves). */
const voiceEnvelope = (s: number) => {
  let v = 0;
  for (const l of VOZ) {
    v = Math.max(v, interpolate(s, [l.start - 0.35, l.start, l.end, l.end + 0.5], [0, 1, 1, 0], clamp));
  }
  return v;
};

const Sfx: React.FC<{at: number; src: string; vol: number; dur?: number; fadeOut?: number}> = ({at, src, vol, dur, fadeOut = 0.4}) => {
  const from = f(at);
  const durationInFrames = dur ? f(dur) : undefined;
  return (
    <Sequence from={from} durationInFrames={durationInFrames} layout="none">
      <Audio
        src={staticFile(`audio/sfx/${src}.wav`)}
        volume={(fr) => (dur ? vol * interpolate(fr / FPS, [0, 0.15, dur - fadeOut, dur], [0, 1, 1, 0], clamp) : vol)}
      />
    </Sequence>
  );
};

/** Efecto en bucle durante un intervalo. */
const LoopSfx: React.FC<{start: number; end: number; src: string; vol: number; loopSec: number}> = ({start, end, src, vol, loopSec}) => {
  const items = [];
  // cruces de 1 s entre repeticiones
  for (let t = start, i = 0; t < end; t += loopSec - 1, i++) {
    const d = Math.min(loopSec, end - t + 0.6);
    items.push(<Sfx key={i} at={t} src={src} vol={vol} dur={d} fadeOut={Math.min(1, d / 2)} />);
  }
  return <>{items}</>;
};

export const Soundtrack: React.FC = () => {
  const S = SCENES;
  return (
    <>
      {/* Narración */}
      {VOZ.map((l) => (
        <Sequence key={l.id} from={f(l.start)} layout="none">
          <Audio src={staticFile(`audio/voz/${l.id}.wav`)} volume={1} />
        </Sequence>
      ))}

      {/* Música (original, sintetizada) por debajo de la voz */}
      <Audio
        src={staticFile('audio/musica.wav')}
        volume={(fr) => {
          const s = fr / FPS;
          const duck = 1 - 0.55 * voiceEnvelope(s);
          const fadeEnd = interpolate(fr, [DURATION_FRAMES - f(2.5), DURATION_FRAMES], [1, 0], clamp);
          return 0.16 * duck * fadeEnd;
        }}
      />

      {/* Transiciones de cámara */}
      <Sfx at={S.absorcion.start - 0.1} src="whoosh" vol={0.22} />
      <Sfx at={S.compresor.start - 0.1} src="whoosh" vol={0.25} />
      <Sfx at={S.condensador.start - 0.1} src="whoosh" vol={0.22} />
      <Sfx at={S.capilar.start - 0.1} src="whoosh" vol={0.22} />
      <Sfx at={S.capilar.end - 0.6} src="whoosh" vol={0.18} />
      <Sfx at={S.final.start + 0.2} src="whoosh" vol={0.22} />
      <Sfx at={L.l8.start - 0.2} src="whoosh" vol={0.18} />

      {/* Circulación del refrigerante (suave, mientras se ve el circuito) */}
      <LoopSfx start={L.l3.start + 0.5} end={S.capilar.end + 0.5} src="flujo" vol={0.16} loopSec={10} />

      {/* Compresor: arranque en su escena y zumbido leve el resto */}
      <LoopSfx start={S.compresor.start + 0.6} end={S.compresor.end + 0.4} src="compresor" vol={0.34} loopSec={8} />
      <LoopSfx start={S.compresor.end + 0.2} end={S.final.end} src="compresor" vol={0.08} loopSec={8} />

      {/* Calor */}
      <Sfx at={0.3} src="calor" vol={0.2} />
      <Sfx at={S.condensador.start + 0.8} src="calor" vol={0.22} />
      <Sfx at={frag('l7', 2) + 1.6} src="calor" vol={0.24} />

      {/* Expansión en el capilar */}
      <Sfx at={frag('l6', 1) - 0.2} src="siseo" vol={0.2} />

      {/* Energía eléctrica */}
      <Sfx at={frag('l7', 2) - 0.1} src="electrico" vol={0.2} />

      {/* Etiquetas */}
      {[L.l3.start + 0.5, L.l4.start + 0.9, L.l5.start + 1.4, L.l6.start + 0.9].map((s, i) => (
        <Sfx key={i} at={s} src="tic" vol={0.18} />
      ))}

      {/* Revelación y conclusión */}
      <Sfx at={frag('l7', 1) + 0.2} src="campana" vol={0.13} />
      <Sfx at={L.l8.start + 1.3} src="campana" vol={0.15} />
    </>
  );
};
