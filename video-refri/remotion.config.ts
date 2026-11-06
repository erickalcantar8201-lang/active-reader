import {Config} from '@remotion/cli/config';

// Chromium headless incluido en el contenedor (cámbialo o elimínalo en tu equipo:
// Remotion descargará su propio navegador si esta ruta no existe).
import fs from 'node:fs';
const local = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
if (fs.existsSync(local)) {
  Config.setBrowserExecutable(local);
}
// WebGL por software (SwiftShader). Con GPU puedes usar 'angle'.
Config.setChromiumOpenGlRenderer('swangle');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setConcurrency(4);
Config.setOverwriteOutput(true);
