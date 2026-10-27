/**
 * Moteur des Crédits de savoir : logique PURE (aucun accès au navigateur) — facile à tester et à faire évoluer.
 *
 * Idée clé : les récompenses ne sont pas « déclenchées par des clics » ; elles sont DÉDUITES de faits d'apprentissage
 * enregistrés (leçon terminée + contrôle réussi, score de quiz, exercice réussi…). Chaque récompense a une clé unique
 * (`lesson:l-ia`, `quiz80:quiz-m1`…) inscrite dans le registre : tant que la clé y est, elle ne peut plus être gagnée.
 * Un rechargement, un quiz refait ou une double action ne peuvent donc jamais produire de doublon.
 *
 * Limite assumée : tout est stocké dans le navigateur. Quelqu'un qui édite son stockage local peut se donner des crédits.
 * Ce système est un encouragement personnel, pas une certification : il ne prétend pas être protégé contre la triche.
 */
import { LESSONS, MODULES, QUIZZES, lessonById, lessonsOfModule, moduleById, termLabel } from '../content';
import { TERMS, termById } from '../content/glossary';
import { MODULE_SKILLS } from '../content/skills';
import type { Question } from '../content/types';
import { BONUS, LEVELS, REWARDS, THRESHOLDS, type BonusDef, type LevelDef } from './creditsConfig';
import type { LedgerEntry, ProgressState } from './state';
import { challengeById } from '../studio/challenges';

export const STUDIO_QUIZ_ID = 'studio-tuto';

const ratio = (r: { best: number; total: number } | undefined) => (r && r.total > 0 ? r.best / r.total : 0);

export const checkQuizId = (lessonId: string) => `check-${lessonId}`;
export const reviewQuizId = (termId: string) => `revue-${termId}`;
export const moduleQuizId = (moduleId: string) => `quiz-${moduleId}`;

export function lessonCheckPassed(s: ProgressState, lessonId: string): boolean {
  return ratio(s.quizzes[checkQuizId(lessonId)]) >= THRESHOLDS.lessonCheckPass;
}

export function quizPassed(s: ProgressState, quizId: string): boolean {
  return ratio(s.quizzes[quizId]) >= THRESHOLDS.quizPass;
}

/** Une leçon est « validée » quand elle est terminée ET que son contrôle de compréhension est réussi. */
export function lessonValidated(s: ProgressState, lessonId: string): boolean {
  return !!s.completed[lessonId] && lessonCheckPassed(s, lessonId);
}

export function moduleLessonsDone(s: ProgressState, moduleId: string): boolean {
  const ls = lessonsOfModule(moduleId);
  return ls.length > 0 && ls.every((l) => !!s.completed[l.id]);
}

/** Module validé : toutes ses leçons terminées ET quiz de fin de module réussi. */
export function moduleValidated(s: ProgressState, moduleId: string): boolean {
  return moduleLessonsDone(s, moduleId) && quizPassed(s, moduleQuizId(moduleId));
}

export const FUNDAMENTAL_MODULES = MODULES.filter((m) => m.level !== 'avance');

export function validatedModules(s: ProgressState, fundamentalOnly = true): string[] {
  return (fundamentalOnly ? FUNDAMENTAL_MODULES : MODULES).filter((m) => moduleValidated(s, m.id)).map((m) => m.id);
}

// ───────────── Récompenses ─────────────

export interface Earnable {
  key: string;
  label: string;
  credits: number;
}

const EXERCISE_LABEL: Record<string, string> = {
  explain: 'Exercice « Expliquer un concept simplement »',
  prompt: 'Exercice « Améliorer un prompt »',
};

/** Quiz dont la réussite compte comme exercice pratique plutôt que comme quiz de connaissances. */
function isExerciseQuiz(id: string): boolean {
  return id === 'quiz-exercices' || id.startsWith('bonus-');
}

export function labelFor(key: string): string {
  const i = key.indexOf(':');
  const kind = key.slice(0, i);
  const id = key.slice(i + 1);
  const quizTitle = QUIZZES.find((q) => q.id === id)?.title;
  switch (kind) {
    case 'lesson': return `Leçon validée : ${lessonById.get(id)?.title ?? id}`;
    case 'quiz80': return `Quiz réussi (≥ 80 %) : ${quizTitle ?? id}`;
    case 'quiz100': return `Quiz parfait (100 %) : ${quizTitle ?? id}`;
    case 'module': return `Module validé : ${moduleById.get(id)?.title ?? id}`;
    case 'review': return `Défi de révision réussi : ${termById.get(id)?.fr ?? id}`;
    case 'exercise': return EXERCISE_LABEL[id] ?? `Exercice réussi : ${BONUS.find((b) => b.id === id)?.title ?? quizTitle ?? id}`;
    case 'studio': return id === 'tuto' ? 'Studio : tutoriel terminé' : `Studio : défi réussi — ${challengeById.get(id)?.title ?? id}`;
    default: return key;
  }
}

