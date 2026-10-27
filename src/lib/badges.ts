/**
 * Badges : quelques repères rares qui marquent des étapes RÉELLES d'apprentissage.
 * Règles : aucun badge pour la connexion, le temps passé ou le nombre de clics ; un badge s'obtient une seule fois ;
 * ils sont déduits de faits enregistrés (comme les crédits). Comme eux, ils sont stockés dans le navigateur et modifiables.
 */
import { MODULES } from '../content';
import { FUNDAMENTAL_MODULES, lessonValidated, moduleValidated, quizPassed } from './credits';
import type { LedgerEntry, ProgressState } from './state';
import { LESSONS } from '../content';

export interface BadgeDef {
  id: string;
  name: string;
  icon: string;
  /** Condition affichée telle quelle (même si le badge n'est pas encore obtenu : pas de mystère artificiel). */
  how: string;
  earned: (s: ProgressState) => boolean;
}

const fullScoreQuiz = (s: ProgressState) =>
  Object.entries(s.quizzes).some(([id, r]) => (id.startsWith('quiz-') || id.startsWith('bonus-')) && r.total >= 5 && r.best === r.total);

export const BADGES: BadgeDef[] = [
  { id: 'premier-pas', name: 'Premier pas', icon: 'check', how: 'Valider ta première leçon (terminée + contrôle réussi).', earned: (s) => LESSONS.some((l) => lessonValidated(s, l.id)) },
  { id: 'mise-en-pratique', name: 'Mise en pratique', icon: 'exercise', how: 'Réussir un premier exercice pratique.', earned: (s) => s.ledger.some((e) => e.key.startsWith('exercise:')) },
  { id: 'sans-faute', name: 'Sans faute', icon: 'spark', how: '100 % à un quiz d’au moins 5 questions.', earned: fullScoreQuiz },
  { id: 'perseverance', name: 'Persévérance', icon: 'review', how: 'Réussir un quiz (≥ 80 %) après l’avoir recommencé.', earned: (s) => Object.entries(s.quizzes).some(([id, r]) => id.startsWith('quiz-') && r.attempts >= 2 && quizPassed(s, id)) },
  { id: 'module-valide', name: 'Module validé', icon: 'book', how: 'Valider un module (leçons terminées + quiz de module ≥ 80 %).', earned: (s) => MODULES.some((m) => moduleValidated(s, m.id)) },
  { id: 'reviseur', name: 'Réviseur', icon: 'review', how: 'Réussir 5 défis de révision.', earned: (s) => s.ledger.filter((e) => e.key.startsWith('review:')).length >= 5 },
  { id: 'cinquante-notions', name: '50 notions', icon: 'quiz', how: 'Réussir le quiz des 50 notions (≥ 80 %).', earned: (s) => quizPassed(s, 'quiz-glossaire') },
  { id: 'batisseur', name: 'Bâtisseur', icon: 'flag', how: 'Terminer 4 étapes du projet final.', earned: (s) => Object.values(s.projectSteps).filter(Boolean).length >= 4 },
  { id: 'projet-final', name: 'Projet final', icon: 'flag', how: 'Terminer les 8 étapes du projet final.', earned: (s) => Object.values(s.projectSteps).filter(Boolean).length >= 8 },
  { id: 'vigilant', name: 'Vigilant', icon: 'info', how: 'Valider le module « Fiabilité et sécurité ».', earned: (s) => moduleValidated(s, 'm7') },
  { id: 'prevoyant', name: 'Prévoyant', icon: 'sheet', how: 'Exporter une sauvegarde de ta progression.', earned: (s) => s.lastExport !== null },
  { id: 'expert', name: 'Expert', icon: 'spark', how: 'Valider le module expert.', earned: (s) => moduleValidated(s, 'm9') },
  { id: 'studio-tutoriel', name: 'Premier schéma', icon: 'network', how: 'Terminer le tutoriel du Studio (étapes réalisées et quiz réussi).', earned: (s) => s.ledger.some((e) => e.key === 'studio:tuto') },
  { id: 'architecte', name: 'Architecte', icon: 'network', how: 'Réussir 3 défis guidés du Studio.', earned: (s) => Object.keys(s.studio.done).length >= 3 },
  { id: 'maitre', name: 'Maître des fondamentaux', icon: 'profile', how: 'Valider les 8 modules fondamentaux.', earned: (s) => FUNDAMENTAL_MODULES.every((m) => moduleValidated(s, m.id)) },
];

export const badgeById = new Map(BADGES.map((b) => [b.id, b]));

/** Ajoute les badges mérités et pas encore obtenus. Idempotent. */
export function applyBadges(s: ProgressState, now: Date = new Date()): { state: ProgressState; added: LedgerEntry[] } {
  const fresh = BADGES.filter((b) => !s.badges[b.id] && b.earned(s));
  if (fresh.length === 0) return { state: s, added: [] };
  const badges = { ...s.badges };
  for (const b of fresh) badges[b.id] = now.toISOString();
  return {
    state: { ...s, badges },
    added: fresh.map((b) => ({ key: `badge:${b.id}`, label: `Badge obtenu : ${b.name}`, credits: 0, at: now.toISOString() })),
  };
}

// ───────────── Graphique d'activité (façon « contributions » GitHub) ─────────────

export interface DayCell {
  date: string;
  count: number;
  /** 0 à 4 */
  level: number;
}

/** Nombre d'activités d'apprentissage enregistrées par jour (leçons terminées, quiz, récompenses, exercices, badges). */
export function activityByDay(s: ProgressState): Map<string, number> {
  const days = new Map<string, number>();
  const add = (iso: string | undefined) => {
    if (!iso || iso.length < 10) return;
    const d = iso.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
    days.set(d, (days.get(d) ?? 0) + 1);
  };
  Object.values(s.completed).forEach(add);
  Object.values(s.quizzes).forEach((q) => add(q.date));
  Object.values(s.exercises).forEach(add);
  Object.values(s.badges).forEach(add);
  s.ledger.forEach((e) => add(e.at));
  return days;
}

const levelOf = (n: number) => (n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n <= 4 ? 3 : 4);

/** Grille de `weeks` semaines (colonnes) × 7 jours (lundi → dimanche), terminant à la semaine de `today`. */
export function activityGrid(s: ProgressState, today: Date = new Date(), weeks = 20): { columns: DayCell[][]; activeDays: number; total: number } {
  const counts = activityByDay(s);
  const end = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const dow = (end.getUTCDay() + 6) % 7; // lundi = 0
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - dow - (weeks - 1) * 7);
  const columns: DayCell[][] = [];
  let activeDays = 0;
  let total = 0;
  for (let w = 0; w < weeks; w++) {
    const col: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(start);
      day.setUTCDate(start.getUTCDate() + w * 7 + d);
      const iso = day.toISOString().slice(0, 10);
      const future = day.getTime() > end.getTime();
      const count = future ? 0 : counts.get(iso) ?? 0;
      if (count > 0) { activeDays++; total += count; }
      col.push({ date: iso, count, level: levelOf(count) });
    }
    columns.push(col);
  }
  return { columns, activeDays, total };
}
