"""Genera la narración (Piper TTS, voz es_MX-claude-high) línea por línea.

Uso:  python tools/narracion.py <ruta_modelo.onnx>
Salida: public/audio/voz/<id>.wav y src/narracion.json (duraciones en segundos).
El texto es exactamente el del guion (tools/guion.json). Las pausas internas
(tras ":" y "…") se insertan como silencio entre fragmentos; no se altera el texto.
"""
import json, sys, wave, re
from pathlib import Path
import numpy as np
from piper import PiperVoice, SynthesisConfig

ROOT = Path(__file__).resolve().parents[1]
voice = PiperVoice.load(sys.argv[1])
SR = voice.config.sample_rate
cfg = SynthesisConfig(length_scale=1.06, noise_scale=0.6, noise_w_scale=0.75)

# Silencios (s) tras ciertos signos, para dar las "pausas breves en las revelaciones".
PAUSAS = {"…": 0.55, ":": 0.22, ".": 0.30}

def synth(text):
    chunks = [c.audio_int16_array for c in voice.synthesize(text, syn_config=cfg)]
    return np.concatenate(chunks)

def trim(a, thr=180):
    idx = np.where(np.abs(a.astype(np.int32)) > thr)[0]
    if len(idx) == 0:
        return a
    s = max(0, idx[0] - int(0.02 * SR)); e = min(len(a), idx[-1] + int(0.06 * SR))
    return a[s:e]

guion = json.loads((ROOT / "tools/guion.json").read_text(encoding="utf-8"))
out = []
for linea in guion:
    # Divide en fragmentos después de "…", ":" o "." (conservando el signo en el fragmento).
    partes = [p.strip() for p in re.split(r"(?<=[…:.])\s+", linea["texto"]) if p.strip()]
    piezas = []
    fragmentos = []
    pos = 0
    for i, p in enumerate(partes):
        a = trim(synth(p))
        fragmentos.append({"texto": p, "inicio": round(pos / SR, 3), "duracion": round(len(a) / SR, 3)})
        pos += len(a)
        piezas.append(a)
        if i < len(partes) - 1:
            sil = np.zeros(int(PAUSAS.get(p[-1], 0.2) * SR), dtype=np.int16)
            pos += len(sil)
            piezas.append(sil)
    audio = np.concatenate(piezas)
    # normaliza a -1 dBFS de pico
    pk = np.abs(audio.astype(np.int32)).max()
    audio = (audio.astype(np.float32) * (0.89 * 32767 / pk)).astype(np.int16)
    dest = ROOT / "public/audio/voz" / f"{linea['id']}.wav"
    with wave.open(str(dest), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(audio.tobytes())
    dur = len(audio) / SR
    out.append({"id": linea["id"], "texto": linea["texto"], "duracion": round(dur, 3), "fragmentos": fragmentos})
    print(f"{linea['id']}: {dur:.2f}s  {partes}")

(ROOT / "src").mkdir(exist_ok=True)
(ROOT / "src/narracion.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
print("total voz:", round(sum(o["duracion"] for o in out), 2), "s")
