/** Types du Studio. Aucune dépendance à React ni à React Flow : tout ce fichier (et le cœur du Studio) est testable seul. */

/** Nature de l'information qui circule. « * » : type hérité de ce qui entre (blocs de contrôle). */
export type DataType =
  | 'texte' | 'contexte' | 'documents' | 'image' | 'passages' | 'index' | 'vecteurs'
  | 'requete' | 'reponse' | 'appel-outil' | 'resultat-outil' | 'decision' | 'erreur' | 'config';

/** Les cinq sens d'une connexion. Chacun a une signification précise (voir connections.ts). */
export type EdgeKind = 'data' | 'tool' | 'request' | 'response' | 'dependency';

export type CategoryId = 'io' | 'ia' | 'infra' | 'data' | 'tools' | 'control';

export interface InPort {
  id: string;
  label: string;
  /** Types acceptés ; ['*'] = tout. */
  accepts: (DataType | '*')[];
  required?: boolean;
  /** Composants dont cette entrée refuse de recevoir (règle sémantique, avec explication). */
  denyFrom?: string[];
  denyWhy?: string;
  /** Si défini, seuls ces composants peuvent alimenter cette entrée. */
  onlyFrom?: string[];
  onlyWhy?: string;
}

export interface OutPort {
  id: string;
  label: string;
  /** Type émis ; '*' = le type de ce qui entre dans le bloc. */
  emits: DataType | '*';
  /** Si défini, cette sortie ne peut alimenter que ces composants. */
  onlyTo?: string[];
  onlyWhy?: string;
}

export interface ParamDef {
  key: string;
  label: string;
  kind: 'text' | 'longtext' | 'number' | 'select' | 'bool';
  default: string | number | boolean;
  options?: { value: string; label: string }[];
  required?: boolean;
  min?: number;
  max?: number;
  help: string;
}

export interface ComponentDef {
  id: string;
  category: CategoryId;
  name: string;
  /** Icône (nom du jeu d'icônes du site). */
  icon: string;
  /** Description courte (affichée dans la bibliothèque). */
  short: string;
  definition: string;
  role: string;
  example: string;
  limits: string;
  mistakes: string[];
  /** Notions à ne pas confondre. */
  confusions: string;
  inputs: InPort[];
  outputs: OutPort[];
  params: ParamDef[];
  /** Mots-clés de recherche (notions voisines). */
  keywords: string[];
  /** Leçon du cours à ouvrir pour approfondir. */
  lessonId?: string;
  /** Un bloc qui peut déclencher une boucle et qui, avec une limite positive, la borne. */
  loopGuard?: { param: string };
  /** Bloc d'entrée du scénario, ou de sortie. */
  entry?: boolean;
  terminal?: boolean;
}

export interface SNode {
  id: string;
  /** Toujours 'block' (type React Flow). */
  type: 'block';
  position: { x: number; y: number };
  data: { c: string; params: Record<string, string | number | boolean> };
  selected?: boolean;
  measured?: { width?: number; height?: number };
  width?: number;
  height?: number;
}

export interface SEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
  /** Décalage (en pixels du canevas) du tracé par rapport au milieu de la liaison : sert à faire de la place. */
  bend?: { dx: number; dy: number };
  selected?: boolean;
}

export interface Graph {
  nodes: SNode[];
  edges: SEdge[];
}

export type Level = 'info' | 'warning' | 'error';

export interface Issue {
  /** Code stable : relie le problème à la documentation de dépannage. */
  code: string;
  level: Level;
  title: string;
  why: string;
  fix: string;
  nodeId?: string;
  edgeId?: string;
  /** Chemin dans le Guide du Studio (ex. depannage#entree-manquante). */
  doc?: string;
  /** structure : le diagramme est-il bien formé ? logique : l'architecture est-elle cohérente ? */
  family: 'structure' | 'logique';
}