/** Toutes les récompenses que les faits enregistrés justifient à cet instant (qu'elles aient déjà été versées ou non). */
export function earnable(s: ProgressState): Earnable[] {
  const out: Earnable[] = [];
  const add = (key: string, credits: number) => out.push({ key, label: labelFor(key), credits });

  for (const l of LESSONS) if (lessonValidated(s, l.id)) add(`lesson:${l.id}`, REWARDS.lesson);

  for (const [id, r] of Object.entries(s.quizzes)) {
    const p = ratio(r);
    if (isExerciseQuiz(id)) {
      if (p >= THRESHOLDS.quizPass) add(`exercise:${id}`, REWARDS.exercise);
    } else if (id.startsWith('quiz-')) {
      if (!QUIZZES.some((q) => q.id === id)) continue;
      if (p >= THRESHOLDS.quizPass) add(`quiz80:${id}`, REWARDS.quiz80);
      if (p === 1) add(`quiz100:${id}`, REWARDS.quiz100);
    } else if (id.startsWith('revue-')) {
      const term = termById.get(id.slice(6));
      // Un défi de révision ne rapporte que sur une notion dont la leçon a déjà été étudiée.
      if (term && s.completed[term.lessonId] && p >= THRESHOLDS.reviewPass) add(`review:${term.id}`, REWARDS.review);
    }
  }
  for (const id of Object.keys(s.exercises)) if (EXERCISE_LABEL[id]) add(`exercise:${id}`, REWARDS.exercise);
  for (const m of MODULES) if (moduleValidated(s, m.id)) add(`module:${m.id}`, REWARDS.module);
  // Studio : le tutoriel exige son quiz réussi ; chaque défi n'est récompensé que s'il a été validé par ses critères (voir actions.completeStudioChallenge).
  if (s.studio.tutorial.status === 'done' && quizPassed(s, STUDIO_QUIZ_ID)) add('studio:tuto', REWARDS.studio);
  for (const id of Object.keys(s.studio.done)) if (challengeById.has(id)) add(`studio:${id}`, REWARDS.studio);
  return out;
}

/** Ajoute au registre les récompenses justifiées et pas encore versées. Idempotent : l'appeler N fois donne le même résultat. */
export function applyRewards(s: ProgressState, now: Date = new Date()): { state: ProgressState; added: LedgerEntry[] } {
  const have = new Set(s.ledger.map((e) => e.key));
  const added: LedgerEntry[] = [];
  for (const e of earnable(s)) {
    if (have.has(e.key)) continue;
    have.add(e.key);
    added.push({ key: e.key, label: e.label, credits: e.credits, at: now.toISOString() });
  }
  return added.length ? { state: { ...s, ledger: [...s.ledger, ...added] }, added } : { state: s, added };
}

// ───────────── Solde, dépenses ─────────────

export const totalEarned = (s: ProgressState) => s.ledger.reduce((n, e) => n + e.credits, 0);
export const totalSpent = (s: ProgressState) => Object.values(s.unlocked).reduce((n, u) => n + u.cost, 0);
export const balance = (s: ProgressState) => Math.max(0, totalEarned(s) - totalSpent(s));

export type SpendResult = { ok: true; state: ProgressState; bonus: BonusDef } | { ok: false; reason: 'inconnu' | 'deja-debloque' | 'solde-insuffisant' };

/**
 * Débloque un bonus facultatif. Ne retire JAMAIS de crédits sans appel explicite : l'interface doit afficher le coût et demander
 * une confirmation avant d'appeler cette fonction.
 */
export function spend(s: ProgressState, bonusId: string, now: Date = new Date()): SpendResult {
  const bonus = BONUS.find((b) => b.id === bonusId);
  if (!bonus) return { ok: false, reason: 'inconnu' };
  if (s.unlocked[bonusId]) return { ok: false, reason: 'deja-debloque' };
  if (balance(s) < bonus.cost) return { ok: false, reason: 'solde-insuffisant' };
  return { ok: true, bonus, state: { ...s, unlocked: { ...s.unlocked, [bonusId]: { cost: bonus.cost, at: now.toISOString() } } } };
}

export const isUnlocked = (s: ProgressState, bonusId: string) => !!s.unlocked[bonusId];

// ───────────── Niveaux ─────────────

export interface LevelStatus {
  level: LevelDef;
  next: LevelDef | null;
  /** Ce qu'il reste à faire pour le niveau suivant (crédits + objectifs pédagogiques). */
  missing: string[];
}

function unmet(s: ProgressState, def: LevelDef): string[] {
  const out: string[] = [];
  const earned = totalEarned(s);
  if (earned < def.minCredits) out.push(`${def.minCredits - earned} crédits à gagner (${earned} / ${def.minCredits})`);
  const r = def.requires;
  if (r.modulesValidated !== undefined) {
    const n = validatedModules(s).length;
    if (n < r.modulesValidated) out.push(`${r.modulesValidated - n} module(s) à valider (${n} / ${r.modulesValidated}) — leçons terminées et quiz ≥ 80 %`);
  }
  if (r.projectSteps !== undefined) {
    const n = Object.values(s.projectSteps).filter(Boolean).length;
    if (n < r.projectSteps) out.push(`${r.projectSteps - n} étape(s) du projet final à terminer (${n} / ${r.projectSteps})`);
  }
  if (r.glossaryQuiz && !quizPassed(s, 'quiz-glossaire')) out.push('réussir le quiz des 50 notions (≥ 80 %)');
  return out;
}

