import type { Question } from './types';

type C = [text: string, feedback?: string];

/** Hachage simple et stable d'une chaîne (FNV-1a 32 bits). */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Permutation déterministe (Fisher-Yates avec générateur congruentiel seedé par l'identifiant). */
function permutation(n: number, seed: number): number[] {
  const p = Array.from({ length: n }, (_, i) => i);
  let s = seed || 1;
  for (let i = n - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  return p;
}

/**
 * Raccourci d'écriture d'une question.
 * `correct` : indice (single) ou liste d'indices (multiple), tels qu'écrits dans le fichier source.
 * Pour chaque mauvais choix, le second élément du tuple explique l'erreur de compréhension qu'il représente.
 * L'ordre des choix est mélangé de façon déterministe (graine = id) pour que la bonne réponse ne soit pas toujours au même rang.
 */
export function q(
  id: string,
  prompt: string,
  choices: C[],
  correct: number | number[],
  explanation: string,
  extra: { context?: Question['context']; lessonId?: string; termId?: string } = {},
): Question {
  const list = Array.isArray(correct) ? correct : [correct];
  const order = permutation(choices.length, hash(id));
  const shuffled = order.map((from) => choices[from]);
  const remapped = list.map((old) => order.indexOf(old)).sort((a, b) => a - b);
  return {
    id,
    type: list.length > 1 ? 'multiple' : 'single',
    prompt,
    choices: shuffled.map(([text, feedback]) => ({ text, feedback })),
    correct: remapped,
    explanation,
    ...extra,
  };
}
