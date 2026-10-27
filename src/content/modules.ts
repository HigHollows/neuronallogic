import type { Module } from './types';

export const MODULES: Module[] = [
  {
    id: 'm1', number: 1, level: 'debutant',
    title: "Comprendre l'IA",
    tagline: "Des neurones artificiels aux grands modèles de langage.",
    objective: "Expliquer ce qu'est l'IA, comment un réseau de neurones apprend, comment un LLM produit du texte — et pourquoi ces systèmes se trompent.",
    synthesis: [
      "L'IA est un domaine large ; le machine learning en est une famille, le deep learning une sous-famille fondée sur des réseaux à plusieurs couches.",
      "Entraînement = ajuster les paramètres ; inférence = utiliser un modèle déjà entraîné.",
      "Un LLM calcule une distribution de probabilités sur le prochain token, puis choisit : c'est de la génération plausible, pas de la vérification.",
      "Les analogies (cerveau, apprenti, instrument) aident à visualiser, mais ne sont jamais des équivalences exactes.",
    ],
  },
  {
    id: 'm2', number: 2, level: 'debutant',
    title: 'Les 50 notions essentielles',
    tagline: "Le vocabulaire de base, expliqué avec exemples et pièges.",
    objective: "Reconnaître et employer correctement les 50 termes clés, et savoir à quelle leçon se référer pour chacun.",
    synthesis: [
      "Le vocabulaire se structure en cinq familles : fondamentaux, génération, applications et données, outils et agents, fiabilité et exploitation.",
      "Comprendre le rôle d'un terme vaut mieux que mémoriser sa définition : relie-le à un exemple et à ses voisins.",
      "Les fiches indiquent aussi l'erreur fréquente associée à chaque notion — c'est souvent là qu'on se trompe.",
    ],
  },
  {
    id: 'm3', number: 3, level: 'debutant',
    title: "Architecture d'une application",
    tagline: "Frontend, backend, API, base de données : qui parle à qui ?",
    objective: "Décrire le trajet d'une requête depuis l'utilisateur jusqu'au modèle d'IA et retour, et lire un échange API simple.",
    synthesis: [
      "Le modèle n'est qu'une brique : l'application gère aussi interface, droits, données, erreurs et coûts.",
      "Les secrets (clés API) restent côté serveur ; le navigateur est un environnement non fiable.",
      "Une API est un contrat ; une requête a un point d'accès, une méthode, des données ; la réponse a un code de statut.",
      "Authentification = qui es-tu ; autorisation = que peux-tu faire. Les deux se vérifient côté serveur.",
    ],
  },
  {
    id: 'm4', number: 4, level: 'intermediaire',
    title: 'Modèles et données',
    tagline: "Choisir un modèle, retrouver l'information, adapter ou mémoriser.",
    objective: "Comparer des modèles selon une tâche, comprendre embeddings, RAG, fine-tuning et mémoire, et choisir entre eux selon le besoin.",
    synthesis: [
      "Il n'existe pas de meilleur modèle universel : on compare sur ses propres tâches (qualité, vitesse, coût, contexte, confidentialité, licence).",
      "Poids ouverts ≠ open source au sens complet ; modèle local ≠ forcément meilleur ni moins cher.",
      "Embeddings et recherche vectorielle retrouvent par proximité de sens ; le RAG injecte les passages trouvés dans le contexte.",
      "RAG (connaissances externes), fine-tuning (comportement), contexte (conversation) et mémoire applicative répondent à des besoins différents.",
    ],
  },
  {
    id: 'm5', number: 5, level: 'debutant',
    title: 'Prompting et méthodes de réflexion',
    tagline: "Formuler une demande claire, itérer, vérifier.",
    objective: "Construire un prompt structuré (objectif, contexte, données, contraintes, format), l'améliorer par itérations et distinguer faits, hypothèses et incertitudes.",
    synthesis: [
      "Un bon prompt réduit l'ambiguïté : objectif, contexte, entrées, contraintes, format, critères de réussite.",
      "Décomposer, donner un exemple, séparer données et instructions, demander les incertitudes.",
      "On améliore un prompt par itérations ciblées, un changement à la fois, testées sur plusieurs cas.",
      "Un prompt oriente la réponse sans garantir sa qualité : la vérification reste nécessaire.",
    ],
  },
  {
    id: 'm6', number: 6, level: 'intermediaire',
    title: 'Outils, MCP, skills et agents',
    tagline: "Quand un modèle agit sur le monde — et comment garder le contrôle.",
    objective: "Distinguer prompt, skill, outil, API, serveur MCP, workflow et agent ; comprendre le cycle MCP ; concevoir des permissions minimales.",
    synthesis: [
      "Le modèle demande un appel d'outil ; c'est l'application qui l'exécute, après contrôle.",
      "MCP standardise la découverte et l'appel de capacités (outils, ressources, prompts) entre hôte/client et serveur — il ne garantit ni sécurité ni autonomie.",
      "Un workflow suit des étapes prévues ; un agent choisit des étapes. L'autonomie doit être proportionnée aux conséquences d'une erreur.",
      "Les règles d'autorisation s'appliquent dans le code qui exécute l'action, pas dans le prompt.",
    ],
  },
  {
    id: 'm7', number: 7, level: 'intermediaire',
    title: 'Fiabilité et sécurité',
    tagline: "Vérifier, tester, protéger, garder un humain dans la boucle.",
    objective: "Limiter les hallucinations, évaluer un système avec un jeu de tests, protéger données et clés, reconnaître une injection de prompt et prévoir pannes et contrôle humain.",
    synthesis: [
      "La fluidité n'est pas la vérité : vérifier les affirmations importantes auprès de sources solides.",
      "Une démonstration réussie ne prouve rien : on évalue sur des cas représentatifs, séparés des cas d'ajustement.",
      "Minimiser les données envoyées, protéger les clés côté serveur, traiter tout contenu récupéré comme non fiable.",
      "Plus l'impact d'une erreur est grand, plus il faut de contrôles déterministes et de validation humaine.",
    ],
  },
  {
    id: 'm8', number: 8, level: 'intermediaire',
    title: 'Mise en pratique',
    tagline: "Spécifier, construire, évaluer et présenter un petit assistant.",
    objective: "Spécifier un assistant, concevoir un pipeline documentaire, intégrer un outil en lecture seule avec contrôles, l'évaluer, puis planifier la suite.",
    synthesis: [
      "On commence par le besoin et la spécification, pas par le choix du modèle.",
      "Architecture la plus simple d'abord : contexte fourni, puis RAG si le corpus grandit, puis outils si nécessaire.",
      "Chaque brique ajoutée doit résoudre un problème identifié et mesurable.",
      "Un projet fini comprend : spécification, architecture, jeu de tests, résultats mesurés et limites documentées.",
    ],
  },
];

MODULES.push({
  id: 'm9', number: 9, level: 'avance',
  title: 'Expert : concevoir des systèmes d’IA',
  tagline: 'Attention, adaptation de modèles, RAG avancé, agents fiables, sécurité, étude de cas.',
  objective: "Aller sous le capot (calcul d'attention, adaptation de modèles), concevoir un RAG ou un agent robuste, mener une analyse de menaces et assembler un système complet en justifiant chaque choix.",
  synthesis: [
    "Le calcul d'attention compare des requêtes à des clés pour pondérer des valeurs ; le cache clé-valeur évite de recalculer le passé pendant la génération.",
    "On adapte un modèle du plus léger au plus lourd : prompt, RAG, adaptation légère (LoRA), puis entraînement plus profond — en mesurant à chaque étape.",
    "Un RAG avancé combine recherche hybride, reclassement, filtres et évaluation séparée de la récupération et de la génération.",
    "Un agent fiable est borné (étapes, budget, délai), observable, testé sur des trajectoires et soumis à des approbations ; la sécurité repose sur la suppression de capacités, pas sur des consignes.",
  ],
});

export const moduleById = new Map(MODULES.map((m) => [m.id, m]));

export const LEVEL_LABEL = {
  debutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  avance: 'Expert',
} as const;
