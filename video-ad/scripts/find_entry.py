#!/usr/bin/env python3
"""Find where to START the ACT 2 cue.

Two constraints:
  1. It must enter on a DOWNBEAT of its own bar, or the 90 BPM cut grid will fight it.
  2. It must enter in a DEVELOPED section (not the quiet intro) — the light has to arrive
     already blooming, not fade up from nothing.

So: score every strong onset past the intro by (onset strength x local energy x local brightness),
and report the best ones. We then start the cue exactly there.
"""
import subprocess, sys
import numpy as np
from scipy.signal import stft

SR = 22050
HOP = 512
FPS = SR / HOP


def decode(path):
    p = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', path,
                        '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                       capture_output=True)
    return np.frombuffer(p.stdout, dtype=np.float32)


path = sys.argv[1]
need = float(sys.argv[2])           # seconds of music we must have AFTER the entry
bpm = float(sys.argv[3])
y = decode(path)
dur = len(y) / SR

f, t, Z = stft(y, fs=SR, nperseg=1024, noverlap=1024 - HOP)
mag = np.abs(Z)
flux = np.maximum(0, np.diff(mag, axis=1)).sum(axis=0)
flux = np.concatenate([[0], flux])
energy = mag.sum(axis=0)
cen = (f[:, None] * (mag + 1e-9)).sum(0) / (mag + 1e-9).sum(0)

# normalise
n = lambda v: (v - v.min()) / (np.ptp(v) + 1e-9)
fl, en, br = n(flux), n(energy), n(cen)

beat = 60.0 / bpm
bar = beat * 4

cands = []
for i in range(len(fl)):
    ts = i / FPS
    if ts < 8.0:                       # skip intro
        continue
    if ts + need > dur - 1.0:          # must have enough music left
        break
    if fl[i] < 0.25:                   # must be a real onset
        continue
    # local (next 4 bars) energy + brightness — is this section actually blooming?
    a, b = i, min(len(fl), i + int(4 * bar * FPS))
    score = fl[i] * 0.4 + en[a:b].mean() * 0.35 + br[a:b].mean() * 0.25
    cands.append((score, ts, en[a:b].mean(), br[a:b].mean()))

cands.sort(reverse=True)
print(f"track dur {dur:.1f}s  bar={bar:.3f}s  need {need}s after entry")
print("  score   entry_t   local_energy  local_bright")
seen = []
for s, ts, e, b in cands:
    if any(abs(ts - x) < bar * 2 for x in seen):   # dedupe near-identical entries
        continue
    seen.append(ts)
    print(f"  {s:.3f}   {ts:7.3f}s   {e:.3f}        {b:.3f}")
    if len(seen) >= 6:
        break
