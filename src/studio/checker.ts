import { findNode, nodeDef, validateConnection } from './connections';
import { componentById } from './data/components';
import type { Graph, Issue, Level, SNode } from './types';

/** Valeur effective d'un paramètre (valeur saisie, sinon valeur par défaut). */
export function param(n: SNode, key: string): string | number | boolean | undefined {
  const v = n.data.params[key];
  if (v !== undefined) return v;
  return nodeDef(n)?.params.find((p) => p.key === key)?.default;
}

const name = (n: SNode) => nodeDef(n)?.name ?? n.data.c;

/** Composants amont d'un nœud (tous les ascendants). */
function ancestors(g: Graph, id: string): Set<string> {
  const seen = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const e of g.edges) if (e.target === cur && !seen.has(e.source)) { seen.add(e.source); stack.push(e.source); }
  }
  return seen;
}

/** Composantes fortement connexes de plus d'un nœud (= cycles), algorithme de Tarjan. */
export function cycles(g: Graph): string[][] {
  const adj = new Map<string, string[]>();
  for (const n of g.nodes) adj.set(n.id, []);
  for (const e of g.edges) adj.get(e.source)?.push(e.target);
  let index = 0;
  const idx = new Map<string, number>();
  const low = new Map<string, number>();
  const on = new Set<string>();
  const stack: string[] = [];
  const out: string[][] = [];
  const strong = (v: string) => {
    idx.set(v, index); low.set(v, index); index++;
    stack.push(v); on.add(v);
    for (const w of adj.get(v) ?? []) {
      if (!idx.has(w)) { strong(w); low.set(v, Math.min(low.get(v)!, low.get(w)!)); }
      else if (on.has(w)) low.set(v, Math.min(low.get(v)!, idx.get(w)!));
    }
    if (low.get(v) === idx.get(v)) {
      const comp: string[] = [];
      let w: string;
      do { w = stack.pop()!; on.delete(w); comp.push(w); } while (w !== v);
      if (comp.length > 1) out.push(comp);
    }
  };
  for (const n of g.nodes) if (!idx.has(n.id)) strong(n.id);
  return out;
}

export interface CheckOptions {
  /** Règle d'exercice : toute action qui modifie des données doit avoir une approbation humaine en amont (déjà un avertissement par défaut). */
  requireApproval?: boolean;
}

const DOC = (code: string) => `depannage#${code}`;
const issue = (code: string, level: Level, family: Issue['family'], title: string, why: string, fix: string, extra: Partial<Issue> = {}): Issue => ({ code, level, family, title, why, fix, doc: DOC(code), ...extra });

