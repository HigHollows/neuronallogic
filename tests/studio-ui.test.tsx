import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { badgeById } from '../src/lib/badges';
import { balance, earnable } from '../src/lib/credits';
import { actions, dismissRewards, getState, reloadState } from '../src/lib/progress';
import { parseState } from '../src/lib/state';
import { COMPONENTS } from '../src/studio/data/components';
import { TROUBLESHOOTING, guideById } from '../src/studio/data/guides';
import { TEMPLATES, templateById } from '../src/studio/data/templates';
import { check } from '../src/studio/checker';
import { studio } from '../src/studio/store';
import { STORAGE_KEY as STUDIO_KEY } from '../src/studio/project';

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
  // React Flow a besoin de ces API du navigateur, absentes de jsdom.
  class RO { observe() {} unobserve() {} disconnect() {} }
  vi.stubGlobal('ResizeObserver', RO);
  class DM { m22 = 1; constructor(public a?: string) {} }
  vi.stubGlobal('DOMMatrixReadOnly', DM);
});

beforeEach(() => {
  localStorage.clear();
  reloadState();
  dismissRewards();
  studio.reset();
});

const studioPage = async () => {
  renderAt('/studio');
  return screen.findByRole('heading', { level: 1, name: /Studio IA/ });
};

describe('Studio : bibliothèque et édition', () => {
  it('affiche les 46 composants, filtrables par recherche', async () => {
    const user = userEvent.setup({ delay: null });
    await studioPage();
    expect(screen.getAllByRole('button', { name: /^Ajouter / })).toHaveLength(46);
    await user.type(screen.getByLabelText('Rechercher un composant'), 'mcp');
    const n = screen.getAllByRole('button', { name: /^Ajouter / }).length;
    expect(n).toBeGreaterThanOrEqual(4);
    expect(n).toBeLessThan(46);
    await user.clear(screen.getByLabelText('Rechercher un composant'));
    await user.type(screen.getByLabelText('Rechercher un composant'), 'zzzzzz');
    expect(screen.getByText(/Aucun composant ne correspond/)).toBeInTheDocument();
  });

  it('ajoute un composant au clic et affiche son inspecteur avec lien « Comprendre ce composant »', async () => {
    const user = userEvent.setup({ delay: null });
    await studioPage();
    await user.click(screen.getByRole('button', { name: 'Ajouter Utilisateur' }));
    expect(studio.get().nodes).toHaveLength(1);
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByRole('heading', { level: 3, name: /Utilisateur/ })).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: 'Comprendre ce composant' })).toHaveAttribute('href', '/studio/guide/composant/utilisateur');
    expect(within(panel).getByRole('button', { name: 'Voir un exemple' })).toBeInTheDocument();
    await user.click(within(panel).getByRole('button', { name: 'Voir un exemple' }));
    expect(within(panel).getByText(/Exemple/)).toBeInTheDocument();
  });

  it('une connexion refusée n’est jamais silencieuse : message, cause et correction', async () => {
    const user = userEvent.setup({ delay: null });
    await studioPage();
    act(() => { studio.addNode('document'); studio.addNode('sortie-texte'); });
    const docId = studio.get().nodes[0].id;
    act(() => studio.select([docId], []));
    const panel = screen.getByRole('tabpanel');
    await user.selectOptions(within(panel).getByLabelText('Vers le composant'), studio.get().nodes[1].id);
    await user.click(within(panel).getByRole('button', { name: 'Connecter' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Connexion refusée/);
    expect(alert).toHaveTextContent(/Comment corriger/);
    expect(studio.get().edges).toHaveLength(0);
  });

  it('crée une connexion valide sans souris (formulaire « Connecter à… »)', async () => {
    const user = userEvent.setup({ delay: null });
    await studioPage();
    act(() => { studio.addNode('utilisateur'); studio.addNode('llm'); });
    act(() => studio.select([studio.get().nodes[0].id], []));
    const panel = screen.getByRole('tabpanel');
    await user.selectOptions(within(panel).getByLabelText('Vers le composant'), studio.get().nodes[1].id);
    await user.selectOptions(within(panel).getByLabelText('Entrée'), 'contexte');
    await user.click(within(panel).getByRole('button', { name: 'Connecter' }));
    expect(studio.get().edges).toHaveLength(1);
  });

  it('modifie un paramètre, puis annule et rétablit depuis la barre d’outils', async () => {
    const user = userEvent.setup({ delay: null });
    await studioPage();
    await user.click(screen.getByRole('button', { name: 'Ajouter Utilisateur' }));
    const field = within(screen.getByRole('tabpanel')).getByLabelText(/Message/);
    await user.clear(field);
    await user.type(field, 'Bonjour');
    expect(studio.get().nodes[0].data.params.message).toBe('Bonjour');
    await user.click(screen.getByRole('button', { name: /Annuler \(Ctrl\+Z\)/ }));
    expect(studio.get().nodes[0].data.params.message).not.toBe('Bonjour');
    await user.click(screen.getByRole('button', { name: /Rétablir/ }));
    expect(studio.get().nodes[0].data.params.message).toBe('Bonjour');
  });

  it('demande confirmation avant d’effacer le canevas', async () => {
    const user = userEvent.setup({ delay: null });
    await studioPage();
    await user.click(screen.getByRole('button', { name: 'Ajouter Utilisateur' }));
    await user.click(screen.getByRole('button', { name: 'Effacer' }));
    const dialog = screen.getByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Annuler' }));
    expect(studio.get().nodes).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Effacer' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Effacer le canevas' }));
    expect(studio.get().nodes).toHaveLength(0);
  });

  it('enregistre automatiquement le projet dans le navigateur', async () => {
    const user = userEvent.setup({ delay: null });
    await studioPage();
    await user.click(screen.getByRole('button', { name: 'Ajouter Utilisateur' }));
    await waitFor(() => expect(localStorage.getItem(STUDIO_KEY)).toBeTruthy(), { timeout: 3000 });
    const lib = JSON.parse(localStorage.getItem(STUDIO_KEY)!);
    expect(lib.projects).toHaveLength(1);
    expect(lib.projects[0].file.nodes).toHaveLength(1);
  });

  it('propose trois zones sur petit écran (composants, canevas, panneau)', async () => {
    const user = userEvent.setup({ delay: null });
    await studioPage();
    const tabs = screen.getByRole('tablist', { name: /Zone affichée/ });
    await user.click(within(tabs).getByRole('tab', { name: 'Composants' }));
    expect(document.querySelector('.studio-body')).toHaveClass('view-library');
    await user.click(within(tabs).getByRole('tab', { name: 'Panneau' }));
    expect(document.querySelector('.studio-body')).toHaveClass('view-panel');
  });
});

