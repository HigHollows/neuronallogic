import { describe, expect, it } from 'vitest';
import { DOCS } from '../src/content/docs';
import { EXTRA_TERMS, GROUPS, TERMS, termById } from '../src/content/glossary';
import { DIAGRAM_IDS } from '../src/components/diagrams';
import { LESSONS, MODULES, QUIZZES, VIDEOS, lessonById, lessonPlainText, lessonReadingMinutes, lessonsOfModule, moduleById, videoById } from '../src/content';
import { MANUAL_MAP } from '../src/content/manualMap';
import { PROJECT_STEPS } from '../src/content/project';
import corrections from '../src/content/corrections.json';
import videoSources from '../src/content/videos.source.json';
import { tokenize } from '../src/lib/rich';
import type { Block, Question } from '../src/content/types';

const allQuestions: Question[] = QUIZZES.flatMap((q) => q.questions);
const lessonQuestions: Question[] = LESSONS.flatMap((l) => l.checkQuestions);

function blocksText(bs: Block[]): string[] {
  return bs.flatMap((b) => {
    switch (b.type) {
      case 'p': return [b.text];
      case 'ul': case 'ol': return b.items;
      case 'table': return b.rows.flat();
      case 'callout': return [b.text];
      default: return [];
    }
  });
}

describe('structure du cours', () => {
  it('a 9 modules (8 fondamentaux + 1 expert) et au moins 45 leçons, toutes rattachées à un module existant', () => {
    expect(MODULES).toHaveLength(9);
    expect(LESSONS.length).toBeGreaterThanOrEqual(45);
    for (const l of LESSONS) expect(moduleById.has(l.moduleId), l.id).toBe(true);
    for (const m of MODULES) expect(lessonsOfModule(m.id).length, m.id).toBeGreaterThan(0);
  });

  it('a des identifiants de leçons uniques', () => {
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
  });

  it.each(LESSONS.map((l) => [l.id, l] as const))('leçon %s : aucune section vide', (_id, l) => {
    expect(l.title.length).toBeGreaterThan(5);
    expect(l.objective.length).toBeGreaterThan(20);
    expect(l.simple.length).toBeGreaterThan(0);
    expect(l.technical.length).toBeGreaterThan(0);
    expect(l.example.blocks.length).toBeGreaterThan(0);
    expect(l.misconceptions.length).toBeGreaterThanOrEqual(2);
    expect(l.realWorld.length).toBeGreaterThan(40);
    expect(l.summary.length).toBeGreaterThanOrEqual(3);
    expect(l.checkQuestions.length).toBeGreaterThanOrEqual(3);
    expect(l.checkQuestions.length).toBeLessThanOrEqual(5);
    expect(lessonPlainText(l).split(/\s+/).length).toBeGreaterThan(200);
    expect(lessonReadingMinutes(l)).toBeGreaterThanOrEqual(1);
  });

  it('référence uniquement des prérequis, leçons, notions, vidéos et docs qui existent', () => {
    const docIds = new Set(DOCS.map((d) => d.id));
    for (const l of LESSONS) {
      for (const p of l.prerequisites ?? []) expect(lessonById.has(p), `${l.id} prérequis ${p}`).toBe(true);
      for (const r of l.related.lessons ?? []) expect(lessonById.has(r), `${l.id} lié ${r}`).toBe(true);
      for (const t of l.related.terms ?? []) expect(termById.has(t), `${l.id} notion ${t}`).toBe(true);
      for (const v of l.videoIds ?? []) expect(videoById.has(v), `${l.id} vidéo ${v}`).toBe(true);
      for (const d of l.docIds ?? []) expect(docIds.has(d), `${l.id} doc ${d}`).toBe(true);
      for (const t of l.glossarySet ?? []) expect(termById.has(t), `${l.id} fiche ${t}`).toBe(true);
      for (const d of [l.diagram, ...(l.extraDiagrams ?? [])]) {
        if (!d) continue;
        expect(DIAGRAM_IDS).toContain(d.id);
        expect(d.explanation.length, `${l.id} schéma sans explication`).toBeGreaterThan(60);
      }
    }
  });

  it('ne contient aucune référence [[notion]] cassée', () => {
    for (const l of LESSONS) {
      const texts = [...l.simple, ...blocksText(l.technical), ...blocksText(l.example.blocks)];
      for (const t of texts)
        for (const tk of tokenize(t)) if (tk.t === 'term') expect(termById.has(tk.id), `${l.id} → [[${tk.id}]]`).toBe(true);
    }
  });

  it('utilise tous les schémas déclarés au moins une fois', () => {
    const used = new Set(LESSONS.flatMap((l) => [l.diagram?.id, ...(l.extraDiagrams ?? []).map((d) => d.id)]).filter(Boolean));
    for (const id of DIAGRAM_IDS) expect(used.has(id), `schéma inutilisé : ${id}`).toBe(true);
  });
});

