# System definition format (v0)

A **system definition** is a single JSON document that describes one game
system to the Omni Matrix engine: its fields, how they're laid out, how
values derive from one another, how dice are rolled, and what resources
and effects exist. The engine renders and automates **any** system from
this document — nothing is hard-coded per game.

> **IP rule (see `../ARCHITECTURE.md`):** definitions Polymachy ships use
> only original, invented names and wording. Branded games are described
> by community-authored definitions, not by us. Mechanics are generic;
> expression stays original.

This is `schemaVersion: 0` — expect changes until Phase 1 locks it.

---

## Top-level shape

```jsonc
{
  "schemaVersion": 0,
  "system": {
    "id": "ashes-of-the-verge",     // stable slug, unique
    "name": "Ashes of the Verge",   // display name
    "version": "1.0.0",             // definition's own semver
    "author": "Polymachy",
    "summary": "An original d10 dice-pool sample system.",
    "diceModel": "pool-success"     // which roller this system uses
  },
  "fields":   { /* id -> field definition */ },
  "sections": [ /* ordered layout: tabs, groups, field refs */ ],
  "dice":     { /* roller configuration for diceModel */ },
  "rolls":    { /* id -> named roll (dice pool from fields) */ },
  "resources":[ /* spendable pools with costs */ ],
  "statusEffects":[ /* named conditions that can be applied */ ],
  "character": { /* defaults & metadata for a new sheet */ }
}
```

---

## Fields

`fields` is a map of `fieldId -> definition`. The `fieldId` is what
formulas and rolls reference, so keep it stable. Every field has a `type`;
the remaining keys depend on the type.

### Common keys (all types)

| key       | meaning                                                       |
|-----------|--------------------------------------------------------------|
| `type`    | one of the field types below (required)                       |
| `label`   | display label (required)                                      |
| `help`    | optional tooltip / sub-text                                   |
| `default` | initial value for a new character                            |
| `editable`| `"player"` \| `"gm"` \| `"none"` (default `"player"`)        |
| `derived` | expression string; if present the value is computed, not set |

### Types

- **`dots`** — a rating shown as filled pips. Params: `min` (default 0),
  `max` (default 5). Value: integer.
- **`number`** — plain integer/decimal. Params: `min`, `max`, `step`.
- **`pool`** — a current/max resource (e.g. an energy pool). Value:
  `{ "current": n, "max": n }`. `max` is often `derived`.
- **`track`** — a box track with states, used for damage/conditions.
  Params: `length` (or `derived` length) and `states` (ordered list, e.g.
  `["empty","light","heavy"]`). Value: array of state strings.
- **`text`** — single line. **`longtext`** — multi-line prose.
- **`select`** — one of `options: [{value,label}]`.
- **`toggle`** — boolean.
- **`list`** — repeatable rows of a sub-shape. Params: `item` (a map of
  sub-field definitions). Value: array of objects. Used for inventory,
  powers, relationships, etc.

### Example fields

```jsonc
"might":   { "type": "dots", "label": "Might",  "max": 5, "default": 1 },
"resolve_max": { "type": "number", "label": "Resolve max",
                 "derived": "3 + composure + wits", "editable": "none" },
"resolve": { "type": "pool", "label": "Resolve", "max": { "derived": "resolve_max" } },
"vitality":{ "type": "track", "label": "Vitality",
             "length": { "derived": "3 + might" },
             "states": ["ok","grazed","wounded"] }
```

---

## Sections (layout)

`sections` is an **ordered** array describing the sheet's visual structure.
The renderer walks it top to bottom. A section is either a **tab** or an
inline **group**.

```jsonc
"sections": [
  { "tab": "Core", "groups": [
      { "title": "Attributes", "columns": 3,
        "fields": ["might","grace","wits","composure", "..."] },
      { "title": "Skills", "columns": 2, "fields": ["athletics","stealth"] }
  ]},
  { "tab": "Powers", "groups": [
      { "title": "Disciplines", "fields": ["powers"] }   // a `list` field
  ]},
  { "tab": "Notes", "groups": [ { "fields": ["background","notes"] } ] }
]
```

Density modes (Full / Compact / Minimal) and layout modes (Tabs / List)
are applied by the renderer over this same structure — the definition
describes *what* is grouped, not the visual density.

---

## Derived values & the expression language

