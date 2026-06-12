#!/usr/bin/env bash
# Generate the looping hero background video with WaveSpeed.ai.
#
# Sends hero.png as BOTH the first and last frame (so the clip loops
# seamlessly) to a Wan image-to-video model, polls until the render is
# done and saves it as hero-loop.mp4 in the repo root.
#
# Usage:
#   WAVESPEED_API_KEY=ws-... scripts/generate-hero-loop.sh
#
# Optional overrides:
#   MODEL=wavespeed-ai/wan-2.2/i2v-720p   (default: alibaba/wan-2.7/image-to-video)
#   DURATION=8                            (seconds, default 5)
#   RESOLUTION=1080p                      (default 720p)
#   SEED=42                               (default -1 = random)

set -euo pipefail
cd "$(dirname "$0")/.."

: "${WAVESPEED_API_KEY:?Set WAVESPEED_API_KEY to your WaveSpeed.ai API key}"
MODEL="${MODEL:-alibaba/wan-2.7/image-to-video}"
DURATION="${DURATION:-5}"
RESOLUTION="${RESOLUTION:-720p}"
SEED="${SEED:--1}"

IMAGE_DATA="data:image/png;base64,$(base64 -w0 hero.png)"

PROMPT='Extreme slow motion, subtle ambient loop of an epic fantasy oil painting. \
Camera completely locked, no pan, no zoom. Four armoured knights defend their position in drifting battlefield smoke. \
The kneeling knight on the left struggles to raise his broken sword, trembling slightly as he fights to keep his balance. \
The grey-bearded knight lifts his longsword to full height, poised to drive a crushing downward blow into an unseen foe. \
The female knight coils, preparing to slash at a charging oncoming enemy. \
The elf knight raises his battered shield against incoming arrows while brandishing his mace. \
Shadowy enemy silhouettes hover in the smoky background, waiting to attack. \
Smoke and dust drift very slowly across the scene. Restrained, minimal, painterly motion. \
The white rectangular border frame and the Polymachy clock logo stay perfectly still and unchanged.'

NEGATIVE='camera movement, pan, zoom, dolly, cut, scene change, fast motion, running, jumping, \
new characters entering, faces morphing, text warping, logo distortion, flicker, strobing, blur, watermark'

echo "Submitting to $MODEL (${RESOLUTION}, ${DURATION}s)..."
SUBMIT=$(jq -n \
  --arg prompt "$PROMPT" \
  --arg neg "$NEGATIVE" \
  --arg image "$IMAGE_DATA" \
  --arg res "$RESOLUTION" \
  --argjson duration "$DURATION" \
  --argjson seed "$SEED" \
  '{prompt:$prompt, negative_prompt:$neg, image:$image, last_image:$image,
    resolution:$res, duration:$duration, seed:$seed}' |
  curl -sS -X POST "https://api.wavespeed.ai/api/v3/$MODEL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $WAVESPEED_API_KEY" \
    --data-binary @-)

ID=$(echo "$SUBMIT" | jq -r '.data.id // empty')
if [ -z "$ID" ]; then
  echo "Submission failed:" >&2
  echo "$SUBMIT" | jq . >&2
  exit 1
fi
echo "Prediction id: $ID — polling..."

while :; do
  RES=$(curl -sS "https://api.wavespeed.ai/api/v3/predictions/$ID/result" \
    -H "Authorization: Bearer $WAVESPEED_API_KEY")
  STATUS=$(echo "$RES" | jq -r '.data.status // empty')
  case "$STATUS" in
    completed)
      URL=$(echo "$RES" | jq -r '.data.outputs[0]')
      echo "Done: $URL"
      curl -sS -o hero-loop.mp4 "$URL"
      echo "Saved hero-loop.mp4 ($(du -h hero-loop.mp4 | cut -f1))"
      break ;;
    failed)
      echo "Generation failed:" >&2
      echo "$RES" | jq . >&2
      exit 1 ;;
    *)
      printf '.'
      sleep 3 ;;
  esac
done
