import { beforeEach, describe, expect, it } from 'vitest';
import { LESSONS, lessonsOfModule } from '../src/content';
import { TERMS } from '../src/content/glossary';
import { applyRewards, balance, earnable, levelStatus, moduleSkills, recommendNext, spend, totalEarned, validatedModules, weakLessons } from '../src/lib/credits';
import { BONUS, LEVELS, REWARDS } from '../src/lib/creditsConfig';
import { decodeSave, encodeSave } from '../src/lib/saveCode';
import { actions, getState, reloadState, STORAGE_KEY } from '../src/lib/progress';
import { emptyState, parseState, type ProgressState } from '../src/lib/state';

const L = LESSONS[0];
const L2 = LESSONS[1];
const q = (best: number, total: number) => ({ best, last: best, total, attempts: 1, date: '2026-01-01' });
const fresh = (): ProgressState => emptyState();
const keys = (s: ProgressState) => s.ledger.map((e) => e.key);

describe('barème', () => {
  it('reprend les récompenses demandées', () => {
    expect(REWARDS).toMatchObject({ lesson: 10, quiz80: 15, quiz100: 5, exercise: 20, module: 30, review: 5 });
  });
  it('a 5 niveaux croissants nommés comme prévu', () => {
    expect(LEVELS.map((l) => l.name)).toEqual(['Explorateur de l’IA', 'Apprenti de l’IA', 'Praticien de l’IA', 'Concepteur de projets IA', 'Maître des fondamentaux']);
    for (let i = 1; i < LEVELS.length; i++) expect(LEVELS[i].minCredits).toBeGreaterThan(LEVELS[i - 1].minCredits);
  });
});

describe('leçons', () => {
  it('ne rapportent rien si la leçon est seulement marquée terminée (clic sans compréhension)', () => {
    const s = { ...fresh(), completed: { [L.id]: 'x' } };
    expect(applyRewards(s).added).toEqual([]);
  });
  it('ne rapportent rien si le contrôle est réussi mais la leçon pas terminée', () => {
    const s = { ...fresh(), quizzes: { [`check-${L.id}`]: q(3, 3) } };
    expect(applyRewards(s).added).toEqual([]);
  });
  it('rapportent 10 crédits quand la leçon est terminée ET le contrôle réussi (2/3 suffit, 1/3 non)', () => {
    const ok = applyRewards({ ...fresh(), completed: { [L.id]: 'x' }, quizzes: { [`check-${L.id}`]: q(2, 3) } });
    expect(ok.added.map((e) => [e.key, e.credits])).toEqual([[`lesson:${L.id}`, 10]]);
    const ko = applyRewards({ ...fresh(), completed: { [L.id]: 'x' }, quizzes: { [`check-${L.id}`]: q(1, 3) } });
    expect(ko.added).toEqual([]);
  });
});

describe('quiz', () => {
  const quizId = 'quiz-m1';
  it('79 % : rien ; 80 % : +15 ; 100 % : +15 +5', () => {
    expect(applyRewards({ ...fresh(), quizzes: { [quizId]: q(79, 100) } }).added).toEqual([]);
    expect(applyRewards({ ...fresh(), quizzes: { [quizId]: q(8, 10) } }).added.map((e) => e.credits)).toEqual([15]);
    expect(applyRewards({ ...fresh(), quizzes: { [quizId]: q(10, 10) } }).added.map((e) => [e.key, e.credits])).toEqual([[`quiz80:${quizId}`, 15], [`quiz100:${quizId}`, 5]]);
  });
  it('un 100 % obtenu après un 80 % ne verse que le bonus manquant', () => {
    const a = applyRewards({ ...fresh(), quizzes: { [quizId]: q(8, 10) } }).state;
    const b = applyRewards({ ...a, quizzes: { [quizId]: q(10, 10) } });
    expect(b.added.map((e) => e.key)).toEqual([`quiz100:${quizId}`]);
    expect(totalEarned(b.state)).toBe(20);
  });
  it('les quiz de leçon et inconnus ne comptent pas comme quiz de connaissances', () => {
    expect(applyRewards({ ...fresh(), quizzes: { 'quiz-inexistant': q(10, 10), 'autre': q(10, 10) } }).added).toEqual([]);
  });
  it('le quiz d’exercices compte comme un exercice pratique (+20), pas comme un quiz', () => {
    const r = applyRewards({ ...fresh(), quizzes: { 'quiz-exercices': q(7, 8) } });
    expect(r.added.map((e) => [e.key, e.credits])).toEqual([['exercise:quiz-exercices', 20]]);
  });
});

