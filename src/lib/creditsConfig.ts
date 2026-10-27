/**
 * Barèmes du système de « Crédits de savoir » — SEUL fichier à modifier pour changer les récompenses, les seuils,
 * les niveaux ou les coûts des bonus.
 *
 * Principes (voir README) :
 *  - les crédits récompensent une maîtrise démontrée (contrôles réussis), jamais le temps passé, la connexion ou les clics ;
 *  - une récompense est attribuée une seule fois par activité et par niveau de réussite (clé unique dans le registre) ;
 *  - les crédits ne débloquent que des activités FACULTATIVES : tout le contenu essentiel reste gratuit et accessible ;
 *  - tout est stocké dans le navigateur : ce n'est pas protégé contre la modification par l'utilisateur.
 */

export const REWARDS = {
  /** Leçon marquée terminée ET contrôle de compréhension réussi. */
  lesson: 10,
  /** Quiz réussi avec au moins `QUIZ_PASS` de bonnes réponses. */
  quiz80: 15,
  /** Bonus supplémentaire pour 100 % à un quiz. */
  quiz100: 5,
  /** Exercice pratique réussi (scénarios corrigés, ou auto-évaluation avec production minimale). */
  exercise: 20,
  /** Module terminé (toutes ses leçons) ET quiz de fin de module réussi. */
  module: 30,
  /** Défi de révision réussi sur une notion déjà étudiée. */
  review: 5,
  /** Studio : tutoriel terminé (quiz réussi) ou défi guidé validé par les critères objectifs du diagramme. */
  studio: 20,
} as const;

export const THRESHOLDS = {
  /** Part de bonnes réponses requise pour un quiz ou un exercice corrigé. */
  quizPass: 0.8,
  /** Part de bonnes réponses requise au contrôle de fin de leçon (3 à 5 questions). */
  lessonCheckPass: 0.66,
  /** Part de bonnes réponses requise pour un défi de révision. */
  reviewPass: 0.66,
  /** Exercice d'explication : note minimale (sur 8) et nombre de mots minimal. */
  explainScore: 6,
  explainMinWords: 90,
  /** Exercice d'amélioration de prompt : critères cochés minimum (sur 6) et mots minimum. */
  promptCriteria: 5,
  promptMinWords: 40,
} as const;

export interface LevelDef {
  id: number;
  name: string;
  /** Crédits gagnés cumulés (les dépenses ne font jamais baisser le niveau). */
  minCredits: number;
  /** Objectifs pédagogiques à remplir EN PLUS des crédits. */
  requires: {
    modulesValidated?: number;
    projectSteps?: number;
    glossaryQuiz?: boolean;
  };
  description: string;
}

export const LEVELS: LevelDef[] = [
  { id: 1, name: 'Explorateur de l’IA', minCredits: 0, requires: {}, description: 'Tu découvres les notions de base.' },
  { id: 2, name: 'Apprenti de l’IA', minCredits: 100, requires: { modulesValidated: 1 }, description: 'Tu as validé un premier module : concepts et vocabulaire se mettent en place.' },
  { id: 3, name: 'Praticien de l’IA', minCredits: 350, requires: { modulesValidated: 3 }, description: 'Tu maîtrises plusieurs briques et sais lire une architecture simple.' },
  { id: 4, name: 'Concepteur de projets IA', minCredits: 650, requires: { modulesValidated: 6, projectSteps: 4 }, description: 'Tu sais spécifier, évaluer et sécuriser un petit assistant.' },
  { id: 5, name: 'Maître des fondamentaux', minCredits: 1000, requires: { modulesValidated: 8, projectSteps: 8, glossaryQuiz: true }, description: 'Tu as validé tous les modules fondamentaux, le projet final et les 50 notions.' },
];

export interface BonusDef {
  id: string;
  kind: 'exercice' | 'fiche' | 'parcours';
  title: string;
  description: string;
  cost: number;
  to: string;
}

/** Activités facultatives qui se débloquent avec des crédits. Jamais d'explication ou de correction essentielle ici. */
export const BONUS: BonusDef[] = [
  { id: 'bonus-architecture', kind: 'exercice', cost: 20, to: '/bonus/bonus-architecture', title: 'Défi : choisir une architecture', description: 'Cinq scénarios où il faut choisir entre appel direct, RAG, outils, workflow ou agent, et justifier.' },
  { id: 'bonus-securite', kind: 'exercice', cost: 25, to: '/bonus/bonus-securite', title: 'Défi : modéliser les menaces', description: 'Cinq situations à analyser : injection indirecte, permissions, fuite de données, approbations.' },
  { id: 'bonus-evaluation', kind: 'exercice', cost: 25, to: '/bonus/bonus-evaluation', title: 'Défi : lire des résultats d’évaluation', description: 'Interpréter des mesures de récupération, de fidélité, de latence et de coût sur un assistant documentaire.' },
  { id: 'synthese-fondamentaux', kind: 'fiche', cost: 15, to: '/bonus/synthese-fondamentaux', title: 'Fiche de synthèse : fondamentaux', description: 'Une page à imprimer : IA, apprentissage, LLM, contexte, limites.' },
  { id: 'synthese-systemes', kind: 'fiche', cost: 15, to: '/bonus/synthese-systemes', title: 'Fiche de synthèse : bâtir un système', description: 'Architecture, API, RAG, mémoire, outils, MCP, agents.' },
  { id: 'synthese-fiabilite', kind: 'fiche', cost: 15, to: '/bonus/synthese-fiabilite', title: 'Fiche de synthèse : fiabilité et sécurité', description: 'Vérifier, évaluer, protéger, garder un humain dans la boucle.' },
  { id: 'revision-perso', kind: 'parcours', cost: 20, to: '/bonus/revision-perso', title: 'Parcours de révision personnalisé', description: 'Un parcours construit à partir des notions que tu as le moins bien réussies.' },
];
