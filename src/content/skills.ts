/** Compétences visées par module : elles ne sont affichées comme « validées » que si le module et son quiz sont réussis. */
export const MODULE_SKILLS: Record<string, string[]> = {
  m1: [
    'Distinguer IA, machine learning et deep learning',
    'Décrire la boucle d’entraînement et la différence avec l’inférence',
    'Expliquer comment un LLM génère du texte, et pourquoi il peut se tromper',
  ],
  m2: ['Employer correctement les 50 notions essentielles', 'Relier chaque notion à un exemple et à son erreur fréquente'],
  m3: [
    'Décrire le trajet d’une requête de l’utilisateur au modèle et retour',
    'Lire une requête HTTP, une réponse JSON et un code d’erreur',
    'Distinguer authentification et autorisation',
  ],
  m4: [
    'Comparer des modèles selon une tâche et des critères explicites',
    'Expliquer embeddings, recherche vectorielle et RAG',
    'Choisir entre RAG, fine-tuning, contexte et mémoire',
  ],
  m5: ['Construire un prompt structuré', 'Itérer sur une réponse et demander les incertitudes', 'Obtenir des sorties exploitables par un programme'],
  m6: [
    'Expliquer le cycle d’un appel d’outil et d’un serveur MCP',
    'Distinguer prompt, skill, outil, workflow et agent',
    'Repérer une faille de permission',
  ],
  m7: [
    'Vérifier une réponse et limiter les hallucinations',
    'Reconnaître une injection de prompt et appliquer des défenses en couches',
    'Construire un jeu de tests et lire des résultats d’évaluation',
  ],
  m8: ['Spécifier un assistant avant de choisir une technologie', 'Concevoir un pipeline documentaire et un workflow contrôlé', 'Planifier sa progression'],
  m9: [
    'Expliquer le calcul d’attention et les choix d’architecture des Transformers',
    'Choisir une méthode d’adaptation de modèle (prompt, RAG, LoRA, distillation)',
    'Concevoir et évaluer un RAG avancé ou un agent borné',
    'Mener une analyse de menaces d’un système d’IA',
  ],
};
