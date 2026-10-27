import type { DocResource } from './types';

const V = '2026-10-26';

/** Documentations et cours externes. Chaque URL a été testée (HTTP 200) à la date indiquée ; `npm run verify:links` les retestera. */
export const DOCS: DocResource[] = [
  {
    id: 'mcp-site', title: 'Model Context Protocol — documentation officielle', org: 'Projet MCP', kind: 'documentation', level: 'intermediaire', language: 'en',
    url: 'https://modelcontextprotocol.io/', topics: ['mcp'],
    description: "Introduction, architecture, guides pour construire des serveurs et des clients. La documentation est versionnée par date : vérifie la version affichée.",
    lessonIds: ['l-mcp', 'l-serveur-mcp', 'n-04'], verified: V,
  },
  {
    id: 'mcp-spec', title: 'Spécification MCP (dernière version)', org: 'Projet MCP', kind: 'reference', level: 'avance', language: 'en',
    url: 'https://modelcontextprotocol.io/specification/latest', topics: ['mcp'],
    description: "Le texte normatif du protocole : messages, primitives, transports, autorisation.",
    lessonIds: ['l-mcp', 'l-serveur-mcp'], verified: V,
  },
  {
    id: 'mcp-security', title: 'MCP — bonnes pratiques de sécurité', org: 'Projet MCP', kind: 'documentation', level: 'intermediaire', language: 'en',
    url: 'https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices', topics: ['mcp', 'securite'],
    description: "Menaces et recommandations propres à MCP. Le chemin contient la date de version de la documentation : s'il change, repartir de la page d'accueil.",
    lessonIds: ['l-serveur-mcp', 'l-permissions', 'e-securite-menaces'], verified: V,
  },
  {
    id: 'mcp-servers', title: 'Serveurs MCP de référence (dépôt GitHub)', org: 'Projet MCP', kind: 'code', level: 'intermediaire', language: 'en',
    url: 'https://github.com/modelcontextprotocol/servers', topics: ['mcp'],
    description: "Exemples de serveurs (fichiers, etc.) à lire avant d'écrire le sien. Lire le code d'un serveur avant de l'installer.",
    lessonIds: ['l-serveur-mcp', 'l-outil-workflow'], verified: V,
  },
  {
    id: 'mcp-anthropic-annonce', title: "Annonce du Model Context Protocol (Anthropic, nov. 2024)", org: 'Anthropic', kind: 'documentation', level: 'debutant', language: 'en',
    url: 'https://www.anthropic.com/news/model-context-protocol', topics: ['mcp'],
    description: "Contexte historique : pourquoi le protocole a été proposé.",
    lessonIds: ['l-mcp'], verified: V,
  },
  {
    id: 'mlcc', title: 'Machine Learning Crash Course', org: 'Google', kind: 'cours', level: 'debutant', language: 'en',
    url: 'https://developers.google.com/machine-learning/crash-course?hl=fr', topics: ['machine-learning', 'reseaux-de-neurones', 'entrainement'],
    description: "Cours structuré, avec exercices, sur les bases du machine learning. L'interface propose le français ; certaines parties restent en anglais.",
    lessonIds: ['l-ia', 'l-apprentissage', 'l-reseau', 'n-01'], verified: V,
  },
  {
    id: 'hf-llm-course', title: 'LLM Course (anciennement NLP Course)', org: 'Hugging Face', kind: 'cours', level: 'intermediaire', language: 'en',
    url: 'https://huggingface.co/learn/llm-course/chapter1/1', topics: ['llm', 'transformer'],
    description: "Cours gratuit sur les Transformers et les modèles de langage. Le lien du manuel (nlp-course) redirige désormais vers ce cours.",
    lessonIds: ['l-llm', 'n-02', 'e-rag-avance'], verified: V,
  },
  {
    id: 'hf-mcp-course', title: 'MCP Course', org: 'Hugging Face', kind: 'cours', level: 'intermediaire', language: 'en',
    url: 'https://huggingface.co/learn/mcp-course/unit0/introduction', topics: ['mcp'],
    description: "Cours gratuit pour construire et utiliser des serveurs et clients MCP.",
    lessonIds: ['l-serveur-mcp', 'l-outil-workflow'], verified: V,
  },
  {
    id: 'openai-docs', title: 'Documentation de l’API OpenAI', org: 'OpenAI', kind: 'documentation', level: 'intermediaire', language: 'en',
    url: 'https://developers.openai.com/api/docs', topics: ['api', 'llm'],
    description: "Guides et référence d'une API de modèles. L'usage de cette API nécessite un compte et peut être payant : la formation n'en dépend pas. L'ancienne adresse platform.openai.com/docs redirige ici.",
    lessonIds: ['l-api', 'l-appel-outil'], verified: V,
  },
  {
    id: 'openai-function-calling', title: "Guide de l'appel de fonctions / d'outils", org: 'OpenAI', kind: 'documentation', level: 'intermediaire', language: 'en',
    url: 'https://developers.openai.com/api/docs/guides/function-calling', topics: ['outils'],
    description: "Comment un modèle demande l'exécution d'une fonction et comment renvoyer le résultat. Le principe est le même chez les autres fournisseurs.",
    lessonIds: ['l-appel-outil'], verified: V,
  },
  {
    id: 'openai-prompting', title: 'Guide de prompt engineering', org: 'OpenAI', kind: 'documentation', level: 'debutant', language: 'en',
    url: 'https://developers.openai.com/api/docs/guides/prompt-engineering', topics: ['prompting'],
    description: "Recommandations d'un fournisseur de modèles pour formuler des consignes.",
    lessonIds: ['l-prompt', 'l-techniques-prompt'], verified: V,
  },
  {
    id: 'anthropic-tools', title: "Utilisation d'outils par un modèle (tool use)", org: 'Anthropic', kind: 'documentation', level: 'intermediaire', language: 'en',
    url: 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview', topics: ['outils'],
    description: "Description du cycle : le modèle demande un outil, l'application l'exécute, le résultat est renvoyé.",
    lessonIds: ['l-appel-outil'], verified: V,
  },
  {
    id: 'anthropic-agents', title: 'Building effective agents', org: 'Anthropic', kind: 'tutoriel', level: 'intermediaire', language: 'en',
    url: 'https://www.anthropic.com/research/building-effective-agents', topics: ['agents', 'workflows'],
    description: "Article de référence qui distingue workflows et agents, et recommande de commencer simple.",
    lessonIds: ['l-skills-workflows-agents', 'l-outil-workflow', 'e-agents-fiables'], verified: V,
  },
  {
    id: 'anthropic-tools-agents', title: 'Writing effective tools for agents', org: 'Anthropic', kind: 'tutoriel', level: 'intermediaire', language: 'en',
    url: 'https://www.anthropic.com/research/writing-tools-for-agents', topics: ['outils', 'agents'],
    description: "Comment concevoir des outils clairs, étroits et testables.",
    lessonIds: ['l-appel-outil', 'l-serveur-mcp'], verified: V,
  },
  {
    id: 'mdn-http', title: "Aperçu de HTTP", org: 'MDN Web Docs', kind: 'documentation', level: 'debutant', language: 'fr',
    url: 'https://developer.mozilla.org/fr/docs/Web/HTTP/Guides/Overview', topics: ['api', 'http'],
    description: "Requêtes, réponses, méthodes : la base des API web, en français.",
    lessonIds: ['l-api', 'l-requete-erreurs', 'n-03'], verified: V,
  },
  {
    id: 'mdn-status', title: 'Codes de statut des réponses HTTP', org: 'MDN Web Docs', kind: 'reference', level: 'debutant', language: 'fr',
    url: 'https://developer.mozilla.org/fr/docs/Web/HTTP/Reference/Status', topics: ['http'],
    description: "Liste de référence des codes 2xx, 4xx, 5xx, en français.",
    lessonIds: ['l-requete-erreurs'], verified: V,
  },
  {
    id: 'mdn-json', title: 'Travailler avec JSON', org: 'MDN Web Docs', kind: 'tutoriel', level: 'debutant', language: 'fr',
    url: 'https://developer.mozilla.org/fr/docs/Learn_web_development/Core/Scripting/JSON', topics: ['json'],
    description: "Structure d'un document JSON et manipulation en JavaScript, en français.",
    lessonIds: ['l-api'], verified: V,
  },
  {
    id: 'mdn-client-server', title: 'Vue d’ensemble client-serveur', org: 'MDN Web Docs', kind: 'tutoriel', level: 'debutant', language: 'fr',
    url: 'https://developer.mozilla.org/fr/docs/Learn_web_development/Extensions/Server-side/First_steps/Client-Server_overview', topics: ['frontend-backend'],
    description: "Ce qui se passe entre un navigateur et un serveur web, en français.",
    lessonIds: ['l-frontend-backend', 'l-parcours-requete'], verified: V,
  },
  {
    id: 'owasp-llm', title: 'OWASP Top 10 pour les applications LLM', org: 'OWASP GenAI Security Project', kind: 'reference', level: 'intermediaire', language: 'en',
    url: 'https://genai.owasp.org/llm-top-10/', topics: ['securite', 'injection-de-prompt'],
    description: "Les principaux risques de sécurité des applications fondées sur des LLM (injection de prompt, fuite de données, agency excessive…).",
    lessonIds: ['l-confidentialite-injection', 'l-permissions', 'n-05', 'e-securite-menaces'], verified: V,
  },
  {
    id: 'willison-injection', title: 'Prompt injection — série d’articles', org: 'Simon Willison', kind: 'tutoriel', level: 'intermediaire', language: 'en',
    url: 'https://simonwillison.net/series/prompt-injection/', topics: ['securite', 'injection-de-prompt'],
    description: "Analyses d'un praticien sur l'injection de prompt, avec cas réels et limites des protections.",
    lessonIds: ['l-confidentialite-injection'], verified: V,
  },
  {
    id: 'nist-rmf', title: 'AI Risk Management Framework', org: 'NIST', kind: 'reference', level: 'avance', language: 'en',
    url: 'https://www.nist.gov/itl/ai-risk-management-framework', topics: ['gouvernance'],
    description: "Cadre de gestion des risques de l'IA (référence institutionnelle américaine).",
    lessonIds: ['l-fiabilite-exploitation', 'l-feuille-de-route', 'e-etude-de-cas'], verified: V,
  },
  {
    id: 'cnil-ia', title: 'Intelligence artificielle — ressources et recommandations', org: 'CNIL', kind: 'reference', level: 'intermediaire', language: 'fr',
    url: 'https://www.cnil.fr/fr/intelligence-artificielle', topics: ['confidentialite', 'gouvernance'],
    description: "Recommandations de l'autorité française de protection des données sur l'IA et les données personnelles.",
    lessonIds: ['l-confidentialite-injection', 'l-droit-donnees'], verified: V,
  },
  {
    id: 'osi-osaid', title: 'Open Source AI Definition', org: 'Open Source Initiative', kind: 'reference', level: 'intermediaire', language: 'en',
    url: 'https://opensource.org/ai/open-source-ai-definition', topics: ['modeles-ouverts'],
    description: "Définition de ce que « open source » devrait signifier pour un système d'IA — distincte de « poids ouverts ».",
    lessonIds: ['l-ouverts-local', 'e-adaptation-modeles'], verified: V,
  },
  {
    id: 'illustrated-transformer', title: 'The Illustrated Transformer', org: 'Jay Alammar', kind: 'tutoriel', level: 'intermediaire', language: 'en',
    url: 'https://jalammar.github.io/illustrated-transformer/', topics: ['transformer', 'attention'],
    description: "Explication illustrée de l'architecture Transformer.",
    lessonIds: ['l-llm', 'e-attention-calcul'], verified: V,
  },
  {
    id: 'tiktokenizer', title: 'Tiktokenizer — visualiser les tokens', org: 'Outil communautaire', kind: 'code', level: 'debutant', language: 'en',
    url: 'https://tiktokenizer.vercel.app/', topics: ['tokens'],
    description: "Outil en ligne tiers pour voir comment un texte est découpé en tokens selon différents tokenizers. Ne pas y coller de données confidentielles.",
    lessonIds: ['l-llm'], verified: V,
  },
];

export const docById = new Map(DOCS.map((d) => [d.id, d]));