/** Examine le diagramme. Chaque règle ci-dessous est réellement évaluée ; rien n'est « validé » parce que les blocs sont simplement reliés. */
export function check(g: Graph, _opts: CheckOptions = {}): Issue[] {
  const out: Issue[] = [];
  if (g.nodes.length === 0) {
    return [issue('vide', 'info', 'structure', 'Le canevas est vide', 'Il n’y a encore aucun composant à examiner.', 'Ajoute un composant depuis la bibliothèque (par exemple « Utilisateur »), ou ouvre une architecture modèle.')];
  }

  // 1. Connexions : chaque connexion doit être valide dans le contexte du diagramme.
  for (const e of g.edges) {
    const rest: Graph = { nodes: g.nodes, edges: g.edges.filter((x) => x.id !== e.id) };
    const r = validateConnection(rest, e);
    if (!r.ok) {
      out.push(issue('connexion-invalide', 'error', 'structure', 'Connexion incompatible', r.reason, r.fix, { edgeId: e.id, nodeId: e.target }));
    }
  }

  // 2. Entrées obligatoires non reliées.
  for (const n of g.nodes) {
    const def = nodeDef(n);
    if (!def) continue;
    for (const p of def.inputs) {
      if (p.required && !g.edges.some((e) => e.target === n.id && e.targetHandle === p.id)) {
        out.push(issue('entree-manquante', 'error', 'structure', `Entrée non reliée : « ${p.label} » de « ${def.name} »`, `« ${def.name} » a besoin de cette information pour fonctionner : sans elle, il ne produira rien d’utile.`, `Relie une sortie compatible (${p.accepts.includes('*') ? 'tout type' : p.accepts.join(', ')}) à l’entrée « ${p.label} ».`, { nodeId: n.id }));
      }
    }
  }

  // 3. Composant isolé, sortie sans destination.
  for (const n of g.nodes) {
    const def = nodeDef(n);
    if (!def) continue;
    const hasEdge = g.edges.some((e) => e.source === n.id || e.target === n.id);
    if (!hasEdge && g.nodes.length > 1) {
      out.push(issue('composant-isole', 'warning', 'structure', `« ${def.name} » n’est relié à rien`, 'Un composant sans aucune connexion ne participe pas à l’architecture : il est soit inutile, soit oublié.', 'Relie-le au reste du schéma ou supprime-le.', { nodeId: n.id }));
    } else if (hasEdge && def.outputs.length > 0 && !def.terminal && !g.edges.some((e) => e.source === n.id)) {
      out.push(issue('sortie-non-reliee', 'warning', 'structure', `Sortie sans destination : « ${def.name} »`, `Ce que produit « ${def.name} » ne va nulle part : le résultat de ce traitement est perdu.`, 'Relie une de ses sorties à la suite du parcours (ou à une Sortie texte / Fin de processus).', { nodeId: n.id }));
    }
  }

  // 4. Cycles : bornés par une limite positive, ou potentiellement infinis.
  for (const comp of cycles(g)) {
    const nodes = comp.map((id) => findNode(g, id)!).filter(Boolean);
    const guards = nodes.filter((n) => {
      const def = nodeDef(n);
      if (!def?.loopGuard) return false;
      const v = Number(param(n, def.loopGuard.param) ?? 0);
      return v > 0;
    });
    const label = nodes.map(name).join(' → ');
    if (guards.length === 0) {
      out.push(issue('cycle-sans-limite', 'error', 'logique', 'Boucle potentiellement infinie', `Le parcours revient sur lui-même (${label}) sans limite : rien ne garantit qu’il s’arrête, et chaque tour peut coûter du temps et de l’argent.`, 'Place un bloc Boucle (avec condition d’arrêt et nombre maximal d’itérations), ou fixe « Appels d’outils maximum » (modèle) / « Étapes maximum » (agent) à une valeur positive.', { nodeId: nodes[0].id }));
    } else {
      out.push(issue('cycle-borne', 'info', 'logique', 'Boucle bornée', `Le parcours contient une boucle (${label}), limitée par : ${guards.map(name).join(', ')}. C’est la bonne pratique ; le nombre maximal reste à choisir avec prudence.`, 'Vérifie que la limite correspond bien à ton besoin et prévois un message clair si elle est atteinte.', { nodeId: guards[0].id }));
    }
  }

  // 5. Paramètres obligatoires manquants ou hors limites.
  for (const n of g.nodes) {
    const def = nodeDef(n);
    if (!def) continue;
    for (const p of def.params) {
      const v = param(n, p.key);
      if (p.required && p.kind !== 'number' && (v === undefined || String(v).trim() === '')) {
        out.push(issue('parametre-invalide', 'warning', 'logique', `Paramètre vide : « ${p.label} » (${def.name})`, `Ce paramètre est obligatoire : ${p.help}`, `Renseigne « ${p.label} » dans l’inspecteur.`, { nodeId: n.id }));
      }
      if (p.kind === 'number') {
        const x = Number(v);
        if (Number.isNaN(x) || (p.min !== undefined && x < p.min) || (p.max !== undefined && x > p.max)) {
          out.push(issue('parametre-invalide', 'warning', 'logique', `Valeur hors limites : « ${p.label} » (${def.name})`, `La valeur doit être comprise entre ${p.min ?? '−∞'} et ${p.max ?? '∞'}.`, `Corrige la valeur de « ${p.label} ».`, { nodeId: n.id }));
        } else if (p.required && x <= 0) {
          out.push(issue('parametre-invalide', 'warning', 'logique', `Valeur nulle : « ${p.label} » (${def.name})`, `Ce paramètre sert de garde-fou : à zéro, il ne protège rien. ${p.help}`, `Choisis une valeur strictement positive pour « ${p.label} ».`, { nodeId: n.id }));
        }
      }
    }
  }

  // 6. Échanges incomplets : une requête ou un appel d'outil dont le retour n'est relié à rien.
  for (const e of g.edges) {
    const t = findNode(g, e.target);
    const s = findNode(g, e.source);
    if (!t || !s) continue;
    const tdef = nodeDef(t)!;
    const emit = nodeDef(s)?.outputs.find((p) => p.id === e.sourceHandle)?.emits;
    const back = emit === 'requete' ? tdef.outputs.filter((p) => p.emits === 'reponse') : emit === 'appel-outil' ? tdef.outputs.filter((p) => p.emits === 'resultat-outil') : [];
    if (back.length && !back.some((p) => g.edges.some((x) => x.source === t.id && x.sourceHandle === p.id))) {
      out.push(issue('echange-incomplet', 'warning', 'logique', `Aucun retour prévu depuis « ${tdef.name} »`, emit === 'requete' ? 'Une requête attend une réponse : sans retour relié, le demandeur ne reçoit jamais le résultat.' : 'Un appel d’outil produit un résultat qui doit revenir à l’application (puis au modèle) : sans retour, l’action est exécutée « dans le vide ».', `Relie la sortie « ${back[0].label} » de « ${tdef.name} » à un composant qui l’utilise.`, { nodeId: t.id }));
    }
  }

  // 7. Entrée et sortie du scénario.
  const hasEntry = g.nodes.some((n) => nodeDef(n)?.entry);
  if (!hasEntry) out.push(issue('pas-entree', 'warning', 'logique', 'Aucun point d’entrée', 'Rien ne déclenche l’architecture : aucune demande d’utilisateur, de formulaire ou d’entrée ne la met en mouvement.', 'Ajoute un composant « Utilisateur », « Entrée texte », « Formulaire » ou « Interface utilisateur ».'));
  const hasEnd = g.nodes.some((n) => nodeDef(n)?.terminal || n.data.c === 'utilisateur' || n.data.c === 'interface');
  if (!hasEnd) out.push(issue('pas-sortie', 'warning', 'logique', 'Aucune destination finale', 'Le résultat n’arrive nulle part où quelqu’un puisse le lire.', 'Ajoute une « Sortie texte », une « Interface utilisateur » ou une « Fin de processus » à la fin du parcours.'));

  // 8. Sécurité et bonnes pratiques.
  for (const n of g.nodes) {
    const def = nodeDef(n);
    if (!def) continue;
    if (n.data.c === 'application' && param(n, 'cleApi') === 'navigateur') {
      out.push(issue('cle-navigateur', 'error', 'logique', 'Clé d’API exposée dans le navigateur', 'Tout ce qui s’exécute dans le navigateur est lisible : n’importe quel visiteur pourrait récupérer la clé et l’utiliser à tes frais.', 'Place la clé côté serveur (variable d’environnement) et fais passer les appels par l’application serveur.', { nodeId: n.id }));
    }
    if (param(n, 'effet') === 'ecriture') {
      const anc = ancestors(g, n.id);
      const approved = [...anc].some((id) => findNode(g, id)?.data.c === 'approbation-humaine');
      if (!approved) {
        out.push(issue('ecriture-sans-approbation', 'warning', 'logique', `« ${def.name} » modifie des données sans approbation`, 'Une action qui modifie des données peut être irréversible : une erreur du modèle ou une instruction piégée ne doit pas pouvoir la déclencher seule.', 'Place un bloc « Approbation humaine » entre la demande d’outil et l’outil, avec un aperçu clair de l’action.', { nodeId: n.id }));
      }
    }
    if ((n.data.c === 'llm' || n.data.c === 'agent') && !g.edges.some((e) => e.target === n.id && e.targetHandle === 'consignes')) {
      out.push(issue('modele-sans-consignes', 'info', 'logique', `« ${def.name} » n’a pas de prompt système`, 'Sans consignes de fond, le comportement du modèle dépend uniquement du message reçu : rôle, ton et règles ne sont pas cadrés.', 'Relie un « Prompt système » à l’entrée « consignes » (dépendance).', { nodeId: n.id }));
    }
    if ((n.data.c === 'recherche-doc' || n.data.c === 'pipeline-rag')) {
      const filtered = g.edges.some((e) => e.source === n.id && findNode(g, e.target)?.data.c === 'filtre');
      if (!filtered) out.push(issue('rag-sans-filtre', 'info', 'logique', `Pas de filtrage des droits après « ${def.name} »`, 'Une recherche ne sait pas qui a le droit de lire quoi : sans filtre, un passage réservé pourrait être fourni au modèle.', 'Ajoute un « Filtre de résultats » qui applique les droits d’accès avant le modèle (le filtrage se fait dans le code, pas dans le prompt).', { nodeId: n.id }));
    }
  }
  for (const e of g.edges) {
    const s = findNode(g, e.source);
    const t = findNode(g, e.target);
    if (s && t && nodeDef(s)?.entry && (t.data.c === 'llm' || t.data.c === 'agent')) {
      out.push(issue('appel-direct-modele', 'info', 'logique', 'Le modèle est appelé directement par l’entrée', 'Dans une vraie application, une Application s’intercale : elle garde les clés secrètes, vérifie les droits, prépare le contexte et contrôle la réponse.', 'Pour une architecture réaliste, insère une « Application » entre l’utilisateur et le modèle.', { edgeId: e.id, nodeId: t.id }));
    }
  }
  return out;
}

export interface Summary {
  errors: number;
  warnings: number;
  infos: number;
  /** Le diagramme est-il bien formé (connexions, entrées, sorties) ? */
  structureOk: boolean;
  /** L'architecture est-elle cohérente (boucles, sécurité, paramètres) ? */
  logicOk: boolean;
}

export function summarize(issues: Issue[]): Summary {
  const c = (l: Level) => issues.filter((i) => i.level === l).length;
  return {
    errors: c('error'), warnings: c('warning'), infos: c('info'),
    structureOk: !issues.some((i) => i.family === 'structure' && i.level !== 'info'),
    logicOk: !issues.some((i) => i.family === 'logique' && i.level !== 'info'),
  };
}

export const componentExists = (id: string) => componentById.has(id);
