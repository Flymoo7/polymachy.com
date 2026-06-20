#!/usr/bin/env bash
# Turn a non-looping clip into a seamless loop with a short crossfade.
#
# Builds:  C = crossfade(tail, head) + body
# so the output's first and last frames are (near) identical and the clip
# repeats with no visible jump. A short crossfade (default 0.13s) keeps the
# unavoidable double-exposure during the blend down to a quick whoosh.
#
# Usage:
#   IN="Barbican Breach.mp4" OUT=barbican-loop.mp4 XFADE=0.13 scripts/make-loop.sh
#
# Env:
#   IN     (required) source mp4
#   OUT    output mp4 (default loop.mp4)
#   XFADE  crossfade seconds (default 0.13; raise for a softer but ghostier blend)

set -euo pipefail
cd "$(dirname "$0")/.."
: "${IN:?Set IN to the source mp4}"
[ -f "$IN" ] || { echo "IN not found: $IN" >&2; exit 1; }
OUT="${OUT:-loop.mp4}"
XFADE="${XFADE:-0.13}"

FF="$(python3 -c 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())')"
# `ffmpeg -i <file>` with no output exits 1, which would trip pipefail+set -e,
# so capture its banner with `|| true` before parsing the duration.
PROBE="$("$FF" -hide_banner -i "$IN" 2>&1 || true)"
D="$(printf '%s' "$PROBE" | sed -n 's/.*Duration: \([0-9:.]*\).*/\1/p' \
      | awk -F: '{print $1*3600+$2*60+$3}')"
TS="$(python3 -c "print(round($D-$XFADE,3))")"

"$FF" -hide_banner -loglevel error -y -i "$IN" -filter_complex "
[0:v]trim=${TS}:${D},setpts=PTS-STARTPTS[tail];
[0:v]trim=0:${XFADE},setpts=PTS-STARTPTS[head];
[0:v]trim=${XFADE}:${TS},setpts=PTS-STARTPTS[body];
[tail][head]blend=all_expr='A*(1-(T/${XFADE}))+B*(T/${XFADE})',setpts=PTS-STARTPTS[xf];
[xf][body]concat=n=2:v=1,fps=30[out]
" -map "[out]" -an -c:v libx264 -crf 18 -pix_fmt yuv420p -movflags +faststart "$OUT"

OUT_DUR="$("$FF" -hide_banner -i "$OUT" 2>&1 || true)"
echo "Wrote $OUT ($(printf '%s' "$OUT_DUR" | sed -n 's/.*Duration: \([0-9:.]*\).*/\1/p'), crossfade ${XFADE}s)"
