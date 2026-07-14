#!/usr/bin/env python3
"""BPM + musical KEY + brightness for the two-act cut.

The ad pivots from darkness to light on the downbeat at 16.0s. For that pivot to sound
INTENTIONAL rather than like a jump cut, the ACT 2 cue must be:
  - the same tempo (90 BPM, so the beat grid survives the switch),
  - in a key that RESOLVES the ACT 1 key (relative major, parallel major, or dominant),
  - measurably brighter in timbre.

Key detection = Krumhansl-Schmuckler: build a 12-bin chroma vector, correlate it against
the 24 rotated major/minor tonal profiles, take the argmax.
"""
import json, subprocess, sys
import numpy as np
from scipy.signal import stft

SR = 22050
HOP = 512
PITCH = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

# Krumhansl-Kessler probe-tone profiles
MAJ = np.array([6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88])
MIN = np.array([6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17])


def decode(path, dur=60):
    p = subprocess.run(
        ['ffmpeg', '-nostdin', '-v', 'error', '-t', str(dur), '-i', path,
         '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
        capture_output=True)
    if p.returncode != 0 or not p.stdout:
        return None
    return np.frombuffer(p.stdout, dtype=np.float32)


def chroma(y):
    f, t, Z = stft(y, fs=SR, nperseg=4096, noverlap=4096 - HOP)
    mag = np.abs(Z)
    # fold each FFT bin onto its pitch class
    with np.errstate(divide='ignore'):
        midi = 69 + 12 * np.log2(np.maximum(f, 1e-9) / 440.0)
    ok = (midi > 23) & (midi < 96)          # ~B0..B6, ignore mud and hiss
    pc = np.round(midi[ok]).astype(int) % 12
    m = mag[ok]
    c = np.zeros(12)
    for k in range(12):
        sel = pc == k
        if sel.any():
            c[k] = m[sel].sum()
    return c / (c.sum() + 1e-9)


def detect_key(c):
    best = (-2, None)
    for rot in range(12):
        for name, prof in (('maj', MAJ), ('min', MIN)):
            p = np.roll(prof, rot)
            r = np.corrcoef(c, p)[0, 1]
            if r > best[0]:
                best = (r, f'{PITCH[rot]} {name}')
    return best[1], round(best[0], 3)


def detect_bpm(y):
    f, t, Z = stft(y, fs=SR, nperseg=1024, noverlap=1024 - HOP)
    mag = np.abs(Z)
    flux = np.maximum(0, np.diff(mag, axis=1)).sum(axis=0)
    flux -= flux.mean()
    if flux.std() < 1e-9:
        return 0
    ac = np.correlate(flux, flux, 'full')[len(flux) - 1:]
    fps = SR / HOP
    best = (0, 0)
    for bpm in np.arange(60, 181, 0.25):
        lag = 60.0 / bpm * fps
        # score the lag AND its harmonics -> kills octave errors
        s = sum(ac[int(round(lag * h))] for h in (1, 2, 3, 4) if int(round(lag * h)) < len(ac))
        if s > best[0]:
            best = (s, bpm)
    return round(best[1], 1)


def brightness(y):
    f, t, Z = stft(y, fs=SR, nperseg=2048, noverlap=1024)
    mag = np.abs(Z) + 1e-9
    cen = (f[:, None] * mag).sum(0) / mag.sum(0)
    return round(float(cen.mean()), 1)


if __name__ == '__main__':
    out = []
    for path in sys.argv[1:]:
        y = decode(path)
        if y is None or len(y) < SR * 5:
            print(f'  SKIP (decode failed) {path}', file=sys.stderr)
            continue
        c = chroma(y)
        k, conf = detect_key(c)
        rec = dict(path=path, bpm=detect_bpm(y), key=k, key_conf=conf,
                   centroid=brightness(y))
        out.append(rec)
        print(f"  {rec['bpm']:>5} bpm  {rec['key']:<8} (conf {rec['key_conf']:>5})  "
              f"centroid {rec['centroid']:>7} Hz  {path.split('/')[-1][:44]}", flush=True)
    print(json.dumps(out))
