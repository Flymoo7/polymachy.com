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
- **2026-06-12 v5 (REJECTED):** kneeling knight finally right, but
  the female knight's slashing sword appeared to split in two
  mid-swing.
- **2026-06-12 v6 (committed, pending owner verdict):** two owner
  changes: female knight no longer slashes — she stays poised to
  strike with sword held high (nothing for the model to split) —
  and the white frame line + POLYMACHY logo are GONE from the video.
  Owner uploaded `CLEAN_HERO.png` (1920x1080, painting without
  frame/logo) to main as the new render source; owner will overlay
  frame/logo as a separate layer later. Frame/logo prompt sentence
  dropped. Kneeling knight ground-brace kept word-for-word from v5.
  6s, fresh seed; frame check incl. female-knight crops passed.
  Plays at baked 0.6x default → ~10s perceived slo-mo loop.
- **2026-06-12 v7 (NOT committed, owner reviewing):** owner rejected
  v6 for the female knight's left (shield) hand suddenly holding the
  sword, and a big smoke puff on the right. v7: she only subtly
  brandishes her sword behind her head (right hand only, left
  arm/shield never move, hands never swap); mist must drift slowly
  left→right, no large plume ever. Result: female knight looks
  fixed, BUT a large white plume billows upper-LEFT during the
  first ~2.5s — same failure mirrored. Repo still holds v6.
  Next idea if re-rolling: rephrase so only the painting's
  EXISTING mist slides right and no new mist/smoke is ever added.
- **2026-06-12 v8 (committed, pending owner verdict):** owner also
  rejected v7's elf knight (moved too much, mace changed shape).
  v8: elf knight stands fixed to the spot, mace held high waiting
  to strike, subtlest movement only, mace never changes shape;
  mist rephrased per the "existing mist only slides left→right,
  no new mist ever created" idea. Frame check: all four knights
  clean (elf mace consistent in crops), no dense plume, but the
  left-side mist still brightens/gathers around the midpoint —
  flagged to owner as softer-but-present. If rejected again,
  consider dropping mist motion from the prompt entirely.
- **2026-06-12 v8 ACCEPTED “for now”** — owner wants to see it live
  with the god-rays/mist before a final verdict.
- **2026-06-12 frame/logo overlay wired:** owner uploaded
  `Logo_Overlay.png` (1920x1080 RGBA, frame line + logo on
  transparent) to main. index.html now layers it over the hero
  still + loop via `.frame-overlay` (object-fit: contain, same fit
  as still/video, under the ::after gradient). Fallback still and
  blurred .bg-fill switched from `hero.png` (owner DELETED it on
  main) to `CLEAN_HERO.png`. The first uploaded overlay's wordmark
  read “COMBAT COPILOT” — owner re-uploaded the corrected
  POLYMACHY version (gold wordmark, verified) and it's on the
  branch; no code change was needed.
- **2026-06-12 PR #11 merged by owner** (loop v8 + overlay + 0.6x).
  Owner reviewed it live and rejected v8: kneeling knight drops his
  sword by the hilt and regrips it by the blade; bearded knight too
  exaggerated vs the other three; drifting mist too distracting.
  Also: god-rays painted across the letterbox bars on non-16:9
  screens — fixed in code by clipping `#home .atmosphere` to the
  same 16:9 contain box as the artwork (aspect-ratio + max
  constraints, margin auto centering).
- **2026-06-13 v9 (committed, pending owner verdict):** kneeling
  knight now stays fixed and only hangs his head through weariness
  (hands/sword never move); bearded knight holds his sword aloft
  nearly still (never swings/thrusts/lowers); mist motion removed
  from the prompt entirely — mist stays ambient, page CSS mist +
  god-rays carry the atmosphere. Female knight + elf knight kept
  word-for-word from v8. 6s, fresh seed; frame check incl.
  kneeling-knight crops passed (head sinks, all else locked).
  Shipped via PR #12 with the first letterbox fix attempt.
- **2026-06-13 letterbox fix v2 + tuned speed:** the pure-CSS
  aspect-ratio clip in PR #12 didn't work (with inset:0 an abspos
  box takes height from the insets and IGNORES aspect-ratio), so
  god-rays still painted the bars and the frame line cut through
  the taglines on non-16:9 screens. Replaced with `fitHeroLayers()`
  JS: sizes `#home .atmosphere` AND `.hero-tagline-wrap` to the
  artwork's 16:9 contain rect on load/resize (registered before the
  canvas resize handlers). Tagline font clamps already track the
  box via min(vw,vh) so no font changes were needed. Owner sent
  tuner export `{"global":{"loopSpeed":0.3}}` — baked as the home
  chapter default (now 0.3, was 0.6; ~20s perceived loop).
