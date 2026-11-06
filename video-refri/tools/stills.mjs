// Renderiza fotogramas sueltos para revisión: node tools/stills.mjs <dir> <seg1> <seg2> ...
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const [outDir, ...times] = process.argv.slice(2);
fs.mkdirSync(outDir, {recursive: true});
const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const chromiumOptions = {gl: 'swangle'};
const composition = await selectComposition({serveUrl, id: 'RefriCalor', browserExecutable, chromiumOptions});
for (const t of times) {
  const frame = Math.round(parseFloat(t) * composition.fps);
  const output = path.join(outDir, `f_${String(frame).padStart(4, '0')}.png`);
  await renderStill({composition, serveUrl, frame, output, browserExecutable, chromiumOptions, scale: parseFloat(process.env.SCALE || '0.5')});
  console.log('ok', t, output);
}
