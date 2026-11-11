"""Integra una narración externa (ElevenLabs, voz humana, etc.) al video.

Uso:  python tools/voz_externa.py <carpeta_con_l1..l8.(mp3|wav|m4a)>

Para cada línea: recorta silencios al inicio/fin, iguala sonoridad entre líneas,
convierte a WAV 48 kHz mono en public/audio/voz/ y detecta las pausas internas
(después de ":", "…" y ".") para ubicar los fragmentos. Reescribe src/narracion.json;
la línea de tiempo del video se reajusta sola.
Requiere ffmpeg y numpy.
"""
import json
import re
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SR = 48000
TARGET_RMS_DB = -18.0  # nivel de voz común para todas las líneas


def load(path: Path) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        check=True,
        capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def frame_db(a: np.ndarray, win: int) -> np.ndarray:
    n = len(a) // win
    fr = a[: n * win].reshape(n, win)
    return 20 * np.log10(np.sqrt((fr**2).mean(axis=1)) + 1e-9)


def trim(a: np.ndarray, thr_db=-45.0) -> np.ndarray:
    win = int(0.01 * SR)
    db = frame_db(a, win)
    voiced = np.where(db > thr_db)[0]
    if len(voiced) == 0:
        return a
    s = max(0, voiced[0] * win - int(0.03 * SR))
    e = min(len(a), (voiced[-1] + 1) * win + int(0.08 * SR))
    return a[s:e]


def pauses(a: np.ndarray, thr_db=-40.0, min_len=0.12):
    """Silencios internos [(inicio, fin, duración)] en segundos."""
    win = int(0.01 * SR)
    db = frame_db(a, win)
    quiet = db < thr_db
    out = []
    i = 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]:
                j += 1
            s, e = i * win / SR, j * win / SR
            if e - s >= min_len and i > 0 and j < len(quiet):
                out.append((s, e, e - s))
            i = j
        else:
            i += 1
    return out


def main(src_dir: Path):
    guion = json.loads((ROOT / "tools/guion.json").read_text(encoding="utf-8"))
    out = []
    for linea in guion:
        files = [p for p in src_dir.glob(f"{linea['id']}.*") if p.suffix.lower() in {".mp3", ".wav", ".m4a", ".ogg", ".flac"}]
        if not files:
            sys.exit(f"Falta el audio de {linea['id']} en {src_dir}")
        a = trim(load(files[0]))
        rms = np.sqrt((a**2).mean())
        a = a * (10 ** (TARGET_RMS_DB / 20) / max(rms, 1e-6))
        a = np.clip(a, -0.98, 0.98)

        partes = [p.strip() for p in re.split(r"(?<=[…:.])\s+", linea["texto"]) if p.strip()]
        # las k-1 pausas más largas, en orden temporal, separan los k fragmentos
        ps = sorted(pauses(a), key=lambda x: -x[2])[: len(partes) - 1]
        ps = sorted(ps, key=lambda x: x[0])
        dur = len(a) / SR
        frag = []
        starts = [0.0] + [p[1] for p in ps]
        ends = [p[0] for p in ps] + [dur]
        if len(ps) != len(partes) - 1:
            # sin pausas suficientes: reparte por longitud de texto
            tot = sum(len(p) for p in partes)
            acc = 0.0
            starts, ends = [], []
            for p in partes:
                starts.append(dur * acc / tot)
                acc += len(p)
                ends.append(dur * acc / tot)
        for p, s, e in zip(partes, starts, ends):
            frag.append({"texto": p, "inicio": round(s, 3), "duracion": round(e - s, 3)})

        pcm = (a * 32767).astype(np.int16)
        dest = ROOT / "public/audio/voz" / f"{linea['id']}.wav"
        with wave.open(str(dest), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())
        out.append({"id": linea["id"], "texto": linea["texto"], "duracion": round(dur, 3), "fragmentos": frag})
        print(f"{linea['id']}: {dur:.2f}s  fragmentos={[f['inicio'] for f in frag]}")

    (ROOT / "src/narracion.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print("total voz:", round(sum(o["duracion"] for o in out), 2), "s")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
