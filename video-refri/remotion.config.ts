import {Config} from '@remotion/cli/config';

// Navegador opcional: define REMOTION_BROWSER con la ruta a un Chrome headless.
// Si no se define, Remotion descarga y usa su propio navegador.
if (process.env.REMOTION_BROWSER) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
}
// WebGL por software (SwiftShader). Con GPU puedes usar 'angle'.
Config.setChromiumOpenGlRenderer('swangle');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setConcurrency(4);
Config.setOverwriteOutput(true);
