#!/bin/bash
# THE AD v3 — 60fps, ZERO temporal stretch.
#
# What was actually wrong in v2 (owner: "kenapa FPS-nya jelek"):
#   v2 only used grok's 0-2.8s window (67 real frames) and STRETCHED it up to 4.4s.
#   ~64% of the delivered frames were synthesised just to fill TIME. That is what looked mushy —
#   not the 24fps number.
#
# The fix: grok clips are clean the FULL 6.04s under a restrained motion prompt (QC'd at 4.5s and
# 5.8s: no scepter, cape intact, baked type intact). Longest shot we need is 4.4s < 6.04s.
#   => cut each shot at EXACTLY its target length. No setpts. No time-stretch. 100% real grok motion.
#   => then upconvert 24 -> 60fps, which only has to invent frames between REAL samples 41.7ms apart.
#      That is the job mci/aobmc is built for, and it is a completely different operation from
#      stretching 67 frames across 105.
#
# grok has NO fps control (fixed 24fps, 6s/10s, 480/720p). 60fps is produced here, not requested there.
set -uo pipefail
J="${WORK_DIR:?set WORK_DIR to the ad working dir}"
A=$J/ad
MUS=$J/music/01_dark-crime-piano-drama_90bpm.mp3
W=/tmp/adbuild3; rm -rf $W; mkdir -p $W
FPS=60; WD=720; HT=1280
SRCMAX=6.0        # grok clip length actually available

# shot | clip | beats | outgoing transition (0 = hard cut)
SHOTS=(
  "s1 v01 4 0"     # hook      cut
  "s2 v02 5 0"     # store     cut
  "s3 v03 4 0"     # puddle    cut
  "s4 v04 6 0.30"  # room      -> sink to rock bottom
  "s5 v05 5 0.40"  # face      -> THE TURN. longest dissolve = the hinge.
  "s6 v06 5 0.25"  # send
  "s7 v07 6 0.40"  # ledger    -> the dawn breaks
  "s8 v08 6 0.35"  # window    -> settle
  "s9 v09 5 0"     # endcard
)

echo "cutting 9 grok clips @ ${FPS}fps — NO time-stretch, 100% real motion"
printf "  %-3s %-4s %-4s %-9s %-9s %s\n" "sh" "clip" "beat" "need" "real-src" "synth-for-time"
for row in "${SHOTS[@]}"; do
  set -- $row; N=$1; V=$2; B=$3; T=$4
  [ -s "$A/$V.mp4" ] || { echo "FATAL: $A/$V.mp4 missing"; exit 1; }
  DUR=$(python3 -c "print(round($B*60/90 + $T, 4))")
  python3 -c "import sys; sys.exit(0 if $DUR <= $SRCMAX else 1)" \
    || { echo "FATAL: $N needs ${DUR}s but grok only gives ${SRCMAX}s"; exit 1; }

  # take the first $DUR seconds of the grok clip AS-IS. setpts is gone. this is the whole fix.
  ffmpeg -nostdin -y -t $DUR -i "$A/$V.mp4" -filter_complex \
    "[0:v]scale=$WD:$HT:flags=lanczos,setsar=1,
       minterpolate=fps=$FPS:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,
       trim=duration=$DUR,setpts=PTS-STARTPTS,
       format=yuv420p[v]" \
    -map "[v]" -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p $W/$N.mp4 2>/dev/null

  R=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $W/$N.mp4 2>/dev/null)
  NF=$(ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 $W/$N.mp4 2>/dev/null | head -1)
  REAL=$(python3 -c "print(int($DUR*24))")
  printf "  %-3s %-4s %-4s %-9s %-9s %s\n" "$N" "$V" "${B}b" "${DUR}s" "${REAL}f@24" "0 (was ~64%% in v2)"
  [ -s $W/$N.mp4 ] || { echo "FATAL: $N empty"; exit 1; }
  awk -v r="$R" -v d="$DUR" 'BEGIN{ exit !(r < d - 0.1) }' \
    && { echo "FATAL: $N is ${R}s, must be ${DUR}s"; exit 1; }
done

