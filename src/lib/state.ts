import { BONUS, REWARDS } from './creditsConfig';

/** Version du format de sauvegarde. La version 1 (sans crédits) est migrée automatiquement. */
export const STATE_VERSION = 2;

export interface QuizResult {
  best: number;
  last: number;
  total: number;
  attempts: number;
  date: string;
}

export interface LedgerEntry {
  /** Clé d'activité unique, par exemple `lesson:l-ia` ou `quiz80:quiz-m1` : c'est ce qui empêche tout doublon. */
  key: string;
  label: string;
  credits: number;
  at: string;
}

export interface QuestionStat {
  right: number;
  wrong: number;
  /** Résultat de la dernière tentative. */
  last: boolean;
}

export interface Goal {
  id: string;
  text: string;
  done: boolean;
}

export interface ProgressState {
  version: typeof STATE_VERSION;
  completed: Record<string, string>;
  lastLesson: string | null;
  quizzes: Record<string, QuizResult>;
  projectSteps: Record<string, boolean>;
  checklist: Record<string, boolean>;
  theme: 'light' | 'dark' | null;
  /** Registre des récompenses obtenues (jamais supprimé automatiquement). */
  ledger: LedgerEntry[];
  /** Bonus débloqués avec des crédits. */
  unlocked: Record<string, { cost: number; at: string }>;
  /** Réussite par question, pour repérer les notions à revoir. */
  qstats: Record<string, QuestionStat>;
  /** Exercices pratiques réussis (auto-évaluation avec production minimale). */
  exercises: Record<string, string>;
  goals: Goal[];
  lastExport: string | null;
  /** Badges obtenus (identifiant → date). */
  badges: Record<string, string>;
  /** NeuronalLogic Studio : tutoriel, guides consultés (≠ maîtrisés), défis réussis. */
  studio: StudioProgress;
}

export interface StudioProgress {
  tutorial: { status: 'none' | 'running' | 'paused' | 'skipped' | 'done'; step: number };
  /** Guides consultés (identifiant → date). Consulter n'est pas maîtriser : cela ne rapporte aucun crédit. */
  guides: Record<string, string>;
  /** Défis guidés réussis (identifiant → date). */
  done: Record<string, string>;
}

export const emptyStudio = (): StudioProgress => ({ tutorial: { status: 'none', step: 0 }, guides: {}, done: {} });

export function emptyState(): ProgressState {
  return {
    version: STATE_VERSION, completed: {}, lastLesson: null, quizzes: {}, projectSteps: {}, checklist: {}, theme: null,
    ledger: [], unlocked: {}, qstats: {}, exercises: {}, goals: [], lastExport: null, badges: {}, studio: emptyStudio(),
  };
}

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const clean = (s: string, max = 200) => s.slice(0, max);

/** Les montants d'un registre sont toujours recalculés d'après le barème : une valeur modifiée à la main est ignorée. */
export function rewardAmount(key: string): number | null {
  const kind = key.split(':')[0] as keyof typeof REWARDS;
  const id = key.slice(key.indexOf(':') + 1);
  if (!id || key.indexOf(':') < 0) return null;
  const map: Record<string, number> = { lesson: REWARDS.lesson, quiz80: REWARDS.quiz80, quiz100: REWARDS.quiz100, exercise: REWARDS.exercise, module: REWARDS.module, review: REWARDS.review, studio: REWARDS.studio };
  return map[kind] ?? null;
}

/** Lecture défensive : toute donnée corrompue ou inattendue est ignorée au lieu de faire planter le site. */
export function parseState(raw: string | null): ProgressState {
  const base = emptyState();
  if (!raw) return base;
  try {
    const data = JSON.parse(raw) as Record<string, unknown> | null;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return base;

    const seen = new Set<string>();
    const ledger: LedgerEntry[] = [];
    if (Array.isArray(data.ledger)) {
      for (const e of data.ledger as unknown[]) {
        const r = rec(e);
        if (!isStr(r.key) || seen.has(r.key)) continue;
        const credits = rewardAmount(r.key);
        if (credits === null) continue;
        seen.add(r.key);
        ledger.push({ key: clean(r.key), label: isStr(r.label) ? clean(r.label) : r.key, credits, at: isStr(r.at) ? clean(r.at, 40) : '' });
      }
    }
    const unlocked: ProgressState['unlocked'] = {};
    for (const [id, v] of Object.entries(rec(data.unlocked))) {
      const def = BONUS.find((b) => b.id === id);
      const r = rec(v);
      if (def) unlocked[id] = { cost: def.cost, at: isStr(r.at) ? clean(r.at, 40) : '' };
    }
    const qstats: ProgressState['qstats'] = {};
    for (const [id, v] of Object.entries(rec(data.qstats))) {
      const r = rec(v);
      if (isNum(r.right) && isNum(r.wrong) && typeof r.last === 'boolean') qstats[id] = { right: Math.max(0, r.right), wrong: Math.max(0, r.wrong), last: r.last };
    }
    const quizzes: ProgressState['quizzes'] = {};
    for (const [id, v] of Object.entries(rec(data.quizzes))) {
      const r = rec(v);
      if (isNum(r.best) && isNum(r.total) && isNum(r.last) && r.total > 0 && r.best >= 0 && r.best <= r.total && r.last >= 0 && r.last <= r.total)
        quizzes[id] = { best: r.best, last: r.last, total: r.total, attempts: isNum(r.attempts) ? Math.max(1, r.attempts) : 1, date: isStr(r.date) ? clean(r.date, 40) : '' };
    }
    const goals: Goal[] = Array.isArray(data.goals)
      ? (data.goals as unknown[]).flatMap((g) => {
          const r = rec(g);
          return isStr(r.id) && isStr(r.text) && r.text.trim() ? [{ id: clean(r.id, 40), text: clean(r.text, 160), done: r.done === true }] : [];
        }).slice(0, 20)
      : [];
    const bools = (o: unknown) => Object.fromEntries(Object.entries(rec(o)).filter(([, v]) => typeof v === 'boolean')) as Record<string, boolean>;
    const strs = (o: unknown) => Object.fromEntries(Object.entries(rec(o)).filter(([, v]) => isStr(v))) as Record<string, string>;

    const st = rec(data.studio);
    const tut = rec(st.tutorial);
    const status = (['none', 'running', 'paused', 'skipped', 'done'] as const).find((x) => x === tut.status) ?? 'none';
    const slug = (o: unknown) => Object.fromEntries(Object.entries(strs(o)).filter(([k]) => /^[a-z0-9/-]{2,60}$/.test(k)).slice(0, 200).map(([k, v]) => [k, clean(v, 40)]));
    const studio: StudioProgress = { tutorial: { status, step: isNum(tut.step) ? Math.min(7, Math.max(0, Math.floor(tut.step))) : 0 }, guides: slug(st.guides), done: slug(st.done) };

    return {
      version: STATE_VERSION,
      completed: strs(data.completed),
      lastLesson: isStr(data.lastLesson) ? data.lastLesson : null,
      quizzes,
      projectSteps: bools(data.projectSteps),
      checklist: bools(data.checklist),
      theme: data.theme === 'light' || data.theme === 'dark' ? data.theme : null,
      ledger,
      unlocked,
      qstats,
      exercises: strs(data.exercises),
      goals,
      lastExport: isStr(data.lastExport) ? clean(data.lastExport, 40) : null,
      badges: Object.fromEntries(Object.entries(strs(data.badges)).filter(([k]) => /^[a-z0-9-]{2,40}$/.test(k)).map(([k, v]) => [k, clean(v, 40)])),
      studio,
    };
  } catch {
    return base;
  }
}
