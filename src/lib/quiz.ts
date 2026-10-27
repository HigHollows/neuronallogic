import type { Question } from '../content/types';

/** Une question est réussie si l'ensemble des réponses cochées est exactement l'ensemble des bonnes réponses. */
export function isCorrect(q: Question, selected: number[]): boolean {
  const a = [...new Set(selected)].sort((x, y) => x - y);
  const b = [...new Set(q.correct)].sort((x, y) => x - y);
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export interface Score {
  correct: number;
  total: number;
  percent: number;
  /** Ids des questions ratées, pour proposer une révision ciblée. */
  missed: string[];
}

export function scoreQuiz(questions: Question[], answers: Record<string, number[]>): Score {
  let correct = 0;
  const missed: string[] = [];
  for (const q of questions) {
    if (isCorrect(q, answers[q.id] ?? [])) correct++;
    else missed.push(q.id);
  }
  const total = questions.length;
  return { correct, total, percent: total === 0 ? 0 : Math.round((correct / total) * 100), missed };
}

export function verdict(percent: number): string {
  if (percent >= 90) return 'Excellent : les notions sont solides.';
  if (percent >= 70) return 'Bien : relis les explications des questions ratées.';
  if (percent >= 50) return 'En progrès : reprends les leçons liées aux erreurs.';
  return 'À consolider : relis les leçons du module puis recommence.';
}
