import type { ProjectStep } from './types';

/** Projet final guidé : un assistant documentaire spécifié, conçu, évalué et présenté. Aucune étape n'impose un service payant. */
export const PROJECT_STEPS: ProjectStep[] = [
  {
    id: 'p1',
    title: '1. Choisir un cas d’usage et écrire la spécification',
    description: "Choisis un petit corpus que tu as le droit d'utiliser (tes propres notes, un guide libre de droits, la documentation d'une petite association). Remplis la spécification : problème, utilisateurs, entrées, sources, sortie, hors périmètre, critère de réussite, escalade, contraintes, mesure.",
    deliverable: "Une page de spécification (10 rubriques).",
    checks: ["Le corpus est autorisé et à jour.", "Les sujets hors périmètre sont listés.", "Un critère de réussite mesurable est écrit."],
  },
  {
    id: 'p2',
    title: '2. Dessiner l’architecture et lister les risques',
    description: "Dessine les blocs : interface, backend, recherche, documents/index, modèle, contrôle des sources, escalade humaine, journalisation. Réponds aux six questions de l'exercice 3 (stockage et accès, absence de résultat, vérification de source, signalement d'erreur, cas transmis à un humain, tests).",
    deliverable: "Un schéma, une liste de risques, cinq tests d'acceptation.",
    checks: ["Les secrets restent côté serveur.", "L'accès aux documents est filtré avant le modèle.", "Le cas « rien de pertinent trouvé » est prévu."],
  },
  {
    id: 'p3',
    title: '3. Version 1 : un document dans le contexte',
    description: "Avec un assistant de ton choix (gratuit si tu veux), fournis un seul document court et la règle « réponds uniquement à partir du document, sinon dis-le ». Teste dix questions. Note les erreurs.",
    deliverable: "Dix questions testées, avec résultats et erreurs notées.",
    checks: ["Le prompt contient une règle de refus.", "Chaque réponse cite un passage.", "Les erreurs sont notées avec leur cause probable."],
  },
  {
    id: 'p4',
    title: '4. Version 2 : découper et rechercher',
    description: "Découpe le corpus en passages (par titres), conserve source et section. Choisis une méthode de recherche : par mots-clés (simple et gratuite), vectorielle, ou hybride. Sélectionne les passages les plus pertinents avant de les fournir au modèle.",
    deliverable: "Un corpus découpé avec métadonnées et une description de la recherche choisie.",
    checks: ["Chaque passage garde sa source.", "Le choix de la recherche est justifié.", "Les droits d'accès sont appliqués avant la sélection."],
  },
  {
    id: 'p5',
    title: '5. Préparer le jeu de tests',
    description: "Prépare 30 questions avec réponse dans le corpus, 10 sans réponse et 5 ambiguës, plus quelques demandes d'accès interdit. Écris les réponses attendues ou les critères d'acceptation.",
    deliverable: "Un tableau de 45 cas ou plus.",
    checks: ["Le jeu de test est séparé des exemples d'ajustement.", "Il contient des cas difficiles.", "Les critères d'acceptation sont écrits à l'avance."],
  },
  {
    id: 'p6',
    title: '6. Évaluer et corriger',
    description: "Mesure : bon passage retrouvé ? réponse fidèle ? sources qui soutiennent la réponse ? refus corrects ? délai et coût acceptables ? Examine les erreurs une par une, corrige la cause, relance.",
    deliverable: "Un tableau de résultats avant/après correction.",
    checks: ["La récupération est mesurée séparément de la génération.", "Chaque correction est liée à une cause identifiée.", "Les tests sont relancés après chaque changement."],
  },
  {
    id: 'p7',
    title: '7. Sécurité et contrôle humain',
    description: "Déroule la check-list avant déploiement. Ajoute un test d'injection de prompt (un document contenant une consigne cachée) et vérifie que l'assistant la traite comme une donnée. Définis qui reprend la main.",
    deliverable: "Check-list remplie, résultat du test d'injection.",
    checks: ["Les permissions sont minimales.", "Une action sensible exige une approbation.", "Un humain peut arrêter ou corriger."],
  },
  {
    id: 'p8',
    title: '8. Présenter le projet',
    description: "Prépare une présentation de cinq minutes : besoin, architecture, résultats chiffrés, erreurs restantes, limites, prochaines étapes. Termine en expliquant ce que tu n'as volontairement pas ajouté (agent, MCP) et pourquoi.",
    deliverable: "Une synthèse d'une page ou une courte présentation.",
    checks: ["Les limites sont énoncées honnêtement.", "Les résultats sont chiffrés.", "Les choix d'architecture sont justifiés."],
  },
];
