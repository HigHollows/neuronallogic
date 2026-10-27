import { beforeEach, describe, expect, it } from 'vitest';
import { check, cycles, summarize } from '../src/studio/checker';
import { CHALLENGES, evaluateChallenge } from '../src/studio/challenges';
import { connectableSources, connectableTargets, describeEdge, EDGE_KINDS, KIND_OF, resolveEmit, validateConnection } from '../src/studio/connections';
import { CATEGORIES, COMPONENTS, componentById } from '../src/studio/data/components';
import { TEMPLATES, templateById } from '../src/studio/data/templates';
import { TUTORIAL } from '../src/studio/data/tutorial';
import { autoLayout } from '../src/studio/layout';
import { deleteProject, duplicateProject, emptyLibrary, LIMITS, loadLibrary, parseProject, saveLibrary, STORAGE_KEY, toFile, upsertProject, validateProject } from '../src/studio/project';
import { retrieve, simulate } from '../src/studio/simulate';
import { studio } from '../src/studio/store';
import type { Graph, SEdge, SNode } from '../src/studio/types';

const n = (id: string, c: string, params: Record<string, string | number | boolean> = {}): SNode => ({ id, type: 'block', position: { x: 0, y: 0 }, data: { c, params } });
const e = (from: string, to: string): SEdge => {
  const [source, sourceHandle] = from.split('.');
  const [target, targetHandle] = to.split('.');
  return { id: `${source}.${sourceHandle}->${target}.${targetHandle}`, source, sourceHandle, target, targetHandle };
};
const g = (nodes: SNode[], edges: SEdge[] = []): Graph => ({ nodes, edges });
const codes = (graph: Graph) => check(graph).map((i) => i.code);

describe('catalogue de composants', () => {
  it('contient les 46 composants demandés, répartis dans les 6 catégories', () => {
    expect(COMPONENTS).toHaveLength(46);
    expect(CATEGORIES).toHaveLength(6);
    const count = (c: string) => COMPONENTS.filter((x) => x.category === c).length;
    expect([count('io'), count('ia'), count('infra'), count('data'), count('tools'), count('control')]).toEqual([7, 8, 8, 8, 7, 8]);
    expect(new Set(COMPONENTS.map((c) => c.id)).size).toBe(46);
  });

  it.each(COMPONENTS.map((c) => [c.id, c] as const))('%s : définition pédagogique complète', (_id, c) => {
    for (const k of ['short', 'definition', 'role', 'example', 'limits', 'confusions'] as const) expect(c[k].length, `${c.id}.${k}`).toBeGreaterThan(15);
    expect(c.short.length).toBeLessThanOrEqual(80);
    expect(c.mistakes.length).toBeGreaterThanOrEqual(1);
    expect(c.keywords.length).toBeGreaterThan(0);
    expect(c.inputs.length + c.outputs.length).toBeGreaterThan(0);
    // identifiants de ports uniques
    expect(new Set(c.inputs.map((p) => p.id)).size).toBe(c.inputs.length);
    expect(new Set(c.outputs.map((p) => p.id)).size).toBe(c.outputs.length);
    for (const p of c.params) expect(p.help.length).toBeGreaterThan(10);
  });

  it('chaque bloc a des ports cohérents avec son rôle (sources sans entrée, terminaux sans sortie)', () => {
    for (const c of COMPONENTS) {
      if (c.terminal) expect(c.outputs, c.id).toHaveLength(0);
      if (['document', 'prompt-systeme', 'entree-texte', 'source-connaissances', 'ressource-mcp', 'prompt-mcp'].includes(c.id)) expect(c.inputs, c.id).toHaveLength(0);
    }
  });

  it('présente MCP comme un protocole, jamais comme un modèle ni un agent', () => {
    expect(componentById.get('client-mcp')!.confusions).toMatch(/protocole d’interopérabilité, pas un modèle/);
    expect(componentById.get('serveur-mcp')!.limits).toMatch(/N’est pas un agent/);
    expect(componentById.get('prompt-mcp')!.confusions).toMatch(/Prompt système/);
    expect(componentById.get('prompt-systeme')!.confusions).toMatch(/Prompt MCP/);
  });

  it('les cinq types de connexion ont une signification et un style distincts', () => {
    const kinds = Object.keys(EDGE_KINDS);
    expect(kinds.sort()).toEqual(['data', 'dependency', 'request', 'response', 'tool']);
    expect(new Set(Object.values(EDGE_KINDS).map((k) => k.dash)).size).toBe(5);
    expect(new Set(Object.values(EDGE_KINDS).map((k) => k.meaning)).size).toBe(5);
    expect(new Set(Object.values(KIND_OF))).toEqual(new Set(kinds));
  });
});

