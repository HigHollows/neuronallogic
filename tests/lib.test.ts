import { beforeEach, describe, expect, it } from 'vitest';
import { actions, getState, parseState, reloadState, STORAGE_KEY } from '../src/lib/progress';
import { isCorrect, scoreQuiz, verdict } from '../src/lib/quiz';
import { stripRich, tokenize } from '../src/lib/rich';
import { queryTerms, search, type IndexEntry } from '../src/lib/search';
import { countWords, formatDuration, normalize, readingMinutes } from '../src/lib/text';
import { buildIndex } from '../src/content/searchIndex';
import type { Question } from '../src/content/types';

describe('lib/text', () => {
  it('normalise accents, casse et ligatures', () => {
    expect(normalize('Réseau de NEURONES — œuvre')).toBe('reseau de neurones oeuvre');
  });
  it('estime le temps de lecture avec un minimum d’une minute', () => {
    expect(readingMinutes(10)).toBe(1);
    expect(readingMinutes(1900)).toBe(10);
    expect(countWords('un  deux\ntrois')).toBe(3);
  });
  it('formate les durées', () => {
    expect(formatDuration(1120)).toBe('18 min');
    expect(formatDuration(6980)).toBe('1 h 56 min');
    expect(formatDuration(45)).toBe('45 s');
    expect(formatDuration(null)).toBe('durée inconnue');
  });
});

describe('lib/quiz', () => {
  const mk = (id: string, correct: number[], n: number): Question => ({
    id, type: correct.length > 1 ? 'multiple' : 'single', prompt: 'Q ?', explanation: 'x', correct,
    choices: Array.from({ length: n }, (_, i) => ({ text: 'c' + i })),
  });
  const single = mk('t1', [1], 3);
  const multi = mk('t2', [0, 2], 4);

  it('corrige une question à réponse unique', () => {
    expect(single.type).toBe('single');
    expect(isCorrect(single, [1])).toBe(true);
    expect(isCorrect(single, [0])).toBe(false);
    expect(isCorrect(single, [])).toBe(false);
  });
  it('exige toutes les bonnes réponses et aucune mauvaise pour un choix multiple', () => {
    expect(multi.type).toBe('multiple');
    expect(isCorrect(multi, [2, 0])).toBe(true);
    expect(isCorrect(multi, [0])).toBe(false);
    expect(isCorrect(multi, [0, 2, 3])).toBe(false);
  });
  it('calcule le score, le pourcentage et les questions ratées', () => {
    const s = scoreQuiz([single, multi], { t1: [1], t2: [0] });
    expect(s).toEqual({ correct: 1, total: 2, percent: 50, missed: ['t2'] });
    expect(scoreQuiz([single, multi], {}).correct).toBe(0);
    expect(scoreQuiz([], {}).percent).toBe(0);
    expect(scoreQuiz([single, multi], { t1: [1], t2: [0, 2] }).percent).toBe(100);
  });
  it('donne un message selon le score', () => {
    expect(verdict(95)).toMatch(/Excellent/);
    expect(verdict(30)).toMatch(/consolider/);
  });
});

describe('lib/rich', () => {
  it('découpe le mini-format', () => {
    const t = tokenize('Un **mot** et *nuance* avec `code`, [[token]] et [lien](https://exemple.org/x).');
    expect(t.map((x) => x.t)).toEqual(['text', 'bold', 'text', 'em', 'text', 'code', 'text', 'term', 'text', 'link', 'text']);
  });
  it('n’interprète pas le HTML ni les liens non http(s)', () => {
    const t = tokenize('<script>alert(1)</script> [x](javascript:alert(1))');
    expect(t.every((x) => x.t === 'text')).toBe(true);
  });
  it('produit un texte brut pour la recherche', () => {
    expect(stripRich('**gras** [[token]]', () => 'Token')).toBe('gras Token');
  });
});

