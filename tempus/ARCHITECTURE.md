# Tempus — architecture

Tempus is Polymachy's **product 03**: a **system-agnostic combat
companion** for tabletop RPGs — a "smart combat copilot" that pairs
**full rules automation** with a **physiological combat simulation**.
Where Omni Matrix (product 02) owns the character sheet, Tempus owns the
**fight**: initiative, an action tree, weapon/strike resolution,
hit-location wounds, and a living health/vitals model, all in a 3D scene
shared across a GM-hosted table.

This document is the authoritative record of the architecture decisions
made with the owner. **Read it before working on anything under
`tempus/`.** The companion format spec is `tempus/TEMPUS-FORMAT.md`.

> **Design reference:** the owner's walkthrough video `Screen_006.mp4`
> (the "Player Screen" demo — shared 2026-06-17 via a GitHub release, not
> committed). It established the Player Screen layout, the action tree,
> the tactical map, and the Health Page. The medieval visuals in it are a
> **framework to present ideas, not a locked art direction** — setting and
> art are a swappable layer (see "Platforms & theming" below). Tempus
> draws on **all of history and beyond**, not one period.

## What it is

A native application that:

1. Runs **any** combat system from a declarative **definition** — the
   action tree, weapons, hit-location effects, and vitals are all data,
   not hard-coded. Adding a system = adding/merging definition content.
2. **Automates combat** — initiative → action selection (the action
   tree) → hit location → dice pool → weapon/body-effect resolution →
   wounds and vitals changes — driven by the definition.
3. **Simulates the body** — damage is transferred to a **Health Page**
   as located wounds plus a panel of physiological vitals (pulse,
   breathing, temperature, blood, etc.). The simulation **feeds back into
   the rules** (a wound/vital can modify later rolls), and outcomes are
   **forwarded to the GM**.
4. Hosts **live, networked play** — a GM sets up a session and players
   join (Omni Matrix model), with a per-player **communicator**
   (capability-adaptive voice, 1:1 or whole-team, plus text chat).
5. **Round-trips characters with Omni Matrix** — it can import an OM
   character and, used standalone, writes characters in the same format
   so they open in OM.

## The Player Screen (from the demo)

The 3D scene is the UI. Labelled elements:

- **Player Avatar** — the character as a posed 3D model, centre stage.
- **Page Selector** — heraldic shields across the top are page tabs
  (Equipment, Statistics, …); double-click the blue shield icons to
  switch pages.
- **Personal Communicator** — top-right ring of party portraits around a
  central active speaker. Click a player to talk to them privately;
  the bottom bar is **Group Chat** (everyone).
- **NPC Selector** — left-hand column of figures (the GM/encounter cast).
- **Map** — a hanging tapestry that opens the full tactical map.
- **Health Font** — a stone basin; click once for an instant health
  read-out (the full picture lives on the Health Page).

**Tactical map & a combat round:** a top-down gridded battle map with
allied (green) and enemy (red) tokens, a left-hand **rotating cylinder**
that selects **where on the body** a strike lands, and a bottom
**Start → End** bar that is the **round's initiative/action timeline**.
Banners unfurl for **Initiative → Actions → Dice Pool**: the player
selects initiatives that become Actions 1–3; each action opens the
**action tree** (e.g. *Melee → Attack → Main Weapon → Cut*), the cylinder
sets the target body region, and a **dice pool** is entered for the action
(believed app-computed from stats/weapon — to confirm with the designer).

**Health Page:** damage becomes **located bodily wounds** on a 3D
anatomical figure, alongside physiological gauges (Pulse, Breathing,
Temperature, Sleep, Hydration, Satiety, Poison, Intoxication, Vigor,
Blood — each a two-pole scale, e.g. Bradycardia↔Tachycardia, with
modifiers like Vigor −3).

## Decisions (locked with the owner)

### System-agnostic, growing rulesets — combat as data

Tempus is **system-agnostic like Omni Matrix**, because players must be
able to bring it to the games they already play and to homebrew. The
combat model is therefore **data-driven content**: the action tree,
weapon tables, hit-location effect tables, and vitals are all described in
a definition (see `TEMPUS-FORMAT.md`), not baked into code. We **ship a
basic set of rulesets and grow it over time**. The first shipped system is
**Yves's** original ruleset (his written spreadsheet — to be shared with
the build later); it spearheads Tempus and is original content.