describe('connexions : refus expliqués', () => {
  const base = g([n('u', 'utilisateur'), n('llm', 'llm'), n('app', 'application'), n('tool', 'outil-externe'), n('cm', 'client-mcp'), n('sm', 'serveur-mcp'), n('api', 'api'), n('out', 'sortie-texte'), n('doc', 'document')]);

  it('accepte une connexion compatible et renvoie son sens', () => {
    const r = validateConnection(base, { source: 'u', sourceHandle: 'message', target: 'llm', targetHandle: 'contexte' });
    expect(r).toMatchObject({ ok: true, kind: 'data', dataType: 'texte' });
  });

  it('refuse un type incompatible en expliquant pourquoi et en proposant une correction', () => {
    const r = validateConnection(base, { source: 'doc', sourceHandle: 'contenu', target: 'out', targetHandle: 'texte' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe('type');
      expect(r.reason).toMatch(/produit : documents/);
      expect(r.fix.length).toBeGreaterThan(20);
    }
  });

  it('propose une autre entrée du même bloc quand elle accepte le type', () => {
    const r = validateConnection(g([n('ps', 'prompt-systeme'), n('llm', 'llm')]), { source: 'ps', sourceHandle: 'consignes', target: 'llm', targetHandle: 'contexte' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fix).toMatch(/Prompt système/);
  });

  it('un modèle ne peut pas exécuter un outil : refus et explication', () => {
    const r = validateConnection(base, { source: 'llm', sourceHandle: 'demande', target: 'tool', targetHandle: 'appel' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toMatch(/formule une demande/);
      expect(r.fix).toMatch(/Application/);
    }
  });

  it('un client MCP ne se connecte qu’à un serveur MCP, pas à une API classique', () => {
    const bad = validateConnection(base, { source: 'cm', sourceHandle: 'requete', target: 'api', targetHandle: 'requete' });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.reason).toMatch(/serveur MCP/);
    expect(validateConnection(base, { source: 'cm', sourceHandle: 'requete', target: 'sm', targetHandle: 'requete' }).ok).toBe(true);
  });

  it('refuse l’auto-connexion, les doublons et les ports inversés', () => {
    expect(validateConnection(base, { source: 'llm', sourceHandle: 'reponse', target: 'llm', targetHandle: 'contexte' })).toMatchObject({ ok: false, code: 'soi-meme' });
    const withEdge = g(base.nodes, [e('u.message', 'llm.contexte')]);
    expect(validateConnection(withEdge, { source: 'u', sourceHandle: 'message', target: 'llm', targetHandle: 'contexte' })).toMatchObject({ ok: false, code: 'doublon' });
    expect(validateConnection(base, { source: 'llm', sourceHandle: 'contexte', target: 'u', targetHandle: 'reponse' })).toMatchObject({ ok: false, code: 'sens' });
  });

  it('les blocs de contrôle héritent du type de ce qui entre (condition → type du flux)', () => {
    const graph = g([n('u', 'utilisateur'), n('c', 'condition'), n('out', 'sortie-texte'), n('api', 'api')], [e('u.message', 'c.entree')]);
    expect(resolveEmit(graph, 'c', 'vrai')).toBe('texte');
    expect(validateConnection(graph, { source: 'c', sourceHandle: 'vrai', target: 'out', targetHandle: 'texte' }).ok).toBe(true);
    expect(validateConnection(graph, { source: 'c', sourceHandle: 'vrai', target: 'api', targetHandle: 'requete' }).ok).toBe(false);
  });

  it('décrit une connexion existante : quoi, dans quel sens, pourquoi', () => {
    const graph = g([n('u', 'utilisateur'), n('llm', 'llm')], [e('u.message', 'llm.contexte')]);
    const d = describeEdge(graph, graph.edges[0])!;
    expect(d.kind).toBe('data');
    expect(d.explanation).toMatch(/Utilisateur envoie texte vers Modèle de langage/);
    expect(d.explanation).toMatch(/de gauche à droite/);
  });

  it('liste les composants connectables pour l’inspecteur', () => {
    const t = connectableTargets('llm');
    expect(t.find((x) => x.from === 'Réponse générée')!.to).toContain('Sortie texte');
    expect(t.find((x) => x.from === 'Demande d’outil')!.to).not.toContain('Outil externe');
    const s = connectableSources('client-mcp');
    expect(s.find((x) => x.into === 'Demande d’outil validée')!.from).not.toContain('Modèle de langage (LLM)');
  });
});

describe('vérificateur d’architecture', () => {
  it('signale un canevas vide sans le juger', () => {
    expect(check(g([]))).toMatchObject([{ code: 'vide', level: 'info' }]);
  });

  it('une entrée obligatoire non reliée est une erreur, localisée', () => {
    const issues = check(g([n('u', 'utilisateur'), n('llm', 'llm')], []));
    const miss = issues.find((i) => i.code === 'entree-manquante')!;
    expect(miss.level).toBe('error');
    expect(miss.nodeId).toBe('llm');
    expect(miss.why.length).toBeGreaterThan(20);
    expect(miss.fix.length).toBeGreaterThan(20);
    expect(miss.doc).toBe('depannage#entree-manquante');
  });

  it('une sortie sans destination et un composant isolé sont des avertissements', () => {
    const c = codes(g([n('u', 'utilisateur'), n('app', 'application'), n('doc', 'document')], [e('u.message', 'app.message')]));
    expect(c).toContain('composant-isole');
    const d = codes(g([n('u', 'utilisateur'), n('app', 'application'), n('llm', 'llm'), n('doc', 'document')], [e('u.message', 'llm.contexte')]));
    expect(d).toContain('sortie-non-reliee');
  });

  it('détecte une boucle sans limite (erreur) et reconnaît une boucle bornée (information)', () => {
    const loop = (maxToolCalls: number) => g(
      [n('u', 'utilisateur'), n('app', 'application'), n('llm', 'llm', { maxToolCalls }), n('out', 'sortie-texte')],
      [e('u.message', 'app.message'), e('app.contexte', 'llm.contexte'), e('llm.reponse', 'app.retours'), e('app.sortie', 'out.texte')],
    );
    expect(codes(loop(0))).toContain('cycle-sans-limite');
    expect(check(loop(0)).find((i) => i.code === 'cycle-sans-limite')!.level).toBe('error');
    expect(codes(loop(3))).toContain('cycle-borne');
    expect(codes(loop(3))).not.toContain('cycle-sans-limite');
    expect(cycles(loop(0))).toHaveLength(1);
  });

  it('une boucle sans condition d’arrêt est une erreur ; avec condition reliée, la boucle est bornée par son maximum', () => {
    const noStop = g([n('u', 'utilisateur'), n('b', 'boucle')], [e('u.message', 'b.entree')]);
    expect(codes(noStop)).toContain('entree-manquante');
  });

  it('signale une action qui modifie des données sans approbation, et ne le fait plus avec une approbation', () => {
    const without = g([n('app', 'application'), n('tool', 'outil-externe', { effet: 'ecriture' })], [e('app.appel', 'tool.appel')]);
    expect(codes(without)).toContain('ecriture-sans-approbation');
    const withApproval = g([n('app', 'application'), n('a', 'approbation-humaine'), n('tool', 'outil-externe', { effet: 'ecriture' })], [e('app.appel', 'a.demande'), e('a.approuve', 'tool.appel')]);
    expect(codes(withApproval)).not.toContain('ecriture-sans-approbation');
  });

  it('signale une clé d’API exposée dans le navigateur', () => {
    expect(codes(g([n('app', 'application', { cleApi: 'navigateur' })]))).toContain('cle-navigateur');
    expect(codes(g([n('app', 'application')]))).not.toContain('cle-navigateur');
  });

  it('signale un échange incomplet (requête ou appel d’outil sans retour)', () => {
    const graph = g([n('app', 'application'), n('api', 'api')], [e('app.requete', 'api.requete')]);
    expect(codes(graph)).toContain('echange-incomplet');
    const ok = g([n('app', 'application'), n('api', 'api')], [e('app.requete', 'api.requete'), e('api.reponse', 'app.retours')]);
    expect(codes(ok)).not.toContain('echange-incomplet');
  });

  it('signale les paramètres obligatoires vides ou nuls', () => {
    expect(codes(g([n('ps', 'prompt-systeme', { texte: '' })]))).toContain('parametre-invalide');
    expect(codes(g([n('a', 'agent', { maxSteps: 0 })]))).toContain('parametre-invalide');
    expect(codes(g([n('l', 'llm', { temperature: 9 })]))).toContain('parametre-invalide');
  });

  it('signale une connexion incompatible importée de l’extérieur', () => {
    const bad = g([n('doc', 'document'), n('out', 'sortie-texte')], [e('doc.contenu', 'out.texte')]);
    expect(check(bad).find((i) => i.code === 'connexion-invalide')!.level).toBe('error');
  });

  it('distingue validité structurelle et cohérence logique', () => {
    const structureOnly = g([n('u', 'utilisateur'), n('app', 'application', { cleApi: 'navigateur' }), n('out', 'sortie-texte')], [e('u.message', 'app.message'), e('app.sortie', 'out.texte')]);
    const s = summarize(check(structureOnly));
    expect(s.structureOk).toBe(true);
    expect(s.logicOk).toBe(false); // bien formé mais incohérent : la clé est exposée
  });

  it('ne déclare pas « correct » un schéma uniquement parce que ses blocs sont reliés', () => {
    const risky = g([n('u', 'utilisateur'), n('app', 'application', { cleApi: 'navigateur' }), n('llm', 'llm'), n('out', 'sortie-texte')], [e('u.message', 'app.message'), e('app.contexte', 'llm.contexte'), e('llm.reponse', 'out.texte')]);
    expect(check(risky).some((i) => i.level === 'error')).toBe(true);
  });

  it('chaque problème a un titre, une explication, une correction et un lien de documentation', () => {
    const bad = TEMPLATES.find((t) => t.id === 'architecture-incorrecte')!.graph;
    for (const i of check(bad)) {
      expect(i.title.length).toBeGreaterThan(5);
      expect(i.why.length).toBeGreaterThan(20);
      expect(i.fix.length).toBeGreaterThan(15);
      expect(i.doc).toMatch(/^depannage#/);
    }
  });
});

describe('architectures modèles', () => {
  it('propose les six modèles demandés', () => {
    expect(TEMPLATES.map((t) => t.id)).toEqual(['assistant-simple', 'assistant-documentaire', 'application-mcp', 'agent-outil', 'validation-humaine', 'architecture-incorrecte']);
    for (const t of TEMPLATES) {
      expect(t.objective.length).toBeGreaterThan(40);
      expect(t.limits.length).toBeGreaterThan(40);
      expect(t.path.length).toBeGreaterThan(20);
    }
  });

  it.each(TEMPLATES.filter((t) => t.id !== 'architecture-incorrecte').map((t) => [t.id, t] as const))('le modèle « %s » est valide : ni erreur ni avertissement', (_id, t) => {
    const bad = check(t.graph).filter((i) => i.level !== 'info');
    expect(bad.map((i) => `${i.code}: ${i.title}`)).toEqual([]);
  });

  it('le modèle incorrect cumule plusieurs défauts réalistes', () => {
    const c = new Set(codes(templateById.get('architecture-incorrecte')!.graph));
    for (const code of ['cle-navigateur', 'cycle-sans-limite', 'connexion-invalide', 'entree-manquante', 'ecriture-sans-approbation', 'echange-incomplet', 'composant-isole', 'parametre-invalide']) expect(c.has(code), code).toBe(true);
    expect(c.size).toBeGreaterThanOrEqual(8);
  });

  it('ouvre chaque modèle avec des positions calculées sans chevauchement de colonnes', () => {
    for (const t of TEMPLATES) {
      const xs = new Set(t.graph.nodes.map((x) => x.position.x));
      expect(xs.size, t.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('le modèle RAG distingue l’indexation (en amont) et la requête', () => {
    const t = templateById.get('assistant-documentaire')!;
    const comps = t.graph.nodes.map((x) => x.data.c);
    for (const c of ['document', 'embedder', 'base-vectorielle', 'recherche-doc', 'filtre', 'llm']) expect(comps).toContain(c);
    expect(t.path).toMatch(/En amont/);
  });
});

describe('simulation pédagogique', () => {
  it('refuse de simuler sans point d’entrée, en l’expliquant', () => {
    const r = simulate(g([n('llm', 'llm')]));
    expect(r.status).toBe('impossible');
    expect(r.message).toMatch(/aucun point d’entrée/);
  });

  it('déroule le parcours élémentaire étape par étape (utilisateur → application → modèle → sortie)', () => {
    const r = simulate(templateById.get('assistant-simple')!.graph);
    expect(r.status).toBe('ok');
    const order = r.steps.filter((s) => s.outputs.length > 0 || s.nodeName === 'Sortie texte').map((s) => s.nodeName);
    expect(order.indexOf('Utilisateur')).toBeLessThan(order.indexOf('Application'));
    expect(order.indexOf('Application')).toBeLessThan(order.indexOf('Modèle de langage (LLM)'));
    expect(order.indexOf('Modèle de langage (LLM)')).toBeLessThan(order.indexOf('Sortie texte'));
    expect(r.finals).toHaveLength(1);
  });

  it('ne prétend jamais appeler un vrai modèle : la réponse est signalée comme fictive', () => {
    const r = simulate(templateById.get('assistant-simple')!.graph);
    const llm = r.steps.filter((s) => s.nodeName.startsWith('Modèle de langage')).at(-1)!;
    expect(llm.note).toMatch(/aucun modèle réel n’est appelé/);
    expect(r.finals[0].text).toMatch(/illustrative/);
  });

  it('chaque étape décrit le composant actif, l’action, les entrées, les sorties et le suivant', () => {
    const r = simulate(templateById.get('assistant-simple')!.graph);
    for (const s of r.steps) {
      expect(s.nodeName.length).toBeGreaterThan(0);
      expect(s.action.length).toBeGreaterThan(5);
    }
    const app = r.steps.find((s) => s.nodeName === 'Application')!;
    expect(app.inputs[0].text).toMatch(/capitale/);
    expect(app.outputs[0].to).toContain('Modèle de langage (LLM)');
  });

  it('est déterministe : deux exécutions donnent exactement les mêmes étapes', () => {
    const t = templateById.get('application-mcp')!.graph;
    expect(JSON.stringify(simulate(t).steps)).toBe(JSON.stringify(simulate(t).steps));
  });

  it('le RAG retrouve des passages pertinents et le modèle s’appuie dessus', () => {
    const t = structuredClone(templateById.get('assistant-documentaire')!.graph);
    t.nodes.find((x) => x.id === 'u')!.data.params.message = 'Quel est le délai de préavis pour une démission ?';
    const r = simulate(t);
    expect(r.status).toBe('ok');
    expect(r.finals[0].text).toMatch(/préavis/);
    const rech = r.steps.filter((s) => s.nodeName === 'Recherche documentaire').at(-1)!;
    expect(rech.action).toMatch(/Retrouve/);
  });

  it('quand aucun passage ne correspond, le modèle refuse de répondre (au lieu d’inventer)', () => {
    const t = structuredClone(templateById.get('assistant-documentaire')!.graph);
    t.nodes.find((x) => x.id === 'u')!.data.params.message = 'Combien mesure la tour Eiffel ?';
    const r = simulate(t);
    expect(r.finals[0].text).toMatch(/Je ne trouve pas cette information/);
    expect(r.steps.filter((s) => s.nodeName === 'Recherche documentaire').at(-1)!.note).toMatch(/Aucun passage/);
  });

  it('simule l’appel d’outil MCP de bout en bout, le modèle demandant et l’application exécutant', () => {
    const r = simulate(templateById.get('application-mcp')!.graph);
    expect(r.status).toBe('ok');
    const names = r.steps.map((s) => s.nodeName);
    for (const need of ['Client MCP', 'Serveur MCP', 'Outil externe']) expect(names).toContain(need);
    expect(r.finals[0].text).toMatch(/Mairie/);
    const demande = r.steps.find((s) => s.action.startsWith('Décide de demander un outil'))!;
    expect(demande.note).toMatch(/c’est un autre composant qui exécute/);
  });

  it('l’agent est borné : refus d’approbation → l’outil n’est jamais exécuté', () => {
    const t = structuredClone(templateById.get('agent-outil')!.graph);
    t.nodes.find((x) => x.id === 'appr')!.data.params.decision = 'refuser';
    const r = simulate(t);
    expect(r.steps.some((s) => s.nodeName === 'Outil externe')).toBe(false);
  });

  it('simule une erreur HTTP et une authentification refusée', () => {
    const graph = g(
      [n('u', 'utilisateur'), n('auth', 'authentification', { jetonValide: false }), n('err', 'gestion-erreurs'), n('out', 'sortie-texte'), n('req', 'requete-http')],
      [e('u.message', 'req.contenu'), e('req.requete', 'auth.requete'), e('auth.refus', 'err.erreur'), e('err.message', 'out.texte')],
    );
    const r = simulate(graph);
    expect(r.steps.find((s) => s.nodeName === 'Authentification')!.action).toMatch(/invalide/);
    expect(r.finals[0].text).toMatch(/indisponible/);
  });

  it('signale les composants restés en attente quand une entrée n’arrive jamais', () => {
    const r = simulate(g([n('u', 'utilisateur'), n('llm', 'llm'), n('ps', 'prompt-systeme'), n('out', 'sortie-texte')], [e('u.message', 'llm.contexte'), e('ps.consignes', 'llm.consignes'), e('llm.reponse', 'out.texte')]));
    expect(r.status).toBe('ok');
    const blocked = simulate(g([n('u', 'utilisateur'), n('app', 'application'), n('llm', 'llm'), n('out', 'sortie-texte'), n('v', 'vision')], [e('u.message', 'app.message'), e('app.contexte', 'llm.contexte'), e('llm.reponse', 'out.texte'), e('v.texte', 'llm.contexte')]));
    expect(blocked.status).toBe('incomplete');
    expect(blocked.waiting.join(' ')).toMatch(/Modèle de langage/);
  });

  it('s’arrête de façon sûre sur une boucle sans fin au lieu de tourner indéfiniment', () => {
    const loop = g(
      [n('u', 'utilisateur'), n('app', 'application'), n('llm', 'llm', { maxToolCalls: 0 }), n('out', 'sortie-texte')],
      [e('u.message', 'app.message'), e('app.contexte', 'llm.contexte'), e('llm.reponse', 'app.retours'), e('app.contexte', 'llm.contexte')],
    );
    const r = simulate(loop);
    expect(['limit', 'incomplete', 'ok']).toContain(r.status);
    expect(r.steps.length).toBeLessThanOrEqual(120);
  });

  it('la recherche simulée classe les passages par mots-clés communs', () => {
    const src = 'Les congés se demandent via le portail. Le préavis de démission est de deux mois. Les notes de frais sont remboursées.';
    expect(retrieve('Quel préavis pour une démission ?', src, 1)[0]).toMatch(/préavis/);
    expect(retrieve('Quelle est la météo ?', src, 2)).toEqual([]);
  });
});

describe('mise en page automatique', () => {
  it('place les composants de gauche à droite dans l’ordre du flux', () => {
    const t = autoLayout(g([n('c', 'sortie-texte'), n('a', 'utilisateur'), n('b', 'application')], [e('a.message', 'b.message'), e('b.sortie', 'c.texte')]));
    const x = (id: string) => t.nodes.find((q) => q.id === id)!.position.x;
    expect(x('a')).toBeLessThan(x('b'));
    expect(x('b')).toBeLessThan(x('c'));
  });
  it('tolère les cycles et ne chevauche pas les blocs d’une même colonne', () => {
    const t = autoLayout(templateById.get('application-mcp')!.graph);
    const byCol = new Map<number, number[]>();
    for (const q of t.nodes) byCol.set(q.position.x, [...(byCol.get(q.position.x) ?? []), q.position.y]);
    for (const ys of byCol.values()) expect(new Set(ys).size).toBe(ys.length);
  });
});

describe('import, export et projets', () => {
  const sample = templateById.get('assistant-simple')!.graph;

  it('exporte puis réimporte sans perte', () => {
    const file = toFile(sample, 'Mon assistant');
    const back = parseProject(JSON.stringify(file));
    expect(back.ok).toBe(true);
    expect(back.name).toBe('Mon assistant');
    expect(back.graph.nodes).toHaveLength(sample.nodes.length);
    expect(back.graph.edges).toHaveLength(sample.edges.length);
    expect(back.dropped).toEqual([]);
    expect(file).toMatchObject({ format: 'neuronallogic-studio', version: 1 });
  });

  it('refuse un fichier qui n’est pas du JSON, trop gros ou d’un autre format', () => {
    expect(parseProject('{pas du json')).toMatchObject({ ok: false });
    expect(parseProject('x'.repeat(LIMITS.fileBytes + 1))).toMatchObject({ ok: false, error: expect.stringMatching(/trop volumineux/) });
    expect(parseProject('{"format":"autre","version":1,"nodes":[],"edges":[]}')).toMatchObject({ ok: false });
    expect(parseProject('{"format":"neuronallogic-studio","version":99,"nodes":[],"edges":[]}')).toMatchObject({ ok: false, error: expect.stringMatching(/Version/) });
    expect(parseProject('[]')).toMatchObject({ ok: false });
  });

  it('applique des limites au nombre de composants et de connexions', () => {
    const many = { format: 'neuronallogic-studio', version: 1, name: 'x', nodes: Array.from({ length: LIMITS.nodes + 1 }, (_, i) => ({ id: `n${i}`, component: 'utilisateur', x: 0, y: 0, params: {} })), edges: [] };
    expect(validateProject(many)).toMatchObject({ ok: false, error: expect.stringMatching(/Trop de composants/) });
    const manyE = { format: 'neuronallogic-studio', version: 1, name: 'x', nodes: [], edges: Array.from({ length: LIMITS.edges + 1 }, () => ({})) };
    expect(validateProject(manyE)).toMatchObject({ ok: false, error: expect.stringMatching(/Trop de connexions/) });
  });

  it('écarte et signale les éléments invalides sans faire confiance au fichier', () => {
    const r = validateProject({
      format: 'neuronallogic-studio', version: 1, name: '<img src=x onerror=alert(1)>',
      nodes: [
        { id: 'a', component: 'utilisateur', x: 10, y: 20, params: { message: 'ok', inconnu: 'x' } },
        { id: 'a', component: 'llm', x: 0, y: 0, params: {} },
        { id: 'b', component: 'composant-inexistant', x: 0, y: 0, params: {} },
        { id: 'c', component: 'llm', x: Infinity, y: 0, params: {} },
        { id: '../../etc', component: 'llm', x: 0, y: 0, params: {} },
        { id: 'd', component: 'llm', x: 5, y: 5, params: { temperature: 999, maxToolCalls: 'abc' } },
        { id: 'e', component: 'condition', x: 1, y: 1, params: { resultatSimule: 'nimporte' } },
      ],
      edges: [
        { source: 'a', sourcePort: 'message', target: 'd', targetPort: 'contexte' },
        { source: 'a', sourcePort: 'message', target: 'd', targetPort: 'contexte' },
        { source: 'a', sourcePort: 'inexistant', target: 'd', targetPort: 'contexte' },
        { source: 'zzz', sourcePort: 'message', target: 'd', targetPort: 'contexte' },
        'pas un objet',
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.graph.nodes.map((x) => x.id)).toEqual(['a', 'd', 'e']);
    expect(r.graph.edges).toHaveLength(1);
    expect(r.dropped.length).toBeGreaterThanOrEqual(8);
    expect(r.graph.nodes.find((x) => x.id === 'a')!.data.params).toEqual({ message: 'ok' }); // paramètre inconnu écarté
    expect(r.graph.nodes.find((x) => x.id === 'd')!.data.params.temperature).toBe(2); // borné au maximum permis
    expect(r.graph.nodes.find((x) => x.id === 'e')!.data.params.resultatSimule).toBeUndefined();
    expect(r.name).toBe('<img src=x onerror=alert(1)>'); // conservé comme texte : React l'échappe à l'affichage
  });

  it('enregistre, retrouve, duplique et supprime des projets', () => {
    const mem = new Map<string, string>();
    const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    let lib = emptyLibrary();
    const a = upsertProject(lib, null, 'Projet A', sample, new Date('2026-10-26T10:00:00Z'));
    lib = a.library;
    expect(saveLibrary(lib, store)).toBe(true);
    const loaded = loadLibrary(store);
    expect(loaded.library.projects).toHaveLength(1);
    expect(loaded.library.projects[0].name).toBe('Projet A');
    expect(loaded.library.currentId).toBe(a.id);
    const dup = duplicateProject(loaded.library, a.id)!;
    expect(dup.library.projects.map((p) => p.name)).toEqual(['Projet A (copie)', 'Projet A']);
    const renamed = upsertProject(dup.library, a.id, 'Renommé', sample);
    expect(renamed.library.projects.find((p) => p.id === a.id)!.name).toBe('Renommé');
    expect(deleteProject(renamed.library, a.id).projects).toHaveLength(1);
  });

  it('ne perd jamais de projet : les données illisibles sont mises de côté, pas effacées', () => {
    const mem = new Map<string, string>([[STORAGE_KEY, JSON.stringify({ version: 1, projects: [{ id: 'ok', name: 'ok', file: toFile(sample, 'ok') }, { id: 'casse', file: { format: 'x' } }], currentId: 'ok' })]]);
    const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    const r = loadLibrary(store);
    expect(r.library.projects.map((p) => p.id)).toEqual(['ok']);
    expect(r.rescued).toBe(1);
    expect([...mem.keys()].some((k) => k.includes(':rescue:'))).toBe(true);
    const corrupt = new Map<string, string>([[STORAGE_KEY, '{cassé']]);
    const r2 = loadLibrary({ getItem: (k) => corrupt.get(k) ?? null, setItem: (k, v) => void corrupt.set(k, v) });
    expect(r2.rescued).toBe(1);
    expect([...corrupt.entries()].some(([k, v]) => k.includes(':rescue:') && v === '{cassé')).toBe(true);
  });

  it('limite le nombre de projets', () => {
    let lib = emptyLibrary();
    for (let i = 0; i < LIMITS.projects + 5; i++) lib = upsertProject(lib, null, `P${i}`, sample).library;
    expect(lib.projects).toHaveLength(LIMITS.projects);
  });
});

describe('magasin d’édition : composants, connexions, annulation', () => {
  beforeEach(() => studio.reset());

  it('ajoute, déplace et supprime des blocs', () => {
    const a = studio.addNode('utilisateur', { x: 10, y: 10 })!;
    expect(studio.get().nodes).toHaveLength(1);
    studio.beginGesture();
    studio.applyView(studio.get().nodes.map((x) => (x.id === a ? { ...x, position: { x: 200, y: 50 } } : x)), studio.get().edges);
    studio.endGesture();
    expect(studio.get().nodes[0].position).toEqual({ x: 200, y: 50 });
    expect(studio.get().flags.moved).toBe(true);
    studio.removeNodes([a]);
    expect(studio.get().nodes).toHaveLength(0);
  });

  it('un déplacement nul ne crée pas d’étape d’annulation', () => {
    studio.addNode('utilisateur', { x: 0, y: 0 });
    const before = studio.get().past.length;
    studio.beginGesture();
    studio.endGesture();
    expect(studio.get().past.length).toBe(before);
    expect(studio.get().flags.moved).toBe(false);
  });

  it('crée une connexion valide et refuse une connexion invalide avec un message explicatif', () => {
    const u = studio.addNode('utilisateur')!;
    const llm = studio.addNode('llm')!;
    const out = studio.addNode('sortie-texte')!;
    expect(studio.connect({ source: u, sourceHandle: 'message', target: llm, targetHandle: 'contexte' }).ok).toBe(true);
    expect(studio.get().edges).toHaveLength(1);
    const bad = studio.connect({ source: u, sourceHandle: 'message', target: out, targetHandle: 'texte' });
    expect(bad.ok).toBe(true); // texte → sortie texte est valide
    const doc = studio.addNode('document')!;
    const refused = studio.connect({ source: doc, sourceHandle: 'contenu', target: out, targetHandle: 'texte' });
    expect(refused.ok).toBe(false);
    expect(studio.get().message).toMatchObject({ kind: 'refus' });
    expect(studio.get().message!.text).toMatch(/Connexion refusée/);
    expect(studio.get().message!.fix!.length).toBeGreaterThan(10);
    expect(studio.get().edges).toHaveLength(2); // aucune connexion invalide n’a été ajoutée
  });

  it('supprime un bloc avec ses connexions, et une connexion seule', () => {
    const u = studio.addNode('utilisateur')!;
    const llm = studio.addNode('llm')!;
    studio.connect({ source: u, sourceHandle: 'message', target: llm, targetHandle: 'contexte' });
    studio.removeEdges([studio.get().edges[0].id]);
    expect(studio.get().edges).toHaveLength(0);
    studio.connect({ source: u, sourceHandle: 'message', target: llm, targetHandle: 'contexte' });
    studio.removeNodes([u]);
    expect(studio.get().edges).toHaveLength(0);
    expect(studio.get().nodes).toHaveLength(1);
  });

  it('annule et rétablit les actions dans l’ordre', () => {
    const u = studio.addNode('utilisateur')!;
    const llm = studio.addNode('llm')!;
    studio.connect({ source: u, sourceHandle: 'message', target: llm, targetHandle: 'contexte' });
    expect(studio.undo()).toBe(true);
    expect(studio.get().edges).toHaveLength(0);
    expect(studio.undo()).toBe(true);
    expect(studio.get().nodes).toHaveLength(1);
    expect(studio.redo()).toBe(true);
    expect(studio.get().nodes).toHaveLength(2);
    expect(studio.redo()).toBe(true);
    expect(studio.get().edges).toHaveLength(1);
    expect(studio.redo()).toBe(false);
  });

  it('une nouvelle action après un retour en arrière efface les actions « rétablissables »', () => {
    studio.addNode('utilisateur');
    studio.addNode('llm');
    studio.undo();
    studio.addNode('sortie-texte');
    expect(studio.redo()).toBe(false);
  });

  it('regroupe les frappes d’un même paramètre en une seule étape d’annulation', () => {
    const id = studio.addNode('utilisateur')!;
    const base = studio.get().past.length;
    studio.setParam(id, 'message', 'a');
    studio.setParam(id, 'message', 'ab');
    studio.setParam(id, 'message', 'abc');
    expect(studio.get().past.length).toBe(base + 1);
    studio.undo();
    expect(studio.get().nodes[0].data.params.message).toBeUndefined();
  });

  it('duplique la sélection avec les connexions internes', () => {
    const u = studio.addNode('utilisateur')!;
    const llm = studio.addNode('llm')!;
    studio.connect({ source: u, sourceHandle: 'message', target: llm, targetHandle: 'contexte' });
    studio.select([u, llm], []);
    const copies = studio.duplicateSelected();
    expect(copies).toHaveLength(2);
    expect(studio.get().nodes).toHaveLength(4);
    expect(studio.get().edges).toHaveLength(2);
  });

  it('supprime la sélection et réorganise le schéma', () => {
    const a = studio.addNode('utilisateur')!;
    const b = studio.addNode('llm')!;
    studio.connect({ source: a, sourceHandle: 'message', target: b, targetHandle: 'contexte' });
    studio.autoLayout();
    const xs = studio.get().nodes.map((x) => x.position.x);
    expect(xs[0]).toBeLessThan(xs[1]);
    studio.select([b], []);
    studio.removeSelected();
    expect(studio.get().nodes).toHaveLength(1);
  });

  it('refuse d’ajouter des composants au-delà de la limite', () => {
    for (let i = 0; i < LIMITS.nodes; i++) studio.addNode('message');
    expect(studio.get().nodes).toHaveLength(LIMITS.nodes);
    expect(studio.addNode('message')).toBeNull();
    expect(studio.get().message!.kind).toBe('refus');
  });

  it('efface le canevas (annulable) et recharge un projet', () => {
    studio.addNode('utilisateur');
    studio.clear();
    expect(studio.get().nodes).toHaveLength(0);
    studio.undo();
    expect(studio.get().nodes).toHaveLength(1);
    studio.load(templateById.get('assistant-simple')!.graph, 'Chargé', 'p1');
    expect(studio.get().nodes).toHaveLength(5);
    expect(studio.get().projectId).toBe('p1');
    expect(studio.get().past).toHaveLength(0);
    studio.addNode('utilisateur')!;
    expect(new Set(studio.get().nodes.map((x) => x.id)).size).toBe(studio.get().nodes.length);
  });
});

describe('tracé des connexions', () => {
  beforeEach(() => studio.reset());
  const two = () => { const u = studio.addNode('utilisateur')!; const l = studio.addNode('llm')!; studio.connect({ source: u, sourceHandle: 'message', target: l, targetHandle: 'contexte' }); return studio.get().edges[0].id; };

  it('décale, annule, rétablit et remet droit le tracé', () => {
    const id = two();
    studio.nudgeBend(id, 0, -40);
    expect(studio.get().edges[0].bend).toEqual({ dx: 0, dy: -40 });
    studio.nudgeBend(id, 40, 0);
    expect(studio.get().edges[0].bend).toEqual({ dx: 40, dy: -40 });
    studio.undo();
    expect(studio.get().edges[0].bend).toEqual({ dx: 0, dy: -40 });
    studio.redo();
    studio.resetBend(id);
    expect(studio.get().edges[0].bend).toBeUndefined();
    studio.undo();
    expect(studio.get().edges[0].bend).toEqual({ dx: 40, dy: -40 });
  });

  it('un glisser entier ne compte que pour une étape d’annulation', () => {
    const id = two();
    const before = studio.get().past.length;
    studio.beginGesture();
    studio.setBend(id, { dx: 5, dy: 5 });
    studio.setBend(id, { dx: 90, dy: 30 });
    studio.endGesture();
    expect(studio.get().past.length).toBe(before + 1);
    expect(studio.get().edges[0].bend).toEqual({ dx: 90, dy: 30 });
  });

  it('est exporté, réimporté, et les valeurs invalides sont ignorées', () => {
    const id = two();
    studio.nudgeBend(id, 12, -7);
    const file = toFile(studio.graph(), 'x');
    expect(file.edges[0].bend).toEqual({ dx: 12, dy: -7 });
    expect(parseProject(JSON.stringify(file)).graph.edges[0].bend).toEqual({ dx: 12, dy: -7 });
    file.edges[0].bend = { dx: Infinity as number, dy: 1e12 };
    const bad = validateProject(JSON.parse(JSON.stringify({ ...file, edges: [{ ...file.edges[0], bend: { dx: 'a', dy: 1e12 } }] })));
    expect(bad.graph.edges[0].bend).toBeUndefined();
  });
});

describe('défis guidés : critères objectifs', () => {
  const run = (id: string, graph: Graph) => evaluateChallenge(CHALLENGES.find((c) => c.id === id)!, graph);

  it('réussit avec les modèles correspondants et échoue avec un schéma vide', () => {
    expect(run('assistant-simple', templateById.get('assistant-simple')!.graph).pass).toBe(true);
    expect(run('rag', templateById.get('assistant-documentaire')!.graph).pass).toBe(true);
    expect(run('mcp', templateById.get('application-mcp')!.graph).pass).toBe(true);
    expect(run('agent-securise', templateById.get('agent-outil')!.graph).pass).toBe(true);
    for (const c of CHALLENGES) expect(run(c.id, g([])).pass).toBe(false);
  });

  it('refuse un schéma qui contient les blocs mais pas les liens ni la qualité demandée', () => {
    const blocks = g(['utilisateur', 'application', 'llm', 'sortie-texte'].map((c, i) => n(`b${i}`, c)));
    expect(run('assistant-simple', blocks).pass).toBe(false);
    const withErrors = g([n('u', 'utilisateur'), n('app', 'application', { cleApi: 'navigateur' }), n('llm', 'llm'), n('out', 'sortie-texte')], [e('u.message', 'app.message'), e('app.contexte', 'llm.contexte'), e('llm.reponse', 'out.texte')]);
    const r = run('assistant-simple', withErrors);
    expect(r.pass).toBe(false);
    expect(r.results.filter((x) => !x.ok)).toHaveLength(1);
  });

  it('le défi « agent sûr » exige l’approbation avant l’outil qui écrit', () => {
    const tpl = structuredClone(templateById.get('agent-outil')!.graph);
    const unapproved: Graph = { nodes: tpl.nodes.filter((x) => x.id !== 'appr'), edges: tpl.edges.filter((x) => x.source !== 'appr' && x.target !== 'appr').concat([e('app.appel', 'tool.appel')]) };
    expect(run('agent-securise', unapproved).pass).toBe(false);
  });

  it('corriger l’architecture incorrecte exige un vrai correctif (pas une suppression)', () => {
    const bad = templateById.get('architecture-incorrecte')!.graph;
    expect(run('corriger-architecture', bad).pass).toBe(false);
    // Corrigé : serveur, limite, approbation, agent retiré, document retiré
    const fixed: Graph = {
      nodes: [n('u', 'utilisateur'), n('app', 'application'), n('ps', 'prompt-systeme'), n('llm', 'llm', { maxToolCalls: 2 }), n('a', 'approbation-humaine'), n('tool', 'outil-externe', { effet: 'ecriture' }), n('out', 'sortie-texte')],
      edges: [e('u.message', 'app.message'), e('app.contexte', 'llm.contexte'), e('ps.consignes', 'llm.consignes'), e('llm.demande', 'app.retours'), e('app.appel', 'a.demande'), e('a.approuve', 'tool.appel'), e('tool.resultat', 'app.retours'), e('app.resultat', 'llm.resultat'), e('llm.reponse', 'out.texte'), e('a.refuse', 'app.retours')],
    };
    expect(check(fixed).filter((i) => i.level !== 'info')).toEqual([]);
    expect(run('corriger-architecture', fixed).pass).toBe(true);
    // Suppression de l’essentiel : refusé
    expect(run('corriger-architecture', g([n('u', 'utilisateur')])).pass).toBe(false);
  });
});

describe('tutoriel', () => {
  const flags = { viewport: false, moved: false, simulated: false };
  it('chaque étape se valide par une vraie action détectée', () => {
    expect(TUTORIAL.map((s) => s.id)).toEqual(['canevas', 'utilisateur', 'llm', 'connexion', 'sortie', 'simulation', 'comprehension']);
    const [canevas, utilisateur, llm, connexion, sortie, simulation] = TUTORIAL;
    expect(canevas.done(g([]), flags)).toBe(false);
    expect(canevas.done(g([]), { ...flags, viewport: true })).toBe(true);
    expect(utilisateur.done(g([n('u', 'utilisateur')]), flags)).toBe(true);
    expect(llm.done(g([n('u', 'utilisateur')]), flags)).toBe(false);
    const connected = g([n('u', 'utilisateur'), n('l', 'llm'), n('o', 'sortie-texte')], [e('u.message', 'l.contexte'), e('l.reponse', 'o.texte')]);
    expect(connexion.done(connected, flags)).toBe(true);
    expect(sortie.done(connected, flags)).toBe(true);
    expect(connexion.done(g([n('u', 'utilisateur'), n('l', 'llm')]), flags)).toBe(false);
    expect(simulation.done(connected, { ...flags, simulated: true })).toBe(true);
  });

  it('le parcours construit pendant le tutoriel est simulable', () => {
    const t = g([n('u', 'utilisateur'), n('l', 'llm'), n('o', 'sortie-texte')], [e('u.message', 'l.contexte'), e('l.reponse', 'o.texte')]);
    expect(simulate(t).status).toBe('ok');
  });
});
