# Document de révision du manuel

> Généré depuis `src/content/corrections.json` — dernière vérification : 2026-10-26.

Le manuel « Comprendre l'intelligence artificielle » (52 pages, version d'octobre 2026) est la base du cours, mais pas une source infaillible. Chaque modification d'une affirmation est consignée ici : passage concerné, problème, correction et justification. Aucune notion importante n'a été supprimée.

| Type | Nombre |
|---|---|
| Erreur certaine | 1 |
| Mise à jour (information qui a évolué) | 5 |
| Précision ou nuance ajoutée | 3 |
| Formulation ambiguë clarifiée | 4 |
| Complément | 7 |
| Mise en forme / extraction | 2 |

## Erreur certaine

### C01 — chapitre(s) 38

- **Passage concerné :** « Routine quotidienne de 30 à 45 minutes » : 10 min de lecture + 10 min de reformulation + 10 min d'exercice + 5 à 15 min de test.
- **Problème identifié :** Les durées listées font 35 à 45 minutes (10 + 10 + 10 + 5 = 35 au minimum), pas 30 à 45.
- **Correction apportée :** « Environ 35 à 45 minutes par jour ».
- **Justification :** Erreur d'arithmétique vérifiable ; l'incohérence aurait pu décourager ou désorienter un apprenant qui chronomètre sa routine.

## Mise à jour (information qui a évolué)

### C02 — chapitre(s) 18, 39, 49

- **Passage concerné :** Lien officiel MCP : https://modelcontextprotocol.io/introduction (aussi dans la liste de ressources).
- **Problème identifié :** Le lien redirige désormais vers une documentation versionnée par date (/docs/2026-07-28/getting-started/intro).
- **Correction apportée :** Lien vers la page d'accueil modelcontextprotocol.io et mention explicite que la documentation est versionnée.
- **Justification :** Un chemin contenant une date de version cassera à la prochaine publication ; la racine du site reste stable. Vérifié le 2026-10-26.

### C03 — chapitre(s) 39, 49

- **Passage concerné :** Hugging Face NLP Course : https://huggingface.co/learn/nlp-course/chapter1/1.
- **Problème identifié :** Le cours a été renommé : l'adresse redirige vers huggingface.co/learn/llm-course/chapter1/1.
- **Correction apportée :** Nouveau nom et nouvelle adresse (« LLM Course »).
- **Justification :** Redirection constatée le 2026-10-26. Le contenu ciblé reste pertinent.

### C04 — chapitre(s) 39, 49

- **Passage concerné :** Documentation OpenAI : https://platform.openai.com/docs/.
- **Problème identifié :** L'adresse redirige désormais vers developers.openai.com/api/docs.
- **Correction apportée :** Nouvelle adresse ; précision que l'usage de cette API exige un compte et peut être payant, donc qu'elle n'est pas nécessaire à la formation.
- **Justification :** Redirection constatée le 2026-10-26 ; règle de gratuité du projet : aucun service payant ne doit être indispensable.

### C05 — chapitre(s) 18, 19

- **Passage concerné :** « Le client et le serveur négocient ou vérifient les capacités et la version prises en charge » ; « les transports et détails de déploiement dépendent de la version ».
- **Problème identifié :** La formulation reste exacte mais très vague. La spécification en vigueur au moment de la vérification (version 2026-07-28) a changé de fonctionnement : protocole sans état (chaque requête porte version et capacités), requête de découverte server/discover optionnelle, transports stdio et Streamable HTTP, fonction « sampling » dépréciée, « elicitation » côté client.
- **Correction apportée :** La leçon décrit le cycle de façon indépendante de la version, puis précise ce qui a changé entre versions et renvoie à la spécification.
- **Justification :** Source primaire : documentation officielle MCP (page Architecture, version 2026-07-28), consultée le 2026-10-26. Un lecteur qui implémente doit cibler une version précise.

### C20 — chapitre(s) 39

- **Passage concerné :** Sept entrées de la bibliothèque sont de simples recherches YouTube (réseaux de neurones, Transformer, API, RAG, MCP, prompt engineering…).
- **Problème identifié :** Les résultats d'une recherche changent à chaque consultation ; le manuel le reconnaît lui-même. Impossible de garantir niveau, date ou qualité.
- **Correction apportée :** Remplacées par 32 vidéos identifiées, dont titre, chaîne, durée, date et sous-titres publiés ont été vérifiés automatiquement (outil tools/verify-videos.mjs). Les deux vidéos du manuel (3Blue1Brown, Karpathy) sont conservées.
- **Justification :** Exigence de la mission : ne jamais inventer de lien, de titre, de durée ou de sous-titre ; privilégier les contenus récents pour MCP.

## Précision ou nuance ajoutée

### C07 — chapitre(s) 3

- **Passage concerné :** « Poser une question à un assistant ne réentraîne généralement pas son modèle de fond. »
- **Problème identifié :** Exacte pour le comportement pendant la réponse, mais laisse croire que les conversations n'ont aucun effet sur l'amélioration future des modèles.
- **Correction apportée :** Nuance ajoutée : selon le produit et les réglages, les conversations peuvent être conservées et parfois utilisées pour améliorer de futurs modèles ; il faut vérifier les paramètres de confidentialité.
- **Justification :** Cohérent avec le chapitre 25 du manuel (confidentialité) ; évite une fausse assurance.

