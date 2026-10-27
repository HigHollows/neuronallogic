/** Normalise un texte pour la recherche : minuscules, sans accents ni ponctuation superflue. */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe')
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function countWords(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

/** Temps de lecture estimé : ~190 mots/min pour un texte technique en français, minimum 1 min. */
export const WORDS_PER_MINUTE = 190;
export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function formatDuration(seconds: number | null): string {
  if (seconds == null) return 'durée inconnue';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')} min`;
  if (m === 0) return `${s} s`;
  return `${m} min`;
}