### Relationship to Omni Matrix & Rules Omnibus — shared format

The real backbone is **one agnostic definition format shared by both apps.**
Tempus's definition is an **extension of Omni Matrix's** format: it reuses
OM's fields/derived-values/dice and **adds combat sections** that OM
ignores. Consequences:

- **Standalone:** Tempus works with no OM involvement.
- **OM character round-trip:** import an OM character and it works as a
  sheet; combat automation activates once a combat ruleset is attached. A
  Tempus-authored character is written in OM's format and opens in OM.
- One schema, **combat is an optional super-set** layered on OM's core.

### Combat realism — automation *and* simulation, both feeding back

"Realism" is explicitly **both**: a rules engine **and** a physiological
simulation, weighted equally. The visual/sim layer is **not cosmetic** —
a strike's located damage is captured, applied to wounds/vitals, **fed
back into subsequent resolution**, and **forwarded to the GM screen**.

### Rich wound model

Not hit-points. Damage is **hit-location based**, resolved through
per-weapon / per-attack effect tables against body regions, expressed as
**located wounds** plus a multi-axis **vitals** panel (bleeding,
breathing, consciousness, poison, etc.). This depth is the core of Yves's
system and the main thing the format must capture faithfully.

### Networking — GM-hosted, GM is the authority

A GM sets up the session and players join (Omni Matrix model: lobby /
short code). **The GM approves outcomes** (locked 2026-06-17): combat
resolution flows **propose → GM approve/deny → execute**, the same event
pattern as OM's action log, with the engine doing the maths and the GM
confirming before wounds/vitals commit. (An optional auto-resolve toggle
may come later, but approval is the default and the v1 model.)

Because Tempus is a **paid product** (below), we may **lean on managed
services** rather than pure P2P:

- **Desktop:** Steam networking + Steam voice.
- **Cross-platform (tablet/mobile, later):** a cross-platform service
  such as **Epic Online Services** (free networking/voice).

This is a deliberate departure from OM's strict "owner pays for nothing"
rule — Tempus's revenue funds its services.

### Communicator

In-app comms are **capability-adaptive**: with a mic/headset a player can
speak to **one** other player or the **whole team**; without one, a
**text** channel covers the same (private and group). Built for **remote
play**, and **a live connection is assumed** (no offline-at-table
requirement).

### IP / legal guardrail — original, adaptable, nothing branded

Same line as Omni Matrix, and **stricter because Tempus is sold**:

- **We ship only original rulesets** (Yves's + ours) — no game's names,
  terminology, conventions, lore, or trademarks anywhere in shipped
  content.
- **Players adapt our system to the games they play.** "Works with D&D /
  Vampire" means a user authors/adapts the rules themselves; Polymachy
  never distributes a third party's IP.
- Game **mechanics** aren't copyrightable; their **expression** (names,
  text, trademarks) is — we stay on the mechanics side and keep all
  shipped expression original. Selling the product makes this a hard
  requirement, not a preference.

### Monetization — paid, Steam-first, content as DLC

- Tempus is a **fee-based product**, distributed **Steam-first** on
  desktop (app stores for tablet/mobile later). One-off purchase vs
  subscription is **undecided** — it does not change the architecture
  (DLC entitlement works under either).
- New content (more weapons, eras — eventually firearms) ships as
  **paid DLC**. Content must therefore be built as **composable packs**
  from day one (see below).

### Stack & engine — Unreal, with a re-implemented rules core

- **Unreal Engine**, chosen for the team's familiarity/compatibility and
  as the **runway to a future, fully-fledged Polymachy game** after
  Tempus. UE also delivers the 3D scene and the physical-combat feel.
- OM's rules engine is JavaScript and **cannot be reused** in UE. We
  reuse the **format and semantics**, not the code: the sandboxed
  **expression evaluator + dice resolver are re-implemented in UE**
  (C++), so OM (web) and Tempus (UE) interpret **identical** definitions
  deterministically. The shared definition format is the single source of
  truth across both products. This is a central, non-trivial piece of
  engineering.

### Platforms & theming

- **Order: desktop → tablet → mobile.** Desktop first (Windows first;
  Mac TBD).
