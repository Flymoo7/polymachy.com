# Omni Matrix app

The Polymachy Omni Matrix — a system-agnostic, peer-to-peer character-sheet
platform (lightweight VTT). Static SPA, intended to be served from
`polymachy.com/app`. See `ARCHITECTURE.md` for the full design and
`systems/SYSTEM-FORMAT.md` for the definition format.

## Develop

```sh
cd app
npm install
npm run dev      # local dev server (Vite)
npm run build    # typecheck + production build into dist/
npm test         # engine unit tests (node:test)
```

`vite.config.ts` sets `base: '/app/'` so built asset paths resolve under
the `polymachy.com/app` subpath.

## What's here (Phase 1)

- `engine/` — dependency-free automation core (expression evaluator + dice
  resolver), shared by the app and runnable/testable on its own.
- `systems/` — the definition format spec and the first original sample
  system (`sample-ashes-of-the-verge.json`).
- `src/` — the React + TypeScript app:
  - **snap-to-grid block canvas** (`react-grid-layout`): each definition
    group becomes a draggable, resizable block; "Arrange blocks" toggles
    edit mode; layout persists to `localStorage`.
  - **live automation**: derived values (e.g. Resolve max, Load) compute
    through the engine; dice buttons roll real pools and log successes /
    criticals / complications.
  - **field renderers**: dots, pools, tracks, numbers, text, lists, etc.
  - **export**: character and layout download as portable JSON.

The three layers stay separate: system definition (`systems/`), character
data, and the layout document — each saved independently and exportable.

## Not yet (later phases)

- Import character/layout from file; multiple characters; tabs.
- GM console (roster, multi-sheet, action log) — Phase 2.
- P2P live sync (Yjs over WebRTC) — Phase 3.
- Deploy wiring: building `dist/` to the `polymachy.com/app` path (see the
  open question in `ARCHITECTURE.md`).
