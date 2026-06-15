// Shapes for a system definition (see ../systems/SYSTEM-FORMAT.md) and the
// character + layout documents. Kept loose where the format is still v0.

export type FieldType =
  | 'dots' | 'number' | 'pool' | 'track'
  | 'text' | 'longtext' | 'select' | 'toggle' | 'list';

export interface DerivedRef { derived: string }

export interface FieldDef {
  type: FieldType;
  label: string;
  help?: string;
  default?: unknown;
  editable?: 'player' | 'gm' | 'none';
  derived?: string;
  // dots / number
  min?: number;
  max?: number | DerivedRef;
  step?: number;
  // pool / track
  length?: number | DerivedRef;
  states?: string[];
  // select
  options?: { value: string; label: string }[];
  // list
  item?: Record<string, FieldDef>;
}

export interface GroupDef {
  title?: string;
  columns?: number;
  fields: string[];
}

export interface SectionDef {
  tab?: string;
  groups: GroupDef[];
}

export interface RollDef { label: string; pool: string }

export interface DiceConfig {
  model: string;
  die: number;
  target: number;
  double?: { value: number; perPair: number };
  complication?: {
    enabled: boolean; label: string; fromField: string;
    critOn: number; botchOn: number;
    critOutcome?: string; botchOutcome?: string;
  };
}

export interface SystemDefinition {
  schemaVersion: number;
  system: { id: string; name: string; version: string; author?: string; summary?: string; diceModel: string };
  fields: Record<string, FieldDef>;
  sections: SectionDef[];
  dice: DiceConfig;
  rolls: Record<string, RollDef>;
  resources?: unknown[];
  statusEffects?: unknown[];
  character?: { newSheet?: { meta?: Record<string, unknown> } };
}

// A character stores only values, keyed by fieldId.
export interface CharacterDoc {
  schemaVersion: number;
  system: string;
  systemVersion: string;
  data: Record<string, unknown>;
  meta: { name: string; created: string; updated: string };
}

// The user's "Lego" arrangement — separate, exportable, shareable.
export interface LayoutBlock {
  id: string;
  source: string;        // "group:Tab/Title" | "roll-panel" | ...
  title?: string;
  x: number; y: number; w: number; h: number;
  colour?: string;
  hidden?: boolean;
  fields?: string[];     // which fields this block shows
}

export interface LayoutPage {
  id: string;
  name: string;
  blocks: LayoutBlock[];
}

export interface LayoutDoc {
  schemaVersion: number;
  system: string;
  name: string;
  pages: LayoutPage[];
  meta: { created: string; updated: string };
}

// Resolved values for rendering: scalars, plus {current,max} for pools.
export type Resolved = Record<string, any>;

export interface RollResult {
  id: string;
  label: string;
  pool: number;
  strain: number;
  successes: number;
  critical: boolean;
  success: boolean;
  complication: string | null;
  faces: number[];
  complicationFaces: number[];
  at: number;
}
