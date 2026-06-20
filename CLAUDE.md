# Polymachy.com — project memory

Static marketing site for **Polymachy** (tabletop/fantasy IP), served via GitHub
Pages (`CNAME`). Plain HTML/CSS/JS, no build step. Pages: `index.html` (landing),
`app.html`, `charactersheet.html`, `distiller.html`, `merch.html`.

This file is the durable cross-session memory. In Claude Code on the web, auto
memory (`~/.claude/.../memory/`) is wiped with each ephemeral session, so anything
worth keeping goes here or in commit messages.

## Git workflow
- Develop on branch **`claude/dazzling-faraday-7ra0yu`**. Don't push elsewhere
  without explicit permission. Don't open PRs unless asked.
- The user often commits source key-art and raw render takes to **`main`**
  (e.g. `Barbican Breach 4.png`, `Barbican Breach_2.mp4`). Pull from `origin/main`
  to retrieve them.
- Commit message footer:
  `https://claude.ai/code/session_019ie9YtUryKPFTEmaRK5xUp`

## Animated backgrounds — what we're building
Subtle, slow-motion, seamlessly-looping background videos generated from painterly
key-art via **WaveSpeed.ai**, played behind the landing-page chapters. Loop assets
live in the repo root: `hero-loop.mp4`, `archer-loop.mp4`, `barbican-loop.mp4`.

### Tooling (in `scripts/`)
- `generate-loop.sh` — renders a motion clip on WaveSpeed. Env vars: `IMAGE`
  (source still), `OUTPUT`, `PROMPT_FILE` or `PROMPT`, `NEGATIVE`, `MODEL`
  (default `wavespeed-ai/wan-2.2/i2v-720p`), `RESOLUTION`, `DURATION`, `SEED`,
  `LAST_IMAGE` (optional). Streams base64 data URLs through `jq --rawfile`.
- `make-loop.sh` — turns a clip into a seamless loop via a short crossfade
  (`IN`, `OUT`, `XFADE` default `0.13`). Builds `crossfade(tail,head)+body` so the
  first/last frames match (seam diff ~3/255).
- `barbican-loop.prompt.txt` — tuned prompt for the barbican scene.
- ffmpeg is available via imageio-ffmpeg:
  `/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2`

### Page integration (`index.html`)
- `chapterVideoLoops` map wires an mp4 behind a chapter; `.bg-video` fades in on
  `canplay`, still art is the fallback.
- `hero-overlay.png` overlays the painted frame + Polymachy logo crisply so the AI
  video can't warp them (hero only).
- `?tune` opens the atmosphere tuner; it includes a per-chapter **loop speed**
  slider (`videoSpeed`) alongside the god-ray/mist controls.

## Generation learnings (important)
- **Never set `last_image` == first frame.** The i2v model interpolates between
  first and last; identical endpoints = a static clip. Leave `LAST_IMAGE` unset for
  real motion. Seamless looping is done in post (crossfade), not by pinning frames.
- **Low net motion = clean loop.** Keep characters rooted and slow so the first and
  last frames stay close; the crossfade then has little to reconcile. Large motion
  (figures travelling across frame, a hard-charging horde) causes visible
  double-exposure ghosting at the seam.
- **Describe weapons accurately, per character.** In `Barbican Breach 4.png` the
  female knight wields **two swords (one in each hand)** plus a third sheathed at
  her side. Prompting "one sword" / negatives like "second sword, duplicate weapon"
  makes the model DELETE her real blade mid-clip. The old knight has a longsword,
  the young knight a poleaxe, the elf a nocked bow.
- **Don't pin a weapon/limb "fixed" while the figure moves — it distorts.**
  Telling the model to hold the old knight's sword at a fixed height while he
  shifts made the blade physically stretch/grow. Instead minimise the whole
  character's motion so the weapon naturally barely moves with the hand. Block
  `stretching/growing/elongating sword` in negatives.
- **Elf bow:** he only draws the string; the arrow stays nocked and is never
  released. Negatives must block `laser, beam, flash, projectile, flying arrow,
  firing arrow, magic` (the model once fired a "laser"). He also keeps
  re-aiming his bow at his own colleagues when he moves — the cure is to keep
  him almost static, holding the painting's existing aim (up/away toward the
  distant gate + horde), rather than describing a new aiming action.
- **Model limits:** `wan-2.2/i2v-720p` only does 720p and 5 or 8 seconds (no 6s).
  True 1080p needs `alibaba/wan-2.7/image-to-video`. A "≤6s loop" is a 5s render
  crossfaded to ~5.27s.

## Environment constraint — the manual hop
- WaveSpeed serves finished renders from **`*.cloudfront.net`, which the network
  egress policy BLOCKS** (403). `api.wavespeed.ai` (generation) and GitHub are
  allowed, so I can *render* but not *download* the result.
- **Manual-hop workflow:** I render → give the user the cloudfront URL → user
  downloads it and commits the raw mp4 to the repo → I `git pull` it, crossfade-loop
  it with `make-loop.sh`, and deliver the result with **SendUserFile** (the direct
  channel). Do NOT rely on GitHub to preview these — its viewer can't display files
  over ~10MB and doesn't loop, so the user can't judge the seam there.
- To remove the hop: add `*.cloudfront.net` (keep `api.wavespeed.ai`) to the
  environment's **Custom** allowed domains. Allowlist changes only take effect in a
  **new session** (which loses chat context but not repo artifacts).
- `WAVESPEED_API_KEY` is provided as an environment variable.
