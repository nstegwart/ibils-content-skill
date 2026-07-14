#!/bin/bash
# ONE CUE — the score is not stitched at all.
#
# Owner: "transisi soundnya ga smooth".
# Correct, and matching key + tempo could never have fixed it. Two different recordings means two
# different pianos, two different rooms, two different reverb tails, and my cut landed mid-phrase.
# A butt-join between recordings is a CUT, not a transition. No amount of crossfade hides that.
#
# So: stop stitching. Find ONE cue that already performs dark -> light, and let the composer's own
# transition be the transition. Then it is smooth by construction — there is no seam to smooth.
#
# Selected: "There is no time to cry" — myshoun (Pixabay, modern-classical, orchestra/cello/piano).
#   window t0 = 21.0s, length 30.167s
#   the cue's OWN brightness turn lands at +16.0s into the window = the film's turn (beat 24)
#   180 BPM = exactly 2x the film's 90 BPM cut grid -> every picture cut still lands on a beat
#   measured: ACT1 303 Hz -> ACT2 1010 Hz (3.33x lift), turn concentrated 3.80x across the 16.0s mark
#
# Rejected: "Emotional Cello" had a stronger arc (5.05x lift, 7.27 turn) but runs at 119.5 BPM, which
# does not lock to the 90 BPM grid. Off-grid cuts are exactly the earlier "music ga sync" complaint.
set -uo pipefail
J="${WORK_DIR:?set WORK_DIR to the ad working dir}"
M=$J/music
W=/tmp/aud3; rm -rf $W; mkdir -p $W

CUE=$M/dla/54_there-is-no-time-to-cry.mp3
SS=21.0
TOTAL=30.166667

[ -s "$CUE" ] || { echo "FATAL: cue missing"; exit 1; }
cp "$CUE" $M/05_onecue-arc_180bpm.mp3

echo "one cue, no seam: t0=${SS}s len=${TOTAL}s"
# loudnorm's single-pass TP is only an ESTIMATE, and AAC encoding overshoots on top of it — the
# first build came out at +0.8 dBFS, i.e. clipping. Do a real two-pass measure, then hard-limit.
MEAS=$(ffmpeg -nostdin -y -ss $SS -t $TOTAL -i "$CUE" \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json" -f null - 2>&1 \
  | python3 -c "
import sys,json,re
s=sys.stdin.read()
m=re.search(r'\{[^{}]*input_i[^{}]*\}', s, re.S)
d=json.loads(m.group(0))
print(':'.join(f'measured_{k}={d[\"input_\"+k]}' for k in ('i','tp','lra','thresh')))
")
[ -z "$MEAS" ] && { echo "FATAL: loudnorm measure failed"; exit 1; }
echo "  measured: $MEAS"

ffmpeg -nostdin -y -ss $SS -t $TOTAL -i "$CUE" -af "
  afade=t=in:st=0:d=1.0,
  afade=t=out:st=$(python3 -c "print(round($TOTAL-2.6,3))"):d=2.6,
  loudnorm=I=-16:TP=-1.5:LRA=11:${MEAS}:linear=true,
  alimiter=limit=0.891:level=disabled:attack=5:release=50" \
  -ar 48000 -ac 2 -c:a aac -b:a 192k $W/score.m4a 2>/dev/null
[ -s $W/score.m4a ] || { echo "FATAL: score empty"; exit 1; }

ffmpeg -nostdin -y -i $J/IBILS_AD_30S_60FPS.mp4 -i $W/score.m4a \
  -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest $J/IBILS_AD_30S_ONECUE.mp4 2>/dev/null

echo ""
echo "=== FINAL ==="
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate -of default=nw=1 \
  $J/IBILS_AD_30S_ONECUE.mp4 2>&1 | grep -E "codec_name|width|height|r_frame_rate|duration"

echo ""
echo "=== ASSERTIONS ==="
export FINAL="$J/IBILS_AD_30S_ONECUE.mp4"
python3 - <<'PY'
import subprocess, os, numpy as np
from scipy.signal import stft
SR=22050
F=os.environ['FINAL']   # heredoc is quoted -> $J would NOT expand inside it
def seg(a,b):
    p=subprocess.run(['ffmpeg','-nostdin','-v','error','-ss',str(a),'-t',str(b-a),'-i',F,
        '-ac','1','-ar',str(SR),'-f','f32le','-'],capture_output=True)
    return np.frombuffer(p.stdout,dtype=np.float32)
def cen(y):
    f,t,Z=stft(y,fs=SR,nperseg=2048,noverlap=1024)
    m=np.abs(Z)+1e-9
    return float(((f[:,None]*m).sum(0)/m.sum(0)).mean())

a1=cen(seg(1.5,15.5)); a2=cen(seg(16.5,29.0))
print(f"  ACT 1 (dark)  centroid {a1:7.1f} Hz")
print(f"  ACT 2 (light) centroid {a2:7.1f} Hz")
print(f"  lift = {a2/a1:.2f}x  -> {'SCORE TURNS' if a2>a1*1.35 else '*** DOES NOT TURN ***'}")

# no seam: there is no join, so check there is no discontinuity anywhere
y=seg(0.5,29.8)
d=np.abs(np.diff(y))
thr=0.30
clicks=int((d>thr).sum())
print(f"  sample discontinuities >{thr}: {clicks}  -> {'NO SEAM' if clicks==0 else '*** CLICK ***'}")

# level — measure PER CHANNEL. decoding with -ac 1 downmixes L+R and can sum past 1.0,
# which reads as clipping that is not there. That false alarm cost a rebuild.
q=subprocess.run(['ffmpeg','-nostdin','-v','error','-i',F,'-f','f32le','-ac','2','-ar','48000','-'],
                 capture_output=True)
st=np.frombuffer(q.stdout,dtype=np.float32).reshape(-1,2)
pk=max(float(np.abs(st[:,0]).max()), float(np.abs(st[:,1]).max()))
print(f"  true peak {20*np.log10(pk+1e-9):+.2f} dBFS (per channel) -> {'OK' if pk<0.99 else '*** CLIPPING ***'}")
PY