describe('modules', () => {
  const mod = 'm3';
  const all = lessonsOfModule(mod);
  const done = Object.fromEntries(all.map((l) => [l.id, 'x']));
  it('exige toutes les leçons ET le quiz de fin de module', () => {
    expect(validatedModules({ ...fresh(), completed: done })).toEqual([]);
    expect(validatedModules({ ...fresh(), quizzes: { 'quiz-m3': q(9, 10) } })).toEqual([]);
    const s = { ...fresh(), completed: done, quizzes: { 'quiz-m3': q(9, 10) } };
    expect(validatedModules(s)).toEqual(['m3']);
    expect(earnable(s).some((e) => e.key === 'module:m3' && e.credits === 30)).toBe(true);
  });
});

describe('défis de révision', () => {
  const term = TERMS.find((t) => t.id === 'token')!;
  it('rapportent +5 seulement sur une notion dont la leçon a été étudiée', () => {
    const quizzes = { 'revue-token': q(1, 1) };
    expect(applyRewards({ ...fresh(), quizzes }).added).toEqual([]);
    const r = applyRewards({ ...fresh(), quizzes, completed: { [term.lessonId]: 'x' } });
    expect(r.added.map((e) => [e.key, e.credits])).toEqual([['review:token', 5]]);
  });
  it('ne rapportent rien en dessous du seuil', () => {
    expect(applyRewards({ ...fresh(), quizzes: { 'revue-token': q(1, 3) }, completed: { [term.lessonId]: 'x' } }).added).toEqual([]);
  });
});

describe('aucun doublon', () => {
  beforeEach(() => {
    localStorage.clear();
    reloadState();
  });
  it('est idempotent : appliquer deux fois ne verse qu’une fois', () => {
    const s0 = { ...fresh(), quizzes: { 'quiz-m1': q(10, 10) } };
    const a = applyRewards(s0);
    const b = applyRewards(a.state);
    expect(b.added).toEqual([]);
    expect(keys(b.state)).toEqual(keys(a.state));
  });
  it('un rechargement de page ne redonne pas les mêmes crédits', () => {
    actions.recordQuiz('quiz-m1', 10, 10);
    const first = totalEarned(getState());
    expect(first).toBe(20);
    for (let i = 0; i < 5; i++) reloadState();
    expect(totalEarned(getState())).toBe(first);
    expect(getState().ledger).toHaveLength(2);
  });
  it('refaire un quiz déjà récompensé ne rapporte rien de plus', () => {
    actions.recordQuiz('quiz-m1', 10, 10);
    const added = actions.recordQuiz('quiz-m1', 10, 10);
    expect(added).toEqual([]);
    expect(totalEarned(getState())).toBe(20);
  });
  it('réinitialiser un quiz ou décocher une leçon n’efface pas ni ne rend à nouveau gagnables les crédits acquis', () => {
    actions.recordQuiz('quiz-m1', 8, 10);
    actions.resetQuiz('quiz-m1');
    expect(totalEarned(getState())).toBe(15);
    const added = actions.recordQuiz('quiz-m1', 8, 10);
    expect(added).toEqual([]);
    expect(totalEarned(getState())).toBe(15);
  });
  it('terminer une leçon deux fois (cocher, décocher, recocher) ne rapporte qu’une fois', () => {
    actions.recordQuiz(`check-${L.id}`, 3, 3);
    actions.toggleLesson(L.id);
    expect(totalEarned(getState())).toBe(10);
    actions.toggleLesson(L.id);
    actions.toggleLesson(L.id);
    expect(totalEarned(getState())).toBe(10);
  });
  it('un exercice auto-évalué n’est récompensé qu’une fois', () => {
    expect(actions.passExercise('explain')).toHaveLength(1);
    expect(actions.passExercise('explain')).toEqual([]);
    expect(totalEarned(getState())).toBe(20);
  });
  it('verse rétroactivement les crédits mérités par une ancienne sauvegarde (version 1), une seule fois', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, completed: { [L.id]: '2026-01-01' }, quizzes: { [`check-${L.id}`]: q(3, 3), 'quiz-m1': q(9, 10) }, lastLesson: L.id, projectSteps: {}, checklist: {}, theme: null }));
    reloadState();
    const s = getState();
    expect(s.version).toBe(2);
    expect(keys(s).sort()).toEqual([`lesson:${L.id}`, 'quiz80:quiz-m1'].sort());
    reloadState();
    expect(getState().ledger).toHaveLength(2);
  });
});

