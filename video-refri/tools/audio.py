"""Efectos de sonido y música de fondo, sintetizados desde cero (sin muestras de
terceros, uso libre). Uso: python tools/audio.py  → public/audio/sfx/*.wav, public/audio/musica.wav
"""
import wave
from pathlib import Path
import numpy as np

SR = 48000
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/audio"
(OUT / "sfx").mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(7)


def save(path, x, stereo=False):
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1 and stereo:
        x = np.stack([x, x], axis=1)
    pk = np.max(np.abs(x)) or 1.0
    x = x / pk * 0.89
    data = (x * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2 if data.ndim == 2 else 1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


def t_(d):
    return np.arange(int(d * SR)) / SR


def onepole_lp(x, fc):
    """Paso bajo de un polo; fc puede ser escalar o arreglo."""
    fc = np.broadcast_to(np.asarray(fc, dtype=np.float64), x.shape)
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y


def bandpass(x, fc, q=1.5):
    lp1 = onepole_lp(x, fc * (1 + 1 / q))
    lp2 = onepole_lp(x, fc / (1 + 1 / q))
    return lp1 - lp2


def env_adsr(n, a, r, curve=2.0):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na:
        e[:na] = np.linspace(0, 1, na) ** curve
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr) ** curve
    return e


# --- Whoosh de transición (cámara) -------------------------------------------
def whoosh(d=1.1):
    t = t_(d)
    n = rng.standard_normal(len(t))
    fc = 300 + 2200 * np.sin(np.pi * t / d) ** 2
    x = bandpass(n, fc, q=1.2)
    e = np.sin(np.pi * t / d) ** 2.2
    return x * e


# --- Zumbido del compresor (ciclo suave sincronizado con el pistón) ----------
def compressor(d=8.0, piston_hz=1.1):
    t = t_(d)
    hum = (
        0.55 * np.sin(2 * np.pi * 100 * t)
        + 0.35 * np.sin(2 * np.pi * 150 * t + 0.4)
        + 0.25 * np.sin(2 * np.pi * 200 * t + 1.1)
        + 0.12 * np.sin(2 * np.pi * 300 * t + 0.2)
    )
    puls = 0.75 + 0.25 * np.sin(2 * np.pi * piston_hz * t) ** 2
    rumble = onepole_lp(rng.standard_normal(len(t)), 180) * 2.5
    x = (hum * puls + rumble * 0.4) * env_adsr(len(t), 0.8, 0.8)
    return x


# --- Circulación del refrigerante: rumor suave + burbujas --------------------
def flow(d=10.0):
    t = t_(d)
    n = rng.standard_normal(len(t))
    base = bandpass(n, 900 + 300 * np.sin(2 * np.pi * 0.23 * t), q=0.9) * 0.6
    bubbles = np.zeros(len(t))
    for _ in range(int(d * 5)):
        s = rng.integers(0, len(t) - 6000)
        f0 = rng.uniform(500, 1300)
        dd = rng.uniform(0.03, 0.07)
        tt = np.arange(int(dd * SR)) / SR
        b = np.sin(2 * np.pi * (f0 * tt + 4000 * tt**2)) * np.exp(-tt * 60)
        bubbles[s : s + len(b)] += b * rng.uniform(0.15, 0.4)
    x = (base + bubbles) * env_adsr(len(t), 1.0, 1.0)
    return x


# --- Siseo de expansión en el capilar ----------------------------------------
def hiss(d=2.2):
    t = t_(d)
    n = rng.standard_normal(len(t))
    x = n - onepole_lp(n, 3000)  # paso alto
    x = onepole_lp(x, 9000)
    return x * env_adsr(len(t), 0.25, 1.2) * 0.6


# --- Tic suave para etiquetas -------------------------------------------------
def tick():
    t = t_(0.18)
    x = np.sin(2 * np.pi * 1320 * t) * np.exp(-t * 38) + 0.5 * np.sin(2 * np.pi * 1980 * t) * np.exp(-t * 55)
    return x


# --- Energía eléctrica: zumbido breve con chisporroteo -----------------------
def zap(d=0.9):
    t = t_(d)
    saw = 2 * ((120 * t) % 1) - 1
    buzz = onepole_lp(saw, 1800)
    crackle = (rng.random(len(t)) > 0.996) * rng.standard_normal(len(t)) * 3
    x = (buzz * 0.7 + onepole_lp(crackle, 5000)) * env_adsr(len(t), 0.05, 0.5)
    return x


