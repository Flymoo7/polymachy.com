// Curated, dependency-free icon set for block headers. Each icon is a
// 24×24 line drawing using currentColor, so it inherits the block accent
// (and therefore the active theme). Users pick/swap icons per block in the
// editor; if a block has no explicit icon we guess a sensible default from
// its title (see guessIcon). All paths are original simple geometry.

import type { ReactNode } from 'react';

export const ICON_NAMES = [
  'hexagon', 'star', 'target', 'bag', 'pencil', 'heart', 'sparkles', 'gem',
  'crossed-swords', 'sword', 'shield', 'user', 'dice', 'list', 'chat', 'book',
  'coins', 'compass', 'foot', 'droplet', 'flame', 'bolt', 'eye', 'flask',
  'key', 'helmet', 'moon', 'sun', 'skull', 'scroll', 'cog', 'map',
] as const;

export type IconName = typeof ICON_NAMES[number];

const ICONS: Record<string, ReactNode> = {
  hexagon: <path d="M12 3 L20 7.5 V16.5 L12 21 L4 16.5 V7.5 Z" />,
  star: <path d="M12 3 L14.6 8.6 L20.7 9.3 L16.2 13.5 L17.4 19.5 L12 16.5 L6.6 19.5 L7.8 13.5 L3.3 9.3 L9.4 8.6 Z" />,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" /></>,
  bag: <><path d="M7.5 8 A4.5 4.5 0 0 1 16.5 8" /><path d="M5 8 H19 L18 19.5 A1 1 0 0 1 17 20.5 H7 A1 1 0 0 1 6 19.5 Z" /></>,
  pencil: <><path d="M4 20 L4.8 16 L16 4.8 A1.4 1.4 0 0 1 18 4.8 L19.2 6 A1.4 1.4 0 0 1 19.2 8 L8 19.2 Z" /><path d="M14.5 6.5 L17.5 9.5" /></>,
  heart: <path d="M12 21 C12 21 4 15 4 9 C4 6.2 6.2 4 9 4 C10.6 4 12 5.1 12 6.6 C12 5.1 13.4 4 15 4 C17.8 4 20 6.2 20 9 C20 15 12 21 12 21 Z" />,
  sparkles: <><path d="M12 3 L13.5 8.5 L19 10 L13.5 11.5 L12 17 L10.5 11.5 L5 10 L10.5 8.5 Z" /><path d="M18 14.5 L18.7 16.8 L21 17.5 L18.7 18.2 L18 20.5 L17.3 18.2 L15 17.5 L17.3 16.8 Z" /></>,
  gem: <><path d="M6 4 H18 L21 9 L12 21 L3 9 Z" /><path d="M3 9 H21 M9 4 L7.5 9 M15 4 L16.5 9 M7.5 9 L12 21 M16.5 9 L12 21" /></>,
  'crossed-swords': <><path d="M4 4 L13 13 M11 15 L8 18 M4 4 L4 7 L7 7 M6 16 L8 18 L8 20 L6 20 L6 18 Z" /><path d="M20 4 L11 13 M13 15 L16 18 M20 4 L20 7 L17 7 M18 16 L16 18 L16 20 L18 20 L18 18 Z" /></>,
  sword: <path d="M12 2 L12 13 M9 13 H15 M11 13 V18 H13 V13 M12 18 V22" />,
  shield: <path d="M12 2 L20 5 V11 C20 16 16.5 19.5 12 21 C7.5 19.5 4 16 4 11 V5 Z" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5 C4.5 16 8 14 12 14 C16 14 19.5 16 19.5 20.5" /></>,
  dice: <><rect x="4" y="4" width="16" height="16" rx="3" /><circle cx="8.5" cy="8.5" r="1" /><circle cx="15.5" cy="8.5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="8.5" cy="15.5" r="1" /><circle cx="15.5" cy="15.5" r="1" /></>,
  list: <><path d="M9 6 H20 M9 12 H20 M9 18 H20" /><circle cx="5" cy="6" r="1" /><circle cx="5" cy="12" r="1" /><circle cx="5" cy="18" r="1" /></>,
  chat: <path d="M4 5.5 A1.5 1.5 0 0 1 5.5 4 H18.5 A1.5 1.5 0 0 1 20 5.5 V14.5 A1.5 1.5 0 0 1 18.5 16 H9 L5 20 V16 H5.5 A1.5 1.5 0 0 1 4 14.5 Z" />,
  book: <><path d="M5 4 H17 A1 1 0 0 1 18 5 V20 H7 A2 2 0 0 1 5 18 Z" /><path d="M5 18 A2 2 0 0 1 7 16 H18" /></>,
  coins: <><ellipse cx="12" cy="7" rx="7" ry="3" /><path d="M5 7 V12 C5 13.7 8 15 12 15 C16 15 19 13.7 19 12 V7" /><path d="M5 12 V17 C5 18.7 8 20 12 20 C16 20 19 18.7 19 17 V12" /></>,
  compass: <><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5 L13 13 L8.5 15.5 L11 11 Z" /></>,
  foot: <path d="M8 3 V11 L6 16 A3 3 0 0 0 9 20 H12 A1.2 1.2 0 0 0 13.2 18.8 V16 H11 V3 Z" />,
  droplet: <path d="M12 3 C16 8 18 11 18 14 A6 6 0 0 1 6 14 C6 11 8 8 12 3 Z" />,
  flame: <path d="M12 3 C13 7 17 8 17 13 A5 5 0 0 1 7 13 C7 11 8 10 9 9 C9 11 10 11.5 11 11.5 C11 8 10 6 12 3 Z" />,
  bolt: <path d="M13 3 L6 13 H11 L11 21 L18 11 H13 Z" />,
  eye: <><path d="M2 12 C5 6.5 8.5 5 12 5 C15.5 5 19 6.5 22 12 C19 17.5 15.5 19 12 19 C8.5 19 5 17.5 2 12 Z" /><circle cx="12" cy="12" r="3" /></>,
  flask: <><path d="M9 3 H15 M10 3 V9 L5.6 17 A2 2 0 0 0 7.4 20 H16.6 A2 2 0 0 0 18.4 17 L14 9 V3" /><path d="M7.6 14 H16.4" /></>,
  key: <><circle cx="8" cy="8" r="4" /><path d="M11 11 L20 20 M17 17 L19 15 M18.5 18.5 L20.5 16.5" /></>,
  helmet: <><path d="M5 13 A7 7 0 0 1 19 13 V15 H5 Z" /><path d="M5 15 H19 V17.5 H5 Z M12 6 V13" /></>,
  moon: <path d="M16.5 3 A9 9 0 1 0 21 14.5 A7 7 0 0 1 16.5 3 Z" />,
  sun: <><circle cx="12" cy="12" r="4.5" /><path d="M12 2 V4 M12 20 V22 M2 12 H4 M20 12 H22 M5 5 L6.5 6.5 M17.5 17.5 L19 19 M19 5 L17.5 6.5 M6.5 17.5 L5 19" /></>,
  skull: <><path d="M5 11 A7 7 0 0 1 19 11 V15 L17 16 V19 H7 V16 L5 15 Z" /><circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" /><path d="M11 18 V16 M13 18 V16" /></>,
  scroll: <><rect x="6" y="4" width="11" height="16" rx="2" /><path d="M9 8 H14 M9 12 H14 M9 16 H12" /></>,
  cog: <><circle cx="12" cy="12" r="3.4" /><path d="M12 3 V5.5 M12 18.5 V21 M3 12 H5.5 M18.5 12 H21 M5.5 5.5 L7.3 7.3 M16.7 16.7 L18.5 18.5 M18.5 5.5 L16.7 7.3 M7.3 16.7 L5.5 18.5" /></>,
  map: <><path d="M3 6 L9 4 L15 6 L21 4 V18 L15 20 L9 18 L3 20 Z" /><path d="M9 4 V18 M15 6 V20" /></>,
};