### C08 — chapitre(s) 14, notion 15

- **Passage concerné :** Fenêtre de contexte : « quantité maximale de tokens que le modèle peut prendre en compte dans une requête donnée », pouvant inclure « la réponse en cours ».
- **Problème identifié :** Selon les fournisseurs, la limite d'entrée et la limite de sortie sont parfois distinctes.
- **Correction apportée :** Mention : certains fournisseurs fixent aussi une limite séparée de longueur de sortie.
- **Justification :** Évite qu'un lecteur déduise à tort que toute la fenêtre est disponible pour la réponse. À vérifier dans la documentation du fournisseur utilisé.

### C09 — chapitre(s) 14, notion 19

- **Passage concerné :** « Une température plus basse tend souvent à rendre les sorties plus prévisibles. »
- **Problème identifié :** Formulation prudente et correcte, mais un débutant peut en déduire « température 0 = réponse toujours identique et vraie ».
- **Correction apportée :** Ajouts : une température basse ne garantit ni l'exactitude ni un résultat strictement identique d'un appel à l'autre ; certains modèles n'exposent pas ce réglage.
- **Justification :** Consigne de la mission : ne jamais présenter une simplification sans en indiquer la limite.

## Formulation ambiguë clarifiée

### C10 — chapitre(s) 22

- **Passage concerné :** Bloc « Rôle / perspective » — exemple : « Agis comme un formateur débutant. »
- **Problème identifié :** Ambigu : « formateur débutant » peut se comprendre comme un formateur qui débute, alors que l'intention est un formateur qui s'adresse à des débutants.
- **Correction apportée :** « Agis comme un formateur pour débutants. »
- **Justification :** Clarté. L'exemple du prompt amélioré du même chapitre confirme l'intention.

### C17 — chapitre(s) 9 (notions 41 à 50)

- **Passage concerné :** Les notions 41 (système de récupération), 42 (corpus) et 43 (chunking) sont classées dans « Fiabilité, sécurité et exploitation ».
- **Problème identifié :** Ces trois notions relèvent du RAG (chapitre 16), pas de la fiabilité ou de la sécurité au sens strict ; le terme « système de récupération » est par ailleurs peu usuel (on dit plutôt « retriever » ou « moteur de recherche documentaire »).
- **Correction apportée :** Numérotation et regroupement conservés pour rester fidèle au manuel ; les fiches 41 à 43 renvoient à la leçon sur le RAG, et la fiche 41 mentionne le terme anglais « retriever ».
- **Justification :** Ne pas renuméroter les « 50 notions » évite de casser la correspondance avec le PDF.

### C18 — chapitre(s) 41

- **Passage concerné :** Le glossaire complémentaire reprend « Observabilité » déjà présente dans les 50 notions (n° 50) et « Fine-tuning supervisé » proche de la notion 28.
- **Problème identifié :** Répétition.
- **Correction apportée :** « Observabilité » est retirée du glossaire complémentaire ; « Fine-tuning supervisé » est conservé (cas particulier). Quatre termes sont ajoutés : recherche hybride, reclassement, similarité cosinus, poids ouverts (définis dans les chapitres 15 et 29 mais absents du glossaire).
- **Justification :** Éviter les doublons sans perdre de contenu.

### C19 — chapitre(s) 20

- **Passage concerné :** Définition de « skill » : « ensemble réutilisable de consignes, de procédures et éventuellement de fichiers de référence ».
- **Problème identifié :** Le chapitre précise justement que le sens dépend de la plateforme, mais ne distingue pas explicitement trois cas fréquents.
- **Correction apportée :** La leçon distingue : procédure réutilisable (documentaire), consignes avec ressources, et paquet pouvant contenir des scripts exécutables, avec la conséquence sur les permissions.
- **Justification :** Exigence de la mission : « distingue une procédure réutilisable, des instructions documentaires et un programme exécutable ».

## Complément

### C06 — chapitre(s) 19

- **Passage concerné :** Bonnes pratiques pour les serveurs MCP (limiter les droits, confirmer les actions sensibles…).
- **Problème identifié :** Le chapitre ne mentionne pas les risques spécifiques documentés par le projet MCP.
- **Correction apportée :** Ajout : un serveur local est du code exécuté avec les droits de l'utilisateur (consentement explicite avant lancement, exécution restreinte), interdiction de faire suivre des jetons non émis pour le serveur (« token passthrough »), permissions (scopes) minimales.
- **Justification :** Source primaire : page « Security Best Practices » de la documentation MCP, consultée le 2026-10-26. L'ajout renforce le message du manuel (« le protocole ne suffit pas ») sans le contredire.

### C11 — chapitre(s) 23

- **Passage concerné :** « Séparer données et instructions — utiliser des délimiteurs clairs autour du contenu fourni. »
- **Problème identifié :** Peut donner une impression de protection contre les instructions cachées dans les données.
- **Correction apportée :** Ajout : les délimiteurs aident à la clarté mais ne garantissent pas une protection contre l'injection de prompt.
- **Justification :** Cohérence avec le chapitre 25 et avec la documentation de sécurité (OWASP LLM Top 10).