Any field (and several config values) may carry a `derived` string. It is
evaluated in a **sandboxed expression evaluator** — NOT JavaScript — so
shared sessions can't run arbitrary code.

**References:** bare identifiers resolve to field values by `fieldId`. For
`pool`/`track` fields, use `field.current`, `field.max`, `field.length`,
or `field.filled` (count of non-empty boxes).

**Operators:** `+ - * / %`, comparisons `== != < <= > >=`, logical
`&& || !`, ternary `cond ? a : b`, parentheses.

**Functions (whitelisted):**

| function | meaning |
|----------|---------|
| `min(a,…) max(a,…)` | smallest / largest |
| `floor(x) ceil(x) round(x)` | rounding |
| `clamp(x,lo,hi)` | constrain to range |
| `sum(list)` | sum a `list` field's numeric column (see below) |
| `count(list)` | number of rows in a `list` |
| `if(cond,a,b)` | conditional (alias of ternary) |

`sum`/`count` can target a `list` and a column, e.g.
`sum(inventory, "weight")`. No loops, no assignment, no I/O — pure
functions of the character's current values.

Derived values are recomputed reactively whenever an input changes; cycles
are detected and reported at load time.

---

## Dice & the roller

`dice` configures the roller named by `system.diceModel`. The engine ships
generic, parameterized models so no system's specifics are hard-coded.

### Model `pool-success` (this sample)

Roll N dice; count those meeting a target number; apply
critical/complication rules.

```jsonc
"dice": {
  "model": "pool-success",
  "die": 10,                 // d10
  "target": 6,               // a die >= target is a success
  "double": { "value": 10, "perPair": 2 },  // each PAIR of 10s adds +2 (crit)
  "complication": {          // optional "complication" sub-pool
    "enabled": true,
    "label": "Strain",       // ORIGINAL name (not a branded term)
    "fromField": "strain",   // how many of the pool are complication dice
    "critOn": 10,            // a 10 on a complication die -> "overreach"
    "botchOn": 1             // a 1 on a complication die in a failure -> "ruin"
  }
}
```

The engine reports: total successes, whether it's a critical, and whether
a complication outcome (`overreach`/`ruin`) triggered — all from these
parameters, with no system-specific code.

### Other models (for later definitions)

- **`polyhedral`** — sum dice + modifier vs a target (d20-style). Params:
  `notation` support (`2d6+3`), `vs` target, advantage/disadvantage.
- **`step`** / custom — added as future sample systems need them.

---

## Named rolls

`rolls` maps a roll id to a dice pool built from fields, so the UI can
offer one-tap rolls and the action log can name them.

```jsonc
"rolls": {
  "strike":  { "label": "Strike", "pool": "might + athletics" },
  "sneak":   { "label": "Sneak",  "pool": "grace + stealth" },
  "willpower_test": { "label": "Resolve test", "pool": "resolve.current" }
}
```

`pool` is an expression (same evaluator) returning the number of dice.
Complication dice are layered in automatically per the `dice` config.

---

## Resources & costs

`resources` are spendable pools the engine can debit, with named costs the
UI and action log understand.

```jsonc
"resources": [
  { "id": "focus", "label": "Focus", "field": "focus_pool",
    "costs": [
      { "id": "channel", "label": "Channel a power", "amount": 1 }
    ]
  }
]
```

Spending routes through the action log so a GM can approve it (Phase 3);
on execute, the bound `pool` field's `current` is reduced.

---

## Status effects

`statusEffects` are named conditions a GM/player can apply; each may carry
modifiers that feed the expression layer.

```jsonc
"statusEffects": [
  { "id": "staggered", "label": "Staggered",
    "modifiers": [ { "applies": "rolls", "delta": -2 } ],
    "help": "−2 dice to all rolls until cleared." }
]
```

(Modifier wiring is sketched here; full effect resolution lands with the
mechanics layer in Phase 0/2.)

---

## Character document (separate from the definition)

A saved character references its system and stores only values:

```jsonc
{
  "schemaVersion": 0,
  "system": "ashes-of-the-verge",   // matches system.id
  "systemVersion": "1.0.0",
  "data": { "might": 3, "resolve": { "current": 5, "max": 5 }, "...": "..." },
  "meta": { "name": "…", "created": "…", "updated": "…" }
}
```

Portable, exportable, and CRDT-friendly for P2P sync. See
`sample-ashes-of-the-verge.json` for a complete worked definition.
