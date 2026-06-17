# Tempus combat definition format (v0 — draft)

A Tempus **combat definition** describes one combat system to the Tempus
engine: its action tree, weapons, body regions, hit-location effects,
vitals, and round structure. It is an **extension of the Omni Matrix
system definition** (`../app/systems/SYSTEM-FORMAT.md`): Tempus reuses
OM's `fields`, `derived` expressions, `dice`, and `rolls`, and **adds the
combat sections below**. Omni Matrix ignores the combat sections; Tempus
reads both — one shared, agnostic format across the web sheet and the
Unreal app.

> **IP rule (see `ARCHITECTURE.md`):** definitions Polymachy ships use
> only original, invented names and wording — and because Tempus is sold,
> this is a hard requirement. Branded games are adapted by users, not
> distributed by us. Mechanics are generic; expression stays original.

This is `schemaVersion: 0`. Expect changes once Yves's ruleset spreadsheet
is folded in and Phase 0 locks it.

---

## Top-level shape (combat super-set of an OM definition)

```jsonc
{
  "schemaVersion": 0,
  "system": {
    "id": "tempus-sample-blades",   // stable slug, unique
    "name": "Sample: Blades & Bone", // ORIGINAL display name
    "version": "0.1.0",
    "author": "Polymachy",
    "diceModel": "pool-success",     // reuses an OM roller
    "tempus": true                   // marks a combat-capable definition
  },

  // ---- Omni Matrix layers (unchanged) ----
  "fields":   { /* attributes, skills, derived values — as OM */ },
  "sections": [ /* default sheet layout — as OM */ ],
  "dice":     { /* roller config — as OM */ },
  "rolls":    { /* named pools — as OM */ },

  // ---- Tempus combat extensions ----
  "round":       { /* initiative & action economy */ },
  "actionTree":  [ /* the branching action menu */ ],
  "weapons":     { /* id -> weapon/gear definition */ },
  "bodyMap":     { /* hit-location regions */ },
  "effectTables":{ /* (attack x region x severity) -> outcomes */ },
  "vitals":      [ /* the Health Page physiological gauges */ ],

  "pack": { /* optional: DLC-pack merge metadata (see end) */ }
}
```

Everything under the "combat extensions" heading is **content** — a
homebrew or an adapted system supplies its own; nothing here is hard-coded
in the engine.

---

## `round` — initiative & action economy

Configures how a combat round is structured (the demo: pick initiatives →
they become Actions 1..N → each opens the action tree).

```jsonc
"round": {
  "initiative": {
    "roll": "agility + reflexes",   // expression: initiative pool/score
    "selectCount": 3,               // how many initiatives a player picks
    "label": "Initiative"
  },
  "actionsPerRound": { "derived": "3" }, // may be derived from stats
  "timeline": { "start": "Start", "end": "End" } // the bottom Start->End bar
}
```

All values are per-system, so a lighter game can set `selectCount: 1` /
`actionsPerRound: 1`.

---

## `actionTree` — the branching action menu

An ordered list of nodes forming a tree (root nodes have no `parent`).
Each node is a choice the player can make for an action; leaves resolve to
something (a roll, a move, a strike). Matches the demo:
`Action → Melee → Attack → Main Weapon → Cut → (target region) → dice pool`.

```jsonc
"actionTree": [
  { "id": "melee", "label": "Melee", "children": ["melee.attack","melee.defence"] },

  { "id": "melee.attack", "label": "Attack", "parent": "melee",
    "requires": "hasMeleeWeapon",          // expression / capability gate
    "children": ["melee.attack.mainWeapon"] },

  { "id": "melee.attack.mainWeapon", "label": "Main Weapon",
    "parent": "melee.attack",
    "weaponFrom": "equipped.mainHand",      // pulls attack types from the weapon
    "children": ["strike.cut","strike.thrust","strike.chop"] },

  { "id": "strike.cut", "label": "Cut", "parent": "melee.attack.mainWeapon",
    "resolve": {
      "kind": "strike",                     // strike | move | roll | custom
      "attackType": "cut",                  // keys into effectTables
      "targetsRegion": true,                // shows the hit-location selector
      "pool": "strength + blade"            // expression -> dice pool (app-computed)
    }
  },

  { "id": "movement.sprint", "label": "Sprint", "parent": "movement",
    "resolve": { "kind": "move", "distance": "15 + 3 * dexterity", "unit": "m" } }
]
```