### C12 — chapitre(s) 3

- **Passage concerné :** Surapprentissage / sous-apprentissage / « tester sur des données séparées ».
- **Problème identifié :** Le manuel ne précise pas comment séparer les données.
- **Correction apportée :** Ajout du découpage entraînement / validation / test et du risque d'évaluer sur les données d'entraînement.
- **Justification :** Notion élémentaire pour comprendre la généralisation ; cohérent avec le chapitre 27 (jeu de test séparé).

### C13 — chapitre(s) 28 (notion), 29

- **Passage concerné :** Fine-tuning ; modèles à poids ouverts.
- **Problème identifié :** Deux distinctions importantes absentes : (1) fine-tuning pour un comportement stable vs RAG pour des faits changeants ; (2) « poids ouverts » vs « open source ».
- **Correction apportée :** Ajouts : rôle du fine-tuning et méthodes légères (type LoRA) ; renvoi à l'Open Source AI Definition 1.0 de l'Open Source Initiative (publiée fin 2024).
- **Justification :** Le manuel annonce ces distinctions dans sa fiche de révision (chapitre 40) sans les développer. Source : opensource.org (page vérifiée le 2026-10-26).

### C14 — chapitre(s) 12

- **Passage concerné :** Tableau des erreurs : 401, 403, 404, 429, 5xx.
- **Problème identifié :** Absents : 400/422 (requête invalide), délai indiqué par le serveur pour les reprises, idempotence.
- **Correction apportée :** Ajout d'une note sur 400/422, du principe de respect du délai de reprise indiqué par le service, et de l'idempotence pour les actions sensibles.
- **Justification :** Complète sans modifier la logique du chapitre ; l'idempotence figure déjà dans le glossaire complémentaire du manuel.

### C15 — chapitre(s) 15

- **Passage concerné :** Embeddings : « des contenus ayant des significations proches produisent des vecteurs proches ».
- **Problème identifié :** Ne précise pas que les embeddings de modèles différents ne sont pas comparables.
- **Correction apportée :** Ajout : question et documents doivent être vectorisés avec le même modèle ; la recherche par mots exacts reste préférable pour les références précises.
- **Justification :** Erreur d'implémentation fréquente chez les débutants.

### C16 — chapitre(s) 27

- **Passage concerné :** Grille d'évaluation et création d'un jeu de test.
- **Problème identifié :** L'évaluation automatisée par un autre modèle (« LLM-as-judge ») n'est pas mentionnée.
- **Correction apportée :** Ajout d'un paragraphe : pratique courante, mais le juge a ses propres biais ; à calibrer sur un échantillon noté par des humains.
- **Justification :** Pratique répandue que le lecteur rencontrera ; mise en garde cohérente avec l'esprit du manuel.

## Mise en forme / extraction

### C21 — chapitre(s) Tout le document

- **Passage concerné :** Balises <b>, <br/> et <link> visibles dans le texte, puces et cases à cocher rendues par des caractères (« q », « s »), titre de couverture coupé (« L'INTELLIGEN CE »).
- **Problème identifié :** Défauts de génération du PDF, sans conséquence sur le sens.
- **Correction apportée :** Contenu retranscrit proprement ; les cases de la check-list du chapitre 45 deviennent de vraies cases à cocher persistantes.
- **Justification :** Lisibilité et accessibilité.

### C22 — chapitre(s) 10, 12, 17, 20, 21, 22, 27, 28, 29, 48

- **Passage concerné :** Tableaux à plusieurs colonnes.
- **Problème identifié :** À l'extraction du texte, les colonnes sont désalignées (les lignes d'un même tableau se mélangent). Le rendu visuel du PDF n'a pas pu être examiné image par image dans cet environnement.
- **Correction apportée :** Les associations ont été reconstituées d'après le sens et la logique de chaque tableau (par exemple 401 → authentification, 403 → permissions, 404 → endpoint, 429 → réduire la fréquence, 5xx → journaux et reprises prudentes).
- **Justification :** Les reconstitutions sont cohérentes avec le reste du manuel, mais une relecture de ces tableaux contre le PDF d'origine est recommandée avant publication définitive.

## Éléments vérifiés et conservés

- Définitions des 50 notions : conformes aux sources de référence consultées ; aucune erreur factuelle certaine trouvée dans le fond (les ajouts ci-dessus sont des précisions).
- Architecture MCP (hôte, client, serveur ; outils, ressources, prompts) : conforme à la documentation officielle.
- Vidéos citées (3Blue1Brown « But what is a neural network? » ; Andrej Karpathy « Let's build GPT ») : existent, correspondent au sujet annoncé, sont en anglais, avec sous-titres français publiés pour les deux.
- Google Machine Learning Crash Course : lien valide.
- Distinctions pédagogiques du manuel (analogie ≠ équivalence, plausible ≠ vrai, workflow ≠ agent, MCP ≠ garantie de sécurité) : conservées et renforcées.
