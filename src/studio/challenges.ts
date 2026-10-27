/**
 * Défis guidés du Studio. Les critères sont de vrais tests sur le diagramme (jamais un simple clic) :
 * `evaluateChallenge` est exécuté par le code au moment de valider, avant toute récompense.
 */
import { check, param } from './checker';
import { findNode } from './connections';
import type { Graph } from './types';

export interface Criterion {
  text: string;
  test: (g: Graph) => boolean;
}

export interface Challenge {
  id: string;
  title: string;
  brief: string;
  /** Modèle à ouvrir pour commencer (facultatif). */
  starter?: string;
  criteria: Criterion[];
  /** Page du guide qui explique les notions du défi. */
  doc: string;
}

const has = (g: Graph, c: string) => g.nodes.some((n) => n.data.c === c);
const hasAny = (g: Graph, ...cs: string[]) => cs.some((c) => has(g, c));

/** Existe-t-il un chemin orienté d'un composant de type `from` à un composant de type `to` ? */
export function reaches(g: Graph, from: string, to: string): boolean {
  const starts = g.nodes.filter((n) => n.data.c === from).map((n) => n.id);
  const seen = new Set(starts);
  const stack = [...starts];
  while (stack.length) {
    const cur = stack.pop()!;
    if (findNode(g, cur)?.data.c === to && !starts.includes(cur)) return true;
    for (const e of g.edges) if (e.source === cur && !seen.has(e.target)) { seen.add(e.target); stack.push(e.target); }
  }
  return false;
}

const clean: Criterion = {
  text: 'Le vérificateur ne signale ni erreur ni avertissement (les informations sont permises).',
  test: (g) => !check(g).some((i) => i.level !== 'info'),
};

export const CHALLENGES: Challenge[] = [
  {
    id: 'assistant-simple', title: 'Construire un assistant simple', doc: 'architectures/application-ia',
    brief: 'Construis le parcours minimal d’un assistant, avec une application entre la personne et le modèle.',
    criteria: [
      { text: 'Le schéma contient Utilisateur, Application, Modèle de langage et Sortie texte.', test: (g) => ['utilisateur', 'application', 'llm', 'sortie-texte'].every((c) => has(g, c)) },
      { text: 'Un chemin relie l’utilisateur à l’application, au modèle puis à la sortie.', test: (g) => reaches(g, 'utilisateur', 'application') && reaches(g, 'application', 'llm') && reaches(g, 'llm', 'sortie-texte') },
      clean,
    ],
  },
  {
    id: 'rag', title: 'Construire un RAG', doc: 'architectures/rag',
    brief: 'Fais répondre un modèle à partir d’un document : recherche des passages, puis contexte pour le modèle.',
    starter: 'assistant-simple',
    criteria: [
      { text: 'Le schéma contient un document (ou une source de connaissances), une recherche documentaire (ou un pipeline RAG) et un modèle de langage.', test: (g) => hasAny(g, 'document', 'source-connaissances') && hasAny(g, 'recherche-doc', 'pipeline-rag') && has(g, 'llm') },
      { text: 'Un chemin relie le document à la recherche puis au modèle.', test: (g) => (reaches(g, 'document', 'recherche-doc') || reaches(g, 'source-connaissances', 'recherche-doc') || reaches(g, 'document', 'pipeline-rag') || reaches(g, 'source-connaissances', 'pipeline-rag')) && (reaches(g, 'recherche-doc', 'llm') || reaches(g, 'pipeline-rag', 'llm')) },
      { text: 'Une application et une personne (utilisateur) font partie du parcours.', test: (g) => has(g, 'utilisateur') && has(g, 'application') },
      clean,
    ],
  },
  {
    id: 'mcp', title: 'Brancher un outil via MCP', doc: 'architectures/mcp-client-serveur',
    brief: 'Fais exécuter un outil par un serveur MCP : le modèle demande, l’application valide, le client MCP communique.',
    starter: 'assistant-simple',
    criteria: [
      { text: 'Le schéma contient Application, Modèle, Client MCP, Serveur MCP et Outil externe.', test: (g) => ['application', 'llm', 'client-mcp', 'serveur-mcp', 'outil-externe'].every((c) => has(g, c)) },
      { text: 'Un chemin relie le client MCP au serveur MCP puis à l’outil.', test: (g) => reaches(g, 'client-mcp', 'serveur-mcp') && reaches(g, 'serveur-mcp', 'outil-externe') },
      { text: 'La boucle d’outils du modèle est bornée (« Appels d’outils maximum » > 0).', test: (g) => g.nodes.some((n) => n.data.c === 'llm' && Number(param(n, 'maxToolCalls') ?? 0) > 0) },
      clean,
    ],
  },
  {
    id: 'agent-securise', title: 'Un agent sûr : approbation avant écriture', doc: 'architectures/agent-outils',
    brief: 'Donne à un agent un outil qui modifie des données… et protège-le par une approbation humaine et une limite d’étapes.',
    starter: 'agent-outil',
    criteria: [
      { text: 'Un agent (avec « Étapes maximum » > 0) ou un modèle avec limite d’appels pilote un outil.', test: (g) => g.nodes.some((n) => (n.data.c === 'agent' && Number(param(n, 'maxSteps') ?? 0) > 0) || (n.data.c === 'llm' && Number(param(n, 'maxToolCalls') ?? 0) > 0)) && hasAny(g, 'outil-externe', 'fonction-agent', 'connecteur') },
      { text: 'Au moins un outil est marqué « Modifie des données ».', test: (g) => g.nodes.some((n) => ['outil-externe', 'fonction-agent', 'connecteur'].includes(n.data.c) && param(n, 'effet') === 'ecriture') },
      { text: 'Une approbation humaine précède l’outil qui modifie des données.', test: (g) => reaches(g, 'approbation-humaine', 'outil-externe') || reaches(g, 'approbation-humaine', 'fonction-agent') || reaches(g, 'approbation-humaine', 'connecteur') },
      clean,
    ],
  },
  {
    id: 'corriger-architecture', title: 'Corriger l’architecture incorrecte', doc: 'depannage', starter: 'architecture-incorrecte',
    brief: 'À partir du modèle « Architecture volontairement incorrecte » : corrige les défauts sans supprimer l’essentiel du système.',
    criteria: [
      { text: 'Utilisateur, Application, Modèle de langage et Outil externe sont toujours présents.', test: (g) => ['utilisateur', 'application', 'llm', 'outil-externe'].every((c) => has(g, c)) },
      { text: 'Une approbation humaine précède l’outil externe.', test: (g) => reaches(g, 'approbation-humaine', 'outil-externe') },
      { text: 'La clé d’API n’est plus dans le navigateur.', test: (g) => !g.nodes.some((n) => n.data.c === 'application' && param(n, 'cleApi') === 'navigateur') },
      clean,
    ],
  },
];

export const challengeById = new Map(CHALLENGES.map((c) => [c.id, c]));

export interface ChallengeResult {
  pass: boolean;
  results: { text: string; ok: boolean }[];
}

export function evaluateChallenge(def: Challenge, g: Graph): ChallengeResult {
  const results = def.criteria.map((c) => ({ text: c.text, ok: c.test(g) }));
  return { pass: results.every((r) => r.ok), results };
}