describe('registre altéré', () => {
  it('recalcule les montants d’après le barème et ignore les clés inconnues ou dupliquées', () => {
    const s = parseState(JSON.stringify({
      version: 2,
      ledger: [
        { key: `lesson:${L.id}`, label: 'x', credits: 99999, at: 'a' },
        { key: `lesson:${L.id}`, label: 'doublon', credits: 10, at: 'b' },
        { key: 'inconnu:x', label: 'y', credits: 500, at: 'c' },
        { key: 42, credits: 1 },
      ],
    }));
    expect(s.ledger).toHaveLength(1);
    expect(s.ledger[0].credits).toBe(10);
    expect(totalEarned(s)).toBe(10);
  });
  it('ignore des scores impossibles et des bonus au coût modifié', () => {
    const s = parseState(JSON.stringify({ version: 2, quizzes: { a: { best: 9, total: 5, last: 1 }, b: { best: 4, total: 5, last: 4, attempts: 1 } }, unlocked: { 'bonus-securite': { cost: 0, at: 'x' }, nimporte: { cost: 0 } } }));
    expect(Object.keys(s.quizzes)).toEqual(['b']);
    expect(s.unlocked['bonus-securite'].cost).toBe(25);
    expect(s.unlocked.nimporte).toBeUndefined();
  });
});

describe('dépenses de crédits', () => {
  const rich = (): ProgressState => ({ ...fresh(), quizzes: { 'quiz-m1': q(10, 10), 'quiz-m2': q(10, 10), 'quiz-m3': q(10, 10) } }); // 60 crédits
  it('refuse sans solde suffisant et ne retire rien', () => {
    const r = spend(fresh(), 'bonus-securite');
    expect(r).toEqual({ ok: false, reason: 'solde-insuffisant' });
  });
  it('débloque, retire exactement le coût et ne fait pas baisser le niveau (basé sur les crédits gagnés)', () => {
    const s = applyRewards(rich()).state;
    expect(balance(s)).toBe(60);
    const r = spend(s, 'bonus-securite');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(balance(r.state)).toBe(60 - 25);
    expect(totalEarned(r.state)).toBe(60);
    expect(levelStatus(r.state).level.id).toBe(levelStatus(s).level.id);
  });
  it('refuse un second déblocage et un bonus inconnu', () => {
    const s = applyRewards(rich()).state;
    const r = spend(s, 'synthese-fondamentaux');
    if (!r.ok) throw new Error('attendu');
    expect(spend(r.state, 'synthese-fondamentaux')).toEqual({ ok: false, reason: 'deja-debloque' });
    expect(spend(s, 'rien')).toEqual({ ok: false, reason: 'inconnu' });
  });
  it('le solde ne devient jamais négatif', () => {
    const s = { ...fresh(), unlocked: { 'bonus-securite': { cost: 25, at: 'x' } } };
    expect(balance(s)).toBe(0);
  });
  it('ne retire jamais de crédits tant qu’aucun déblocage n’est demandé', () => {
    localStorage.clear();
    reloadState();
    actions.recordQuiz('quiz-m1', 10, 10);
    const before = balance(getState());
    actions.resetQuiz('quiz-m1');
    actions.toggleLesson(L2.id);
    expect(balance(getState())).toBe(before);
  });
  it('les bonus ont des coûts positifs et des identifiants uniques', () => {
    expect(new Set(BONUS.map((b) => b.id)).size).toBe(BONUS.length);
    for (const b of BONUS) expect(b.cost).toBeGreaterThan(0);
  });
});

describe('niveaux', () => {
  it('démarre à Explorateur', () => {
    const l = levelStatus(fresh());
    expect(l.level.id).toBe(1);
    expect(l.missing.length).toBeGreaterThan(0);
  });
  it('les crédits seuls ne suffisent pas : il faut aussi des modules validés', () => {
    // 150 crédits via quiz ne valident aucun module : on reste Explorateur.
    const quizzes = Object.fromEntries(['quiz-m1', 'quiz-m2', 'quiz-m3', 'quiz-m4', 'quiz-m5', 'quiz-m6', 'quiz-m7'].map((id) => [id, q(10, 10)]));
    const s = applyRewards({ ...fresh(), quizzes }).state;
    expect(totalEarned(s)).toBeGreaterThanOrEqual(100);
    expect(levelStatus(s).level.id).toBe(1);
    expect(levelStatus(s).missing.join(' ')).toMatch(/module/);
  });
  it('passe Apprenti avec 100 crédits et un module validé', () => {
    const completed = Object.fromEntries(lessonsOfModule('m1').map((l) => [l.id, 'x']));
    const checks = Object.fromEntries(lessonsOfModule('m1').map((l) => [`check-${l.id}`, q(3, 3)]));
    const s = applyRewards({ ...fresh(), completed, quizzes: { ...checks, 'quiz-m1': q(10, 10) } }).state;
    expect(validatedModules(s)).toEqual(['m1']);
    expect(totalEarned(s)).toBe(lessonsOfModule('m1').length * 10 + 20 + 30); // leçons + quiz (80 % et 100 %) + module
    expect(levelStatus(s).level.id).toBe(totalEarned(s) >= 100 ? 2 : 1);
    // Sans module validé, les mêmes crédits ne suffisent pas.
    const noModule = applyRewards({ ...fresh(), quizzes: { 'quiz-glossaire': q(30, 30), 'quiz-exercices': q(8, 8), 'quiz-m2': q(10, 10), 'quiz-m3': q(10, 10), 'quiz-m4': q(10, 10), 'quiz-m5': q(10, 10) } }).state;
    expect(totalEarned(noModule)).toBeGreaterThanOrEqual(100);
    expect(levelStatus(noModule).level.id).toBe(1);
  });
  it('le niveau maximal demande le projet final et le quiz des 50 notions', () => {
    const l5 = LEVELS[4];
    expect(l5.requires).toMatchObject({ modulesValidated: 8, projectSteps: 8, glossaryQuiz: true });
  });
});

