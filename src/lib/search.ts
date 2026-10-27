import { normalize } from './text';

export type SearchKind = 'lecon' | 'notion' | 'ressource' | 'video' | 'module' | 'studio';

export interface IndexEntry {
  id: string;
  kind: SearchKind;
  title: string;
  /** Texte secondaire, affiché sous le titre. */
  subtitle: string;
  /** Corps complet utilisé pour la recherche et les extraits. */
  body: string;
  to: string;
  /** Mots-clés supplémentaires, par exemple le nom anglais d'une notion. */
  keywords?: string[];
}

export interface SearchResult {
  entry: IndexEntry;
  score: number;
  snippet: string;
}

interface Prepared {
  entry: IndexEntry;
  title: string;
  keywords: string;
  body: string;
}

const prepared = new WeakMap<IndexEntry[], Prepared[]>();

function prepare(index: IndexEntry[]): Prepared[] {
  let p = prepared.get(index);
  if (!p) {
    p = index.map((entry) => ({
      entry,
      title: normalize(entry.title),
      keywords: normalize((entry.keywords ?? []).join(' ')),
      body: normalize(entry.body),
    }));
    prepared.set(index, p);
  }
  return p;
}

const STOP = new Set(['le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'd', 'l', 'et', 'ou', 'en', 'a', 'au', 'aux']);

export function queryTerms(query: string): string[] {
  return normalize(query)
    .split(' ')
    .map((t) => t.replace(/^['-]+|['-]+$/g, ''))
    .filter((t) => t.length > 0 && !STOP.has(t));
}

function makeSnippet(raw: string, terms: string[]): string {
  const flat = raw.replace(/\s+/g, ' ').trim();
  const norm = normalize(flat);
  // normalize() peut raccourcir la chaîne (œ → oe l'allonge) : on cherche donc sur la version normalisée de façon approximative.
  let pos = -1;
  for (const t of terms) {
    const i = norm.indexOf(t);
    if (i >= 0 && (pos < 0 || i < pos)) pos = i;
  }
  if (pos < 0) return flat.slice(0, 140) + (flat.length > 140 ? '…' : '');
  const ratio = flat.length / Math.max(1, norm.length);
  const center = Math.round(pos * ratio);
  const start = Math.max(0, center - 50);
  const end = Math.min(flat.length, start + 150);
  return (start > 0 ? '…' : '') + flat.slice(start, end) + (end < flat.length ? '…' : '');
}

/** Recherche plein texte : tous les mots de la requête doivent apparaître (préfixes acceptés). Titre > mots-clés > corps. */
export function search(index: IndexEntry[], query: string, limit = 40): SearchResult[] {
  const terms = queryTerms(query);
  if (terms.length === 0) return [];
  const results: SearchResult[] = [];
  for (const p of prepare(index)) {
    let score = 0;
    let ok = true;
    for (const t of terms) {
      let s = 0;
      if (p.title === t) s += 60;
      else if (p.title.startsWith(t)) s += 40;
      else if (p.title.includes(t)) s += 25;
      if (p.keywords.includes(t)) s += 15;
      if (p.body.includes(t)) s += 5;
      if (s === 0) {
        ok = false;
        break;
      }
      score += s;
    }
    if (!ok) continue;
    if (p.entry.kind === 'notion') score += 3;
    results.push({ entry: p.entry, score, snippet: makeSnippet(p.entry.body, terms) });
  }
  results.sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title, 'fr'));
  return results.slice(0, limit);
}
