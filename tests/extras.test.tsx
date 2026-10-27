import { readFileSync, existsSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { buildPrompt, checkJson, estimateTokens, promptAdvice, windowShare } from '../src/lib/atelier';
import { dueReviews, REVIEW_INTERVALS_DAYS } from '../src/lib/review';
import { actions, dismissRewards, reloadState } from '../src/lib/progress';
import { emptyState } from '../src/lib/state';

const DAY = 86_400_000;
const iso = (now: Date, daysAgo: number) => new Date(now.getTime() - daysAgo * DAY).toISOString();

describe('révision espacée', () => {
  const now = new Date('2026-10-26T12:00:00Z');
  it('ne propose rien tant que la leçon n’a pas été étudiée', () => {
    expect(dueReviews(emptyState(), now)).toEqual([]);
  });
  it('propose les notions d’une leçon terminée après 3 jours, pas avant', () => {
    expect(dueReviews({ ...emptyState(), completed: { 'l-llm': iso(now, 2) } }, now)).toEqual([]);
    const due = dueReviews({ ...emptyState(), completed: { 'l-llm': iso(now, 3) } }, now);
    expect(due.length).toBeGreaterThan(0);
    expect(due.every((d) => d.daysSince >= REVIEW_INTERVALS_DAYS[0])).toBe(true);
    expect(due.map((d) => d.term.id)).toContain('token');
  });
  it('espace davantage après une révision : 7 jours après la première', () => {
    const base = { ...emptyState(), completed: { 'l-llm': iso(now, 30) }, quizzes: { 'revue-token': { best: 3, last: 3, total: 3, attempts: 1, date: iso(now, 5) } } };
    expect(dueReviews(base, now).map((d) => d.term.id)).not.toContain('token');
    const later = { ...base, quizzes: { 'revue-token': { ...base.quizzes['revue-token'], date: iso(now, 8) } } };
    expect(dueReviews(later, now).map((d) => d.term.id)).toContain('token');
  });
  it('trie les plus anciennes d’abord et ignore les dates invalides', () => {
    const s = { ...emptyState(), completed: { 'l-llm': iso(now, 10), 'l-ia': iso(now, 40), 'l-reseau': 'pas une date' } };
    const due = dueReviews(s, now);
    for (let i = 1; i < due.length; i++) expect(due[i - 1].daysSince).toBeGreaterThanOrEqual(due[i].daysSince);
  });
});

describe('outils de l’atelier', () => {
  it('estime les tokens par une fourchette et le dit', () => {
    const e = estimateTokens('Bonjour tout le monde'); // 21 caractères
    expect(e).toMatchObject({ chars: 21, words: 4, low: 5, high: 7 });
    expect(estimateTokens('')).toMatchObject({ chars: 0, words: 0, low: 0, high: 0 });
    expect(estimateTokens('é😀').chars).toBe(2); // compte les caractères, pas les octets
  });
  it('calcule la part de fenêtre de contexte, plafonnée à 100 %', () => {
    expect(windowShare(800, 8000)).toBe(10);
    expect(windowShare(50000, 8000)).toBe(100);
    expect(windowShare(10, 0)).toBe(0);
  });
  it('valide du JSON et résume son contenu', () => {
    expect(checkJson('{ "a": 1, "b": [1, 2] }')).toMatchObject({ ok: true, kind: 'objet' });
    expect(checkJson('[1, 2, 3]')).toMatchObject({ ok: true, kind: 'tableau', summary: '3 éléments' });
    expect(checkJson('null')).toMatchObject({ ok: true, kind: 'null' });
  });
  it('explique les erreurs de JSON courantes avec une piste', () => {
    const single = checkJson("{ 'a': 1 }");
    expect(single.ok).toBe(false);
    expect(!single.ok && single.hint).toMatch(/guillemets doubles/);
    const trailing = checkJson('{ "a": 1, }');
    expect(!trailing.ok && trailing.hint).toMatch(/virgule/);
    const noQuotes = checkJson('{ a: 1 }');
    expect(!noQuotes.ok && noQuotes.hint).toMatch(/guillemets/);
    const comment = checkJson('{ "a": 1 } // note');
    expect(comment.ok).toBe(false);
    expect(checkJson('   ')).toMatchObject({ ok: false, message: 'Aucun texte à vérifier.' });
  });
  it('indique la ligne d’une erreur quand le moteur donne une position', () => {
    const r = checkJson('{\n  "a": 1,\n  "b": ,\n}');
    expect(r.ok).toBe(false);
    if (!r.ok && r.line !== null) expect(r.line).toBeGreaterThanOrEqual(1);
  });
  it('assemble un prompt structuré en ignorant les blocs vides, avec les données entre balises', () => {
    const out = buildPrompt({ role: 'formateur', objective: 'Expliquer une API', context: '', inputs: 'texte brut', constraints: 'sans jargon', format: 'trois étapes' });
    expect(out).toContain('Rôle : formateur');
    expect(out).toContain('Objectif : Expliquer une API');
    expect(out).not.toContain('Contexte :');
    expect(out).toContain('<donnees>\ntexte brut\n</donnees>');
    expect(out).toMatch(/pose une question au lieu de l'inventer/);
    expect(buildPrompt({ role: '', objective: '', context: '', inputs: '', constraints: '', format: '' })).toBe('');
  });
  it('conseille sans bloquer', () => {
    expect(promptAdvice({ role: '', objective: '', context: '', inputs: '', constraints: '', format: '' })).toHaveLength(4);
    expect(promptAdvice({ role: '', objective: 'a', context: 'b', inputs: '', constraints: 'c', format: 'd' })).toHaveLength(0);
  });
});

describe('atelier et révision dans l’interface', () => {
  beforeAll(() => {
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    Element.prototype.scrollIntoView = vi.fn();
  });
  beforeEach(() => {
    localStorage.clear();
    reloadState();
    dismissRewards();
  });
  const renderAt = (p: string) => render(<MemoryRouter initialEntries={[p]}><AppRoutes /></MemoryRouter>);

  it('estime des tokens en direct et rappelle que ce n’est pas un tokenizer', async () => {
    const user = userEvent.setup({ delay: null });
    renderAt('/atelier');
    expect(await screen.findByText(/pas un vrai tokenizer/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Texte à mesurer'), 'Bonjour tout le monde');
    expect(screen.getByText('5 – 7')).toBeInTheDocument();
  });

  it('valide le JSON saisi et signale une erreur', async () => {
    const user = userEvent.setup({ delay: null });
    renderAt('/atelier');
    const box = await screen.findByLabelText('JSON à vérifier');
    expect(screen.getByText(/JSON valide — objet/)).toBeInTheDocument();
    await user.clear(box);
    await user.click(box);
    await user.paste("{ 'a': 1 }");
    expect(await screen.findByText(/JSON invalide/)).toBeInTheDocument();
    expect(screen.getByText(/guillemets doubles/)).toBeInTheDocument();
  });

  it('construit et copie un prompt', async () => {
    const user = userEvent.setup({ delay: null });
    let copied = '';
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t: string) => void (copied = t) } });
    renderAt('/atelier');
    await user.type(await screen.findByLabelText(/Objectif/), 'Expliquer le RAG');
    await user.click(screen.getByRole('button', { name: 'Copier le prompt' }));
    expect(copied).toContain('Objectif : Expliquer le RAG');
    expect(await screen.findByText('Prompt copié.')).toBeInTheDocument();
  });

  it('suggère des notions à revoir sur la page Défis, sans pression', async () => {
    actions.toggleLesson('l-llm');
    const s = JSON.parse(localStorage.getItem('nl:v1')!);
    s.completed['l-llm'] = new Date(Date.now() - 10 * DAY).toISOString();
    localStorage.setItem('nl:v1', JSON.stringify(s));
    reloadState();
    renderAt('/defis');
    expect(await screen.findByRole('heading', { level: 2, name: 'Bon moment pour revoir' })).toBeInTheDocument();
    expect(screen.getByText(/sans obligation ni série à maintenir/)).toBeInTheDocument();
    expect((await screen.findAllByRole('button', { name: 'Réviser' })).length).toBeGreaterThan(0);
  });
});