- **2026-06-13 hero hugs artwork + About moved (PR #14):** owner
  still saw bars (the blurred .bg-fill's painted sky-rays) and the
  fixed POLYMACHY nav title floating "off picture". Owner chose
  "hero hugs the artwork" over cinematic black bars: `#home` height
  now tracks the painting's 16:9 contain height (CSS
  `min(100vh, max(56.25vw, 60vh))`, refined to exact px in
  fitHeroLayers since 100vw counts the scrollbar). No bars on
  squarer-than-16:9 screens; About peeks below; 60vh floor means
  slim bands persist on portrait phones; .bg-fill dimmed
  brightness 0.55→0.32 for those cases. About Us section moved to
  slot 2 (after hero, before the three project chapters); nav dots
  reordered and hero scroll cue now targets #about.
- **2026-06-13 About goes dark (PR #15):** owner: white About bg
  too bright after the landing page. #about now rgb(14,14,14),
  body text light, stat boxes #1a1a1a with white numerals, the
  "multiple disciplines" box INVERTED to the light panel
  (var(--light), dark text, deepened gold #8c6f3f list items —
  bright accent lacked contrast on light). `#about .section-rule`
  darkened like merch. 'about' removed from lightChapters so the
  nav/logo stay light over it.
- **2026-06-13 disciplines panel + dark Contact (PR #16):** owner
  found the cream disciplines panel too bright → now warm dark-grey
  #262119, light text, accent-gold list restored. Get In Contact
  restyled to match the Register Interest interstitial (#immersed):
  black bg, #1a1a1a top border, light text, dark form fields
  (#1a1a1a/#2a2a2a, accent focus), submit button now matches
  .btn-primary (gold bg, black text, white hover). lightChapters
  is now empty (the whole site is dark; on-light CSS kept for
  future use).

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

## Archer loop task — status

Goal: a subtle 6s loop of `Archer_Claude.png` behind the Rules
Omnibus chapter (`chapterVideoLoops['project-01']`).

- **2026-06-13 v1 (committed, pending owner verdict):** owner
  uploaded `Archer_Claude.png` (1920x1080) to main and DELETED
  `archer.jpg` (the `#project-01 .bg-art` reference was switched
  accordingly). Direction: archer kneels in the tree aiming at the
  motionless group below, only flexing the bowstring in preparation,
  never releasing. Prompt built on all hero-loop learnings (single
  subtle action, everything else locked, ambient mist, no new
  figures). 6s; frame check incl. archer + group crops passed.
- **2026-06-13 owner tuner export baked for project-01:**
  `loopSpeed 0.35, sunX 100, sunY -40, rayBrightness 0.8,
  sunAngle 50, mistDensity 1.5` are now the chapter defaults
  (replaced the previous ray values; ~17s perceived loop).

## Bear loop task — status

Goal: a subtle 6s loop of `Bear_Claude.png` behind the Omni Matrix
chapter (`chapterVideoLoops['project-02']`). Owner direction: the
bear has ALREADY struck (paw only follows through, never strikes
again), the airborne elf keeps falling backwards (arms/legs/head
trail), the head-blood keeps travelling, all slo-mo subtle,
painterly preserved. Owner deleted `bear.jpg` on main →
`#project-02 .bg-art` switched to `Bear_Claude.png` (committed).

- **2026-06-13 v1 (REJECTED by Claude's check, NOT committed, owner
  reviewing):** mid-loop (~3s) the elf LANDS and stands upright
  facing the bear before easing back to airborne — the same
  start/end frame return path routed through "standing". If
  re-rolling: add "the elf remains airborne in EVERY frame, his
  feet never touch the ground", clamp amplitudes ("each movement
  only a few centimetres"), and consider repeating the never-lands
  language twice.
- **2026-06-13 v2 (REJECTED by Claude's check, NOT committed):**
  dropped the `last_image` end anchor to allow one-way forward
  motion. MOTION fixed — elf flies backwards and away (never
  dragged back), feet never touch ground, blood travels with his
  head, bear leans weight forward (no backstep). BUT the painterly
  oil texture DRIFTED to glossy photoreal CGI partway through
  (realistic fur/metal/sky) — fails artistic integrity. Root
  cause: the end anchor was also holding the painterly STYLE, not
  just position. So anchored = motion reversal (v1),
  un-anchored = style drift (v2). v3 plan: stay un-anchored
  (motion was right) and hammer the style lock — "flat 2D oil
  painting on aged cracked canvas, heavy visible brushstrokes and
  canvas grain in EVERY frame, muted desaturated palette; NOT
  photorealistic, NOT 3D, NOT CGI, no glossy realism" up front and
  reinforced; consider lower CRF won't help (it's the model).
- **2026-06-13 v3 (COMMITTED, pending owner verdict):** kept the
  un-anchored one-way motion AND added a heavy painterly style lock
  (front + back of prompt: "flat 2D oil painting on aged cracked
  canvas, brushstrokes + canvas grain in EVERY frame, NOT photoreal/
  3D/CGI"). Style HELD across all frames (grain/brushwork preserved,
  muted palette); motion correct (elf flies back and away, blood
  travels with head, bear leans forward, sword/shield fly off).
  Wired into `chapterVideoLoops['project-02']`. NOTE: one-way =
  no seamless loop, so there is a visible cut when it restarts
  (elf travels a fair distance) — flagged to owner; a slower baked
  loopSpeed softens the cadence. No project-02 loopSpeed baked yet
  (owner may send tuner settings as for project-01).

## Other chapters

`project-02`–`project-03` have `null` entries in `chapterVideoLoops`
and the same `.bg-video` slot, ready for loops if the owner asks.
Note: the project chapters' `.bg-art` runs the kenburns drift, so a
chapter video inherits the slow zoom from its parent (the hero's
bg-art has `animation: none`, so the hero loop does not).