export function Icon({ name, size = 18, className }: { name?: string; size?: number; className?: string }) {
  const node = (name && ICONS[name]) || ICONS.hexagon;
  return (
    <svg
      className={className} width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={1.7}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      {node}
    </svg>
  );
}

// Guess a default icon from a block's title (and source for the built-in panels).
const RULES: [RegExp, IconName][] = [
  [/roll|dice/, 'dice'],
  [/log|history/, 'list'],
  [/attribut|stat\b|trait/, 'star'],
  [/skill|ability|abilities|talent/, 'target'],
  [/combat|attack|weapon|martial/, 'crossed-swords'],
  [/defen|armou?r|protect/, 'shield'],
  [/gear|equip|inventory|item|loadout/, 'bag'],
  [/note|journal|memo/, 'pencil'],
  [/condition|health|vitality|hull|wound|damage/, 'heart'],
  [/power|magic|spell|discipline|gift|psi/, 'sparkles'],
  [/resource|reserve/, 'gem'],
  [/identity|concept|bio|profile|persona/, 'user'],
  [/contact|ally|allies|relationship|bond/, 'chat'],
  [/lore|knowledge|memory|secret/, 'book'],
  [/standing|reputation|wealth|coin|money|credit|fund/, 'coins'],
  [/pilot|ship|navigat|travel|explor/, 'compass'],
  [/stealth|sneak|shadow/, 'foot'],
  [/focus|resolve|composure|will|nerve|calm/, 'droplet'],
  [/heat|fire|burn|rage|fury/, 'flame'],
  [/speed|energy|momentum|drive|reflex|haste/, 'bolt'],
  [/perception|aware|sight|sense|insight/, 'eye'],
  [/potion|alchem|brew|drug/, 'flask'],
];

export function guessIcon(title?: string, source?: string): IconName {
  if (source === 'rolls') return 'dice';
  if (source === 'log') return 'list';
  const t = (title ?? '').toLowerCase();
  for (const [re, name] of RULES) if (re.test(t)) return name;
  return 'hexagon';
}