Node keys:

| key | meaning |
|-----|---------|
| `id` / `label` / `parent` | identity and tree position |
| `children` | ordered child node ids (optional for leaves) |
| `requires` | expression gating availability (weapon, shield, state) |
| `weaponFrom` | a slot whose weapon supplies the child attack types |
| `cost` | action/initiative cost (defaults to one action) |
| `resolve` | what a leaf does — `strike` / `move` / `roll` / `custom` |

`resolve.pool` is an expression in OM's evaluator → the number of dice;
this is the **app-computed dice pool** the player confirms before the roll.

---

## `weapons` — weapons & gear

A map of `weaponId -> definition`. Deliberately **generic** so future
eras (firearms, etc.) fit without a schema change: melee-only keys are
optional, ranged keys are optional.

```jsonc
"weapons": {
  "arming_sword": {
    "label": "Arming Sword", "slot": "mainHand", "class": "melee",
    "attackTypes": ["cut","thrust"],   // which strike.* nodes it enables
    "requires": { "strength": 2 },
    "damage": { "cut": "blade + 1", "thrust": "blade + 2" }, // expressions
    "reach": 1                          // grid squares
  },
  "kite_shield": {
    "label": "Kite Shield", "slot": "offHand", "class": "shield",
    "passiveDefense": 0.45,             // 45% (from the demo)
    "block": 1,                          // Blocking +1
    "actions": { "shieldBash": "strength + 1" }  // Shield Bash STR+1B
  },
  "wheellock_pistol": {                  // example of later/era content
    "label": "Wheellock Pistol", "slot": "mainHand", "class": "ranged",
    "attackTypes": ["ballistic"],
    "rangeBands": [{ "to": 10, "mod": 0 }, { "to": 25, "mod": -2 }],
    "ammo": { "capacity": 1, "reloadActions": 3 }
  }
}
```

Ranged vs melee vs shield are just `class` + which keys are present — the
engine does not assume a period.

---

## `bodyMap` — hit-location regions

The regions the **rotating cylinder** selects. Ordered; each can carry
properties (coverage, severity weighting, which armour slot protects it).

```jsonc
"bodyMap": {
  "regions": [
    { "id": "head",     "label": "Head",     "armorSlot": "helm",   "severity": 1.5 },
    { "id": "shoulderL","label": "Left Shoulder", "armorSlot": "pauldron" },
    { "id": "torso",    "label": "Torso",    "armorSlot": "cuirass", "severity": 1.0 },
    { "id": "armR",     "label": "Right Arm","armorSlot": "vambrace" },
    { "id": "groin",    "label": "Groin" },
    { "id": "legL",     "label": "Left Leg", "armorSlot": "greave" }
  ]
}
```

---

## `effectTables` — what a strike actually does