describe('Studio : vérification, simulation, modèles', () => {
  it('ouvre un modèle depuis l’adresse du guide et le vérifie sans erreur', async () => {
    const user = userEvent.setup({ delay: null });
    renderAt('/studio?modele=assistant-simple');
    await screen.findByRole('heading', { level: 1, name: /Studio IA/ });
    await waitFor(() => expect(studio.get().nodes).toHaveLength(5));
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByText('0 erreur(s)')).toBeInTheDocument();
    expect(within(panel).getByText(/ne veut pas dire que l’architecture est « bonne »/)).toBeInTheDocument();
    expect(within(panel).getByText(/jamais testée en vrai/)).toBeInTheDocument();
  });

  it('signale les défauts du modèle incorrect avec explication et lien de dépannage', async () => {
    const user = userEvent.setup({ delay: null });
    renderAt('/studio?modele=architecture-incorrecte');
    await waitFor(() => expect(studio.get().nodes.length).toBeGreaterThan(5));
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByText('Clé d’API exposée dans le navigateur')).toBeInTheDocument();
    expect(within(panel).getAllByText(/Comment corriger/).length).toBeGreaterThan(3);
    expect(within(panel).getAllByRole('link', { name: 'En savoir plus' })[0].getAttribute('href')).toMatch(/^\/studio\/guide\/depannage#/);
  });

  it('simule pas à pas avec le message « données fictives », en avant et en arrière', async () => {
    const user = userEvent.setup({ delay: null });
    renderAt('/studio?modele=assistant-simple');
    await waitFor(() => expect(studio.get().nodes).toHaveLength(5));
    await user.click(screen.getByRole('button', { name: 'Simuler' }));
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByText(/aucun modèle d’IA réel n’est appelé/i)).toBeInTheDocument();
    expect(within(panel).getByText('Parcours complet')).toBeInTheDocument();
    expect(within(panel).getByRole('heading', { level: 4, name: /Étape 1 sur/ })).toBeInTheDocument();
    await user.click(within(panel).getByRole('button', { name: 'Étape suivante' }));
    expect(within(panel).getByRole('heading', { level: 4, name: /Étape 2 sur/ })).toBeInTheDocument();
    await user.click(within(panel).getByRole('button', { name: 'Étape précédente' }));
    expect(within(panel).getByRole('heading', { level: 4, name: /Étape 1 sur/ })).toBeInTheDocument();
    expect(studio.get().flags.simulated).toBe(true);
  });

  it('refuse de simuler un schéma sans entrée en l’expliquant', async () => {
    const user = userEvent.setup({ delay: null });
    await studioPage();
    await user.click(screen.getByRole('button', { name: 'Ajouter Modèle de langage (LLM)' }));
    await user.click(screen.getByRole('button', { name: 'Simuler' }));
    expect(within(screen.getByRole('tabpanel')).getByText(/aucun point d’entrée/)).toBeInTheDocument();
    expect(studio.get().flags.simulated).toBe(false);
  });

  it('liste les six modèles avec objectif, parcours et limites', async () => {
    const user = userEvent.setup({ delay: null });
    await studioPage();
    await user.click(screen.getByRole('tab', { name: 'Modèles' }));
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getAllByRole('button', { name: 'Ouvrir ce modèle' })).toHaveLength(6);
    expect(within(panel).getAllByText(/Objectif :/)).toHaveLength(6);
    expect(within(panel).getAllByText(/Limites :/)).toHaveLength(6);
  });
});

