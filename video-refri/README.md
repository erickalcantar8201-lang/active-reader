# ¿Por qué tu refri calienta la cocina? — video educativo vertical (Remotion)

Video vertical de **1080 × 1920, 30 fps, H.264 + AAC, ~51 s** que explica, con un refrigerador 3D original y un circuito de refrigerante animado, por qué un refri enfría por dentro y libera calor por fuera.

- **Video terminado:** [`entrega/refri-calor.mp4`](entrega/refri-calor.mp4)
- **Tiempos de narración y escenas:** [`entrega/TIEMPOS.md`](entrega/TIEMPOS.md) · [`entrega/tiempos.json`](entrega/tiempos.json)
- **Subtítulos (opcional):** [`entrega/subtitulos.srt`](entrega/subtitulos.srt)
- **Hoja de contactos (1 fotograma/s):** [`entrega/contactos.jpg`](entrega/contactos.jpg)

## Cómo está construido

Es una sola escena 3D (three.js dentro de Remotion) con **una sola geometría** de refrigerador y **un solo circuito cerrado** de refrigerante. La cámara nunca corta: se mueve de forma continua entre claves y, en las transiciones, «sigue la tubería» real. La capa 2D (títulos, etiquetas, flechas de calor, ondas, símbolo eléctrico) se calcula proyectando puntos 3D con la **misma cámara**, así que cada anotación queda pegada a su pieza.

| Archivo | Qué contiene |
|---|---|
| `src/timeline.ts` | Línea de tiempo maestra. Escenas y textos se derivan de la duración real de cada línea de voz. |
| `src/narracion.json` | Duración de cada línea y de sus fragmentos (generado por `tools/narracion.py`). |
| `src/scene/dims.ts` | Dimensiones únicas del refrigerador. |
| `src/scene/circuit.ts` | Trayectoria cerrada evaporador → succión → compresor → descarga → condensador → línea de líquido → capilar → evaporador; estado explicativo (color, fracción de vapor, velocidad) a lo largo del circuito. |
| `src/scene/camera.ts` | Claves de cámara, seguimiento de tubería y proyector 3D→2D. |
| `src/scene/Fridge.tsx`, `Food.tsx`, `Kitchen.tsx`, `Compressor.tsx`, `Circuit.tsx` | Modelo 3D: gabinete con cortes transparentes, alimentos, cocina, compresor con corte y pistón, tubos y partículas. |
| `src/scene/reveal.ts` | Cuándo se abren los cortes (pared lateral, forro sobre el evaporador, carcasa del compresor). |
| `src/overlay/` | Títulos, etiquetas, ondas y flechas de calor, energía eléctrica. Respeta zonas seguras: 160 px arriba, 250 px abajo, 140 px a la derecha. |
| `src/audio/Soundtrack.tsx` | Mezcla: voz, música con *ducking* y efectos. |
| `tools/narracion.py` | Síntesis de voz alternativa (Piper TTS). |
| `tools/voz_externa.py` | Integra una voz externa (ElevenLabs o grabación propia). |
| `tools/audio.py` | Efectos y música sintetizados desde cero. |
| `tools/exportar-tiempos.ts` | Exporta `entrega/tiempos.json`, `subtitulos.srt`, `TIEMPOS.md`. |
| `tools/qc.sh` | Control de calidad del MP4 (resolución, fps, duración, sonoridad, hoja de contactos). |
| `tools/stills.mjs` | Renderiza fotogramas sueltos para revisión. |

## Renderizar

Requisitos: Node 18+ y ffmpeg (Remotion trae el suyo para codificar).

```bash
npm install
npm run studio          # vista previa interactiva
npm run render          # -> out/refri-calor.mp4
./tools/qc.sh out/refri-calor.mp4
```

`remotion.config.ts` usa WebGL por software (`swangle`). Si quieres usar un Chrome headless propio, define la variable `REMOTION_BROWSER` con su ruta; si no, Remotion descarga su propio navegador. Con GPU puedes cambiar a `Config.setChromiumOpenGlRenderer('angle')` para que el render sea mucho más rápido.

## Voz

La narración usa **exactamente** el guion entregado, generada con **ElevenLabs** (modelo `eleven_v4`, voz «Emiliano – Deep, Clear and Educational», español de México). Solo se añadieron dos indicaciones de tono que no se pronuncian: `[curious]` en la primera frase y `[confident]` en la segunda. La sincronización usa la duración real de cada línea y las pausas internas detectadas en el audio, sin acelerar la voz.

- Tomas usadas: `voz-elevenlabs/tomas/lN_a.mp3`. Alternativas: `lN_b.mp3`.
- Para cambiar una toma (o usar otra voz o una grabación propia): copia los 8 audios a una carpeta con los nombres `l1` … `l8` (mp3, wav o m4a) y ejecuta
  `python tools/voz_externa.py ruta/a/la/carpeta`
  Esto recorta silencios, iguala el volumen, detecta las pausas y reescribe `public/audio/voz/` y `src/narracion.json`. Después: `npx tsx tools/exportar-tiempos.ts` y `npm run render`.
- Uso comercial: revisa que tu plan de ElevenLabs lo permita (el plan gratuito no lo incluye).

La versión anterior con voz sintética abierta (Piper, `tools/narracion.py`) sigue disponible como alternativa sin costo.

## Música y efectos

Música ambiental y efectos (transiciones, compresor, circulación, siseo del capilar, energía eléctrica, campana) **sintetizados desde cero** con `tools/audio.py`: no usan muestras de terceros y pueden usarse sin restricciones. La música queda por debajo de la voz con *ducking* automático.

## Coherencia científica

- Orden del circuito: **evaporador → compresor → condensador → tubo capilar → evaporador**, en un circuito sellado.
- El compresor recibe **vapor** a baja presión y lo entrega a mayor presión y temperatura; la condensación ocurre después, en el condensador, al liberar calor; el capilar reduce la presión y aparece una mezcla fría de líquido y vapor.
- Las ondas y flechas naranjas representan **transferencia de calor**, nunca fugas de gas. Dentro de los tubos, las partículas representan el refrigerante: puntos grandes y densos = líquido; puntos pequeños y claros = vapor.
- Los colores son un **recurso explicativo** (cian = frío, coral = caliente). No se muestran temperaturas, presiones, consumos ni porcentajes.
- El condensador trasero es el de este modelo; la nota «Ubicación según modelo» lo aclara.

## Licencias de recursos

- Tipografía Montserrat: SIL Open Font License (`public/fonts/OFL-Montserrat.txt`).
- Voz: generada con ElevenLabs bajo los términos de tu plan.
- Música y efectos: originales de este proyecto.
- [Remotion](https://www.remotion.dev/license) es gratuito para personas y empresas de hasta 3 empleados; organizaciones más grandes necesitan licencia de empresa.