describe('glossaire des 50 notions', () => {
  it('contient exactement 50 notions numérotées de 1 à 50, sans trou ni doublon', () => {
    expect(TERMS).toHaveLength(50);
    expect(TERMS.map((t) => t.n)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
    expect(new Set(TERMS.map((t) => t.id)).size).toBe(50);
  });

  it.each(TERMS.map((t) => [t.id, t] as const))('fiche %s complète et bien reliée', (_id, t) => {
    expect(t.definition.length).toBeGreaterThan(20);
    expect(t.explanation.length).toBeGreaterThan(40);
    expect(t.example.length).toBeGreaterThan(15);
    expect(t.mistake.length).toBeGreaterThan(20);
    expect(t.related.length).toBeGreaterThanOrEqual(2);
    for (const r of t.related) expect(termById.has(r), `${t.id} → ${r}`).toBe(true);
    expect(lessonById.has(t.lessonId), `${t.id} leçon ${t.lessonId}`).toBe(true);
    expect(GROUPS.some((g) => g.id === t.group)).toBe(true);
    if (t.analogy) expect(t.analogy.limit.length, `${t.id} analogie sans limite`).toBeGreaterThan(10);
  });

  it('couvre 10 notions par série de leçons n-01 à n-05', () => {
    for (const g of GROUPS) {
      const lesson = lessonById.get(g.lessonId)!;
      expect(lesson.glossarySet).toHaveLength(10);
      expect(TERMS.filter((t) => t.group === g.id)).toHaveLength(10);
    }
  });

  it('a un glossaire complémentaire sans doublon avec les 50 notions', () => {
    const ids = new Set([...TERMS.map((t) => t.id), ...EXTRA_TERMS.map((t) => t.id)]);
    expect(ids.size).toBe(TERMS.length + EXTRA_TERMS.length);
    expect(EXTRA_TERMS.length).toBeGreaterThanOrEqual(20);
  });
});

describe('questions de quiz', () => {
  it('ont des identifiants uniques (hors réemploi des questions de leçon dans les quiz de module)', () => {
    const ids = [...lessonQuestions.map((q) => q.id), ...QUIZZES.filter((q) => !q.id.startsWith('quiz-m')).flatMap((q) => q.questions.map((x) => x.id))];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(allQuestions.map((q) => [q.id, q] as const))('question %s : cohérente et pédagogique', (_id, q) => {
    expect(q.choices.length).toBeGreaterThanOrEqual(2);
    expect(q.correct.length).toBeGreaterThanOrEqual(1);
    for (const i of q.correct) expect(i).toBeGreaterThanOrEqual(0);
    for (const i of q.correct) expect(i).toBeLessThan(q.choices.length);
    expect(new Set(q.correct).size).toBe(q.correct.length);
    expect(q.type).toBe(q.correct.length > 1 ? 'multiple' : 'single');
    expect(q.explanation.length).toBeGreaterThan(8);
    // Les distracteurs doivent enseigner quelque chose : chaque mauvais choix explique son erreur.
    q.choices.forEach((c, i) => {
      if (!q.correct.includes(i)) expect(c.feedback?.length ?? 0, `${q.id} choix ${i} sans explication`).toBeGreaterThan(8);
    });
    // Ni doublons de réponses, ni question « tout est vrai ».
    expect(new Set(q.choices.map((c) => c.text)).size).toBe(q.choices.length);
    if (q.type === 'single') expect(q.correct.length).toBe(1);
    expect(q.correct.length).toBeLessThan(q.choices.length);
  });

  it('ne place pas systématiquement la bonne réponse au même rang', () => {
    const singles = allQuestions.filter((q) => q.type === 'single');
    const counts = [0, 1, 2].map((i) => singles.filter((q) => q.correct[0] === i).length);
    for (const c of counts) expect(c / singles.length).toBeGreaterThan(0.12);
  });

  it('fournit un quiz par module, un quiz des 50 notions et des exercices', () => {
    for (const m of MODULES) expect(QUIZZES.find((q) => q.id === `quiz-${m.id}`)?.questions.length).toBeGreaterThanOrEqual(5);
    expect(QUIZZES.find((q) => q.id === 'quiz-glossaire')?.questions.length).toBeGreaterThanOrEqual(25);
    expect(QUIZZES.find((q) => q.id === 'quiz-exercices')?.questions.length).toBeGreaterThanOrEqual(6);
  });

  it('lie les questions à des leçons et notions existantes', () => {
    for (const q of allQuestions) {
      if (q.lessonId) expect(lessonById.has(q.lessonId), q.id).toBe(true);
      if (q.termId) expect(termById.has(q.termId), q.id).toBe(true);
    }
  });
});

describe('ressources', () => {
  it('liste uniquement des vidéos vérifiées (métadonnées présentes, ids sans doublon)', () => {
    expect(VIDEOS.length).toBe(videoSources.length);
    expect(new Set(VIDEOS.map((v) => v.id)).size).toBe(VIDEOS.length);
    for (const v of VIDEOS) {
      expect(v.id).toMatch(/^[\w-]{11}$/);
      expect(v.title.length, v.id).toBeGreaterThan(3);
      expect(v.channel.length, v.id).toBeGreaterThan(1);
      expect(v.seconds, v.id).toBeGreaterThan(0);
      expect(v.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const l of v.lessonIds) expect(lessonById.has(l), `${v.id} → ${l}`).toBe(true);
    }
  });

  it('inclut les deux vidéos du manuel', () => {
    expect(videoById.get('aircAruvnKk')?.channel).toBe('3Blue1Brown');
    expect(videoById.get('kCc8FmEb1nY')?.channel).toBe('Andrej Karpathy');
  });

  it('a des documentations en https, uniques, rattachées à des leçons existantes', () => {
    expect(new Set(DOCS.map((d) => d.id)).size).toBe(DOCS.length);
    expect(new Set(DOCS.map((d) => d.url)).size).toBe(DOCS.length);
    for (const d of DOCS) {
      expect(d.url, d.id).toMatch(/^https:\/\//);
      expect(d.verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const l of d.lessonIds) expect(lessonById.has(l), `${d.id} → ${l}`).toBe(true);
    }
  });

  it('ne dépend d’aucun service payant pour être consulté (pas de lien d’achat)', () => {
    const urls = DOCS.map((d) => d.url).join(' ');
    expect(urls).not.toMatch(/pricing|checkout|subscribe|buy/i);
  });

  it('chaque thème (module) propose au moins une ressource', () => {
    for (const m of MODULES) {
      const ids = new Set(lessonsOfModule(m.id).map((l) => l.id));
      const n = [...VIDEOS, ...DOCS].filter((r) => r.lessonIds.some((l) => ids.has(l))).length;
      expect(n, m.id).toBeGreaterThan(0);
    }
  });
});

describe('fidélité au manuel', () => {
  it('relie les 50 chapitres du manuel à un contenu existant', () => {
    expect(MANUAL_MAP.map((m) => m.chapter)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
    const routes = ['/exercices', '/projet-final', '/ressources', '/revision', '/notions', '/progression'];
    for (const m of MANUAL_MAP) {
      expect(m.targets.length).toBeGreaterThan(0);
      for (const t of m.targets) {
        if (t.startsWith('lesson:')) expect(lessonById.has(t.slice(7)), `chapitre ${m.chapter} → ${t}`).toBe(true);
        else expect(routes, `chapitre ${m.chapter} → ${t}`).toContain(t.slice(6));
      }
    }
  });

  it('a une étape de projet final complète', () => {
    expect(PROJECT_STEPS.length).toBeGreaterThanOrEqual(6);
    for (const s of PROJECT_STEPS) {
      expect(s.checks.length).toBeGreaterThan(0);
      expect(s.deliverable.length).toBeGreaterThan(5);
    }
  });

  it('documente chaque correction (passage, problème, correction, justification)', () => {
    expect(corrections.items.length).toBeGreaterThanOrEqual(15);
    for (const i of corrections.items) {
      expect(Object.keys(corrections.types)).toContain(i.type);
      for (const k of ['passage', 'problem', 'correction', 'justification'] as const) expect(i[k].length, `${i.id}.${k}`).toBeGreaterThan(10);
    }
  });

  it('propose un contenu 100 % gratuit : aucun mot-clé de monétisation dans les textes pédagogiques', () => {
    const text = LESSONS.map(lessonPlainText).join(' ').toLowerCase();
    for (const w of ['abonnement premium', 'acheter', 'tarif premium', 'freemium', 'paiement requis']) expect(text.includes(w), w).toBe(false);
  });
});
