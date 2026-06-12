#!/bin/bash
# One-shot helper: download the four finished WaveSpeed ambient loops for the
# landing page chapters into the repo root. Requires $WAVESPEED_API_KEY and
# network access to api.wavespeed.ai + d1q70pf5vjeyhc.cloudfront.net.
# Delete this script once the mp4 files are committed.
set -euo pipefail
cd "$(dirname "$0")/.."

declare -A PREDICTIONS=(
  [hero-loop.mp4]=f6ef58846d5d46568e37fddef53a40be
  [archer-loop.mp4]=004618952e164b30ac660c8c82a2d7d0
  [bear-loop.mp4]=dd23b72f7aed4275accac76a4cb1b318
  [ogre-loop.mp4]=0c27a45cee51428a97ec57d6aca77887
)

for out in "${!PREDICTIONS[@]}"; do
  id=${PREDICTIONS[$out]}
  url=$(curl -sf -H "Authorization: Bearer $WAVESPEED_API_KEY" \
    "https://api.wavespeed.ai/api/v3/predictions/$id/result" \
    | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['outputs'][0])")
  curl -sfL --max-time 300 -o "$out" "$url"
  echo "saved $out ($(stat -c%s "$out") bytes)"
done
