import { componentById } from './data/components';
import type { DataType, EdgeKind, Graph, InPort, OutPort, SEdge, SNode } from './types';

/** Les cinq sens d'une connexion. Aucun n'est décoratif : chacun correspond à une réalité d'architecture. */
export const EDGE_KINDS: Record<EdgeKind, { label: string; meaning: string; color: string; dash: string; width: number }> = {
  data: {
    label: 'Flux de données', color: '#6e7781', dash: '', width: 2,
    meaning: 'Une information (texte, contexte, passages, vecteurs, décision…) passe d’un composant au suivant. C’est le fil principal d’un traitement.',
  },
  request: {
    label: 'Requête', color: '#2f81f7', dash: '10 4', width: 2.5,
    meaning: 'Un composant sollicite un autre pour obtenir un service (aller d’un échange requête/réponse), par exemple un appel d’API.',
  },
  response: {
    label: 'Réponse', color: '#2da44e', dash: '3 3', width: 2.5,
    meaning: 'Le résultat d’une requête revient vers celui qui l’a émise. Une requête sans réponse prévue est un échange incomplet.',
  },
  tool: {
    label: 'Appel d’outil', color: '#bf8700', dash: '12 4 2 4', width: 3,
    meaning: 'Une demande d’exécution d’une action (aller) ou son résultat (retour). Le modèle demande ; c’est l’application qui décide d’exécuter, après contrôle.',
  },
  dependency: {
    label: 'Dépendance', color: '#8b949e', dash: '1 5', width: 2,
    meaning: 'Un composant a besoin d’un élément de configuration (prompt système, capacités MCP) pour fonctionner. Aucune donnée d’utilisateur ne circule : c’est un réglage.',
  },
};

export const KIND_OF: Record<DataType, EdgeKind> = {
  texte: 'data', contexte: 'data', documents: 'data', image: 'data', passages: 'data', index: 'data', vecteurs: 'data', decision: 'data', erreur: 'data',
  requete: 'request', reponse: 'response', 'appel-outil': 'tool', 'resultat-outil': 'tool', config: 'dependency',
};

export const DATA_LABEL: Record<DataType, string> = {
  texte: 'texte', contexte: 'contexte (consigne + données)', documents: 'documents', image: 'image', passages: 'passages retrouvés', index: 'index de recherche',
  vecteurs: 'vecteurs (embeddings)', requete: 'requête', reponse: 'réponse', 'appel-outil': 'demande d’outil', 'resultat-outil': 'résultat d’outil',
  decision: 'décision', erreur: 'erreur', config: 'configuration',
};

/** Que faire quand un type n'est pas accepté : quel composant intercaler. */
const BRIDGE: Partial<Record<DataType, string>> = {
  texte: 'Pour transformer un texte en contexte ou en requête, intercale une Application (elle prépare le contexte et les appels).',
  passages: 'Des passages retrouvés se fournissent à un modèle de langage (ou à l’Application qui prépare le contexte).',
  documents: 'Des documents doivent d’abord être recherchés (Recherche documentaire) ou vectorisés (Modèle d’embeddings).',
  vecteurs: 'Des vecteurs se rangent dans une Base vectorielle ; ils ne se lisent pas directement.',
  index: 'Un index se consulte avec une Recherche documentaire ou un Pipeline RAG.',
  requete: 'Une requête s’envoie à une API, un Serveur, un Service externe ou une Base de données (ou à un Serveur MCP si elle vient d’un Client MCP).',
  reponse: 'Une réponse HTTP se lit avec un composant « Réponse HTTP » ou revient à l’Application ; pour afficher du texte, passe par l’Application.',
  'appel-outil': 'Une demande d’outil passe par l’Application (ou une Approbation humaine) avant d’atteindre l’outil.',
  'resultat-outil': 'Un résultat d’outil revient à l’Application, qui le contrôle avant de le fournir au modèle.',
  decision: 'Une décision (verdict) s’utilise dans une Condition, une Boucle (condition d’arrêt) ou une Étape de validation.',
  erreur: 'Une erreur se traite avec la Gestion des erreurs ou un Gestionnaire d’erreurs, ou s’affiche dans une Sortie texte.',
  config: 'Une configuration (prompt système, capacités) alimente une entrée de type « consignes » ou « capacités ».',
};

