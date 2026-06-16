// Builds a fresh character document and a default "Lego" layout from a
// system definition. The layout is just the starting kit — users rearrange.

import type { SystemDefinition, CharacterDoc, LayoutDoc, LayoutBlock, LayoutPage } from './types';

export function genId(prefix = 'c'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

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
    id: genId(),
    system: def.system.id,
    systemVersion: def.system.version,
    data,
    meta: { name, created: now, updated: now },
  };
}

const COLS = 12;

// a simple left-to-right, wrapping placer with its own cursor
function makePlacer() {
  let x = 0; let y = 0; let rowH = 0;
  return (w: number, h: number) => {
    if (x + w > COLS) { x = 0; y += rowH; rowH = 0; }
    const pos = { x, y, w, h };
    x += w;
    rowH = Math.max(rowH, h);
    return pos;
  };
}

export function defaultLayout(def: SystemDefinition): LayoutDoc {
  // one page per definition tab; its groups become the page's default blocks
  const pages: LayoutPage[] = def.sections.map((section, si) => {
    const place = makePlacer();
    const blocks: LayoutBlock[] = section.groups.map((group) => {
      const cols = group.columns ?? 1;
      const w = Math.min(COLS, Math.max(4, cols * 2));
      const rows = Math.ceil(group.fields.length / cols);
      const h = Math.min(14, 2 + rows);
      const title = group.title ?? section.tab ?? 'Block';
      return { id: `group:${section.tab ?? si}/${title}`, source: 'group', title, fields: group.fields, ...place(w, h) };
    });
    return { id: `page:${section.tab ?? si}`, name: section.tab ?? `Page ${si + 1}`, blocks };
  });

  // hero banner (portrait + name + key stats) tops the first page; below it
  // sit the group blocks, then the dice + log panels
  if (pages.length) {
    const p0 = pages[0];
    const HERO_H = 6;
    p0.blocks = p0.blocks.map((b) => ({ ...b, y: b.y + HERO_H }));
    p0.blocks.unshift({ id: 'panel:hero', source: 'hero', title: 'Character', icon: 'user', fields: [], x: 0, y: 0, w: COLS, h: HERO_H });
    const maxY = p0.blocks.reduce((m, b) => Math.max(m, b.y + b.h), 0);
    p0.blocks.push({ id: 'panel:rolls', source: 'rolls', title: 'Dice', x: 0, y: maxY, w: 4, h: 8 });
    p0.blocks.push({ id: 'panel:log', source: 'log', title: 'Roll log', x: 4, y: maxY, w: 4, h: 8 });
  }

  const now = new Date().toISOString();
  return { schemaVersion: 0, system: def.system.id, name: 'Default layout', pages, theme: def.system.defaultTheme, meta: { created: now, updated: now } };
}
