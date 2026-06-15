// Builds a fresh character document and a default "Lego" layout from a
// system definition. The layout is just the starting kit — users rearrange.

import type { SystemDefinition, CharacterDoc, LayoutDoc, LayoutBlock } from './types';

export function newCharacter(def: SystemDefinition): CharacterDoc {
  const data: Record<string, unknown> = {};
  for (const [id, f] of Object.entries(def.fields)) {
    if (f.editable === 'none' || typeof f.derived === 'string') continue;
    if (f.type === 'pool') data[id] = typeof f.default === 'number' ? f.default : 0;
    else if (f.type === 'track' || f.type === 'list') data[id] = Array.isArray(f.default) ? f.default : [];
    else if (f.default !== undefined) data[id] = f.default;
  }
  const now = new Date().toISOString();
  const name = (def.character?.newSheet?.meta?.name as string) ?? 'New character';
  return {
    schemaVersion: 0,
    system: def.system.id,
    systemVersion: def.system.version,
    data,
    meta: { name, created: now, updated: now },
  };
}

const COLS = 12;

export function defaultLayout(def: SystemDefinition): LayoutDoc {
  const blocks: LayoutBlock[] = [];
  let x = 0;
  let y = 0;
  let rowH = 0;

  const place = (w: number, h: number) => {
    if (x + w > COLS) { x = 0; y += rowH; rowH = 0; }
    const pos = { x, y, w, h };
    x += w;
    rowH = Math.max(rowH, h);
    return pos;
  };

  for (const section of def.sections) {
    for (const group of section.groups) {
      const cols = group.columns ?? 1;
      const w = Math.min(COLS, Math.max(4, cols * 2));
      const rows = Math.ceil(group.fields.length / cols);
      const h = Math.min(14, 2 + rows);
      const pos = place(w, h);
      const title = group.title ?? section.tab ?? 'Block';
      blocks.push({
        id: `group:${section.tab ?? ''}/${title}`,
        source: 'group',
        title,
        fields: group.fields,
        ...pos,
      });
    }
  }

  // a dice-roller block and a roll-log block to round out the kit
  blocks.push({ id: 'panel:rolls', source: 'rolls', title: 'Dice', ...place(4, 8) });
  blocks.push({ id: 'panel:log', source: 'log', title: 'Roll log', ...place(4, 8) });

  const now = new Date().toISOString();
  return {
    schemaVersion: 0,
    system: def.system.id,
    name: 'Default layout',
    blocks,
    meta: { created: now, updated: now },
  };
}