describe('compétences et notions à revoir', () => {
  it('ne prétend rien sans données : « à découvrir »', () => {
    for (const m of moduleSkills(fresh())) expect(m.status).toBe('a-decouvrir');
  });
  it('« en cours » dès qu’une leçon est terminée, « à renforcer » après un contrôle raté, « validée » seulement avec le quiz', () => {
    const first = lessonsOfModule('m1')[0];
    expect(moduleSkills({ ...fresh(), completed: { [first.id]: 'x' } })[0].status).toBe('en-cours');
    expect(moduleSkills({ ...fresh(), quizzes: { [`check-${first.id}`]: q(1, 4) } })[0].status).toBe('a-renforcer');
    const completed = Object.fromEntries(lessonsOfModule('m1').map((l) => [l.id, 'x']));
    expect(moduleSkills({ ...fresh(), completed })[0].status).toBe('en-cours');
    expect(moduleSkills({ ...fresh(), completed, quizzes: { 'quiz-m1': q(9, 10) } })[0].status).toBe('validee');
    expect(moduleSkills({ ...fresh(), completed, quizzes: { 'quiz-m1': q(5, 10) } })[0].status).toBe('a-renforcer');
  });
  it('relève les leçons liées aux dernières questions manquées', () => {
    const qid = L.checkQuestions[0].id;
    expect(weakLessons({ ...fresh(), qstats: { [qid]: { right: 0, wrong: 1, last: false } } })).toEqual([{ lessonId: L.id, missed: 1 }]);
    expect(weakLessons({ ...fresh(), qstats: { [qid]: { right: 1, wrong: 1, last: true } } })).toEqual([]);
  });
  it('recommande la prochaine leçon non terminée', () => {
    expect(recommendNext(fresh())?.id).toBe(LESSONS[0].id);
    expect(recommendNext({ ...fresh(), lastLesson: LESSONS[2].id, completed: { [LESSONS[2].id]: 'x' } })?.id).toBe(LESSONS[3].id);
    expect(recommendNext({ ...fresh(), completed: Object.fromEntries(LESSONS.map((l) => [l.id, 'x'])) })).toBeNull();
  });
});

describe('code de sauvegarde', () => {
  it('restaure fidèlement la progression, crédits compris', async () => {
    const s = applyRewards({ ...fresh(), completed: { [L.id]: 'x' }, quizzes: { 'quiz-m1': q(10, 10), [`check-${L.id}`]: q(3, 3) }, goals: [{ id: 'g1', text: 'Finir le module 3', done: false }] }).state;
    const code = await encodeSave(s);
    expect(code).toMatch(/^NL[12]:[A-Za-z0-9_-]+$/);
    const back = await decodeSave(code);
    expect(back).toEqual(s);
    expect(back && totalEarned(back)).toBe(30);
  });
  it('tolère les espaces et retours à la ligne ajoutés en copiant', async () => {
    const code = await encodeSave(fresh());
    expect(await decodeSave(`  ${code.slice(0, 10)}\n${code.slice(10)} `)).not.toBeNull();
  });
  it('rejette un code invalide ou tronqué', async () => {
    expect(await decodeSave('')).toBeNull();
    expect(await decodeSave('blabla')).toBeNull();
    expect(await decodeSave('NL1:%%%')).toBeNull();
    const code = await encodeSave(fresh());
    expect(await decodeSave(code.slice(0, 12))).toBeNull();
  });
});