- **Setting/scene-skin is a swappable layer, and the thematic scope is
  vast.** Tempus is not tied to any one period or genre — it draws on the
  **whole sweep of history and beyond**: from the earliest civilizations,
  through the present day, into the future, *and* across fantasy and the
  supernatural (vampire courts, realms of dragons, …). The guiding line is
  "**as limited as our imaginations**." The same data-driven combat
  systems are re-skinned per setting; the medieval hall in the demo is the
  first skin, not the boundary.

## Data model — four independent layers

Extends OM's three-layer model with a session layer for live combat:

1. **System definition** *(agnostic ruleset — OM layer + combat
   extensions).* Fields/derived/dice (OM) **plus** action tree, weapons &
   gear, body map, hit-effect tables, vitals, and round/initiative config.
   See `TEMPUS-FORMAT.md`. Authored once per system; extended by DLC packs.
2. **Character data** *(OM-compatible, portable).* Persistent values
   (attributes, equipped gear) in OM's format so it round-trips.
3. **Session / encounter state** *(transient, lives in the live game).*
   Wounds, current vitals, map position, initiative, the shared action
   log. Not saved into the character; owned by the GM-hosted session.
4. **Layout / scene-skin** *(swappable theme).* Where the avatar /
   communicator / map / health-font sit and the visual theme — separate so
   visuals can change without touching rules (as in OM).

## Content as composable DLC packs

A content pack is **additive definition fragments** — new weapons, an era,
new action-tree branches (e.g. firearms), more hit-effect tables — that
**merge over the base system**, namespaced to avoid id collisions. Steam
DLC entitlement decides which packs load. Designing for clean merge now is
what makes "add content forever" cheap later. The **weapon/damage schema
is deliberately generic** so ranged/firearms and other periods fit without
a format rewrite.

## Subsystems

1. **Definition + content pipeline** — load/merge the base system and
   entitled DLC packs into one resolved ruleset.
2. **Rules core (UE)** — re-implemented sandboxed expression evaluator +
   parameterized dice resolver; drives derived values and roll pools.
3. **Combat engine** — initiative/round structure, action-tree traversal
   with conditions/costs, hit-location targeting, strike resolution
   against effect tables, wound + vitals application and feedback.
4. **Character model** — OM-compatible import/export, round-trip.
5. **Session layer** — GM-hosted rooms, presence/roster, the action log
   as an event stream (**propose → GM approve/deny → execute**), NPC
   roster, the tactical map state.
6. **Communicator** — adaptive voice (1:1 / team) + text, over the chosen
   networking service.
7. **Scene / UI shell** — the 3D Player Screen, pages, Health Page, and
   the swappable scene-skin.

## Team

- **Yves** — Designer (owns the seed ruleset / spreadsheet).
- **Dmir** — UI/UX Director & team lead.
- **Nick** — Tech Art Director, Unreal expert.
- **Alex** — Lead Programmer (role under evaluation).
- Claude — engineering/architecture collaborator (as on Omni Matrix).

## Phased roadmap (proposed — refine with the team)

Each phase independently demoable.

- **Phase 0 — Format & rules core:** the extended definition format
  (`TEMPUS-FORMAT.md`); a first original sample combat system; the UE
  re-implementation of the expression evaluator + dice resolver, with
  tests; the content-pack merge model. No 3D yet.
- **Phase 1 — Single-device combat loop:** Player Screen + Health Page;
  action tree → hit location → dice pool → effect tables → wounds/vitals,
  driven by the sample system; OM character import.
- **Phase 2 — GM tools:** GM session setup, NPC roster, tactical map,
  the propose → approve → execute action log — still single device.
- **Phase 3 — Go live:** GM-hosted networked sessions (Steam first),
  presence/roster, the communicator (voice + text), synced session state.
- **Phase 4 — Content & platforms:** the DLC pack pipeline + a second
  era/system to prove agnosticism; tablet build (and the cross-platform
  networking service); polish.

## Open questions (revisit before the phase that needs them)

- **GM authority detail:** approval is locked as default; an optional
  auto-resolve mode is a later question.
- **Yves's ruleset spreadsheet:** to be shared; will harden the
  weapon / hit-effect / vitals schema in `TEMPUS-FORMAT.md` against it.
- **Dice pool source:** believed app-computed from stats/weapon — confirm
  with the designer.
- **One-off vs subscription:** pricing model undecided (architecture-
  neutral).
- **Mac on desktop; exact mobile distribution:** decide at the platform
  phase.
- **Action economy specifics** (e.g. the demo's 3 actions/round): confirm
  it is fully per-system configurable.