describe('Studio : projets, export et import', () => {
  const importFile = async (user: ReturnType<typeof userEvent.setup>, content: string, name = 'x.json') => {
    await user.click(screen.getByRole('tab', { name: 'Projets' }));
    const input = within(screen.getByRole('tabpanel')).getByLabelText('Importer un fichier');
    await user.upload(input, new File([content], name, { type: 'application/json' }));
  };

  it('refuse un fichier invalide avec un message clair', async () => {
    const user = userEvent.setup({ delay: null });
    await studioPage();
    await importFile(user, '{ceci n’est pas du json');
    expect(await screen.findByRole('alert')).toHaveTextContent(/Import refusé/);
    expect(studio.get().nodes).toHaveLength(0);
  });

  it('importe un projet valide et signale ce qui a été écarté', async () => {
    const user = userEvent.setup({ delay: null });
    await studioPage();
    const file = { format: 'neuronallogic-studio', version: 1, name: 'Importé', nodes: [
      { id: 'a', component: 'utilisateur', x: 0, y: 0, params: {} }, { id: 'b', component: 'inconnu', x: 0, y: 0, params: {} }], edges: [] };
    await importFile(user, JSON.stringify(file));
    await waitFor(() => expect(studio.get().nodes).toHaveLength(1));
    expect(studio.get().name).toBe('Importé');
    expect(await screen.findByText('Éléments ignorés à l’import')).toBeInTheDocument();
  });

  it('exporte le projet courant au format documenté', async () => {
    const user = userEvent.setup({ delay: null });
    renderAt('/studio?modele=assistant-simple');
    await waitFor(() => expect(studio.get().nodes).toHaveLength(5));
    let captured = '';
    const OrigBlob = Blob;
    vi.stubGlobal('Blob', class extends OrigBlob { constructor(parts: BlobPart[], o?: BlobPropertyBag) { super(parts, o); captured = String(parts[0]); } });
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    HTMLAnchorElement.prototype.click = vi.fn();
    await user.click(screen.getByRole('button', { name: 'Exporter' }));
    vi.stubGlobal('Blob', OrigBlob);
    const parsed = JSON.parse(captured);
    expect(parsed).toMatchObject({ format: 'neuronallogic-studio', version: 1, name: 'Assistant IA simple' });
    expect(parsed.nodes).toHaveLength(5);
  });

  it('ouvre, duplique et supprime un projet — la suppression demande confirmation', async () => {
    const user = userEvent.setup({ delay: null });
    renderAt('/studio?modele=assistant-simple');
    await waitFor(() => expect(studio.get().nodes).toHaveLength(5));
    await user.click(screen.getByRole('tab', { name: 'Projets' }));
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByText(/Stockage dans ce navigateur/)).toBeInTheDocument();
    await user.click(within(panel).getByRole('button', { name: /^Dupliquer/ }));
    await waitFor(() => expect(studio.get().name).toMatch(/\(copie\)/));
    expect(within(screen.getByRole('tabpanel')).getAllByRole('button', { name: /^Supprimer/ })).toHaveLength(2);
    await user.click(within(screen.getByRole('tabpanel')).getAllByRole('button', { name: /^Supprimer/ })[0]);
    expect(screen.getByRole('alertdialog')).toHaveTextContent(/Supprimer définitivement/);
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Annuler' }));
    expect(JSON.parse(localStorage.getItem(STUDIO_KEY)!).projects).toHaveLength(2);
  });
});

