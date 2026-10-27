import { autoLayout } from '../layout';
import type { Graph, SEdge, SNode } from '../types';

export interface Template {
  id: string;
  name: string;
  objective: string;
  /** Parcours des données, en une phrase. */
  path: string;
  limits: string;
  /** Pour le modèle volontairement incorrect : ce qu'il faut trouver. */
  exercise?: string;
  graph: Graph;
  /** Pages du Guide du Studio associées. */
  docs: string[];
}

type Params = Record<string, string | number | boolean>;
const n = (id: string, c: string, params: Params = {}): SNode => ({ id, type: 'block', position: { x: 0, y: 0 }, data: { c, params } });
const e = (from: string, to: string): SEdge => {
  const [source, sourceHandle] = from.split('.');
  const [target, targetHandle] = to.split('.');
  return { id: `${source}.${sourceHandle}->${target}.${targetHandle}`, source, sourceHandle, target, targetHandle };
};
const build = (nodes: SNode[], edges: SEdge[]): Graph => autoLayout({ nodes, edges });

export const TEMPLATES: Template[] = [
  {
    id: 'assistant-simple', name: 'Assistant IA simple',
    objective: 'Comprendre le parcours minimal d’une requête : utilisateur, application, modèle, réponse.',
    path: 'Utilisateur → Application → Modèle de langage → Sortie texte, avec un prompt système qui cadre le modèle.',
    limits: 'Aucune connaissance externe : le modèle ne connaît ni tes documents, ni les informations récentes, et peut se tromper. Aucune vérification n’a lieu avant l’affichage.',
    docs: ['architectures/application-ia', 'composant/llm'],
    graph: build(
      [n('u', 'utilisateur'), n('app', 'application'), n('ps', 'prompt-systeme'), n('llm', 'llm'), n('out', 'sortie-texte')],
      [e('u.message', 'app.message'), e('app.contexte', 'llm.contexte'), e('ps.consignes', 'llm.consignes'), e('llm.reponse', 'out.texte')],
    ),
  },
  {
    id: 'assistant-documentaire', name: 'Assistant avec contexte documentaire (RAG)',
    objective: 'Comprendre qu’un RAG n’est pas « une base de données branchée au modèle » : il faut préparer et indexer les documents, rechercher les passages pertinents, les filtrer puis les fournir au modèle.',
    path: 'En amont : Document → Modèle d’embeddings → Base vectorielle (index). À chaque question : Application → Recherche documentaire → Filtre → Modèle de langage → Sortie texte.',
    limits: 'Ne garantit ni que le bon passage soit retrouvé, ni que le modèle respecte les passages, ni que le document soit exact ou à jour. La récupération et la génération doivent être évaluées séparément.',
    docs: ['architectures/rag', 'architectures/rag-ou-fine-tuning'],
    graph: build(
      [
        n('u', 'utilisateur'), n('app', 'application'), n('doc', 'document'), n('emb', 'embedder'), n('bv', 'base-vectorielle'),
        n('rech', 'recherche-doc'), n('flt', 'filtre'), n('ps', 'prompt-systeme'), n('llm', 'llm'), n('out', 'sortie-texte'),
      ],
      [
        e('u.message', 'app.message'), e('doc.contenu', 'emb.contenu'), e('emb.vecteurs', 'bv.vecteurs'), e('bv.index', 'rech.source'),
        e('app.recherche', 'rech.question'), e('rech.passages', 'flt.passages'), e('flt.passages', 'llm.contexte'),
        e('app.contexte', 'llm.contexte'), e('ps.consignes', 'llm.consignes'), e('llm.reponse', 'out.texte'),
      ],
    ),
  },
  {
    id: 'application-mcp', name: 'Application utilisant MCP',
    objective: 'Distinguer les rôles : le modèle demande, l’application valide, le client MCP communique, le serveur MCP expose et exécute l’outil.',
    path: 'Application → Client MCP → Serveur MCP → Outil externe, puis retour du résultat jusqu’au modèle. Le modèle ne parle jamais directement au serveur MCP.',
    limits: 'MCP standardise la communication ; il ne rend pas l’outil fiable ni sûr. Le serveur agit avec ses permissions : outil en lecture seule et boucle bornée ici, mais d’autres protections (approbations, isolation) restent à prévoir.',
    docs: ['architectures/mcp-client-serveur', 'architectures/mcp-ou-api'],
    graph: build(
      [
        n('u', 'utilisateur'), n('app', 'application'), n('ps', 'prompt-systeme'), n('llm', 'llm', { maxToolCalls: 2 }), n('cm', 'client-mcp'),
        n('sm', 'serveur-mcp'), n('res', 'ressource-mcp'), n('tool', 'outil-externe', { effet: 'lecture', resultatSimule: 'Mairie : lun-ven 9h-17h.' }), n('out', 'sortie-texte'),
      ],
      [
        e('u.message', 'app.message'), e('app.contexte', 'llm.contexte'), e('ps.consignes', 'llm.consignes'), e('llm.demande', 'app.retours'),
        e('app.appel', 'cm.demande'), e('cm.requete', 'sm.requete'), e('res.capacite', 'sm.capacites'), e('sm.appel', 'tool.appel'),
        e('tool.resultat', 'sm.resultat'), e('sm.reponse', 'cm.reponse'), e('cm.resultat', 'app.retours'), e('app.resultat', 'llm.resultat'), e('llm.reponse', 'out.texte'),
      ],
    ),
  },
  {
    id: 'agent-outil', name: 'Agent avec outil et exécution contrôlée',
    objective: 'Voir qu’un agent est une boucle bornée : l’agent demande, une personne approuve, l’outil s’exécute, le résultat revient.',
    path: 'Agent → demande d’outil → Application → Approbation humaine → Outil externe → résultat → Application → Agent → Sortie texte.',
    limits: 'Un agent n’est pas une garantie de fiabilité ni d’autonomie illimitée : il reste borné (3 étapes), l’action qui modifie des données exige une approbation, et le résultat doit être vérifié.',
    docs: ['architectures/agent-outils', 'composant/agent'],
    graph: build(
      [
        n('u', 'utilisateur'), n('app', 'application'), n('ps', 'prompt-systeme'), n('ag', 'agent', { maxSteps: 3 }), n('appr', 'approbation-humaine'),
        n('tool', 'outil-externe', { effet: 'ecriture', resultatSimule: 'Demande d’équipement enregistrée (brouillon).' }), n('out', 'sortie-texte'),
      ],
      [
        e('u.message', 'app.message'), e('app.contexte', 'ag.objectif'), e('ps.consignes', 'ag.consignes'), e('ag.appel', 'app.retours'),
        e('app.appel', 'appr.demande'), e('appr.approuve', 'tool.appel'), e('appr.refuse', 'app.retours'), e('tool.resultat', 'app.retours'),
        e('app.resultat', 'ag.resultat'), e('ag.reponse', 'out.texte'),
      ],
    ),
  },
  {
    id: 'validation-humaine', name: 'Système avec validation humaine',
    objective: 'Placer des contrôles proportionnés au risque : validation automatique, relecture par une personne, chemin de repli en cas de rejet.',
    path: 'Entrée texte → Application → Modèle → Étape de validation → Validation humaine → Sortie. Les rejets partent vers un gestionnaire d’erreurs.',
    limits: 'La validation automatique contrôle la forme, pas la vérité ; la relecture humaine coûte du temps et peut devenir machinale. Elles doivent rester proportionnées à l’enjeu.',
    docs: ['architectures/validation-erreurs', 'composant/validation-humaine'],
    graph: build(
      [
        n('in', 'entree-texte'), n('app', 'application'), n('ps', 'prompt-systeme'), n('llm', 'llm'), n('val', 'etape-validation'),
        n('hum', 'validation-humaine'), n('err', 'gestionnaire-erreurs'), n('out', 'sortie-texte'), n('out2', 'sortie-texte'),
      ],
      [
        e('in.texte', 'app.message'), e('app.contexte', 'llm.contexte'), e('ps.consignes', 'llm.consignes'), e('llm.reponse', 'val.entree'),
        e('val.valide', 'hum.resultat'), e('val.invalide', 'err.erreur'), e('hum.valide', 'out.texte'), e('hum.rejet', 'err.erreur'), e('err.repli', 'out2.texte'),
      ],
    ),
  },
  {
    id: 'architecture-incorrecte', name: 'Architecture volontairement incorrecte',
    objective: 'S’entraîner à repérer des erreurs réalistes et à les corriger en comprenant pourquoi elles posent problème.',
    path: 'Un assistant qui appelle un outil… mais qui cumule plusieurs défauts à trouver avec « Vérifier mon architecture ».',
    limits: 'Les défauts sont volontaires ; le vérificateur n’en détecte que certains (règles implémentées) : réfléchis aussi par toi-même.',
    exercise: 'Corrige l’architecture : plus aucune erreur ni avertissement, en gardant Utilisateur, Application, Modèle, Outil externe et en ajoutant une Approbation humaine devant l’outil.',
    docs: ['depannage', 'architectures/securite'],
    graph: build(
      [
        n('u', 'utilisateur'), n('app', 'application', { cleApi: 'navigateur' }), n('llm', 'llm'), n('tool', 'outil-externe', { effet: 'ecriture' }),
        n('ag', 'agent', { maxSteps: 0 }), n('doc', 'document'), n('out', 'sortie-texte'),
      ],
      [e('u.message', 'app.message'), e('app.contexte', 'llm.contexte'), e('llm.reponse', 'app.retours'), e('llm.demande', 'tool.appel'), e('app.sortie', 'out.texte')],
    ),
  },
];

export const templateById = new Map(TEMPLATES.map((t) => [t.id, t]));
