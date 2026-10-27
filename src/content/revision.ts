/** Contenus de révision issus du manuel : distinctions, carte mentale, principes, auto-évaluation, corrigé. */

export const DISTINCTIONS: { pair: string; diff: string }[] = [
  { pair: 'IA et LLM', diff: "L'IA est un domaine large ; un LLM est une famille de modèles de langage." },
  { pair: 'Entraînement et inférence', diff: "L'un ajuste les paramètres ; l'autre utilise le modèle entraîné." },
  { pair: 'Modèle et application', diff: "Le modèle produit des sorties ; l'application gère aussi l'interface, les données, les outils et les règles." },
  { pair: 'Contexte et mémoire', diff: "Le contexte est fourni à la requête ; une mémoire persistante dépend d'un mécanisme de stockage." },
  { pair: 'API et MCP', diff: "Une API expose un contrat de service ; MCP standardise l'échange entre applications compatibles et serveurs de capacités." },
  { pair: 'Serveur MCP et agent', diff: "Le serveur expose des capacités ; l'agent décide éventuellement quand les utiliser." },
  { pair: 'Skill et outil', diff: "Une skill décrit une méthode réutilisable ; un outil exécute une opération concrète." },
  { pair: 'RAG et fine-tuning', diff: "Le RAG récupère des données externes au moment de la requête ; le fine-tuning adapte les paramètres du modèle." },
  { pair: 'Recherche et génération', diff: "La recherche retrouve des contenus ; la génération produit une réponse à partir du contexte et du modèle." },
  { pair: 'Poids ouverts et logiciel libre', diff: "L'accès aux paramètres ne signifie pas automatiquement que toutes les composantes sont ouvertes." },
  { pair: 'Réponse plausible et réponse vraie', diff: "La fluidité n'est pas une preuve ; les affirmations importantes doivent être vérifiées." },
];

export const MENTAL_MAP: { layer: string; question: string }[] = [
  { layer: 'Modèle', question: 'Comment transforme-t-il les entrées en sorties ?' },
  { layer: 'Prompt et contexte', question: 'Quelles instructions et informations reçoit-il ?' },
  { layer: 'Données / RAG', question: 'Quelles sources externes peuvent être récupérées ?' },
  { layer: 'Outils / API / MCP', question: 'Quelles actions ou données le système peut-il utiliser ?' },
  { layer: 'Backend / orchestration', question: 'Qui coordonne les étapes, les permissions et les erreurs ?' },
  { layer: 'Frontend', question: "Comment l'utilisateur interagit-il avec le système ?" },
  { layer: 'Évaluation / sécurité', question: 'Comment vérifier la qualité, protéger les données et limiter les risques ?' },
];

export const FIVE_PRINCIPLES: string[] = [
  "Une IA est un système probabiliste et technique, pas une source infaillible.",
  "Un modèle n'est qu'une brique : les données, les outils et l'application comptent autant.",
  "Un prompt clair améliore la demande, mais ne remplace pas la vérification.",
  "L'autonomie doit être limitée par les permissions, les tests et le niveau de risque.",
  "La meilleure solution est celle qui résout le problème avec une qualité mesurable, un coût acceptable et des risques maîtrisés.",
];

export const READY_CHECKLIST: { id: string; text: string }[] = [
  { id: 'r01', text: "Je peux expliquer la différence entre IA, machine learning et deep learning." },
  { id: 'r02', text: "Je peux décrire les grandes étapes de l'entraînement d'un réseau de neurones." },
  { id: 'r03', text: "Je comprends la différence entre entraînement et inférence." },
  { id: 'r04', text: "Je peux expliquer simplement ce qu'est un LLM et un token." },
  { id: 'r05', text: "Je distingue modèle, application, frontend, backend et serveur." },
  { id: 'r06', text: "Je peux décrire une requête API et interpréter quelques erreurs courantes." },
  { id: 'r07', text: "Je comprends à quoi servent les embeddings et la recherche vectorielle." },
  { id: 'r08', text: "Je peux expliquer le principe du RAG et ses limites." },
  { id: 'r09', text: "Je sais distinguer API, outil, skill, workflow, agent et MCP." },
  { id: 'r10', text: "Je peux expliquer les rôles du client et du serveur MCP." },
  { id: 'r11', text: "Je sais structurer un prompt avec objectif, contexte, contraintes et format." },
  { id: 'r12', text: "Je vérifie les affirmations importantes au lieu de faire confiance au ton." },
  { id: 'r13', text: "Je sais identifier les données sensibles et limiter les permissions." },
  { id: 'r14', text: "Je peux définir des tests et des critères de réussite." },
  { id: 'r15', text: "Je sais expliquer pourquoi une solution simple peut être préférable à un agent autonome." },
];