export const nodeDef = (n: SNode) => componentById.get(n.data.c);
export const findNode = (g: Graph, id: string) => g.nodes.find((n) => n.id === id);
export const outPortOf = (n: SNode, id: string): OutPort | undefined => nodeDef(n)?.outputs.find((p) => p.id === id);
export const inPortOf = (n: SNode, id: string): InPort | undefined => nodeDef(n)?.inputs.find((p) => p.id === id);

/** Type réellement émis par une sortie ; pour les blocs de contrôle (« * »), c'est celui de ce qui entre. null = inconnu. */
export function resolveEmit(g: Graph, nodeId: string, outId: string, seen: Set<string> = new Set()): DataType | null {
  const n = findNode(g, nodeId);
  if (!n) return null;
  const port = outPortOf(n, outId);
  if (!port) return null;
  if (port.emits !== '*') return port.emits;
  const key = `${nodeId}:${outId}`;
  if (seen.has(key)) return null;
  seen.add(key);
  const types = new Set<DataType | null>();
  for (const e of g.edges) if (e.target === nodeId) types.add(resolveEmit(g, e.source, e.sourceHandle, seen));
  types.delete(null);
  return types.size === 1 ? ([...types][0] as DataType) : null;
}

export type ConnectionResult =
  | { ok: true; kind: EdgeKind; dataType: DataType | null }
  | { ok: false; code: 'inconnu' | 'soi-meme' | 'doublon' | 'sens' | 'type' | 'pair'; reason: string; fix: string };

export interface ConnectionRequest {
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
}

const list = (types: (DataType | '*')[]) => types.map((t) => (t === '*' ? 'tout type' : DATA_LABEL[t])).join(', ');

export function validateConnection(g: Graph, c: ConnectionRequest): ConnectionResult {
  const s = findNode(g, c.source);
  const t = findNode(g, c.target);
  if (!s || !t) return { ok: false, code: 'inconnu', reason: 'Un des deux composants n’existe plus.', fix: 'Recommence la connexion entre deux composants présents sur le canevas.' };
  const out = outPortOf(s, c.sourceHandle);
  const inp = inPortOf(t, c.targetHandle);
  if (!out || !inp) return { ok: false, code: 'sens', reason: 'Une connexion relie une sortie (à droite d’un bloc) à une entrée (à gauche d’un autre).', fix: 'Part d’un port de sortie et termine sur un port d’entrée.' };
  const sd = nodeDef(s)!;
  const td = nodeDef(t)!;
  if (s.id === t.id) return { ok: false, code: 'soi-meme', reason: `« ${sd.name} » ne peut pas se connecter à lui-même.`, fix: 'Relie-le à un autre composant ; pour répéter une étape, utilise un bloc Boucle avec une condition d’arrêt.' };
  if (g.edges.some((e) => e.source === c.source && e.sourceHandle === c.sourceHandle && e.target === c.target && e.targetHandle === c.targetHandle)) {
    return { ok: false, code: 'doublon', reason: 'Cette connexion existe déjà.', fix: 'Sélectionne la connexion existante pour l’inspecter ou la supprimer.' };
  }
  if (out.onlyTo && !out.onlyTo.includes(t.data.c)) {
    return { ok: false, code: 'pair', reason: out.onlyWhy ?? `La sortie « ${out.label} » ne peut alimenter que : ${out.onlyTo.map((id) => componentById.get(id)?.name ?? id).join(', ')}.`, fix: `Relie cette sortie à : ${out.onlyTo.map((id) => componentById.get(id)?.name ?? id).join(', ')}.` };
  }
  if (inp.onlyFrom && !inp.onlyFrom.includes(s.data.c)) {
    return { ok: false, code: 'pair', reason: inp.onlyWhy ?? `L’entrée « ${inp.label} » n’accepte que : ${inp.onlyFrom.map((id) => componentById.get(id)?.name ?? id).join(', ')}.`, fix: `Alimente cette entrée avec : ${inp.onlyFrom.map((id) => componentById.get(id)?.name ?? id).join(', ')}.` };
  }
  if (inp.denyFrom?.includes(s.data.c)) {
    return { ok: false, code: 'pair', reason: inp.denyWhy ?? `« ${sd.name} » ne peut pas alimenter cette entrée.`, fix: 'Intercale une Application (qui valide et exécute) entre les deux composants.' };
  }
  const emitted = resolveEmit(g, c.source, c.sourceHandle);
  const declared = out.emits === '*' ? emitted : out.emits;
  if (declared && !inp.accepts.includes('*') && !inp.accepts.includes(declared)) {
    const other = td.inputs.find((p) => p.id !== inp.id && (p.accepts.includes('*') || p.accepts.includes(declared)));
    const bridge = BRIDGE[declared] ?? 'Choisis un composant dont l’entrée accepte ce type d’information.';
    return {
      ok: false,
      code: 'type',
      reason: `« ${sd.name} » produit : ${DATA_LABEL[declared]}. L’entrée « ${inp.label} » de « ${td.name} » attend : ${list(inp.accepts)}.`,
      fix: other ? `Essaie l’entrée « ${other.label} » de « ${td.name} », qui accepte ${DATA_LABEL[declared]}. ${bridge}` : bridge,
    };
  }
  return { ok: true, kind: declared ? KIND_OF[declared] : 'data', dataType: declared ?? null };
}

