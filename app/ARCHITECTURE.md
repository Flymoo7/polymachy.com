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
   `systems/SYSTEM-FORMAT.md`. First definition: `systems/wod-vampire.json`
   (the owner's *By Night in Prague* / Vampire 5e chronicle).
2. **Mechanics layer** — a **sandboxed** formula + mechanics evaluator.
   NOT arbitrary JS (unsafe in shared sessions): a safe expression
   evaluator plus parameterized primitives (e.g. "roll pool, count
   successes ≥ N, with botch/critical/messy rules"). This is what makes
   automation system-agnostic.
3. **Character model** — portable `{ system, schemaVersion, data, meta }`,
   export/import, CRDT-friendly for sync.
4. **Session layer** — rooms, presence, roster, the **action log as an
   event stream** (propose → GM approve/deny → execute with resource
   deltas), whispers/chat, initiative/combat, auto-save, roles &
   permissions (player edits own sheet + proposes; GM edits all +
   approves).
5. **Rendering shell + themes** — renders a definition into the player
   view or GM console; density modes (Full/Compact/Minimal), Tabs/List,
   1/2/4 multi-sheet; swappable themes/layouts.

## Phased roadmap

Each phase is independently demoable.

- **Phase 0 — Foundations (no UI):** system-definition format spec; the
  Vampire 5e definition; character model; the sandboxed mechanics/formula
  evaluator with tests. *(In progress — this commit starts it.)*
- **Phase 1 — Player sheet:** render screen 1 from the definition,
  matched to the owner's Figma; dots/pools/tabs; density modes; the d10
  pool builder driven by system config; local save/load + export file.
- **Phase 2 — GM console:** roster, 1/2/4 multi-sheet, action-log UI,
  combat/initiative, status effects — still single-device.
- **Phase 3 — Go live:** stand up P2P sync; presence/roster/action-log
  sync; propose→approve→execute; whispers; roles; auto-save.
- **Phase 4 — Prove agnostic + polish:** add a second, non-WoD system;
  themes; print/export; optional cloud-save bolt-on.

## Open questions (revisit before the phase that needs them)

- **GitHub Pages + Vite build:** commit built assets to `app/` vs a build
  action vs a `gh-pages`-style flow. Decide at Phase 1.
- **Signalling for WebRTC:** public signalling server vs a tiny serverless
  function on a free tier. Decide at Phase 3.
- **TURN relay:** only if real users hit restrictive-network failures.
- **Cloud save / accounts:** optional Phase 4 bolt-on; the only piece that
  would touch a hosted service.