describe('lib/progress', () => {
  beforeEach(() => {
    localStorage.clear();
    reloadState();
  });

  it('démarre vide', () => {
    expect(getState().completed).toEqual({});
    expect(getState().lastLesson).toBeNull();
  });

  it('marque une leçon terminée, la persiste et la restaure après « actualisation »', () => {
    actions.toggleLesson('l-ia');
    actions.setLesson('l-reseau');
    expect(Object.keys(getState().completed)).toEqual(['l-ia']);
    const raw = localStorage.getItem(STORAGE_KEY)!;
    expect(JSON.parse(raw).completed['l-ia']).toBeTruthy();
    reloadState(); // simule un rechargement de page
    expect(getState().completed['l-ia']).toBeTruthy();
    expect(getState().lastLesson).toBe('l-reseau');
  });

  it('peut annuler une leçon terminée', () => {
    actions.toggleLesson('l-ia');
    actions.toggleLesson('l-ia');
    expect(getState().completed['l-ia']).toBeUndefined();
  });

  it('conserve le meilleur score, le dernier et le nombre de tentatives', () => {
    actions.recordQuiz('quiz-m1', 7, 10);
    actions.recordQuiz('quiz-m1', 4, 10);
    const r = getState().quizzes['quiz-m1'];
    expect(r).toMatchObject({ best: 7, last: 4, total: 10, attempts: 2 });
    actions.resetQuiz('quiz-m1');
    expect(getState().quizzes['quiz-m1']).toBeUndefined();
  });

  it('ignore un stockage corrompu sans planter', () => {
    localStorage.setItem(STORAGE_KEY, '{pas du json');
    reloadState();
    expect(getState().completed).toEqual({});
    expect(parseState('[1,2]').completed).toEqual({});
    expect(parseState(JSON.stringify({ completed: { a: 3, b: '2026-01-01' }, quizzes: { x: { best: 'z' } }, theme: 'rose' }))).toMatchObject({
      completed: { b: '2026-01-01' },
      quizzes: {},
      theme: null,
    });
  });

  it('exporte et importe une sauvegarde, et refuse un fichier invalide', () => {
    actions.toggleLesson('l-llm');
    const json = actions.exportJson();
    actions.resetAll();
    expect(getState().completed).toEqual({});
    expect(actions.importJson(json)).toBe(true);
    expect(getState().completed['l-llm']).toBeTruthy();
    expect(actions.importJson('n’importe quoi')).toBe(false);
    expect(actions.importJson('{"version":3}')).toBe(false);
  });

  it('garde le thème lors d’une réinitialisation', () => {
    actions.setTheme('dark');
    actions.toggleLesson('l-ia');
    actions.resetAll();
    expect(getState().theme).toBe('dark');
    expect(getState().completed).toEqual({});
  });
});

describe('lib/search', () => {
  const idx: IndexEntry[] = [
    { id: 'a', kind: 'notion', title: 'Fenêtre de contexte', subtitle: '', body: 'Quantité maximale de tokens', to: '/a', keywords: ['Context window'] },
    { id: 'b', kind: 'lecon', title: 'Le RAG', subtitle: '', body: 'Génération augmentée par récupération avec des embeddings', to: '/b' },
    { id: 'c', kind: 'lecon', title: 'Embeddings', subtitle: '', body: 'Représentation numérique', to: '/c' },
  ];
  it('ignore accents et casse', () => {
    expect(search(idx, 'FENETRE').map((r) => r.entry.id)).toEqual(['a']);
    expect(search(idx, 'recuperation').map((r) => r.entry.id)).toEqual(['b']);
  });
  it('trouve par mot-clé anglais', () => {
    expect(search(idx, 'context window')[0].entry.id).toBe('a');
  });
  it('classe les titres avant les corps de texte', () => {
    expect(search(idx, 'embeddings').map((r) => r.entry.id)).toEqual(['c', 'b']);
  });
  it('exige tous les mots de la requête', () => {
    expect(search(idx, 'rag banane')).toEqual([]);
  });
  it('gère les requêtes vides ou composées de mots vides', () => {
    expect(search(idx, '   ')).toEqual([]);
    expect(queryTerms('le de la')).toEqual([]);
  });
  it('fournit un extrait autour du terme trouvé', () => {
    expect(search(idx, 'tokens')[0].snippet).toContain('tokens');
  });
});

describe('recherche sur le vrai contenu', () => {
  const index = buildIndex();
  it('retrouve des notions, leçons, ressources et vidéos', () => {
    expect(search(index, 'injection de prompt')[0].entry.title.toLowerCase()).toContain('injection');
    expect(search(index, 'chunking').some((r) => r.entry.kind === 'notion')).toBe(true);
    expect(search(index, 'MCP').some((r) => r.entry.kind === 'lecon')).toBe(true);
    expect(search(index, '3Blue1Brown').some((r) => r.entry.kind === 'video')).toBe(true);
    expect(search(index, 'documentation officielle').some((r) => r.entry.kind === 'ressource')).toBe(true);
  });
  it('trouve par définition (« tokens » dans la fenêtre de contexte)', () => {
    expect(search(index, 'quantité maximale tokens').some((r) => r.entry.id === 'fenetre-de-contexte')).toBe(true);
  });
  it('ne renvoie rien pour une requête absurde', () => {
    expect(search(index, 'zzzzqqqq')).toEqual([]);
  });
});
