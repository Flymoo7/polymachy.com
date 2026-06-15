# The Omni Matrix — architecture

The Omni Matrix is Polymachy's product 02: a **system-agnostic, networked
character-sheet platform** — effectively a lightweight virtual tabletop
(VTT) focused on character sheets, live play, and full rules automation.

This document is the authoritative record of the architecture decisions
made with the owner. Read it before working on anything under `app/`.

## What it is

A web app that:

1. Renders **any** game system from a declarative **system definition**
   (no system is hard-coded; adding D&D = adding a definition file).
2. **Automates the rules** — derived values, dice pools, success counting,
   resource spends, status effects — driven by the definition, not by
   bespoke code per system.
3. Supports **live, networked play** between a group, with a Game Master
   (GM) view and player views, a shared action log, presence/roster,
   whispers, and a combat/initiative tracker.
4. Offers a **configurable dice roller** whose behaviour (pool d10 vs
   polyhedral, success thresholds, criticals, special dice) is set by the
   system definition.

It must honour the five product tenets from `charactersheet.html`:
**Stability, Security, Portability, Ownership, Automation.**

## Decisions (locked with the owner)

### Networking model — peer-to-peer, GM-hosted

The owner does **not** want to run or pay for a server. The app is a
**100% static SPA** with **peer-to-peer (WebRTC) live sessions**:

- The GM clicks "Host session" and gets a short room code.
- Players join with the code; browsers connect **directly to each other**
  (the GM's browser is the session hub). Game data never touches a
  Polymachy server.
- The only shared infrastructure is a momentary **signalling** handshake
  that introduces peers and carries no game data (free public
  infrastructure / a near-free serverless function).
- **Persistence:** characters save in the player's own browser
  (localStorage/IndexedDB) **plus** a downloadable, portable file they
  own. No accounts required to play.
- **Honest caveats:** the GM must be online to host (closing the tab
  pauses the *live* link but loses nothing — re-host and reconnect with
  the same code); a small fraction of restrictive networks need a TURN
  relay (the one optional paid piece, added only if anyone hits it);
  "character follows me to any device" (cloud accounts) is an **optional
  later bolt-on**, not part of the free serverless core.

Why P2P over a hosted backend (Supabase/Firebase/PartyKit): it is the
only option that delivers live multiplayer with **no server for the owner
to run or pay for**, keeps data with the players (reinforcing the
Ownership/Portability/Security tenets), and needs no sign-up friction for
a public tool discovered from the marketing site.

### IP / legal guardrail — product-agnostic, ship nothing branded

The platform must be **genuinely game-agnostic and not tied to any one
product**, both as a product goal and to avoid stepping on any
publisher's IP (copyright/trademark exposure). Hard rules:

- **The engine ships no branded content.** Mechanic primitives are
  generic (success-pools, polyhedral rolls, damage tracks, resource
  spends); no game's terminology, names, descriptions, lore, or
  trademarks are baked in anywhere.
- **Polymachy distributes only ORIGINAL/neutral sample definitions** —
  invented names and our own wording — to demonstrate the engine.
- **Communities supply their own definitions** for branded games they
  play. Definitions are just data that users author or import, so
  Polymachy never distributes a third party's IP. This is both the
  product vision and the legal shield.
- **Vampire: the Masquerade (and similar) is an internal design
  reference ONLY** — used privately to pressure-test the format. It is
  never shipped, and no WoD-specific names/text/trademarks appear in any
  committed file. The legal line: game *mechanics* aren't copyrightable,
  but their *expression* (names, descriptions, text, trademarks) is — so
  we stay on the mechanics side and keep all expression original.

### Layout — user-configurable block canvas (the "Lego" model)

The sheet is **not** a fixed layout the system imposes. It is a **canvas
of draggable blocks the user arranges themselves** — like assembling a
Lego kit: the user chooses each block's placement, size, colour, and which
fields/numbers it shows. This is a core product requirement, not a
nice-to-have.

This forces a clean **three-layer data model**, each independently owned,
saved, and portable:

1. **System definition** — *what blocks exist and how they behave* (the
   bag of pieces + the rules). Authored once per game.
2. **Character data** — *the values* (`{ system, data, meta }`).
3. **Layout document** — *how THIS user arranged and skinned their
   blocks*: per-block position, size, colour/theme, visibility, and field
   selection. Owned per user, **exportable and shareable** (share a
   layout without sharing a character; re-skin a character without
   touching its data). Reinforces the Ownership/Portability tenets.

The system definition's `sections` provide a **sensible default
arrangement** (a "pre-built kit") — the user starts from that and is free
to rearrange/recolour/hide blocks, never from a blank canvas unless they
choose. Technically this is a drag-and-drop grid editor (a well-trodden
dashboard-builder pattern; candidate libs: `dnd-kit`,
`react-grid-layout`). The layout editor is therefore a **first-class part
of the build**, not an afterthought.

**Placement model (locked 2026-06-15): snap-to-grid.** Blocks snap to a
uniform grid and can be scaled, but always conform to the grid system —
no freeform pixel placement. This keeps every sheet tidy, readable, and
device-independent. Layout positions/sizes are stored in grid units, not
pixels.

### Where it lives — `polymachy.com/app`

- Built as static files into the **`app/` subfolder of this repo** and
  served from the existing GitHub Pages deploy at `polymachy.com/app`.
- The hand-authored marketing site (`index.html` et al.) is untouched;
  `charactersheet.html`'s "Launch App" button will link to `/app`.
- One domain, one deploy, zero extra hosting cost.

### Frontend stack

- **React + TypeScript + Vite**, building to static files. Chosen for
  schema-driven dynamic rendering (the whole UI is generated from a
  definition) and for matching the owner's Figma at high fidelity.
- **Yjs over WebRTC** (`y-webrtc`) for the peer-to-peer shared session
  state — the standard "serverless collaborative" stack. CRDT semantics
  give conflict-free merge and offline tolerance for free.
- Build output committed/published so GitHub Pages can serve it statically
  (exact deploy wiring decided at Phase 1; see open questions).

## Subsystems

1. **System definition** — declarative description of one game system:
   fields, sections/tabs, derived formulas, dice/roller config, special
   mechanics, resources & costs, status effects. See
   `systems/SYSTEM-FORMAT.md`. First shipped definition is an **original,
   neutral sample system** (invented names, our own wording) — see the IP
   guardrail above; no branded game content ships.
2. **Mechanics layer** — a **sandboxed** formula + mechanics evaluator.
   NOT arbitrary JS (unsafe in shared sessions): a safe expression
   evaluator plus parameterized primitives (e.g. "roll pool, count
   successes ≥ N, with botch/critical/messy rules"). This is what makes
   automation system-agnostic.
3. **Character model** — portable `{ system, schemaVersion, data, meta }`,
   export/import, CRDT-friendly for sync.
3b. **Layout model** — the third data layer (see the "Lego" decision
   above): per-user/per-character block arrangement, sizes, colours,
   visibility, and field selection. Separate document, export/import,
   shareable, CRDT-friendly.
4. **Session layer** — rooms, presence, roster, the **action log as an
   event stream** (propose → GM approve/deny → execute with resource
   deltas), whispers/chat, initiative/combat, auto-save, roles &
   permissions (player edits own sheet + proposes; GM edits all +
   approves).
5. **Rendering shell + block layout editor** — renders the definition's
   blocks onto a **drag-and-drop grid canvas** the user configures
   (placement, size, colour, visibility, field selection — the "Lego"
   model). Persists/loads the Layout document; supports default kits,
   density modes, and 1/2/4 multi-sheet in the GM console; layouts are
   export/importable and shareable.

## Phased roadmap

Each phase is independently demoable.

- **Phase 0 — Foundations (no UI):** system-definition format spec; an
  original/neutral sample definition; character model; the sandboxed
  mechanics/formula evaluator with tests. *(In progress.)*
- **Phase 1 — Player sheet (block canvas):** render the definition's
  blocks onto the drag-and-drop grid; the "Lego" editor (move/resize/
  recolour/hide blocks) with the definition's default kit as the starting
  arrangement; the dice pool builder driven by system config; local
  save/load + export of both character and layout documents.
- **Phase 2 — GM console:** roster, 1/2/4 multi-sheet, action-log UI,
  combat/initiative, status effects, shareable layout kits — still
  single-device.
- **Phase 3 — Go live:** stand up P2P sync; presence/roster/action-log
  sync; propose→approve→execute; whispers; roles; auto-save.
- **Phase 4 — Prove agnostic + polish:** add a second original sample
  system (different dice model, e.g. polyhedral) to prove agnosticism;
  themes; print/export; optional cloud-save bolt-on.

## Open questions (revisit before the phase that needs them)

- **GitHub Pages + Vite build:** commit built assets to `app/` vs a build
  action vs a `gh-pages`-style flow. Decide at Phase 1.
- **Signalling for WebRTC:** public signalling server vs a tiny serverless
  function on a free tier. Decide at Phase 3.
- **TURN relay:** only if real users hit restrictive-network failures.
- **Cloud save / accounts:** optional Phase 4 bolt-on; the only piece that
  would touch a hosted service.
