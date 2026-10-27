import { useSyncExternalStore } from 'react';
import { applyBadges } from './badges';
import { applyRewards, spend, type SpendResult } from './credits';
import { challengeById, evaluateChallenge } from '../studio/challenges';
import type { Graph } from '../studio/types';
import { emptyState, parseState, STATE_VERSION, type LedgerEntry, type ProgressState, type QuizResult } from './state';

export { emptyState, parseState };
export type { LedgerEntry, ProgressState, QuizResult };
export const STORAGE_KEY = 'nl:v1';

let state: ProgressState = emptyState();
let loaded = false;
const listeners = new Set<() => void>();

function load(): void {
  try {
    // Les données d'une version antérieure (sans crédits) sont migrées, puis les crédits déjà mérités sont versés (sans notification).
    state = applyBadges(applyRewards(parseState(localStorage.getItem(STORAGE_KEY))).state).state;
  } catch {
    state = emptyState();
  }
  loaded = true;
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* stockage plein ou désactivé : la session continue sans sauvegarde */
  }
}

// ───────────── Gains récents (en mémoire seulement, pour la notification discrète) ─────────────
let recent: LedgerEntry[] = [];
const rewardListeners = new Set<() => void>();
function emitRewards(entries: LedgerEntry[]) {
  if (!entries.length) return;
  recent = [...recent, ...entries];
  rewardListeners.forEach((l) => l());
}
export function dismissRewards(): void {
  recent = [];
  rewardListeners.forEach((l) => l());
}
export function useRecentRewards(): LedgerEntry[] {
  return useSyncExternalStore(
    (cb) => { rewardListeners.add(cb); return () => rewardListeners.delete(cb); },
    () => recent,
    () => recent,
  );
}

/** Applique un changement, verse les récompenses justifiées, sauvegarde et notifie. Renvoie les crédits gagnés par ce changement. */
function update(next: ProgressState): LedgerEntry[] {
  const { state: rewarded, added } = applyRewards(next);
  const { state: badged, added: newBadges } = applyBadges(rewarded);
  state = badged;
  persist();
  listeners.forEach((l) => l());
  emitRewards([...added, ...newBadges]);
  return added;
}

export function getState(): ProgressState {
  if (!loaded) load();
  return state;
}

/** Recharge depuis le stockage (modification dans un autre onglet, tests). */
export function reloadState(): void {
  load();
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) reloadState();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

export function useProgress(): ProgressState {
  return useSyncExternalStore(subscribe, getState, getState);
}

