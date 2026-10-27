/**
 * Mini-langage de texte enrichi, volontairement limité :
 *   **gras**   *italique*   `code`   [[id-de-notion]]   [texte](https://…)
 * Aucun HTML n'est interprété : tout le reste est du texte brut (pas d'injection possible).
 */
export type Token =
  | { t: 'text'; v: string }
  | { t: 'bold'; v: string }
  | { t: 'em'; v: string }
  | { t: 'code'; v: string }
  | { t: 'term'; id: string }
  | { t: 'link'; v: string; href: string };

const RE = /\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*|`([^`]+)`|\[\[([a-z0-9-]+)\]\]|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

export function tokenize(input: string): Token[] {
  const out: Token[] = [];
  let last = 0;
  for (const m of input.matchAll(RE)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ t: 'text', v: input.slice(last, i) });
    if (m[1] !== undefined) out.push({ t: 'bold', v: m[1] });
    else if (m[2] !== undefined) out.push({ t: 'em', v: m[2] });
    else if (m[3] !== undefined) out.push({ t: 'code', v: m[3] });
    else if (m[4] !== undefined) out.push({ t: 'term', id: m[4] });
    else if (m[5] !== undefined && m[6] !== undefined) out.push({ t: 'link', v: m[5], href: m[6] });
    last = i + m[0].length;
  }
  if (last < input.length) out.push({ t: 'text', v: input.slice(last) });
  return out;
}

/** Texte brut sans balisage (recherche, comptage de mots). `termLabel` donne le nom français d'une notion. */
export function stripRich(input: string, termLabel: (id: string) => string = (id) => id): string {
  return tokenize(input)
    .map((tk) => {
      switch (tk.t) {
        case 'term':
          return termLabel(tk.id);
        case 'link':
        case 'text':
        case 'bold':
        case 'em':
        case 'code':
          return tk.v;
      }
    })
    .join('');
}