describe('site installable et hors ligne', () => {
  it('a un manifeste valide avec des icônes existantes', () => {
    const m = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
    expect(m.name).toMatch(/NeuronalLogic/);
    expect(m.display).toBe('standalone');
    expect(m.start_url).toBe('/');
    for (const icon of m.icons) expect(existsSync('public' + icon.src), icon.src).toBe(true);
    expect(m.icons.some((i: { sizes: string }) => i.sizes === '512x512')).toBe(true);
    expect(m.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
  });
  it('génère de vrais fichiers PNG', () => {
    for (const f of ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png']) {
      const b = readFileSync('public/' + f);
      expect([...b.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    }
  });
  it('le service worker n’intercepte jamais les ressources externes ni les requêtes non GET', () => {
    const sw = readFileSync('public/sw.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''); // sans les commentaires
    expect(sw).toMatch(/req\.method !== 'GET'/);
    expect(sw).toMatch(/url\.origin !== self\.location\.origin/);
    expect(sw).not.toMatch(/youtube|googlevideo/i);
  });
  it('déclare le manifeste et l’aperçu de partage dans index.html', () => {
    const html = readFileSync('index.html', 'utf8');
    for (const needle of ['rel="manifest"', 'og:title', 'og:description', 'og:image', 'apple-touch-icon', 'lang="fr"']) expect(html).toContain(needle);
  });
  it('exclut le service worker, le manifeste et les icônes de la réécriture SPA', () => {
    const v = JSON.parse(readFileSync('vercel.json', 'utf8'));
    const re = new RegExp('^' + v.rewrites[0].source + '$');
    for (const p of ['/sw.js', '/manifest.webmanifest', '/icon-192.png', '/robots.txt', '/assets/index-abc.js']) expect(re.test(p.slice(1) ? p : p), p).toBe(false);
    for (const p of ['/lecon/l-ia', '/progression', '/atelier']) expect(re.test(p), p).toBe(true);
  });
});
