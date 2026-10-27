/**
 * Révision espacée, sobre : une notion étudiée est proposée à revoir quelques jours après, puis de plus en plus tard.
 * Aucune pression : pas de série, pas de rappel insistant, pas de pénalité. C'est une suggestion affichée, rien de plus.
 */
import { TERMS } from '../content/glossary';
import type { Term } from '../content/types';
import { reviewQuizId, termQuestions } from './credits';
import type { ProgressState } from './state';

/** Délais (en jours) avant la 1re, la 2e puis les suivantes révisions d'une notion. */
export const REVIEW_INTERVALS_DAYS = [3, 7, 21] as const;

export interface DueReview {
  term: Term;
  /** Date de référence (leçon terminée ou dernière révision). */
  since: string;
  daysSince: number;
}

const DAY = 86_400_000;

export function dueReviews(s: ProgressState, now: Date = new Date()): DueReview[] {
  const out: DueReview[] = [];
  for (const term of TERMS) {
    const lessonDone = s.completed[term.lessonId];
    if (!lessonDone || termQuestions(term.id).length === 0) continue;
    const r = s.quizzes[reviewQuizId(term.id)];
    const since = r?.date || lessonDone;
    const t = Date.parse(since);
    if (Number.isNaN(t)) continue;
    const interval = REVIEW_INTERVALS_DAYS[Math.min(r?.attempts ?? 0, REVIEW_INTERVALS_DAYS.length - 1)];
    const daysSince = Math.floor((now.getTime() - t) / DAY);
    if (daysSince >= interval) out.push({ term, since, daysSince });
  }
  // Les plus anciennes d'abord.
  return out.sort((a, b) => b.daysSince - a.daysSince);
}
