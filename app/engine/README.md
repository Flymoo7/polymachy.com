# Omni Matrix engine

The system-agnostic automation core. Pure, dependency-free ES modules so
they run and test under plain Node today and port directly into the
React + TypeScript app later (see `../ARCHITECTURE.md`). No game specifics
live here — behaviour comes entirely from a system definition
(`../systems/SYSTEM-FORMAT.md`).

## Modules

- **`expression.mjs`** — sandboxed evaluator for `derived` field values and
  roll `pool` expressions. Parses a small safe grammar (no JS `eval`), so a
  shared P2P session can never run arbitrary code from a definition.
  Exports `evaluate`, `compile`, `dependencies`, `ExpressionError`.
- **`dice.mjs`** — configurable dice resolver. `pool-success` model
  (success counting, criticals, optional complication sub-pool). Rolling
  (`rollPool`, `rollAndResolve`) is separated from resolving
  (`resolvePoolSuccess`) so results are deterministic and testable.

## Tests

```sh
cd app/engine && node --test
```

Dependency-free; uses Node's built-in test runner (`node:test`).
