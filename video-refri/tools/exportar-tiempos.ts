/**
 * Exporta los tiempos de narración y escenas (para reemplazar la voz o subtitular).
 * Uso: npx tsx tools/exportar-tiempos.ts  → entrega/tiempos.json, entrega/subtitulos.srt, entrega/TIEMPOS.md
 */
import fs from 'node:fs';
import {DURATION_S, SCENES, VOZ, FPS} from '../src/timeline';

fs.mkdirSync('entrega', {recursive: true});
const ts = (s: number) => {
  const ms = Math.round(s * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  const r = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(r).padStart(3, '0')}`;
};
const r3 = (x: number) => Math.round(x * 1000) / 1000;

const json = {
  fps: FPS,
  duracion_s: r3(DURATION_S),
  escenas: Object.fromEntries(Object.entries(SCENES).map(([k, v]) => [k, {inicio: r3(v.start), fin: r3(v.end)}])),
  narracion: VOZ.map((l) => ({
    id: l.id,
    texto: l.texto,
    inicio: r3(l.start),
    fin: r3(l.end),
    fotograma_inicio: Math.round(l.start * FPS),
    fragmentos: l.fragmentos.map((f) => ({texto: f.texto, inicio: r3(l.start + f.inicio), fin: r3(l.start + f.inicio + f.duracion)})),
  })),
};
fs.writeFileSync('entrega/tiempos.json', JSON.stringify(json, null, 2));

let srt = '';
let n = 1;
VOZ.forEach((l) => {
  l.fragmentos.forEach((f) => {
    srt += `${n++}\n${ts(l.start + f.inicio)} --> ${ts(l.start + f.inicio + f.duracion)}\n${f.texto}\n\n`;
  });
});
fs.writeFileSync('entrega/subtitulos.srt', srt);

const nombres: Record<string, string> = {
  gancho: '1. Gancho',
  absorcion: '2. Absorción de calor (evaporador)',
  compresor: '3. Compresor',
  condensador: '4. Liberación de calor (condensador)',
  capilar: '5. Expansión y regreso (tubo capilar)',
  final: '6. Revelación final',
};
let md = `# Tiempos de narración y escenas\n\nDuración total: **${DURATION_S.toFixed(2)} s** (${Math.round(DURATION_S * FPS)} fotogramas a ${FPS} fps).\n\n`;
md += `## Escenas\n\n| Escena | Inicio (s) | Fin (s) |\n|---|---:|---:|\n`;
Object.entries(SCENES).forEach(([k, v]) => (md += `| ${nombres[k]} | ${v.start.toFixed(2)} | ${v.end.toFixed(2)} |\n`));
md += `\n## Narración (cada línea empieza en el segundo indicado)\n\n| # | Inicio (s) | Fin (s) | Fotograma | Texto |\n|---|---:|---:|---:|---|\n`;
VOZ.forEach((l, i) => (md += `| ${i + 1} | ${l.start.toFixed(2)} | ${l.end.toFixed(2)} | ${Math.round(l.start * FPS)} | ${l.texto} |\n`));
md += `\nPara grabar una voz humana: graba cada línea por separado, nómbrala \`l1.wav\` … \`l8.wav\`, colócalas en \`public/audio/voz/\` y actualiza \`src/narracion.json\` con sus duraciones (o ejecuta \`tools/narracion.py\` adaptado). La línea de tiempo y las escenas se reajustan solas.\n`;
fs.writeFileSync('entrega/TIEMPOS.md', md);
console.log('tiempos exportados');