export function readinessMessage(score: number): string {
  if (score <= 5) return "0 à 5 : consolide les fondamentaux et refais les premiers exercices.";
  if (score <= 10) return "6 à 10 : tu peux commencer un petit projet guidé.";
  if (score <= 13) return "11 à 13 : tu comprends plusieurs briques et peux concevoir une architecture simple.";
  return "14 à 15 : tu as une base solide ; continue avec un projet réel et une évaluation rigoureuse.";
}

export const DEPLOY_CHECKLIST: { id: string; text: string }[] = [
  { id: 'd1', text: "Le problème et le résultat attendu sont clairement définis." },
  { id: 'd2', text: "Les données sont autorisées et à jour." },
  { id: 'd3', text: "Les sorties ont été testées sur des cas représentatifs." },
  { id: 'd4', text: "Les permissions sont minimales." },
  { id: 'd5', text: "Les erreurs et pannes ont un comportement prévu." },
  { id: 'd6', text: "Le coût et la latence sont mesurés." },
  { id: 'd7', text: "Une personne peut reprendre la main sur les cas sensibles." },
];

export const COMPREHENSION: { q: string; a: string }[] = [
  { q: 'IA, machine learning, deep learning', a: "L'IA est le domaine général. Le machine learning est une famille de méthodes qui apprennent à partir de données. Le deep learning est une famille du machine learning fondée sur des réseaux de neurones à plusieurs couches." },
  { q: 'Entraînement et inférence', a: "L'entraînement ajuste les paramètres à partir d'exemples. L'inférence utilise les paramètres existants pour produire une sortie pour une nouvelle entrée." },
  { q: 'API et MCP', a: "Une API décrit comment appeler un service. MCP est un protocole qui standardise la manière dont des applications compatibles peuvent découvrir et utiliser des capacités exposées par des serveurs. Un serveur MCP peut lui-même s'appuyer sur des API." },
  { q: 'RAG et fine-tuning', a: "Le RAG récupère des informations externes au moment de la requête et les ajoute au contexte. Le fine-tuning adapte les paramètres d'un modèle par un nouvel entraînement. Les deux approches peuvent être combinées." },
  { q: 'Pourquoi vérifier ?', a: "Un modèle génère une réponse plausible à partir du contexte et de ses paramètres, mais cela ne garantit pas que chaque affirmation soit exacte. La vérification est essentielle lorsque l'erreur a des conséquences." },
];

/** Grille d'auto-évaluation de l'exercice 1 (explication d'un concept). */
export const EXPLAIN_RUBRIC: { id: string; label: string; levels: [string, string, string] }[] = [
  { id: 'exactitude', label: 'Exactitude', levels: ['Concept faux', 'Partiellement correct', 'Correct et nuancé'] },
  { id: 'clarte', label: 'Clarté', levels: ['Jargon non expliqué', 'Quelques passages obscurs', 'Accessible au débutant'] },
  { id: 'exemple', label: 'Exemple', levels: ['Absent', 'Générique', 'Concret et pertinent'] },
  { id: 'limite', label: 'Limite', levels: ['Aucune', 'Mentionnée vaguement', 'Limite clairement expliquée'] },
];

/** Critères d'auto-évaluation de l'exercice 2 (améliorer un prompt). */
export const PROMPT_CRITERIA: { id: string; text: string }[] = [
  { id: 'objectif', text: "L'objectif est précis (durée, type de livrable)." },
  { id: 'contexte', text: "Le contexte nécessaire est fourni (produit, public, budget…) ou signalé comme manquant." },
  { id: 'format', text: "Le format de sortie est demandé (calendrier, indicateurs, priorités…)." },
  { id: 'hypotheses', text: "Les hypothèses sont demandées explicitement et séparées des données." },
  { id: 'chiffres', text: "Il est demandé de ne pas inventer de statistiques de marché." },
  { id: 'questions', text: "Le modèle peut poser des questions si une information essentielle manque." },
];

export const PROMPT_MODEL_ANSWER =
  "Construis un plan marketing de 90 jours pour [produit], destiné à [public], avec un budget de [montant]. Objectif principal : [objectif mesurable]. Propose trois priorités, un calendrier hebdomadaire, les canaux, les ressources nécessaires et les indicateurs. Sépare les données fournies des hypothèses. N'invente pas de statistiques de marché : indique celles qu'il faudrait rechercher. Si une information essentielle manque, pose jusqu'à trois questions avant de finaliser.";
