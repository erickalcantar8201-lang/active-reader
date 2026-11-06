#!/usr/bin/env bash
# Control de calidad del MP4 exportado: resolución, fps, códecs, duración,
# sonoridad y hoja de contactos (1 fotograma por segundo).
set -euo pipefail
IN="${1:-entrega/refri-calor.mp4}"
OUTDIR="${2:-out/qc}"
mkdir -p "$OUTDIR"
echo "== Flujo de video"
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,profile,width,height,r_frame_rate,avg_frame_rate,pix_fmt,nb_frames -of default=nw=1 "$IN"
echo "== Flujo de audio"
ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,sample_rate,channels -of default=nw=1 "$IN"
echo "== Duración (s)"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN"
echo "== Sonoridad integrada (EBU R128)"
ffmpeg -nostats -i "$IN" -filter_complex ebur128=peak=true -f null - 2>&1 | grep -E "I:|LRA:|Peak:" | tail -3
echo "== Hoja de contactos -> $OUTDIR/contactos.jpg"
ffmpeg -loglevel error -y -i "$IN" -vf "fps=1,scale=216:384,tile=11x5" -frames:v 1 "$OUTDIR/contactos.jpg"
