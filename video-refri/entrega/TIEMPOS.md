# Tiempos de narración y escenas

Duración total: **54.73 s** (1642 fotogramas a 30 fps).

## Escenas

| Escena | Inicio (s) | Fin (s) |
|---|---:|---:|
| 1. Gancho | 0.00 | 5.77 |
| 2. Absorción de calor (evaporador) | 5.77 | 15.71 |
| 3. Compresor | 15.71 | 21.66 |
| 4. Liberación de calor (condensador) | 21.66 | 28.98 |
| 5. Expansión y regreso (tubo capilar) | 28.98 | 36.41 |
| 6. Revelación final | 36.41 | 54.73 |

## Narración (cada línea empieza en el segundo indicado)

| # | Inicio (s) | Fin (s) | Fotograma | Texto |
|---|---:|---:|---:|---|
| 1 | 0.50 | 5.52 | 15 | ¿Por qué tu refri está caliente por fuera, si por dentro mantiene todo frío? |
| 2 | 6.12 | 8.65 | 184 | Porque está sacando el calor de tu comida. |
| 3 | 9.15 | 15.41 | 274 | Mira estas tuberías. Por dentro circula un refrigerante que absorbe calor al evaporarse. |
| 4 | 16.11 | 21.31 | 483 | Después, un compresor aprieta ese gas: suben su presión y su temperatura. |
| 5 | 22.01 | 28.68 | 660 | El gas llega a la parte de atrás, libera calor al aire y vuelve a convertirse en líquido. |
| 6 | 29.33 | 36.06 | 880 | Luego pasa por un tubo muy delgado: baja su presión, se enfría y el ciclo comienza otra vez. |
| 7 | 36.86 | 44.89 | 1106 | Y aquí está el detalle: afuera termina el calor que sacó de dentro… más la energía que gastó para moverlo. |
| 8 | 45.74 | 51.40 | 1372 | Así que, mientras enfría tu comida, tu refri también está calentando la cocina. |

Para grabar una voz humana: graba cada línea por separado, nómbrala `l1.wav` … `l8.wav`, colócalas en `public/audio/voz/` y actualiza `src/narracion.json` con sus duraciones (o ejecuta `tools/narracion.py` adaptado). La línea de tiempo y las escenas se reajustan solas.