export function levelStatus(s: ProgressState): LevelStatus {
  let current = LEVELS[0];
  for (const def of LEVELS) if (unmet(s, def).length === 0) current = def;
  const next = LEVELS.find((l) => l.id === current.id + 1) ?? null;
  return { level: current, next, missing: next ? unmet(s, next) : [] };
}

// ───────────── Compétences et notions à revoir ─────────────

const allQuestions: Map<string, Question> = new Map();
for (const q of QUIZZES) for (const x of q.questions) allQuestions.set(x.id, x);
for (const l of LESSONS) for (const x of l.checkQuestions) allQuestions.set(x.id, x);
export const questionById = (id: string) => allQuestions.get(id);

/** Questions pour lesquelles la dernière tentative était fausse. */
export function missedQuestions(s: ProgressState): Question[] {
  return Object.entries(s.qstats).filter(([, v]) => !v.last).map(([id]) => allQuestions.get(id)).filter((q): q is Question => !!q);
}

/** Leçons associées à des questions récemment manquées, avec le nombre de questions à revoir. */
export function weakLessons(s: ProgressState): { lessonId: string; missed: number }[] {
  const counts = new Map<string, number>();
  for (const q of missedQuestions(s)) if (q.lessonId) counts.set(q.lessonId, (counts.get(q.lessonId) ?? 0) + 1);
  return [...counts].map(([lessonId, missed]) => ({ lessonId, missed })).sort((a, b) => b.missed - a.missed);
}

/** Notions (parmi les 50) sur lesquelles une question a été récemment manquée. */
export function weakTerms(s: ProgressState): string[] {
  return [...new Set(missedQuestions(s).map((q) => q.termId).filter((t): t is string => !!t && termById.has(t)))];
}

/** Questions disponibles pour un défi de révision sur une notion. */
export function termQuestions(termId: string): Question[] {
  return [...allQuestions.values()].filter((q) => q.termId === termId);
}

/** Notions étudiées (leçon associée terminée) pour lesquelles un défi de révision existe. */
export function reviewableTerms(s: ProgressState) {
  return TERMS.filter((t) => s.completed[t.lessonId] && termQuestions(t.id).length > 0);
}

export type SkillStatus = 'validee' | 'a-renforcer' | 'en-cours' | 'a-decouvrir';

export interface ModuleSkill {
  moduleId: string;
  title: string;
  skills: string[];
  status: SkillStatus;
  lessonsDone: number;
  lessonsTotal: number;
  quiz: { best: number; total: number } | null;
  /** Leçons dont le contrôle a été tenté sans atteindre le seuil. */
  toStrengthen: string[];
}

/**
 * Compétences par module. Honnête par construction : « validée » exige leçons terminées + quiz de module réussi ;
 * sans tentative, le statut reste « à découvrir » ou « en cours » — aucune statistique de maîtrise n'est inventée.
 */
export function moduleSkills(s: ProgressState): ModuleSkill[] {
  return MODULES.map((m) => {
    const ls = lessonsOfModule(m.id);
    const done = ls.filter((l) => s.completed[l.id]).length;
    const qr = s.quizzes[moduleQuizId(m.id)];
    const toStrengthen = ls.filter((l) => {
      const r = s.quizzes[checkQuizId(l.id)];
      return r && ratio(r) < THRESHOLDS.lessonCheckPass;
    }).map((l) => l.id);
    let status: SkillStatus;
    if (moduleValidated(s, m.id)) status = 'validee';
    else if ((qr && ratio(qr) < THRESHOLDS.quizPass) || toStrengthen.length > 0) status = 'a-renforcer';
    else if (done > 0 || qr || ls.some((l) => s.quizzes[checkQuizId(l.id)])) status = 'en-cours';
    else status = 'a-decouvrir';
    return { moduleId: m.id, title: m.title, skills: MODULE_SKILLS[m.id] ?? [], status, lessonsDone: done, lessonsTotal: ls.length, quiz: qr ? { best: qr.best, total: qr.total } : null, toStrengthen };
  });
}

// ───────────── Recommandation ─────────────

export type LessonStatus = 'termine' | 'en-cours' | 'a-decouvrir';

export function lessonStatus(s: ProgressState, lessonId: string): LessonStatus {
  if (s.completed[lessonId]) return 'termine';
  if (s.lastLesson === lessonId || s.quizzes[checkQuizId(lessonId)]) return 'en-cours';
  return 'a-decouvrir';
}

/** Prochaine leçon à proposer : première leçon non terminée à partir de la dernière consultée, sinon la première non terminée. */
export function recommendNext(s: ProgressState) {
  const idx = s.lastLesson ? LESSONS.findIndex((l) => l.id === s.lastLesson) : -1;
  const after = LESSONS.slice(Math.max(0, idx)).find((l) => !s.completed[l.id]);
  return after ?? LESSONS.find((l) => !s.completed[l.id]) ?? null;
}

export { termLabel };