# --- Campana de revelación ---------------------------------------------------
def chime(d=2.6, f=659.25):
    t = t_(d)
    partials = [(1, 1.0, 2.2), (2.01, 0.45, 3.0), (2.76, 0.28, 4.2), (4.07, 0.15, 6.0)]
    x = sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t * dcy) for k, a, dcy in partials)
    return x * env_adsr(len(t), 0.004, 0.3)


# --- Calor: soplo cálido y grave ---------------------------------------------
def warm(d=2.4):
    t = t_(d)
    n = rng.standard_normal(len(t))
    x = bandpass(n, 380 + 120 * np.sin(np.pi * t / d), q=0.8)
    return x * np.sin(np.pi * t / d) ** 1.5


# --- Música: colchón ambiental original --------------------------------------
def music(d=60.0, bpm=84):
    t = t_(d)
    beat = 60 / bpm
    bar = beat * 4
    # progresión curiosa y luminosa: Am9 – Fmaj7 – C(add9) – G6
    chords = [
        [57, 60, 64, 67, 71],
        [53, 57, 60, 64, 69],
        [48, 55, 60, 62, 64],
        [55, 59, 62, 64, 67],
    ]
    hz = lambda m: 440 * 2 ** ((m - 69) / 12)
    pad = np.zeros(len(t))
    for i in range(int(d / bar) + 1):
        notes = chords[i % 4]
        s = int(i * bar * SR)
        n = min(len(t) - s, int(bar * 1.25 * SR))
        if n <= 0:
            break
        tt = np.arange(n) / SR
        e = env_adsr(n, 1.2, 1.6, curve=1.5)
        seg = np.zeros(n)
        for m in notes:
            f = hz(m)
            seg += np.sin(2 * np.pi * f * tt) * 0.6 + np.sin(2 * np.pi * f * 1.003 * tt + 1) * 0.4
        pad[s : s + n] += seg * e / len(notes)
    pad = onepole_lp(pad, 1400)
    # arpegio suave (pluck)
    arp = np.zeros(len(t))
    step = beat / 2
    k = 0
    while k * step < d - 1:
        ci = int((k * step) // bar) % 4
        notes = chords[ci]
        m = notes[[0, 2, 3, 4, 3, 2, 1, 2][k % 8]] + 12
        s = int(k * step * SR)
        tt = np.arange(int(0.9 * SR)) / SR
        p = np.sin(2 * np.pi * hz(m) * tt) * np.exp(-tt * 5.5) + 0.25 * np.sin(4 * np.pi * hz(m) * tt) * np.exp(-tt * 9)
        e = min(len(arp) - s, len(p))
        arp[s : s + e] += p[:e] * (0.55 if k % 2 == 0 else 0.4)
        k += 1
    # bajo
    bass = np.zeros(len(t))
    for i in range(int(d / bar) + 1):
        s = int(i * bar * SR)
        n = min(len(t) - s, int(bar * SR))
        if n <= 0:
            break
        tt = np.arange(n) / SR
        bass[s : s + n] += np.sin(2 * np.pi * hz(chords[i % 4][0] - 12) * tt) * env_adsr(n, 0.05, 0.8)
    x = pad * 1.0 + arp * 0.32 + bass * 0.35
    x *= env_adsr(len(t), 1.5, 3.0, curve=1.2)
    # estéreo con leve retardo
    left = x
    right = np.concatenate([np.zeros(int(0.012 * SR)), x[: -int(0.012 * SR)]])
    return np.stack([left, right], axis=1)


if __name__ == "__main__":
    save(OUT / "sfx/whoosh.wav", whoosh())
    save(OUT / "sfx/compresor.wav", compressor())
    save(OUT / "sfx/flujo.wav", flow())
    save(OUT / "sfx/siseo.wav", hiss())
    save(OUT / "sfx/tic.wav", tick())
    save(OUT / "sfx/electrico.wav", zap())
    save(OUT / "sfx/campana.wav", chime())
    save(OUT / "sfx/calor.wav", warm())
    save(OUT / "musica.wav", music())
    print("listo")
