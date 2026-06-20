#!/usr/bin/env bash
# Generate a seamless looping background clip with WaveSpeed.ai.
#
# Sends a still image as BOTH the first and last frame (so the clip loops
# cleanly) to a Wan image-to-video model, polls until the render is done
# and saves the result.
#
# Usage:
#   WAVESPEED_API_KEY=wsk_... \
#   IMAGE=barbican.png OUTPUT=barbican-loop.mp4 \
#   PROMPT_FILE=scripts/barbican-loop.prompt.txt \
#   scripts/generate-loop.sh
#
# Env vars:
#   IMAGE        (required) source still, png/jpg in the repo
#   OUTPUT       output file (default: loop.mp4)
#   PROMPT       inline prompt, OR
#   PROMPT_FILE  path to a file containing the prompt
#   NEGATIVE     negative prompt (sensible painterly default below)
#   MODEL        WaveSpeed model path (default wavespeed-ai/wan-2.2/i2v-720p,
#                which supports last_image for seamless loops)
#   DURATION     seconds (default 5)
#   RESOLUTION   480p|720p|1080p (default 720p)
#   SEED         integer, -1 = random (default -1)
#   LAST_IMAGE   override last frame (default: same as IMAGE = seamless loop)

set -euo pipefail
cd "$(dirname "$0")/.."

: "${WAVESPEED_API_KEY:?Set WAVESPEED_API_KEY to your WaveSpeed.ai API key}"
: "${IMAGE:?Set IMAGE to the source still image}"
[ -f "$IMAGE" ] || { echo "IMAGE not found: $IMAGE" >&2; exit 1; }

OUTPUT="${OUTPUT:-loop.mp4}"
MODEL="${MODEL:-wavespeed-ai/wan-2.2/i2v-720p}"
DURATION="${DURATION:-5}"
RESOLUTION="${RESOLUTION:-720p}"
SEED="${SEED:--1}"
# By default we DON'T pin a last frame: an image-to-video model fills in
# the frames between first and last, so an identical first==last frame
# yields a static clip. Leave LAST_IMAGE unset for real motion; set it
# only for a deliberate first-last-frame (FLF2V) transition. Seamless
# looping is done as a post-process (boomerang / crossfade), not by
# pinning identical endpoints.
LAST_IMAGE="${LAST_IMAGE:-}"

if [ -n "${PROMPT_FILE:-}" ]; then
  PROMPT="$(cat "$PROMPT_FILE")"
fi
: "${PROMPT:?Set PROMPT or PROMPT_FILE}"

NEGATIVE="${NEGATIVE:-photorealistic, 3d render, cgi, plastic, glossy, smooth digital gradient, \
photograph, video game, camera shake, pan, zoom, dolly, scene change, cut, fast motion, \
sudden movement, abrupt movement, running in place, marching on the spot, jumping in place, \
hopping, bouncing, dancing, static ogre, motionless ogre, knights walking, knights running, knights advancing, \
striding forward, travelling forward, new characters, extra limbs, weapon changing shape, \
weapon morphing, transforming weapon, disappearing weapon, sword turning into bow, \
stretching weapon, growing weapon, elongating sword, bending sword, rubbery weapon, laser, \
laser beam, energy beam, light beam, muzzle flash, flash, projectile, flying arrow, releasing \
arrow, firing arrow, magic, glowing energy, sparks, morphing faces, warping armour, flicker, \
strobing, blur, distortion, melting, watermark, text}"

mime() { case "$1" in *.png) echo image/png;; *.jpg|*.jpeg) echo image/jpeg;; *.webp) echo image/webp;; *) echo image/png;; esac; }

# Data URLs can be several MB — far past the shell ARG_MAX limit — so we
# write them to a temp file and let jq read it with --rawfile.
TMP_IMG="$(mktemp)"; TMP_LAST="$(mktemp)"
trap 'rm -f "$TMP_IMG" "$TMP_LAST"' EXIT
printf 'data:%s;base64,' "$(mime "$IMAGE")" > "$TMP_IMG"; base64 -w0 "$IMAGE" >> "$TMP_IMG"

echo "Model      : $MODEL"
echo "Source     : $IMAGE"
echo "Last frame : ${LAST_IMAGE:-<none — free motion>}"
echo "Output     : $OUTPUT"
echo "Spec       : ${RESOLUTION}, ${DURATION}s, seed $SEED"
echo "Submitting..."

PAYLOAD_ARGS=(-n
  --arg prompt "$PROMPT"
  --arg neg "$NEGATIVE"
  --rawfile image "$TMP_IMG"
  --arg res "$RESOLUTION"
  --argjson duration "$DURATION"
  --argjson seed "$SEED")
FILTER='{prompt:$prompt, negative_prompt:$neg, image:$image, resolution:$res, duration:$duration, seed:$seed}'

if [ -n "$LAST_IMAGE" ]; then
  printf 'data:%s;base64,' "$(mime "$LAST_IMAGE")" > "$TMP_LAST"; base64 -w0 "$LAST_IMAGE" >> "$TMP_LAST"
  PAYLOAD_ARGS+=(--rawfile last "$TMP_LAST")
  FILTER='{prompt:$prompt, negative_prompt:$neg, image:$image, last_image:$last, resolution:$res, duration:$duration, seed:$seed}'
fi

SUBMIT=$(jq "${PAYLOAD_ARGS[@]}" "$FILTER" |
  curl -sS -X POST "https://api.wavespeed.ai/api/v3/$MODEL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $WAVESPEED_API_KEY" \
    --data-binary @-)

ID=$(echo "$SUBMIT" | jq -r '.data.id // empty')
if [ -z "$ID" ]; then
  echo "Submission failed:" >&2
  echo "$SUBMIT" | jq . >&2 2>/dev/null || echo "$SUBMIT" >&2
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
      curl -sS -o "$OUTPUT" "$URL"
      echo "Saved $OUTPUT ($(du -h "$OUTPUT" | cut -f1))"
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