# ---- hard cuts through the descent, dissolves through the turn ----
: > $W/g1.txt
for n in s1 s2 s3 s4; do echo "file '$W/$n.mp4'" >> $W/g1.txt; done
ffmpeg -nostdin -y -f concat -safe 0 -i $W/g1.txt -c copy $W/g1.mp4 2>/dev/null
DA=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $W/g1.mp4)
echo ""
echo "descent (hard cuts 1-4): ${DA}s"

CUR=$W/g1.mp4; i=0
for row in "${SHOTS[@]:4}"; do
  set -- $row; N=$1
  case $N in s5) T=0.30 ;; s6) T=0.40 ;; s7) T=0.25 ;; s8) T=0.40 ;; s9) T=0.35 ;; esac
  OFF=$(python3 -c "print(round($DA - $T, 4))")
  ffmpeg -nostdin -y -i $CUR -i $W/$N.mp4 -filter_complex \
    "[0:v][1:v]xfade=transition=fade:duration=$T:offset=$OFF,format=yuv420p[v]" \
    -map "[v]" -r $FPS -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p $W/x$i.mp4 2>/dev/null
  [ -s $W/x$i.mp4 ] || { echo "FATAL: xfade into $N failed"; exit 1; }
  CUR=$W/x$i.mp4
  DA=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $CUR)
  printf "  dissolve %ss into %s -> running %ss\n" "$T" "$N" "$DA"
  i=$((i+1))
done

# ---- grade + grain last ----
ffmpeg -nostdin -y -i $CUR -filter_complex "
  [0:v]colorbalance=rs=-.03:gs=.02:bs=.02:rh=.04:gh=.02:bh=-.02,
       curves=all='0/0.02 0.5/0.48 1/0.96',
       noise=alls=4:allf=t+u,
       format=yuv420p[v]" \
  -map "[v]" -r $FPS -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p $W/picture.mp4 2>/dev/null
TOTAL=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $W/picture.mp4)
echo ""
echo "picture: ${TOTAL}s @ ${FPS}fps"

ffmpeg -nostdin -y -ss 6.0 -t "$TOTAL" -i "$MUS" \
  -af "afade=t=in:st=0:d=1.2,afade=t=out:st=$(python3 -c "print(round($TOTAL-2.2,3))"):d=2.2,loudnorm=I=-16:TP=-1.5:LRA=11" \
  -c:a aac -b:a 192k -ar 48000 $W/mus.m4a 2>/dev/null

ffmpeg -nostdin -y -i $W/picture.mp4 -i $W/mus.m4a -map 0:v -map 1:a \
  -c:v copy -c:a aac -b:a 192k -shortest $J/IBILS_AD_30S_60FPS.mp4 2>/dev/null

echo ""
echo "=== FINAL ==="
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate,nb_frames -of default=nw=1 $J/IBILS_AD_30S_60FPS.mp4 2>&1 | grep -E "codec_name|width|height|r_frame_rate|nb_frames|duration"

echo ""
echo "=== ASSERTIONS ==="
fail=0
RF=$(ffprobe -v error -select_streams v -show_entries stream=r_frame_rate -of csv=p=0 $J/IBILS_AD_30S_60FPS.mp4)
echo "  framerate=$RF"; [ "$RF" = "60/1" ] || { echo "  <<< NOT 60fps"; fail=1; }
STA=$(ffmpeg -nostdin -y -ss 2 -i $J/IBILS_AD_30S_60FPS.mp4 -frames:v 1 -f image2 - 2>/dev/null | magick - -format '%[fx:mean]' info:)
END=$(ffmpeg -nostdin -y -ss 28 -i $J/IBILS_AD_30S_60FPS.mp4 -frames:v 1 -f image2 - 2>/dev/null | magick - -format '%[fx:mean]' info:)
echo "  light arc: start=$STA end=$END"
awk -v a="$STA" -v b="$END" 'BEGIN{ if (b > a*1.5) print "  ARC OK"; else { print "  ARC FAIL"; exit 1 } }' || fail=1
AC=$(ffprobe -v error -select_streams a -show_entries stream=codec_name -of csv=p=0 $J/IBILS_AD_30S_60FPS.mp4)
echo "  audio=${AC:-NONE}"; [ -z "$AC" ] && fail=1
echo ""
[ $fail -eq 0 ] && echo "ASSERTIONS PASS" || echo "ASSERTIONS FAILED"
