# Tiempos de narración y escenas

Duración total: **51.47 s** (1544 fotogramas a 30 fps).

## Escenas

| Escena | Inicio (s) | Fin (s) |
|---|---:|---:|
| 1. Gancho | 0.00 | 5.25 |
| 2. Absorción de calor (evaporador) | 5.25 | 14.32 |
| 3. Compresor | 14.32 | 20.54 |
| 4. Liberación de calor (condensador) | 20.54 | 26.82 |
| 5. Expansión y regreso (tubo capilar) | 26.82 | 34.32 |
| 6. Revelación final | 34.32 | 51.47 |

## Narración (cada línea empieza en el segundo indicado)

| # | Inicio (s) | Fin (s) | Fotograma | Texto |
|---|---:|---:|---:|---|
| 1 | 0.50 | 5.00 | 15 | ¿Por qué tu refri está caliente por fuera, si por dentro mantiene todo frío? |
| 2 | 5.60 | 7.96 | 168 | Porque está sacando el calor de tu comida. |
| 3 | 8.46 | 14.02 | 254 | Mira estas tuberías. Por dentro circula un refrigerante que absorbe calor al evaporarse. |
| 4 | 14.72 | 20.19 | 442 | Después, un compresor aprieta ese gas: suben su presión y su temperatura. |
| 5 | 20.89 | 26.52 | 627 | El gas llega a la parte de atrás, libera calor al aire y vuelve a convertirse en líquido. |
| 6 | 27.17 | 33.97 | 815 | Luego pasa por un tubo muy delgado: baja su presión, se enfría y el ciclo comienza otra vez. |
| 7 | 34.77 | 42.18 | 1043 | Y aquí está el detalle: afuera termina el calor que sacó de dentro… más la energía que gastó para moverlo. |
| 8 | 43.03 | 48.15 | 1291 | Así que, mientras enfría tu comida, tu refri también está calentando la cocina. |

Para grabar una voz humana: graba cada línea por separado, nómbrala `l1.wav` … `l8.wav`, colócalas en `public/audio/voz/` y actualiza `src/narracion.json` con sus duraciones (o ejecuta `tools/narracion.py` adaptado). La línea de tiempo y las escenas se reajustan solas.