export const actions = {
  setLesson(id: string) {
    const s = getState();
    if (s.lastLesson !== id) update({ ...s, lastLesson: id });
  },
  toggleLesson(id: string) {
    const s = getState();
    const completed = { ...s.completed };
    if (completed[id]) delete completed[id];
    else completed[id] = new Date().toISOString();
    update({ ...s, completed });
  },
  /**
   * Enregistre un quiz terminé. `details` : réussite question par question (alimente « notions à revoir »).
   * Renvoie les crédits gagnés par cette tentative (tableau vide si aucun : seuil non atteint ou déjà récompensé).
   */
  recordQuiz(id: string, correct: number, total: number, details?: Record<string, boolean>): LedgerEntry[] {
    const s = getState();
    const prev = s.quizzes[id];
    const result: QuizResult = {
      best: Math.max(prev?.best ?? 0, correct),
      last: correct,
      total,
      attempts: (prev?.attempts ?? 0) + 1,
      date: new Date().toISOString(),
    };
    const qstats = { ...s.qstats };
    for (const [qid, ok] of Object.entries(details ?? {})) {
      const p = qstats[qid] ?? { right: 0, wrong: 0, last: ok };
      qstats[qid] = { right: p.right + (ok ? 1 : 0), wrong: p.wrong + (ok ? 0 : 1), last: ok };
    }
    return update({ ...s, quizzes: { ...s.quizzes, [id]: result }, qstats });
  },
  resetQuiz(id: string) {
    const s = getState();
    const quizzes = { ...s.quizzes };
    delete quizzes[id];
    update({ ...s, quizzes });
  },
  /** Exercice pratique auto-évalué réussi (les critères de réussite sont contrôlés par l'appelant). */
  passExercise(id: string): LedgerEntry[] {
    const s = getState();
    if (s.exercises[id]) return [];
    return update({ ...s, exercises: { ...s.exercises, [id]: new Date().toISOString() } });
  },
  toggleProjectStep(id: string) {
    const s = getState();
    update({ ...s, projectSteps: { ...s.projectSteps, [id]: !s.projectSteps[id] } });
  },
  toggleChecklist(id: string) {
    const s = getState();
    update({ ...s, checklist: { ...s.checklist, [id]: !s.checklist[id] } });
  },
  setTheme(theme: 'light' | 'dark') {
    update({ ...getState(), theme });
  },
  /** Débloque un bonus. À n'appeler qu'APRÈS confirmation explicite de l'utilisateur, coût affiché. */
  unlock(bonusId: string): SpendResult {
    const res = spend(getState(), bonusId);
    if (res.ok) update(res.state);
    return res;
  },
  addGoal(text: string) {
    const t = text.trim().slice(0, 160);
    const s = getState();
    if (!t || s.goals.length >= 20) return;
    update({ ...s, goals: [...s.goals, { id: `g${Date.now().toString(36)}${s.goals.length}`, text: t, done: false }] });
  },
  toggleGoal(id: string) {
    const s = getState();
    update({ ...s, goals: s.goals.map((g) => (g.id === id ? { ...g, done: !g.done } : g)) });
  },
  removeGoal(id: string) {
    const s = getState();
    update({ ...s, goals: s.goals.filter((g) => g.id !== id) });
  },
  /** Studio : avancement du tutoriel (persistant : pause, reprise, relance). */
  setTutorial(status: 'none' | 'running' | 'paused' | 'skipped' | 'done', step: number) {
    const s = getState();
    const cur = s.studio.tutorial;
    if (cur.status === status && cur.step === step) return [];
    // Relancer le tutoriel ne retire jamais de crédits (le registre est permanent) et ne rapporte rien de plus (clé unique).
    return update({ ...s, studio: { ...s.studio, tutorial: { status, step } } });
  },
  /** Studio : un guide a été consulté (ne rapporte aucun crédit : consulter n'est pas maîtriser). */
  markGuideRead(id: string) {
    const s = getState();
    if (s.studio.guides[id] || !/^[a-z0-9/-]{2,60}$/.test(id)) return;
    update({ ...s, studio: { ...s.studio, guides: { ...s.studio.guides, [id]: new Date().toISOString() } } });
  },
  /** Studio : valide un défi. Les critères sont ré-évalués ICI sur le diagramme fourni : un simple clic ne suffit jamais. */
  completeStudioChallenge(id: string, graph: Graph): { ok: boolean; added: LedgerEntry[]; failed: string[] } {
    const def = challengeById.get(id);
    if (!def) return { ok: false, added: [], failed: ['Défi inconnu.'] };
    const res = evaluateChallenge(def, graph);
    if (!res.pass) return { ok: false, added: [], failed: res.results.filter((r) => !r.ok).map((r) => r.text) };
    const s = getState();
    if (s.studio.done[id]) return { ok: true, added: [], failed: [] };
    return { ok: true, added: update({ ...s, studio: { ...s.studio, done: { ...s.studio.done, [id]: new Date().toISOString() } } }), failed: [] };
  },
  markExported() {
    update({ ...getState(), lastExport: new Date().toISOString() });
  },
  resetAll() {
    const theme = getState().theme;
    recent = [];
    update({ ...emptyState(), theme });
  },
  exportJson(): string {
    return JSON.stringify(getState(), null, 2);
  },
  /** Importe une sauvegarde JSON (version 1 ou 2) ; renvoie false si le fichier est invalide. */
  importJson(raw: string): boolean {
    try {
      const parsed = JSON.parse(raw) as { version?: number } | null;
      if (!parsed || typeof parsed !== 'object' || (parsed.version !== 1 && parsed.version !== STATE_VERSION)) return false;
    } catch {
      return false;
    }
    update(parseState(raw));
    return true;
  },
};
