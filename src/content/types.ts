/** Types du contenu pédagogique. Les identifiants sont stables : ne jamais les renommer sans migration. */

export type Level = 'debutant' | 'intermediaire' | 'avance';

export type CalloutKind = 'note' | 'limit' | 'warning' | 'tip';

export type Block =
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'table'; head: string[]; rows: string[][]; caption?: string }
  | { type: 'code'; lang?: string; text: string; caption?: string }
  | { type: 'callout'; kind: CalloutKind; title?: string; text: string }
  | { type: 'beforeAfter'; before: string; after: string; why: string[] };

export interface Choice {
  text: string;
  /** Pourquoi ce choix est faux (ou, pour une bonne réponse, ce qu'il faut retenir). */
  feedback?: string;
}

export interface Question {
  id: string;
  /** 'single' : une seule bonne réponse. 'multiple' : plusieurs bonnes réponses, toutes à cocher. */
  type: 'single' | 'multiple';
  prompt: string;
  /** Contexte optionnel (extrait de requête, scénario…) affiché en bloc de code ou de texte. */
  context?: { kind: 'code' | 'text'; text: string };
  choices: Choice[];
  /** Indices des bonnes réponses. */
  correct: number[];
  explanation: string;
  lessonId?: string;
  termId?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  /** Module concerné, ou 'glossaire' / 'exercices'. */
  scope: string;
  questions: Question[];
}

export type DiagramId =
  | 'ia-ml-dl'
  | 'neural-net'
  | 'training-loop'
  | 'llm-generation'
  | 'request-flow'
  | 'api-cycle'
  | 'rag-pipeline'
  | 'mcp-architecture'
  | 'mcp-lifecycle'
  | 'agent-loop'
  | 'building-blocks'
  | 'memory-layers'
  | 'attention-calc'
  | 'lethal-trifecta';

export interface DiagramRef {
  id: DiagramId;
  title: string;
  /** Texte qui explique l'idée portée par le schéma (obligatoire : pas de schéma décoratif). */
  explanation: string;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  objective: string;
  /** Niveau de la leçon ; par défaut, celui de son module. */
  level?: Level;
  /** Place la leçon juste après la leçon indiquée (sinon : à la fin de son module). */
  after?: string;
  /** Activité pratique facultative (non récompensée par des crédits : elle sert à t'entraîner). */
  activity?: { title: string; steps: string[]; outcome: string };
  /** Identifiants de leçons à connaître avant. */
  prerequisites?: string[];
  /** Explication simple, quelques paragraphes sans jargon. */
  simple: string[];
  /** Explication technique progressive. */
  technical: Block[];
  example: { title: string; blocks: Block[] };
  diagram?: DiagramRef;
  /** Schémas supplémentaires, affichés après le schéma principal. */
  extraDiagrams?: DiagramRef[];
  misconceptions: { myth: string; reality: string }[];
  /** Comment cela apparaît dans un système réel. */
  realWorld: string;
  summary: string[];
  /** Identifiants de vidéos (videos.json) et de documentations (docs.ts). */
  videoIds?: string[];
  docIds?: string[];
  related: { terms?: string[]; lessons?: string[] };
  /** Questions de vérification (3 à 5). */
  checkQuestions: Question[];
  /** Pour le module 2 : fiches affichées dans la leçon. */
  glossarySet?: string[];
  /** Chapitres du manuel dont la leçon est issue (traçabilité). */
  manualRefs?: string[];
}

export interface Module {
  id: string;
  number: number;
  title: string;
  tagline: string;
  objective: string;
  level: Level;
  synthesis: string[];
}

export interface Term {
  id: string;
  n: number;
  fr: string;
  en?: string;
  definition: string;
  explanation: string;
  example: string;
  analogy?: { text: string; limit: string };
  related: string[];
  mistake: string;
  lessonId: string;
  group: string;
}

export interface ExtraTerm {
  id: string;
  fr: string;
  en?: string;
  definition: string;
}

export interface DocResource {
  id: string;
  title: string;
  org: string;
  url: string;
  kind: 'documentation' | 'cours' | 'tutoriel' | 'reference' | 'code';
  level: Level;
  language: 'fr' | 'en';
  topics: string[];
  description: string;
  lessonIds: string[];
  /** Date de dernière vérification (AAAA-MM-JJ). */
  verified: string;
}

export interface VideoSource {
  id: string;
  level: Level;
  topics: string[];
  lessonIds: string[];
  /** Langue parlée dans la vidéo. */
  language: 'fr' | 'en';
  /** Remarque éditoriale facultative. */
  note?: string;
}

export interface Video extends VideoSource {
  title: string;
  channel: string;
  seconds: number | null;
  publishedAt: string | null;
  /** Vrai seulement si une piste de sous-titres française est publiée avec la vidéo. */
  frenchSubtitles: boolean;
  verifiedAt: string;
}

export interface ProjectStep {
  id: string;
  title: string;
  description: string;
  deliverable: string;
  checks: string[];
}
