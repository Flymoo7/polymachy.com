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

### Owner's creative direction (authoritative — fill in / keep updated)

> TODO: the owner's original direction was lost with a previous
> session. When the owner restates it, record it here VERBATIM
> (expected motion, mood, exact prompt wording if given, model
> preference, what past attempts got wrong) and follow it exactly.

## Other chapters

`project-01`–`project-03` have `null` entries in `chapterVideoLoops`
and the same `.bg-video` slot, ready for loops if the owner asks.
