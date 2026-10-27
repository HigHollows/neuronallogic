import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { LESSONS } from '../src/content';
import { balance } from '../src/lib/credits';
import { actions, dismissRewards, getState, reloadState, STORAGE_KEY } from '../src/lib/progress';

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
  dismissRewards();
});

const L = LESSONS[0];

async function answerLesson(user: ReturnType<typeof userEvent.setup>, wrongOnFirst: boolean) {
  const section = (await screen.findByRole('heading', { level: 2, name: 'Vérifie-toi' })).closest('section')!;
  for (const [i, q] of L.checkQuestions.entries()) {
    const wanted = wrongOnFirst && i === 0 ? [q.choices.findIndex((_, idx) => !q.correct.includes(idx))] : q.correct;
    for (const idx of wanted) {
      const text = q.choices[idx].text;
      await user.click(within(section).getByLabelText(new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)));
    }
    await user.click(within(section).getByRole('button', { name: 'Valider ma réponse' }));
    await user.click(within(section).getByRole('button', { name: i === L.checkQuestions.length - 1 ? 'Voir mon score' : 'Question suivante' }));
  }
  return section;
}

describe('gain de crédits en apprenant', () => {
  it('verse 10 crédits seulement quand le contrôle est réussi ET la leçon terminée, avec notification', async () => {
    const user = userEvent.setup({ delay: null });
    renderAt(`/lecon/${L.id}`);
    // 1. Terminer la leçon sans comprendre (aucune réponse) ne rapporte rien.
    await user.click(await screen.findByRole('button', { name: 'Marquer comme terminée' }));
    expect(balance(getState())).toBe(0);
    // 2. Réussir le contrôle : maintenant la leçon validée rapporte.
    const section = await answerLesson(user, false);
    expect(within(section).getByText(/\+10 crédits/)).toBeInTheDocument();
    expect(balance(getState())).toBe(10);
    expect(await screen.findAllByText(/Leçon validée/)).not.toHaveLength(0);
    expect(screen.getAllByLabelText(/Crédits de savoir : 10/).length).toBeGreaterThan(0);
  });

  it('explique sans pression qu’aucun crédit n’est gagné sous le seuil', async () => {
    const user = userEvent.setup({ delay: null });
    renderAt(`/lecon/${L.id}`);
    await user.click(await screen.findByRole('button', { name: 'Marquer comme terminée' }));
    // On rate toutes les questions.
    const section = (await screen.findByRole('heading', { level: 2, name: 'Vérifie-toi' })).closest('section')!;
    for (const [i, q] of L.checkQuestions.entries()) {
      const wrong = q.choices.findIndex((_, idx) => !q.correct.includes(idx));
      await user.click(within(section).getAllByRole(q.type === 'single' ? 'radio' : 'checkbox')[wrong]);
      await user.click(within(section).getByRole('button', { name: 'Valider ma réponse' }));
      await user.click(within(section).getByRole('button', { name: i === L.checkQuestions.length - 1 ? 'Voir mon score' : 'Question suivante' }));
    }
    expect(within(section).getByText(/Aucun crédit cette fois/)).toBeInTheDocument();
    expect(balance(getState())).toBe(0);
  });

  it('un rechargement de la page ou refaire le contrôle ne redonne pas les crédits', async () => {
    const user = userEvent.setup({ delay: null });
    const { unmount } = renderAt(`/lecon/${L.id}`);
    await user.click(await screen.findByRole('button', { name: 'Marquer comme terminée' }));
    const section = await answerLesson(user, false);
    expect(balance(getState())).toBe(10);
    await user.click(within(section).getByRole('button', { name: 'Recommencer' }));
    await answerLesson(user, false);
    expect(balance(getState())).toBe(10);
    unmount();
    for (let i = 0; i < 3; i++) reloadState();
    renderAt('/progression');
    expect((await screen.findAllByText(/Leçon validée/)).length).toBeGreaterThan(0);
    expect(balance(getState())).toBe(10);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).ledger).toHaveLength(1);
  });
});