The heart of the system (and of Yves's depth): the outcome of an
**attack type × body region × severity** lookup. Outcomes apply **wounds**
(located, shown on the Health Page figure) and **vitals deltas**, and may
set **status**. Severity tiers come from the resolved roll (e.g. successes
→ glancing / solid / critical).

```jsonc
"effectTables": {
  "cut": {                              // keyed by attackType
    "torso": {
      "glancing": { "wound": { "region": "torso", "level": 1 },
                    "vitals": { "blood": -1 } },
      "solid":    { "wound": { "region": "torso", "level": 2 },
                    "vitals": { "blood": -3, "vigor": -3 },
                    "status": ["bleeding"] },
      "critical": { "wound": { "region": "torso", "level": 3 },
                    "vitals": { "blood": -6, "breathing": -2 },
                    "status": ["bleeding","winded"] }
    },
    "armR": { "solid": { "wound": { "region": "armR", "level": 2 },
                         "status": ["disarmRiskMainHand"] } }
  },
  "ballistic": { /* firearm outcomes, when that content ships */ }
}
```

How severity tiers are derived from the roll is set per system (e.g.
`{ "from": "successes", "tiers": [1,3,5] }`). Armour at a region's
`armorSlot` reduces level/severity before lookup (rules per system).

---

## `vitals` — the Health Page physiological model

The gauges from the demo. Each vital is a two-pole scale with a current
value, thresholds, and how wounds/status modify it. A light system may
define just one vital (e.g. a single "Health" pool) — depth is optional.

```jsonc
"vitals": [
  { "id": "pulse", "label": "Pulse",
    "poles": ["Bradycardia","Tachycardia"], "min": -5, "max": 5, "default": 0 },
  { "id": "breathing", "label": "Breathing",
    "poles": ["Bradypnea","Tachypnea"], "min": -5, "max": 5, "default": 0 },
  { "id": "blood", "label": "Blood",
    "poles": ["Exsanguinated","Normal"], "min": 0, "max": 10, "default": 10,
    "thresholds": [ { "at": 3, "status": "faint" }, { "at": 0, "status": "down" } ] },
  { "id": "vigor", "label": "Vigor",
    "poles": ["Wasted","Fresh"], "min": -10, "max": 0, "default": 0,
    "appliesModifier": { "to": "rolls", "delta": "vigor" } } // feedback into rules
]
```

`appliesModifier` is how the **simulation feeds back into the rules** — a
depleted vital modifies later pools. Vitals are **session state** (current
values live in the live encounter), not saved into the portable character.

---

## State: persistent character vs. live encounter

- **Persistent character** (OM format, round-trips with Omni Matrix):
  attributes, skills, equipped gear. See `SYSTEM-FORMAT.md`'s character
  document.
- **Encounter state** (transient, owned by the GM-hosted session): current
  `vitals`, accumulated `wounds[]` (region + level), map `position`,
  chosen `initiative`/actions, and the shared action log. Never written
  into the saved character.

```jsonc
// encounter state for one combatant (lives in the session, not the save)
{
  "charId": "…",
  "position": { "x": 12, "y": 7 },
  "initiative": [16, 11, 6],
  "vitals": { "blood": 7, "vigor": -3, "pulse": 1 },
  "wounds": [ { "region": "torso", "level": 2, "type": "cut" } ]
}
```

---

## Resolution flow (propose → GM approve → execute)

Locked: **the GM approves outcomes.** A strike runs as an event, the same
pattern as Omni Matrix's action log:

1. **Propose** — player picks the action-tree leaf, target region, and the
   app-computed dice pool; this is queued to the GM.
2. **Resolve** — the engine rolls (OM dice model), derives the severity
   tier, and looks up `effectTables` → proposed wounds + vitals deltas.
3. **Approve / deny** — the GM reviews the proposed outcome.
4. **Execute** — on approve, wounds/vitals commit to the target's
   encounter state, feed back into the rules, and the result is logged and
   forwarded to the GM screen.

---

## DLC packs — additive, mergeable content

New content (weapons, eras, action-tree branches, effect tables) ships as
**packs** that merge over a base system. Packs are namespaced so ids never
collide, and Steam DLC entitlement decides which load.

```jsonc
"pack": {
  "id": "tempus-pack-blackpowder",
  "label": "Black Powder Era",
  "extends": "tempus-sample-blades",   // base system id
  "namespace": "bp",                    // prefixes added ids: bp.wheellock_pistol
  "adds": {
    "weapons":     { /* … */ },
    "actionTree":  [ /* e.g. a Ranged → Firearm branch */ ],
    "effectTables":{ "ballistic": { /* … */ } }
  }
}
```

Merge rules (v0): packs may **add** ids and **append** action-tree
children to existing nodes; they may not silently overwrite base ids
(overrides must be explicit). The resolved ruleset = base + all entitled
packs, validated for id collisions and expression cycles at load.

---

## Reuse of the Omni Matrix engine semantics

`derived`, `pool`, and roll expressions use the **same sandboxed
expression language** as Omni Matrix (`SYSTEM-FORMAT.md` → "Derived values
& the expression language"): bare identifiers are field values, the same
operators and whitelisted functions, no arbitrary code. Tempus
**re-implements that evaluator and the dice resolver in Unreal** so both
products interpret identical definitions deterministically. Keeping the
language identical is what lets one definition drive both the web sheet and
the UE app.
