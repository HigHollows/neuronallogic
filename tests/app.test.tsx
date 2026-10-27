import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { LESSONS, MODULES, QUIZZES, quizById } from '../src/content';
import { TERMS } from '../src/content/glossary';
import { STORAGE_KEY, reloadState } from '../src/lib/progress';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

beforeAll(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  localStorage.clear();
  reloadState();
});

const STATIC_ROUTES = ['/', '/defis', '/bonus', '/parcours', '/notions', '/ressources', '/quiz', '/exercices', '/projet-final', '/revision', '/progression', '/recherche?q=rag', '/a-propos', '/corrections'];

describe('navigation', () => {
  it.each(STATIC_ROUTES)('la page %s s’affiche avec un titre de niveau 1', async (path) => {
    renderAt(path);
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('affiche chaque module', async () => {
    for (const m of MODULES) {
      const { unmount } = renderAt(`/module/${m.id}`);
      expect(await screen.findByRole('heading', { level: 1, name: new RegExp(`Module ${m.number}`) })).toBeInTheDocument();
      unmount();
    }
  });

  it('affiche chacune des leçons avec ses sections et la navigation précédente/suivante', async () => {
    for (const [i, l] of LESSONS.entries()) {
      const { unmount, container } = renderAt(`/lecon/${l.id}`);
      expect(await screen.findByRole('heading', { level: 1, name: l.title })).toBeInTheDocument();
      for (const h of ['En clair', 'Explication technique', 'À retenir', 'Vérifie-toi', 'Erreurs et idées reçues']) {
        expect(screen.getByRole('heading', { level: 2, name: h }), `${l.id}: ${h}`).toBeInTheDocument();
      }
      const nav = within(screen.getByRole('navigation', { name: 'Navigation entre leçons' }));
      if (i > 0) expect(nav.getByText(/Leçon précédente/)).toBeInTheDocument();
      expect(nav.getByText(i < LESSONS.length - 1 ? /Leçon suivante/ : /Projet final/)).toBeInTheDocument();
      expect(container.textContent).not.toMatch(/undefined|\[object Object\]|\[\[/);
      unmount();
    }
  });

  it('affiche les 50 fiches de notions', async () => {
    for (const t of TERMS) {
      const { unmount } = renderAt(`/notions/${t.id}`);
      expect(await screen.findByRole('heading', { level: 1, name: t.fr })).toBeInTheDocument();
      expect(screen.getByText(t.definition)).toBeInTheDocument();
      unmount();
    }
  });

  it.each(['/lecon/inexistante', '/module/zzz', '/notions/zzz', '/quiz/zzz', '/nimporte/quoi'])('affiche une page « introuvable » pour %s', async (path) => {
    renderAt(path);
    expect(await screen.findByRole('heading', { level: 1, name: /introuvable/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Retour à l’accueil/ })).toBeInTheDocument();
  });

  it('contient une navigation latérale avec les 8 modules et un lien d’évitement', async () => {
    renderAt('/');
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByRole('link', { name: 'Aller au contenu' })).toBeInTheDocument();
    const nav = within(screen.getByRole('navigation', { name: 'Modules et leçons' }));
    expect(nav.getAllByRole('group', { hidden: true }).length >= 0).toBe(true);
    for (const m of MODULES) expect(nav.getByText(new RegExp(`${m.number}\\. ${m.title}`))).toBeInTheDocument();
  });
});

describe('progression', () => {
  it('marque une leçon comme terminée, la sauvegarde et la restaure après rechargement', async () => {
    const user = userEvent.setup();
    const first = LESSONS[0];
    const { unmount } = renderAt(`/lecon/${first.id}`);
    await user.click(await screen.findByRole('button', { name: 'Marquer comme terminée' }));
    expect(await screen.findByRole('button', { name: /Terminée — annuler/ })).toHaveAttribute('aria-pressed', 'true');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).completed[first.id]).toBeTruthy();
    unmount();

    reloadState(); // « actualisation »
    renderAt('/');
    expect(await screen.findByText(/1 leçon terminée sur/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reprendre mon apprentissage' })).toBeInTheDocument();
  });

  it('retient la dernière leçon consultée', async () => {
    const l = LESSONS[3];
    const { unmount } = renderAt(`/lecon/${l.id}`);
    await screen.findByRole('heading', { level: 1, name: l.title });
    unmount();
    reloadState();
    renderAt('/progression');
    expect(await screen.findByText(/Dernière leçon consultée/)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: l.title }).length).toBeGreaterThan(0);
  });

  it('affiche un état vide pour les quiz et permet de cocher l’auto-évaluation', async () => {
    const user = userEvent.setup();
    renderAt('/progression');
    expect(await screen.findByText(/Aucun quiz tenté/)).toBeInTheDocument();
    await user.click(screen.getAllByRole('checkbox')[0]);
    expect(await screen.findByText(/compétences cochées/)).toBeInTheDocument();
    expect(screen.getByText(/0 à 5 : consolide/)).toBeInTheDocument();
  });

  it('explique que la progression est locale', async () => {
    renderAt('/progression');
    expect((await screen.findAllByText(/pas synchronisée/)).length).toBeGreaterThan(0);
  });
});

describe('quiz', () => {
  it('permet de faire un quiz complet, avec corrections immédiates, score exact, sauvegarde et reprise', { timeout: 90000 }, async () => {
    const user = userEvent.setup({ delay: null });
    const quiz = quizById.get('quiz-glossaire')!;
    renderAt(`/quiz/${quiz.id}`);
    await user.click(await screen.findByRole('button', { name: 'Commencer le quiz' }));

    // On répond juste à toutes les questions sauf la première.
    for (const [i, q] of quiz.questions.entries()) {
      expect(await screen.findByText(q.prompt)).toBeInTheDocument();
      const labels = q.choices.map((c) => c.text);
      const wanted = i === 0 ? [q.choices.findIndex((_, idx) => !q.correct.includes(idx))] : q.correct;
      for (const idx of wanted) await user.click(screen.getByLabelText(new RegExp(`^${labels[idx].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)));
      await user.click(screen.getByRole('button', { name: 'Valider ma réponse' }));
      // Correction immédiate avec explication.
      const feedback = (await screen.findByText(i === 0 ? 'Pas tout à fait.' : 'Correct.')).closest('.explain')!;
      expect(feedback).toHaveTextContent(q.explanation);
      await user.click(screen.getByRole('button', { name: i === quiz.questions.length - 1 ? 'Voir mon score' : 'Question suivante' }));
    }

    const total = quiz.questions.length;
    expect(await screen.findByText(new RegExp(`^${total - 1} / ${total}`))).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).quizzes['quiz-glossaire']).toMatchObject({ best: total - 1, last: total - 1, total, attempts: 1 });
    expect(screen.getByRole('heading', { name: 'Correction détaillée' })).toBeInTheDocument();

    // Recommencer remet le quiz à zéro sans effacer le meilleur score.
    await user.click(screen.getByRole('button', { name: 'Recommencer' }));
    expect(await screen.findByText(quiz.questions[0].prompt)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).quizzes['quiz-glossaire'].best).toBe(total - 1);
  });

  it('propose le mode « correction à la fin » : aucune explication avant le score', async () => {
    const user = userEvent.setup();
    const quiz = quizById.get('quiz-m3')!;
    renderAt(`/quiz/${quiz.id}`);
    await user.click(await screen.findByLabelText(/À la fin du quiz/));
    await user.click(screen.getByRole('button', { name: 'Commencer le quiz' }));
    await user.click((await screen.findAllByRole(quiz.questions[0].type === 'single' ? 'radio' : 'checkbox'))[0]);
    expect(screen.queryByText(/Correct\.|Pas tout à fait\./)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Question suivante' }));
    expect(screen.getByText(/Question 2 sur/)).toBeInTheDocument();
  });

  it('garde « Question suivante » inactif tant qu’aucune réponse n’est choisie (mode final)', async () => {
    const user = userEvent.setup();
    renderAt('/quiz/quiz-m1');
    await user.click(await screen.findByLabelText(/À la fin du quiz/));
    await user.click(screen.getByRole('button', { name: 'Commencer le quiz' }));
    expect(await screen.findByRole('button', { name: 'Question suivante' })).toBeDisabled();
  });

  it('liste tous les quiz', async () => {
    renderAt('/quiz');
    await screen.findByRole('heading', { level: 1, name: 'Quiz' });
    for (const q of QUIZZES) expect(screen.getByRole('link', { name: q.title })).toBeInTheDocument();
  });

  it('affiche aussi la vérification de fin de leçon, avec les questions de la leçon', async () => {
    const user = userEvent.setup();
    const l = LESSONS[0];
    renderAt(`/lecon/${l.id}`);
    const section = (await screen.findByRole('heading', { level: 2, name: 'Vérifie-toi' })).closest('section')!;
    expect(within(section).getByText(l.checkQuestions[0].prompt)).toBeInTheDocument();
    await user.click(within(section).getAllByRole('radio')[0]);
    await user.click(within(section).getByRole('button', { name: 'Valider ma réponse' }));
    expect(within(section).getByRole('status')).toBeInTheDocument();
  });
});

describe('glossaire, ressources et recherche', () => {
  it('filtre le glossaire et gère l’absence de résultat', async () => {
    const user = userEvent.setup();
    renderAt('/notions');
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByText(/50 notions sur 50/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Filtrer par mot'), 'chunking');
    expect(screen.getByText(/1 notion sur 50/)).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Filtrer par mot'));
    await user.type(screen.getByLabelText('Filtrer par mot'), 'zzzzqq');
    expect(screen.getByText(/Aucune notion ne correspond/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Réinitialiser les filtres' }));
    expect(screen.getByText(/50 notions sur 50/)).toBeInTheDocument();
  });

  it('filtre les ressources par type, thème et recherche, et présente les vidéos comme externes', async () => {
    const user = userEvent.setup();
    renderAt('/ressources');
    await screen.findByRole('heading', { level: 1, name: /Bibliothèque/ });
    expect(screen.getAllByText('Vidéo YouTube externe').length).toBeGreaterThan(10);
    await user.selectOptions(screen.getByLabelText('Type'), 'video');
    expect(screen.queryAllByText('Documentation', { selector: '.badge' })).toHaveLength(0);
    await user.selectOptions(screen.getByLabelText('Type'), 'all');
    await user.type(screen.getByLabelText('Recherche'), 'MCP');
    expect(screen.getAllByRole('article').length).toBeGreaterThan(2);
    await user.clear(screen.getByLabelText('Recherche'));
    await user.type(screen.getByLabelText('Recherche'), 'zzzzqq');
    expect(screen.getByText(/Aucune ressource ne correspond/)).toBeInTheDocument();
  });

  it('ne charge aucun lecteur YouTube avant un clic explicite', async () => {
    const user = userEvent.setup();
    const { container } = renderAt('/ressources');
    await screen.findByRole('heading', { level: 1, name: /Bibliothèque/ });
    expect(container.querySelector('iframe')).toBeNull();
    await user.click(screen.getAllByRole('button', { name: /Charger le lecteur intégré/ })[0]);
    const frame = container.querySelector('iframe')!;
    expect(frame.getAttribute('src')).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\//);
  });

  it('ouvre tous les liens externes dans un nouvel onglet avec rel=noopener', async () => {
    const { container } = renderAt('/ressources');
    await screen.findByRole('heading', { level: 1, name: /Bibliothèque/ });
    const externals = Array.from(container.querySelectorAll<HTMLAnchorElement>('a[href^="http"]'));
    expect(externals.length).toBeGreaterThan(30);
    for (const a of externals) {
      expect(a.target, a.href).toBe('_blank');
      expect(a.rel).toContain('noopener');
    }
  });

  it('trouve des résultats dans les titres, les définitions et les leçons', async () => {
    renderAt('/recherche?q=injection');
    expect(await screen.findByText(/résultats? pour « injection »/)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Injection de prompt/i }).length).toBeGreaterThan(0);
  });

  it('indique l’absence de résultat', async () => {
    renderAt('/recherche?q=zzzzqqqq');
    expect(await screen.findByText(/Aucun résultat/)).toBeInTheDocument();
  });

  it('lance une recherche depuis la barre latérale', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await screen.findByRole('heading', { level: 1 });
    await user.type(screen.getByLabelText('Rechercher dans le cours'), 'embedding{enter}');
    expect(await screen.findByRole('heading', { level: 1, name: 'Recherche' })).toBeInTheDocument();
    expect(await screen.findByText(/résultats? pour « embedding »/)).toBeInTheDocument();
  });
});

describe('exercices et projet', () => {
  it('calcule le total de la grille d’auto-évaluation et conclut selon le seuil de 6/8', async () => {
    const user = userEvent.setup();
    renderAt('/exercices');
    await screen.findByRole('heading', { level: 1, name: 'Exercices' });
    for (const r of ['exactitude', 'clarte', 'exemple', 'limite']) {
      const radios = document.querySelectorAll<HTMLInputElement>(`input[name="rub-${r}"]`);
      await user.click(radios[2]);
    }
    expect(screen.getByText(/8 \/ 8/)).toBeInTheDocument();
    expect(screen.getByText(/Réussi/)).toBeInTheDocument();
    await user.click(document.querySelectorAll<HTMLInputElement>('input[name="rub-clarte"]')[0]);
    await user.click(document.querySelectorAll<HTMLInputElement>('input[name="rub-exemple"]')[0]);
    expect(screen.getByText(/4 \/ 8/)).toBeInTheDocument();
    expect(screen.getByText(/En dessous de 6\/8/)).toBeInTheDocument();
  });

  it('coche des étapes du projet final et conserve l’avancement', async () => {
    const user = userEvent.setup();
    const { unmount } = renderAt('/projet-final');
    await screen.findByRole('heading', { level: 1 });
    await user.click(screen.getAllByRole('checkbox', { name: 'Étape terminée' })[0]);
    expect(screen.getByText(/1 étape sur 8 terminée/)).toBeInTheDocument();
    unmount();
    reloadState();
    renderAt('/projet-final');
    expect(await screen.findByText(/1 étape sur 8 terminée/)).toBeInTheDocument();
  });

  it('affiche l’exemple de prompt amélioré seulement à la demande', async () => {
    const user = userEvent.setup();
    renderAt('/exercices');
    await screen.findByRole('heading', { level: 1, name: 'Exercices' });
    expect(screen.queryByText(/Construis un plan marketing de 90 jours/)).toBeNull();
    await user.click(screen.getByRole('button', { name: /Voir un exemple de version améliorée/ }));
    expect(screen.getByText(/Construis un plan marketing de 90 jours/)).toBeInTheDocument();
  });
});

describe('gratuité et honnêteté', () => {
  it('n’affiche aucune offre payante, aucun compte requis, et le dit clairement', async () => {
    const { container } = renderAt('/a-propos');
    await screen.findByRole('heading', { level: 1 });
    expect(container.textContent).toMatch(/Aucun compte obligatoire/);
    expect(container.textContent).toMatch(/Aucun achat, abonnement/);
    expect(container.querySelector('form[action*="checkout"], a[href*="pricing"]')).toBeNull();
  });

  it('affiche les corrections apportées au manuel avec passage, problème, correction et justification', async () => {
    renderAt('/corrections');
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getAllByText('Passage concerné').length).toBeGreaterThan(10);
    expect(screen.getAllByText('Justification').length).toBeGreaterThan(10);
  });
});

describe('accessibilité de base', () => {
  const pages = [...STATIC_ROUTES, ...LESSONS.map((l) => `/lecon/${l.id}`), ...MODULES.map((m) => `/module/${m.id}`), '/notions/rag', '/quiz/quiz-m2'];

  it.each(pages)('%s : un seul h1, des repères, des champs étiquetés, des boutons et liens nommés, des id uniques', async (path) => {
    const { container, unmount } = renderAt(path);
    await screen.findByRole('heading', { level: 1 });
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelector('main')).not.toBeNull();
    expect(container.querySelector('nav[aria-label]')).not.toBeNull();
    expect(container.querySelector('html')).toBeNull();

    const fields = container.querySelectorAll<HTMLElement>('input:not([type=hidden]), select, textarea');
    for (const f of fields) {
      const named = f.getAttribute('aria-label') || f.getAttribute('aria-labelledby') || (f.id && container.querySelector(`label[for="${f.id}"]`)) || f.closest('label');
      expect(named, `${path}: champ sans libellé (${f.outerHTML.slice(0, 80)})`).toBeTruthy();
    }
    for (const el of container.querySelectorAll<HTMLElement>('button, a[href]')) {
      const name = (el.getAttribute('aria-label') || el.textContent || '').trim();
      expect(name.length, `${path}: lien ou bouton sans nom (${el.outerHTML.slice(0, 80)})`).toBeGreaterThan(0);
    }
    const ids = Array.from(container.querySelectorAll('[id]')).map((e) => e.id);
    expect(new Set(ids).size, `${path}: identifiants dupliqués`).toBe(ids.length);
    for (const img of container.querySelectorAll('img')) expect(img.getAttribute('alt')).not.toBeNull();
    for (const svg of container.querySelectorAll('svg:not([aria-hidden])')) expect(svg.getAttribute('aria-label') || svg.querySelector('title'), `${path}: svg sans nom`).toBeTruthy();
    // Les titres ne sautent pas de niveau (h1 → h2 → h3…).
    let prev = 1;
    for (const h of container.querySelectorAll('main h1, main h2, main h3, main h4')) {
      const lvl = Number(h.tagName[1]);
      expect(lvl - prev, `${path}: saut de niveau avant « ${h.textContent} »`).toBeLessThanOrEqual(1);
      prev = lvl;
    }
    unmount();
  });
});
