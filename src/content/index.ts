import type { Block, Lesson, Level, Module, Question, Quiz, Video } from './types';
import { MODULES, moduleById } from './modules';
import { M1 } from './lessons/m1';
import { M2 } from './lessons/m2';
import { M3 } from './lessons/m3';
import { M4 } from './lessons/m4';
import { M5 } from './lessons/m5';
import { M6 } from './lessons/m6';
import { M7 } from './lessons/m7';
import { M8 } from './lessons/m8';
import { M9 } from './lessons/m9';
import { EXTRA_DEBUTANT } from './lessons/extra-debutant';
import { EXTRA_INTERMEDIAIRE } from './lessons/extra-intermediaire';
import { TERMS, termById } from './glossary';
import { GLOSSARY_QUIZ, MODULE_EXTRA, EXERCISES } from './quizzes';
import videosJson from './videos.json';
import { stripRich } from '../lib/rich';
import { countWords, readingMinutes } from '../lib/text';

/**
 * Toutes les leçons, dans l'ordre du parcours : les leçons de base de chaque module, puis les leçons complémentaires
 * (débutant, intermédiaire) insérées juste après la leçon indiquée par `after` (ou à la fin du module), puis le module expert.
 */
function buildLessons(): Lesson[] {
  const out: Lesson[] = [...M1, ...M2, ...M3, ...M4, ...M5, ...M6, ...M7, ...M8];
  const pending = [...EXTRA_DEBUTANT, ...EXTRA_INTERMEDIAIRE];
  // Plusieurs passes : une leçon complémentaire peut se placer après une autre leçon complémentaire.
  for (let pass = 0; pass < 4 && pending.length; pass++) {
    for (const l of [...pending]) {
      let i: number;
      if (l.after) {
        const target = out.findIndex((x) => x.id === l.after);
        if (target < 0) continue;
        i = target + 1;
        while (i < out.length && out[i].after === l.after) i++;
      } else {
        i = out.map((x) => x.moduleId).lastIndexOf(l.moduleId) + 1;
      }
      out.splice(i, 0, l);
      pending.splice(pending.indexOf(l), 1);
    }
  }
  if (pending.length) throw new Error('Leçons complémentaires sans cible : ' + pending.map((l) => l.id + ' → ' + l.after).join(', '));
  return [...out, ...M9];
}
export const LESSONS: Lesson[] = buildLessons();

export function lessonLevel(l: Lesson): Level {
  return l.level ?? moduleById.get(l.moduleId)!.level;
}

export const lessonById = new Map(LESSONS.map((l) => [l.id, l]));
export const VIDEOS = videosJson as Video[];
export const videoById = new Map(VIDEOS.map((v) => [v.id, v]));

export function lessonsOfModule(moduleId: string): Lesson[] {
  return LESSONS.filter((l) => l.moduleId === moduleId);
}

export function neighbours(lessonId: string): { prev: Lesson | null; next: Lesson | null } {
  const i = LESSONS.findIndex((l) => l.id === lessonId);
  if (i < 0) return { prev: null, next: null };
  return { prev: LESSONS[i - 1] ?? null, next: LESSONS[i + 1] ?? null };
}

export const termLabel = (id: string): string => termById.get(id)?.fr ?? id;

function blockText(b: Block): string {
  switch (b.type) {
    case 'p':
      return stripRich(b.text, termLabel);
    case 'ul':
    case 'ol':
      return b.items.map((i) => stripRich(i, termLabel)).join(' ');
    case 'table':
      return [...b.head, ...b.rows.flat()].map((c) => stripRich(c, termLabel)).join(' ');
    case 'code':
      return b.text;
    case 'callout':
      return `${b.title ?? ''} ${stripRich(b.text, termLabel)}`;
    case 'beforeAfter':
      return `${b.before} ${b.after} ${b.why.join(' ')}`;
  }
}

/** Texte intégral d'une leçon, hors questions : pour la recherche et le calcul du temps de lecture. */
export function lessonPlainText(l: Lesson): string {
  const parts: string[] = [l.title, l.objective];
  parts.push(...l.simple.map((s) => stripRich(s, termLabel)));
  parts.push(...l.technical.map(blockText));
  parts.push(l.example.title, ...l.example.blocks.map(blockText));
  if (l.diagram) parts.push(l.diagram.title, l.diagram.explanation);
  parts.push(...l.misconceptions.flatMap((m) => [m.myth, m.reality]));
  parts.push(l.realWorld, ...l.summary);
  if (l.glossarySet) {
    for (const id of l.glossarySet) {
      const t = termById.get(id);
      if (t) parts.push(t.fr, t.definition, t.explanation, t.example, t.mistake);
    }
  }
  return parts.join(' \n');
}

export function lessonWordCount(l: Lesson): number {
  return countWords(lessonPlainText(l));
}

/** Temps de lecture estimé (minutes), calculé sur le texte réel de la leçon. */
export function lessonReadingMinutes(l: Lesson): number {
  return readingMinutes(lessonWordCount(l));
}

function moduleQuestions(moduleId: string): Question[] {
  return [...lessonsOfModule(moduleId).flatMap((l) => l.checkQuestions), ...(MODULE_EXTRA[moduleId] ?? [])];
}

export const QUIZZES: Quiz[] = [
  ...MODULES.map<Quiz>((m: Module) => ({
    id: `quiz-${m.id}`,
    title: `Quiz du module ${m.number} — ${m.title}`,
    description: `Questions de fin de module : ${m.objective}`,
    scope: m.id,
    questions: moduleQuestions(m.id),
  })),
  {
    id: 'quiz-glossaire',
    title: 'Quiz récapitulatif des 50 notions',
    description: 'Trente questions qui couvrent les cinq familles de notions du glossaire.',
    scope: 'glossaire',
    questions: GLOSSARY_QUIZ,
  },
  {
    id: 'quiz-exercices',
    title: 'Exercices de mise en situation',
    description: 'RAG ou fine-tuning ? Analyser un appel API, distinguer workflow et agent, repérer une faille de permission.',
    scope: 'exercices',
    questions: EXERCISES,
  },
];

export const quizById = new Map(QUIZZES.map((q) => [q.id, q]));

export function lessonQuizId(moduleId: string): string {
  return `quiz-${moduleId}`;
}

export { MODULES, moduleById, TERMS, termById };
