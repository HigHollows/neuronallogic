import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** Audit de contraste WCAG 2.x sur les VRAIES variables de couleur du site (src/styles/github.css), thèmes clair et sombre. */
const css = readFileSync('src/styles/github.css', 'utf8');

function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector + ' {');
  if (start < 0) throw new Error('bloc introuvable : ' + selector);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('\n}', start));
  const vars: Record<string, string> = {};
  for (const m of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  return vars;
}

const light = block(':root');
const dark = { ...light, ...block(":root[data-theme='dark']") };

function rgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error('couleur non hexadécimale : ' + hex);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const lum = ([r, g, b]: [number, number, number]) => {
  const f = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a: string, b: string) => {
  const [l1, l2] = [lum(rgb(a)), lum(rgb(b))].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

// [texte, fond, minimum, description]
const PAIRS: [string, string, number, string][] = [
  ['text', 'bg', 7, 'texte principal sur fond'],
  ['text', 'surface-2', 7, 'texte sur surface secondaire'],
  ['muted', 'bg', 4.5, 'texte secondaire sur fond'],
  ['muted', 'surface-2', 4.5, 'texte secondaire sur surface secondaire'],
  ['accent', 'bg', 4.5, 'liens sur fond'],
  ['accent-strong', 'bg', 4.5, 'liens survolés sur fond'],
  ['accent', 'accent-weak', 4.5, 'texte d’accent sur fond d’accent'],
  ['text', 'accent-weak', 4.5, 'texte sur fond d’accent'],
  ['on-accent', 'btn', 4.5, 'texte du bouton principal'],
  ['ok', 'bg', 4.5, 'texte de réussite sur fond'],
  ['ok', 'ok-bg', 4.5, 'texte de réussite sur son fond'],
  ['text', 'ok-bg', 4.5, 'texte sur fond de réussite'],
  ['warn', 'bg', 4.5, 'texte d’avertissement sur fond'],
  ['text', 'warn-bg', 4.5, 'texte sur fond d’avertissement'],
  ['bad', 'bg', 4.5, 'texte d’erreur sur fond'],
  ['text', 'bad-bg', 4.5, 'texte sur fond d’erreur'],
  ['text', 'note-bg', 4.5, 'texte sur fond de note'],
  ['purple', 'bg', 4.5, 'étiquette « expert » sur fond'],
  ['header-fg', 'header-bg', 7, 'texte de l’en-tête'],
];

describe.each([
  ['clair', light],
  ['sombre', dark],
])('contraste — thème %s', (_name, vars) => {
  it.each(PAIRS)('%s sur %s ≥ %s : %s', (fg, bg, min) => {
    const r = ratio(vars[fg], vars[bg]);
    expect(r, `${fg} ${vars[fg]} sur ${bg} ${vars[bg]} = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(min);
  });
});