export interface EdgeInfo {
  from: string;
  to: string;
  fromPort: string;
  toPort: string;
  kind: EdgeKind;
  dataType: DataType | null;
  explanation: string;
}

/** Explication d'une connexion existante : quoi circule, dans quel sens, pourquoi. */
export function describeEdge(g: Graph, e: SEdge): EdgeInfo | null {
  const s = findNode(g, e.source);
  const t = findNode(g, e.target);
  if (!s || !t) return null;
  const out = outPortOf(s, e.sourceHandle);
  const inp = inPortOf(t, e.targetHandle);
  if (!out || !inp) return null;
  const dataType = resolveEmit(g, e.source, e.sourceHandle);
  const kind = dataType ? KIND_OF[dataType] : 'data';
  const what = dataType ? DATA_LABEL[dataType] : 'une information dont le type dépend de ce qui entre dans le bloc de contrôle';
  return {
    from: nodeDef(s)!.name, to: nodeDef(t)!.name, fromPort: out.label, toPort: inp.label, kind, dataType,
    explanation: `${nodeDef(s)!.name} envoie ${what} vers ${nodeDef(t)!.name} (entrée « ${inp.label} »). Sens : de gauche à droite, de « ${out.label} » vers « ${inp.label} ». ${EDGE_KINDS[kind].meaning}`,
  };
}

/** Composants auxquels un bloc peut être connecté (en sortie), pour l'inspecteur. */
export function connectableTargets(componentId: string): { from: string; to: string[] }[] {
  const def = componentById.get(componentId);
  if (!def) return [];
  const all = [...componentById.values()];
  return def.outputs.map((out) => ({
    from: out.label,
    to: all
      .filter((c) => c.inputs.some((p) => (!out.onlyTo || out.onlyTo.includes(c.id)) && (!p.onlyFrom || p.onlyFrom.includes(componentId)) && !p.denyFrom?.includes(componentId) && (out.emits === '*' || p.accepts.includes('*') || p.accepts.includes(out.emits))))
      .map((c) => c.name),
  }));
}

export function connectableSources(componentId: string): { into: string; from: string[] }[] {
  const def = componentById.get(componentId);
  if (!def) return [];
  const all = [...componentById.values()];
  return def.inputs.map((inp) => ({
    into: inp.label,
    from: all
      .filter((c) => c.outputs.some((o) => (!o.onlyTo || o.onlyTo.includes(componentId)) && (!inp.onlyFrom || inp.onlyFrom.includes(c.id)) && !inp.denyFrom?.includes(c.id) && (o.emits === '*' || inp.accepts.includes('*') || inp.accepts.includes(o.emits))))
      .map((c) => c.name),
  }));
}
