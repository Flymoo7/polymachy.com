// Shared table-background presets + resolver. Presets are original CSS
// gradient "moods" (no bundled binary assets, so the self-contained build
// stays light and IP-clean). A GM-uploaded image arrives as a data URL.

export interface BgPreset { id: string; label: string; css: string }

export const BG_PRESETS: BgPreset[] = [
  { id: 'void',   label: 'Void',   css: 'radial-gradient(circle at 30% 15%, #16243a 0%, #0a1020 45%, #050810 80%)' },
  { id: 'ember',  label: 'Ember',  css: 'radial-gradient(circle at 50% 120%, #5a2412 0%, #2a120a 45%, #0e0705 80%)' },
  { id: 'forest', label: 'Forest', css: 'linear-gradient(165deg, #16291c 0%, #0e1a12 50%, #08110b 85%)' },
  { id: 'dusk',   label: 'Dusk',   css: 'linear-gradient(160deg, #2c2042 0%, #3a2440 40%, #160a14 85%)' },
  { id: 'storm',  label: 'Storm',  css: 'linear-gradient(180deg, #1f2a36 0%, #121a22 50%, #080c10 85%)' },
  { id: 'sand',   label: 'Sand',   css: 'linear-gradient(160deg, #41351f 0%, #2a2114 50%, #15100a 85%)' },
  { id: 'frost',  label: 'Frost',  css: 'linear-gradient(165deg, #1c3340 0%, #122530 50%, #0a151c 85%)' },
  { id: 'arcane', label: 'Arcane', css: 'radial-gradient(circle at 70% 20%, #2a1840 0%, #1a1030 45%, #0a0818 80%)' },
];

// Resolve a stored background value to a CSS background-image string, or null.
export function backgroundCss(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith('preset:')) {
    const p = BG_PRESETS.find((x) => x.id === value.slice(7));
    return p ? p.css : null;
  }
  if (value.startsWith('data:')) return `url("${value}")`;
  return null;
}
