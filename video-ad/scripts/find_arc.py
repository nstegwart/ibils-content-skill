#!/usr/bin/env python3
"""Find a SINGLE 30s window whose own brightness rises dark -> light, with the turn at 16.0s.

Stitching two recordings can never be fully smooth: different piano, different room, different
reverb tail, and the cut lands mid-phrase. Key and tempo matching is necessary but not sufficient.

The fix is to not stitch at all — find one cue that already performs the arc. Then the transition
is whatever the composer wrote, which is by definition smooth.

Scoring, per candidate 30.167s window starting at t0:
  lift     = centroid(ACT2 half) / centroid(ACT1 half)   -> must be > 1.35
  rise     = energy(ACT2) / energy(ACT1)                 -> the light should also swell
  turnable = the brightness jump is CONCENTRATED near the 16.0s mark, not a slow ramp
             (we want a turn on the downbeat, not a gradual fade-up)
  quiet1   = ACT 1 half must actually be dark/sparse in absolute terms
"""
import subprocess, sys, json, glob
import numpy as np
from scipy.signal import stft

SR = 22050
HOP = 512
FPS = SR / HOP
WIN = 30.167
TURN = 16.0


def decode(path):
    p = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', path,
                        '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True)
    if p.returncode != 0 or not p.stdout:
        return None
    return np.frombuffer(p.stdout, dtype=np.float32)


def frames(y):
    f, t, Z = stft(y, fs=SR, nperseg=2048, noverlap=2048 - HOP)
    m = np.abs(Z) + 1e-9
    cen = (f[:, None] * m).sum(0) / m.sum(0)
    en = m.sum(0)
    return cen, en


best = []
for path in sorted(glob.glob('dla/*.mp3')):
    y = decode(path)
    if y is None or len(y) < SR * (WIN + 6):
        continue
    cen, en = frames(y)
    dur = len(y) / SR
    gcen = cen.mean()

    for t0 in np.arange(2.0, dur - WIN - 1.0, 1.0):
        a = int(t0 * FPS)
        mid = int((t0 + TURN) * FPS)
        b = int((t0 + WIN) * FPS)
        if b >= len(cen):
            break
        c1, c2 = cen[a:mid], cen[mid:b]
        e1, e2 = en[a:mid], en[mid:b]
        if c1.mean() < 1e-6:
            continue
        lift = c2.mean() / c1.mean()
        rise = e2.mean() / (e1.mean() + 1e-9)
        if lift < 1.35 or rise < 1.15:
            continue
        # the jump must be CONCENTRATED at the turn: compare the 3s straddling 16.0s
        pre = cen[mid - int(3 * FPS):mid].mean()
        post = cen[mid:mid + int(3 * FPS)].mean()
        turnness = post / (pre + 1e-9)
        # ACT 1 must be genuinely dark relative to the whole track
        dark1 = gcen / (c1.mean() + 1e-9)
        score = lift * 0.4 + turnness * 0.35 + rise * 0.15 + dark1 * 0.10
        best.append((score, path, float(t0), float(lift), float(rise), float(turnness),
                     float(c1.mean()), float(c2.mean())))

best.sort(reverse=True)
print(f"{'score':>6} {'t0':>7} {'lift':>5} {'rise':>5} {'turn':>5} {'act1Hz':>7} {'act2Hz':>7}  track")
seen = {}
shown = 0
for s, p, t0, lift, rise, tn, c1, c2 in best:
    k = p
    if seen.get(k, 0) >= 1:          # one best window per track
        continue
    seen[k] = seen.get(k, 0) + 1
    print(f"{s:6.3f} {t0:7.1f} {lift:5.2f} {rise:5.2f} {tn:5.2f} {c1:7.0f} {c2:7.0f}  {p.split('/')[-1][:40]}")
    shown += 1
    if shown >= 10:
        break
if not best:
    print("NO CANDIDATE with a built-in arc")
