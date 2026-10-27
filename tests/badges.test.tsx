import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { LESSONS, lessonsOfModule } from '../src/content';
import { activityGrid, applyBadges, BADGES } from '../src/lib/badges';
import { actions, dismissRewards, getState, reloadState } from '../src/lib/progress';
import { emptyState, parseState } from '../src/lib/state';

const q = (best: number, total: number, date = '2026-10-20T10:00:00.000Z') => ({ best, last: best, total, attempts: 1, date });

describe('badges', () => {
  it('aucun badge sans fait d’apprentissage (ni pour la connexion, ni pour le temps)', () => {
    expect(applyBadges(emptyState()).added).toEqual([]);
    expect(BADGES.length).toBeGreaterThanOrEqual(10);
    expect(BADGES.length).toBeLessThanOrEqual(15); // « de temps en temps » : peu nombreux
  });

  it('« Premier pas » exige une leçon terminée ET un contrôle réussi', () => {
    const L = LESSONS[0];
    expect(applyBadges({ ...emptyState(), completed: { [L.id]: 'x' } }).added).toEqual([]);
    const r = applyBadges({ ...emptyState(), completed: { [L.id]: 'x' }, quizzes: { [`check-${L.id}`]: q(3, 3) } });
    expect(r.added.map((b) => b.key)).toEqual(['badge:premier-pas']);
    expect(r.state.badges['premier-pas']).toBeTruthy();
  });

  it('est idempotent : un badge obtenu ne se redonne pas', () => {
    const s0 = { ...emptyState(), quizzes: { 'quiz-m1': q(22, 22) } };
    const a = applyBadges(s0);
    expect(a.added.map((b) => b.key)).toContain('badge:sans-faute');
    expect(applyBadges(a.state).added).toEqual([]);
  });

  it('« Sans faute » ignore les très petits quiz ; « Persévérance » exige une réussite après un nouvel essai', () => {
    expect(applyBadges({ ...emptyState(), quizzes: { 'quiz-m1': q(3, 3) } }).added).toEqual([]);
    expect(applyBadges({ ...emptyState(), quizzes: { 'quiz-m1': { ...q(9, 10), attempts: 1 } } }).added.map((b) => b.key)).not.toContain('badge:perseverance');
    expect(applyBadges({ ...emptyState(), quizzes: { 'quiz-m1': { ...q(9, 10), attempts: 2 } } }).added.map((b) => b.key)).toContain('badge:perseverance');
  });

  it('« Module validé » exige leçons terminées + quiz de module réussi', () => {
    const completed = Object.fromEntries(lessonsOfModule('m3').map((l) => [l.id, 'x']));
    expect(applyBadges({ ...emptyState(), completed }).added.map((b) => b.key)).not.toContain('badge:module-valide');
    expect(applyBadges({ ...emptyState(), completed, quizzes: { 'quiz-m3': q(9, 10) } }).added.map((b) => b.key)).toContain('badge:module-valide');
  });

  it('« Prévoyant » est obtenu en exportant une sauvegarde', () => {
    expect(applyBadges({ ...emptyState(), lastExport: '2026-10-20' }).added.map((b) => b.key)).toContain('badge:prevoyant');
  });

  it('ignore des identifiants ou dates invalides dans une sauvegarde altérée', () => {
    const s = parseState(JSON.stringify({ version: 2, badges: { 'premier-pas': '2026-01-01', 'Pas Valide!': 'x', autre: 5 } }));
    expect(Object.keys(s.badges)).toEqual(['premier-pas']);
  });
});

describe('graphique d’activité', () => {
  const today = new Date(2026, 9, 26); // lundi 26 octobre 2026

  it('affiche 20 semaines × 7 jours et compte les jours actifs sans inventer d’activité', () => {
    const g = activityGrid(emptyState(), today);
    expect(g.columns).toHaveLength(20);
    expect(g.columns.every((c) => c.length === 7)).toBe(true);
    expect(g.activeDays).toBe(0);
    expect(g.total).toBe(0);
  });

  it('place chaque activité à sa date, avec des niveaux 0 à 4', () => {
    const s = { ...emptyState(), completed: { a: '2026-10-20T09:00:00.000Z' }, quizzes: { 'quiz-m1': q(9, 10, '2026-10-20T11:00:00.000Z') }, ledger: [{ key: 'lesson:x', label: 'x', credits: 10, at: '2026-10-22T08:00:00.000Z' }] };
    const g = activityGrid(s, today);
    const cells = g.columns.flat();
    expect(cells.find((c) => c.date === '2026-10-20')).toMatchObject({ count: 2, level: 2 });
    expect(cells.find((c) => c.date === '2026-10-22')).toMatchObject({ count: 1, level: 1 });
    expect(g.activeDays).toBe(2);
    expect(g.total).toBe(3);
  });

  it('ne compte pas les jours futurs de la semaine en cours', () => {
    const s = { ...emptyState(), completed: { a: '2026-10-30T09:00:00.000Z' } };
    expect(activityGrid(s, today).total).toBe(0);
  });
});

describe('badges dans l’interface', () => {
  beforeAll(() => {
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    Element.prototype.scrollIntoView = vi.fn();
  });
  beforeEach(() => {
    localStorage.clear();
    reloadState();
    dismissRewards();
  });

  it('notifie discrètement un nouveau badge et l’affiche dans le profil, avec les non obtenus et leur condition', async () => {
    actions.recordQuiz('quiz-m1', 22, 22, {});
    expect(getState().badges['sans-faute']).toBeTruthy();
    render(<MemoryRouter initialEntries={['/progression']}><AppRoutes /></MemoryRouter>);
    expect(await screen.findByRole('heading', { level: 2, name: 'Badges' })).toBeInTheDocument();
    expect(screen.getAllByText(/Nouveau badge/).length).toBeGreaterThan(0);
    const list = within(screen.getByRole('heading', { level: 2, name: 'Badges' }).parentElement!);
    expect(list.getByText('Sans faute')).toBeInTheDocument();
    expect(list.getByText('Valider ta première leçon (terminée + contrôle réussi).')).toBeInTheDocument(); // condition d'un badge non obtenu
    expect(screen.getByRole('img', { name: /Activité d’apprentissage des 20 dernières semaines/ })).toBeInTheDocument();
  });

  it('montre un état honnête quand aucune activité n’est enregistrée', async () => {
    render(<MemoryRouter initialEntries={['/progression']}><AppRoutes /></MemoryRouter>);
    expect(await screen.findByRole('img', { name: /aucune activité enregistrée/ })).toBeInTheDocument();
  });

  it('place la recherche dans l’en-tête et la focalise avec la touche « / »', async () => {
    render(<MemoryRouter initialEntries={['/']}><AppRoutes /></MemoryRouter>);
    const input = await screen.findByLabelText('Rechercher dans le cours');
    expect(input.closest('header')).not.toBeNull();
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));
    expect(document.activeElement).toBe(input);
  });
});