describe('Studio : tutoriel et crédits', () => {
  it('propose le tutoriel, valide chaque étape par une vraie action et ne verse les crédits qu’une fois', async () => {
    const user = userEvent.setup({ delay: null });
    await studioPage();
    expect(getState().studio.tutorial.status).toBe('none');
    await user.click(screen.getByRole('button', { name: 'Commencer le tutoriel' }));
    const coach = () => screen.getByRole('region', { name: 'Tutoriel' });
    expect(within(coach()).getByRole('heading', { level: 2, name: 'Découvrir le canevas' })).toBeInTheDocument();
    // Un clic ne suffit pas : aucune action détectée → même étape.
    expect(within(coach()).getByText('Étape 1 sur 7')).toBeInTheDocument();
    act(() => studio.setFlag('viewport'));
    await waitFor(() => expect(within(coach()).getByText('Étape 2 sur 7')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Ajouter Utilisateur' }));
    await waitFor(() => expect(within(coach()).getByText('Étape 3 sur 7')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Ajouter Modèle de langage (LLM)' }));
    await waitFor(() => expect(within(coach()).getByText('Étape 4 sur 7')).toBeInTheDocument());
    const [u, llm] = studio.get().nodes.map((n) => n.id);
    act(() => { studio.connect({ source: u, sourceHandle: 'message', target: llm, targetHandle: 'contexte' }); });
    await waitFor(() => expect(within(coach()).getByText('Étape 5 sur 7')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Ajouter Sortie texte' }));
    const out = studio.get().nodes.at(-1)!.id;
    act(() => { studio.connect({ source: llm, sourceHandle: 'reponse', target: out, targetHandle: 'texte' }); });
    await waitFor(() => expect(within(coach()).getByText('Étape 6 sur 7')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Simuler' }));
    await waitFor(() => expect(within(coach()).getByText('Étape 7 sur 7')).toBeInTheDocument());
    // Dernière étape : quiz obligatoire avant de terminer.
    const finish = within(coach()).getByRole('button', { name: 'Terminer le tutoriel' });
    expect(finish).toBeDisabled();
    expect(balance(getState())).toBe(0);
    act(() => { actions.recordQuiz('studio-tuto', 3, 3); });
    expect(balance(getState())).toBe(0); // quiz réussi mais tutoriel pas terminé
    await user.click(within(coach()).getByRole('button', { name: 'Terminer le tutoriel' }));
    expect(balance(getState())).toBe(20);
    expect(getState().badges['studio-tutoriel']).toBeTruthy();
    // Relancer ou refaire le quiz ne verse rien de plus.
    act(() => { actions.setTutorial('running', 0); actions.recordQuiz('studio-tuto', 3, 3); actions.setTutorial('done', 7); });
    expect(balance(getState())).toBe(20);
    expect(getState().ledger.filter((e) => e.key === 'studio:tuto')).toHaveLength(1);
  });

  it('permet de mettre en pause, reprendre et passer le tutoriel ; l’état est conservé', async () => {
    const user = userEvent.setup({ delay: null });
    await studioPage();
    await user.click(screen.getByRole('button', { name: 'Commencer le tutoriel' }));
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByText(/Tutoriel en pause à l’étape 1 sur 7/)).toBeInTheDocument();
    reloadState();
    expect(getState().studio.tutorial.status).toBe('paused');
    await user.click(screen.getByRole('button', { name: 'Reprendre' }));
    expect(getState().studio.tutorial.status).toBe('running');
    await user.click(screen.getByRole('button', { name: 'Passer le tutoriel' }));
    expect(getState().studio.tutorial.status).toBe('skipped');
    expect(screen.queryByRole('region', { name: 'Tutoriel' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tutoriel' }));
    expect(getState().studio.tutorial.status).toBe('running');
    expect(balance(getState())).toBe(0);
  });

  it('affiche l’aide d’une étape à la demande', async () => {
    const user = userEvent.setup({ delay: null });
    await studioPage();
    await user.click(screen.getByRole('button', { name: 'Commencer le tutoriel' }));
    await user.click(screen.getByRole('button', { name: 'J’ai besoin d’aide' }));
    expect(screen.getByText(/Glisse avec la souris/)).toBeInTheDocument();
  });
});

describe('défis du Studio : récompenses sans doublon ni triche', () => {
  const good = () => structuredClone(templateById.get('assistant-simple')!.graph);

  it('exige que les critères soient réellement remplis, et verse une seule fois', () => {
    expect(actions.completeStudioChallenge('assistant-simple', { nodes: [], edges: [] })).toMatchObject({ ok: false });
    expect(balance(getState())).toBe(0);
    const first = actions.completeStudioChallenge('assistant-simple', good());
    expect(first.ok).toBe(true);
    expect(first.added).toHaveLength(1);
    expect(balance(getState())).toBe(20);
    const again = actions.completeStudioChallenge('assistant-simple', good());
    expect(again).toMatchObject({ ok: true, added: [] });
    expect(balance(getState())).toBe(20);
    reloadState();
    expect(balance(getState())).toBe(20);
  });

  it('refuse un défi inconnu et ignore les identifiants falsifiés dans la sauvegarde', () => {
    expect(actions.completeStudioChallenge('inexistant', good()).ok).toBe(false);
    const forged = JSON.stringify({ version: 2, studio: { done: { 'defi-inventé': '2026-01-01', rag: '2026-01-01' }, guides: { '<script>': 'x' } }, ledger: [{ key: 'studio:rag', credits: 99999, label: 'x', at: '' }] });
    const s = parseState(forged);
    expect(Object.keys(s.studio.guides)).toEqual([]);
    expect(s.ledger[0].credits).toBe(20); // le montant est recalculé d’après le barème
    expect(earnable({ ...s, studio: { ...s.studio, done: { 'defi-inventé': 'x' } } }).some((e) => e.key.includes('inventé'))).toBe(false);
  });

  it('attribue le badge « Architecte » après trois défis réussis', () => {
    actions.completeStudioChallenge('assistant-simple', good());
    actions.completeStudioChallenge('rag', structuredClone(templateById.get('assistant-documentaire')!.graph));
    expect(getState().badges.architecte).toBeUndefined();
    actions.completeStudioChallenge('mcp', structuredClone(templateById.get('application-mcp')!.graph));
    expect(getState().badges.architecte).toBeTruthy();
    expect(badgeById.get('architecte')!.how).toMatch(/3 défis/);
    expect(balance(getState())).toBe(60);
  });

  it('consulter un guide ne rapporte aucun crédit (consulté ≠ maîtrisé)', () => {
    actions.markGuideRead('prise-en-main');
    actions.markGuideRead('composant/llm');
    expect(Object.keys(getState().studio.guides)).toHaveLength(2);
    expect(balance(getState())).toBe(0);
    actions.markGuideRead('<script>alert(1)</script>');
    expect(Object.keys(getState().studio.guides)).toHaveLength(2);
  });

  it('les défis du panneau affichent leurs critères et refusent une validation prématurée', async () => {
    const user = userEvent.setup({ delay: null });
    await studioPage();
    await user.click(screen.getByRole('tab', { name: 'Défis' }));
    const panel = screen.getByRole('tabpanel');
    await user.click(within(panel).getAllByRole('button', { name: 'Valider mon schéma' })[0]);
    expect(await within(panel).findByText(/Pas encore\. Il manque/)).toBeInTheDocument();
    expect(balance(getState())).toBe(0);
  });
});

describe('Guide du Studio', () => {
  it('affiche le sommaire, filtre par recherche et rappelle que consulter ≠ maîtriser', async () => {
    const user = userEvent.setup({ delay: null });
    renderAt('/studio/guide');
    expect(await screen.findByRole('heading', { level: 1, name: 'Guide du Studio' })).toBeInTheDocument();
    expect(screen.getByText(/Consulter un guide n’est pas le maîtriser/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Prise en main du Studio' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Rechercher dans le guide'), 'filtre');
    expect(screen.getByRole('link', { name: 'Filtre de résultats' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Utilisateur' })).not.toBeInTheDocument();
  });

  it('chaque composant a sa page, et la consultation est enregistrée', async () => {
    renderAt('/studio/guide/composant/client-mcp');
    expect(await screen.findByRole('heading', { level: 1, name: 'Client MCP' })).toBeInTheDocument();
    for (const h of ['Définition', 'Rôle dans une architecture', 'Exemple', 'Limites', 'Erreurs fréquentes', 'À ne pas confondre', 'Entrées, sorties et paramètres']) {
      expect(screen.getByRole('heading', { level: 2, name: h })).toBeInTheDocument();
    }
    await waitFor(() => expect(getState().studio.guides['composant/client-mcp']).toBeTruthy());
  });

  it('chaque guide d’architecture montre un schéma, le parcours des données et un exercice', async () => {
    renderAt('/studio/guide/architectures/rag');
    expect(await screen.findByRole('heading', { level: 1, name: /RAG/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Schéma « Assistant avec contexte documentaire/ })).toBeInTheDocument();
    expect(screen.getByText(/Parcours des données/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Exercice' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ouvrir ce schéma dans le Studio' })).toHaveAttribute('href', '/studio?modele=assistant-documentaire');
  });

  it('la page de dépannage explique les 16 remarques du vérificateur', async () => {
    renderAt('/studio/guide/depannage#cle-navigateur');
    expect(await screen.findByRole('heading', { level: 1, name: /Dépannage/ })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(TROUBLESHOOTING.length);
    expect(screen.getAllByText('Comment corriger')).toHaveLength(TROUBLESHOOTING.length);
  });

  it('une page inconnue affiche un message clair avec retour au sommaire', async () => {
    renderAt('/studio/guide/n-existe-pas');
    expect(await screen.findByRole('heading', { level: 1, name: 'Guide introuvable' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Retour au sommaire/ })).toBeInTheDocument();
  });

  it('tous les liens de documentation (vérificateur, modèles, composants) mènent à une page existante', () => {
    const codes = new Set(TROUBLESHOOTING.map((t) => t.code));
    for (const t of TEMPLATES) {
      for (const issue of check(t.graph)) expect(codes.has(issue.code), `${t.id}: ${issue.code}`).toBe(true);
      for (const d of t.docs) expect(d === 'depannage' || guideById(d), `${t.id} → ${d}`).toBeTruthy();
    }
    for (const c of COMPONENTS) expect(guideById(`composant/${c.id}`), c.id).toBeTruthy();
    for (const t of TROUBLESHOOTING) {
      expect(t.observe.length).toBeGreaterThan(10);
      expect(t.fix.length).toBeGreaterThan(10);
      expect(t.retain.length).toBeGreaterThan(10);
    }
  });
});

describe('intégration au site', () => {
  it('ajoute « Studio IA » à la navigation', async () => {
    renderAt('/');
    expect(await screen.findAllByRole('link', { name: 'Studio IA' })).not.toHaveLength(0);
  });

  it('ne casse pas quand le stockage des projets est corrompu : message, aucune perte silencieuse', async () => {
    localStorage.setItem(STUDIO_KEY, '{cassé');
    await studioPage();
    expect(await screen.findByText(/projets illisibles/)).toBeInTheDocument();
    expect([...Array(localStorage.length).keys()].map((i) => localStorage.key(i)!).some((k) => k.includes(':rescue:'))).toBe(true);
  });
});
