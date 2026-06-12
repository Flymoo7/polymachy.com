# Polymachy — notes for Claude sessions

Single-page fantasy landing site (GitHub Pages, CNAME → polymachy.com).
Everything lives in `index.html`; artwork files sit in the repo root.

## Working rules

- **Read this file before continuing any task.** Session memory does not
  carry over; this file is the handoff.
- **Never spend generation credits without approval.** Video/image
  generation costs the owner real money. Always show the exact model,
  prompt, and estimated cost, and wait for an explicit yes before
  submitting a job.
- Video generation is done via the **Wavespeed API**
  (`https://api.wavespeed.ai/api/v3/...`, key in `WAVESPEED_API_KEY`).
  Do NOT use the Higgsfield MCP tools — uploads to it are blocked by the
  network policy and the owner has chosen Wavespeed.
- Generated video outputs land on `d1q70pf5vjeyhc.cloudfront.net` /
  `d2p7pge43lyniu.cloudfront.net` (both allowlisted for download).
- Compress delivered video for web (H.264, faststart, no audio, aim for
  well under 10MB) before committing.

## Hero loop task — status

Goal: an AI-generated slow-motion loop of `hero.png` that plays behind
the hero text via `chapterVideoLoops.home` in `index.html` (the still
painting stays as the instant fallback; wiring + CSS already done).

- **2026-06-12 attempt (REJECTED by owner):** the current
  `hero-loop.mp4` was generated with
  `bytedance/seedance-v1.5-pro/image-to-video`, 1080p, 10s, same
  start/end frame, with a prompt Claude wrote itself. The owner had
  given specific creative direction in an earlier session and this
  attempt ignored it. Treat the current `hero-loop.mp4` as a
  placeholder to be replaced.
- **2026-06-12 v2 (NEARLY approved):** regenerated 6s from the
  direction below; owner liked it except for two running shadow
  figures the model invented in the background. v3 spec: re-render at
  10s with the background silhouettes explicitly motionless (nothing
  runs/charges/crosses, no new figures), plus whole animation slowed
  40% — implemented as baked `loopSpeed: 0.6` default for the home
  chapter (slider still overrides).
- **2026-06-12 v3 (REJECTED, not committed):** the 10s
  render drifted badly mid-loop — kneeling knight stands up with a
  full sword, a new round shield appears, elf knight's shield loses
  its arrows. Longer durations drift more. Owner rejected both v2
  (running shadows) and v3 (mid-loop drift).
- **2026-06-12 v4 (REJECTED):** owner liked the mist but the kneeling
  knight's right sword arm animated strangely.
- **2026-06-12 v5 (committed, pending owner verdict):** kneeling
  knight's action simplified per owner: he lets go of the broken
  sword with his right hand and reaches that hand to the ground to
  support himself, staying kneeling; arrow in his right shoulder
  explicitly fixed in place. Everything else word-for-word from v4
  (static arrows, drifting mist, motionless background). 6s, fresh
  seed. Claude's frame check incl. kneeling-knight close-up crops
  passed. Plays at baked 0.6x default → ~10s perceived slo-mo loop.

### Owner's creative direction (authoritative — restated 2026-06-12)

Recorded verbatim from the owner:

> Maintaining the original painterly effect of the hero image - I want
> this to be a subtle, slo-mo fx of the 4 main characters defending
> their position. Character 1 - knight on bended knee should be
> struggling to raise his broken sword whilst maintaining his balance,
> make sure the arrow in his right should stays fixed in place and
> doesnt become attached to the broken sword. Character 2 - bearded
> knight brings his sword to full height in anticipation of thrusting
> a crushing downwards blow into an unforeseen foe. Character 3 -
> female knight preparing to slash at the charging oncoming enemy, as
> she slashes her shield arm moves with the general motion and the
> shield remains firmly fixed to her atm. Character 4 - elf knight
> raises shield against arrows whilst brandishing his mace. The shadow
> characters in the background should be seen to hover waiting to
> attack. There should be NO sparks or explosions in the background,
> no trailing leaves being blown across the screen by an unseen wind.
> This requires a 6 second looping animation whose speed can be
> tweaked with a slider similar to the god-ray sliders recently
> created.

Notes: character numbering is left to right in `hero.png` (1 kneeling
knight, 2 bearded knight, 3 female knight, 4 elf knight with shield).
The painted white frame line and POLYMACHY logo must stay perfectly
static. Loop speed slider = video `playbackRate` control in the ?tune
panel.

## Other chapters

`project-01`–`project-03` have `null` entries in `chapterVideoLoops`
and the same `.bg-video` slot, ready for loops if the owner asks.
