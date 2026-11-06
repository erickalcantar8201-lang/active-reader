import React, {useEffect, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';

export const FONT = 'Montserrat';
const WEIGHTS = [600, 700, 800, 900];

export const FontLoader: React.FC = () => {
  const [handle] = useState(() => delayRender('Cargando Montserrat'));
  useEffect(() => {
    Promise.all(
      WEIGHTS.map((w) => {
        const f = new FontFace(FONT, `url(${staticFile(`fonts/montserrat-latin-${w}-normal.woff2`)}) format('woff2')`, {weight: String(w)});
        return f.load().then((ff) => (document.fonts as unknown as {add: (f: FontFace) => void}).add(ff));
      }),
    )
      .then(() => continueRender(handle))
      .catch((e) => {
        console.error(e);
        continueRender(handle);
      });
  }, [handle]);
  return null;
};