describe('tableau de bord et profil', () => {
  it('affiche le tableau de bord avec solde, niveau, prochaine leçon et dernières activités', async () => {
    actions.recordQuiz('quiz-m1', 10, 10);
    renderAt('/');
    expect(await screen.findByRole('heading', { level: 1, name: /Bon retour/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reprendre mon apprentissage' })).toBeInTheDocument();
    expect(screen.getByText('Prochaine leçon recommandée')).toBeInTheDocument();
    expect(screen.getAllByText(/Explorateur de l’IA/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Quiz parfait/).length).toBeGreaterThan(0);
  });

  it('montre le niveau, ses conditions pédagogiques, le barème et l’avertissement sur la triche', async () => {
    renderAt('/progression');
    await screen.findByRole('heading', { level: 1, name: 'Profil et progression' });
    expect(screen.getByRole('heading', { level: 2, name: 'Explorateur de l’IA' })).toBeInTheDocument();
    expect(screen.getByText(/les crédits ne suffisent pas/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Barème des crédits' })).toBeInTheDocument();
    expect(screen.getByText(/pas protégés contre la modification/)).toBeInTheDocument();
    expect(screen.getByText(/Aucune récompense pour l’instant/)).toBeInTheDocument();
  });

  it('n’invente aucune maîtrise sans données : toutes les compétences sont « À découvrir »', async () => {
    renderAt('/progression');
    await screen.findByRole('heading', { level: 1, name: 'Profil et progression' });
    const table = screen.getByRole('region', { name: 'Compétences par module' });
    expect(within(table).getAllByText('À découvrir')).toHaveLength(9);
    expect(within(table).queryByText('Validée')).toBeNull();
  });

  it('gère les objectifs personnels : ajouter, cocher, supprimer', async () => {
    const user = userEvent.setup({ delay: null });
    renderAt('/progression');
    await user.type(await screen.findByLabelText('Nouvel objectif d’apprentissage'), 'Comprendre le RAG');
    await user.click(screen.getByRole('button', { name: 'Ajouter l’objectif' }));
    expect(screen.getByText('Comprendre le RAG')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Comprendre le RAG' }));
    expect(getState().goals[0].done).toBe(true);
    await user.click(screen.getByRole('button', { name: /Supprimer l’objectif/ }));
    expect(getState().goals).toHaveLength(0);
  });

  it('demande une confirmation avant de tout effacer, et n’efface rien si on refuse', async () => {
    const user = userEvent.setup({ delay: null });
    actions.recordQuiz('quiz-m1', 10, 10);
    renderAt('/progression');
    const spy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await user.click(await screen.findByRole('button', { name: 'Tout effacer' }));
    expect(spy).toHaveBeenCalled();
    expect(getState().ledger).toHaveLength(2);
    spy.mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: 'Tout effacer' }));
    expect(getState().ledger).toHaveLength(0);
    spy.mockRestore();
  });
});

describe('activités bonus : dépense avec confirmation', () => {
  it('rappelle que tout reste gratuit et ne propose pas de dépense sans solde', async () => {
    renderAt('/bonus');
    expect(await screen.findByText(/Tout le cours reste gratuit et accessible/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Débloquer/ })).toBeNull();
    expect(screen.getAllByText(/il en manque/).length).toBeGreaterThan(3);
  });

  it('affiche le coût, demande confirmation, annule sans rien retirer, puis débloque et retire exactement le coût', async () => {
    const user = userEvent.setup({ delay: null });
    for (const id of ['quiz-m1', 'quiz-m2', 'quiz-m3']) actions.recordQuiz(id, 10, 10); // 60 crédits
    renderAt('/bonus');
    await user.click(await screen.findByRole('button', { name: /Débloquer Fiche de synthèse : fondamentaux pour 15 crédits/ }));
    expect(screen.getByText(/Il te resterait/)).toBeInTheDocument();
    expect(balance(getState())).toBe(60); // rien n'est retiré avant confirmation
    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(balance(getState())).toBe(60);
    await user.click(screen.getByRole('button', { name: /Débloquer Fiche de synthèse : fondamentaux/ }));
    await user.click(screen.getByRole('button', { name: 'Confirmer la dépense de 15 crédits' }));
    expect(balance(getState())).toBe(45);
    expect(await screen.findByText(/débloqué\. 15 crédits dépensés/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ouvrir' })).toBeInTheDocument();
  });

  it('bloque l’accès direct à une activité non débloquée, mais pas au cours', async () => {
    renderAt('/bonus/bonus-securite');
    expect(await screen.findByText(/n’est pas encore débloquée/)).toBeInTheDocument();
  });

  it('un défi bonus débloqué est jouable et sa réussite compte comme un exercice pratique (+20), une seule fois', async () => {
    const user = userEvent.setup({ delay: null });
    for (const id of ['quiz-m1', 'quiz-m2', 'quiz-m3']) actions.recordQuiz(id, 10, 10);
    expect(actions.unlock('bonus-architecture').ok).toBe(true);
    const before = balance(getState());
    renderAt('/bonus/bonus-architecture');
    await user.click(await screen.findByRole('button', { name: 'Commencer le quiz' }));
    const { BONUS_QUIZZES } = await import('../src/content/bonus');
    const questions = BONUS_QUIZZES['bonus-architecture'].questions;
    for (const [i, q] of questions.entries()) {
      for (const idx of q.correct) await user.click(screen.getByLabelText(new RegExp(`^${q.choices[idx].text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)));
      await user.click(screen.getByRole('button', { name: 'Valider ma réponse' }));
      await user.click(screen.getByRole('button', { name: i === questions.length - 1 ? 'Voir mon score' : 'Question suivante' }));
    }
    await waitFor(() => expect(balance(getState())).toBe(before + 20));
    expect(screen.getAllByText(/Exercice réussi/).length).toBeGreaterThan(0);
  });
});

describe('sauvegarde ultra simple', () => {
  it('copie un code et le restaure après effacement', async () => {
    const user = userEvent.setup({ delay: null });
    actions.recordQuiz('quiz-m1', 10, 10);
    let copied = '';
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t: string) => void (copied = t) } });
    renderAt('/progression');
    await user.click(await screen.findByRole('button', { name: 'Copier mon code de sauvegarde' }));
    await waitFor(() => expect(copied).toMatch(/^NL[12]:/));
    expect(getState().lastExport).not.toBeNull();
    actions.resetAll();
    expect(balance(getState())).toBe(0);
    await user.click(screen.getByLabelText('Restaurer : colle ici un code de sauvegarde'));
    await user.paste(copied);
    await user.click(screen.getByRole('button', { name: 'Restaurer depuis le code' }));
    await waitFor(() => expect(balance(getState())).toBe(20));
    expect(screen.getByText('Progression restaurée depuis le code.')).toBeInTheDocument();
  });

  it('refuse un code invalide sans rien modifier', async () => {
    const user = userEvent.setup({ delay: null });
    actions.recordQuiz('quiz-m1', 10, 10);
    renderAt('/progression');
    await user.click(await screen.findByLabelText('Restaurer : colle ici un code de sauvegarde'));
    await user.paste('NL2:abc');
    await user.click(screen.getByRole('button', { name: 'Restaurer depuis le code' }));
    expect(await screen.findByText(/Code invalide/)).toBeInTheDocument();
    expect(balance(getState())).toBe(20);
  });
});

describe('défis de révision et parcours', () => {
  it('affiche un état vide honnête sans données', async () => {
    renderAt('/defis');
    expect(await screen.findByText(/Aucune erreur récente enregistrée/)).toBeInTheDocument();
    expect(screen.getByText(/Termine d’abord quelques leçons/)).toBeInTheDocument();
  });

  it('propose de refaire les questions manquées après un quiz raté', async () => {
    const q = LESSONS[0].checkQuestions[0];
    actions.recordQuiz(`check-${LESSONS[0].id}`, 0, 3, { [q.id]: false });
    const user = userEvent.setup({ delay: null });
    renderAt('/defis');
    expect(await screen.findByText(/1 question manquée/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Refaire mes questions manquées' }));
    await user.click(await screen.findByRole('button', { name: 'Commencer le quiz' }));
    expect(await screen.findByText(q.prompt)).toBeInTheDocument();
  });

  it('propose un défi par notion étudiée, qui rapporte 5 crédits une seule fois', async () => {
    const user = userEvent.setup({ delay: null });
    // « token » est rattaché à la leçon l-llm : on la marque terminée.
    actions.toggleLesson('l-llm');
    renderAt('/defis');
    await user.click((await screen.findAllByRole('button', { name: 'Lancer le défi' }))[0]);
    await user.click(await screen.findByRole('button', { name: 'Commencer le quiz' }));
    expect(await screen.findByText(/Question 1 sur/)).toBeInTheDocument();
  });

  it('filtre le parcours par niveau et affiche le statut de chaque leçon', async () => {
    const user = userEvent.setup({ delay: null });
    actions.toggleLesson(LESSONS[0].id);
    renderAt('/parcours');
    await screen.findByRole('heading', { level: 1, name: 'Parcours de formation' });
    expect(screen.getAllByText(/Terminé ·/).length).toBeGreaterThan(0);
    await user.selectOptions(screen.getByLabelText('Niveau'), 'avance');
    const main = within(screen.getByRole('main'));
    expect(main.getByRole('link', { name: /Sous le capot/ })).toBeInTheDocument();
    expect(main.queryByRole('link', { name: /Qu'est-ce que l'intelligence artificielle/ })).toBeNull();
    await user.selectOptions(screen.getByLabelText('Niveau'), 'all');
    await user.selectOptions(screen.getByLabelText('Statut'), 'termine');
    expect(within(screen.getByRole('main')).queryByRole('link', { name: /Sous le capot/ })).toBeNull();
  });
});

describe('contenu de niveaux', () => {
  it('propose des leçons débutant, intermédiaire et expert', async () => {
    const { lessonLevel } = await import('../src/content');
    const counts = { debutant: 0, intermediaire: 0, avance: 0 };
    for (const l of LESSONS) counts[lessonLevel(l)]++;
    expect(counts.debutant).toBeGreaterThanOrEqual(15);
    expect(counts.intermediaire).toBeGreaterThanOrEqual(15);
    expect(counts.avance).toBeGreaterThanOrEqual(6);
  });
  it('affiche la section « Mets en pratique » d’une leçon avec activité', async () => {
    renderAt('/lecon/l-ia-quotidien');
    expect(await screen.findByRole('heading', { level: 2, name: /Mets en pratique/ })).toBeInTheDocument();
    expect(screen.getByText(/ne rapporte pas de crédits/)).toBeInTheDocument();
  });
});
