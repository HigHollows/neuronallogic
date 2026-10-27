# Compte rendu des tests

Exécution du 26 octobre 2026 — `npm test` (Vitest 5, jsdom, Testing Library) : **621 tests, 621 réussis, 0 échec**. `npm run typecheck` : sans erreur. `npm run build` : réussi.

## Tests automatisés

| Fichier | Tests | Ce qui est vérifié |
|---|---|---|
| `tests/content.test.ts` | ≈ 380 | Intégrité du contenu (9 modules, 51 leçons, 200+ questions) |
| `tests/credits.test.ts` | 38 | Moteur de crédits : seuils, anti-doublons, dépenses, niveaux, migration, code de sauvegarde |
| `tests/credits-ui.test.tsx` | 20 | Crédits dans l'interface : gains, notification, bonus avec confirmation, profil, défis, sauvegarde |
| `tests/lib.test.ts` | 26 | Logique métier pure |
| `tests/app.test.tsx` | ≈ 110 | Parcours utilisateur et accessibilité de base |

### Intégrité du contenu (276)
- 8 modules, 35 leçons, identifiants uniques, aucune section vide (objectif, explication simple et technique, exemple, ≥ 2 idées reçues, cas réel, ≥ 3 points à retenir, 3 à 5 questions de vérification, > 200 mots).
- Toutes les références croisées existent : prérequis, leçons et notions liées, vidéos, documentations, schémas (tous utilisés, chacun avec une explication), `[[notion]]` dans les textes.
- 50 notions numérotées de 1 à 50 sans trou, fiches complètes, analogies accompagnées de leur limite, notions liées existantes, 10 notions par série.
- 144 questions de quiz uniques : bonnes réponses valides, **chaque mauvais choix accompagné d'une explication**, aucun doublon de réponse, bonne réponse répartie sur plusieurs positions.
- Ressources : 32 vidéos avec métadonnées vérifiées, 25 documentations en HTTPS, au moins une ressource par module, aucune URL d'achat.
- Fidélité au manuel : les 50 chapitres du PDF sont chacun reliés à un contenu existant (`manualMap.ts`) ; 22 corrections documentées avec passage, problème, correction et justification ; aucun vocabulaire de monétisation dans les leçons.

### Logique (26)
Normalisation, temps de lecture, durées ; correction des questions à choix unique et multiple, calcul du score ; mini-format de texte (sans interprétation de HTML ni de liens non http(s)) ; progression : persistance, annulation, meilleur score, stockage corrompu, export/import, réinitialisation ; recherche : accents, mots anglais, classement titre/corps, requêtes vides, extraits, et recherche sur le vrai contenu.

### Interface (99)
- Navigation : 12 pages statiques, 8 modules, 35 leçons (sections et boutons précédent/suivant présents, aucun `undefined` ni balise brute), 50 fiches, 5 routes inexistantes (page « introuvable » avec liens de retour).
- Progression : leçon terminée, sauvegarde, restauration après rechargement simulé, dernière leçon consultée, état vide des quiz, message sur la nature locale des données.
- Quiz : quiz complet de 30 questions avec correction immédiate et score exact, enregistrement du meilleur score, reprise ; mode « correction à la fin » ; bouton inactif sans réponse ; liste des quiz ; vérification en fin de leçon.
- Glossaire (filtre, état vide, réinitialisation), ressources (filtres type/recherche/état vide, vidéos présentées comme externes, **aucun lecteur YouTube avant clic**, liens externes en `target=_blank rel=noopener`), recherche (titres, définitions, absence de résultat, barre latérale).
- Exercices (grille d'auto-évaluation, seuil 6/8), projet final (étapes persistantes), gratuité et corrections.
- Accessibilité de base sur 57 pages : un seul `h1`, repères `main` et `nav`, champs étiquetés, liens et boutons nommés, identifiants uniques, SVG nommés, pas de saut de niveau de titre. *(Ce test a révélé et fait corriger 5 sauts de niveau de titres.)*

## Vérifications faites hors tests automatisés

| Vérification | Résultat |
|---|---|
| `npm run verify:links` — 25 URL de documentation | 25 OK ; 3 redirections détectées et corrigées vers l'adresse finale |
| `npm run verify:videos` — 32 vidéos YouTube | 32 trouvées ; titre, chaîne, durée, date et sous-titres français publiés relevés (6 vidéos avec sous-titres FR) |
| Navigateur réel (volet intégré), console | aucune erreur ni avertissement de console sur les pages visitées |
| Navigateur réel, mobile 375 px, 21 pages | aucun débordement horizontal ; schémas lisibles ; menu et quiz utilisables |
| Navigateur réel, persistance | leçon marquée terminée → rechargement complet → progression, dernière leçon et bouton « Reprendre » restaurés |
| Navigateur réel, route inexistante | page « Page introuvable » avec titre de document adapté |
| Bug visuel trouvé et corrigé | légendes du schéma de réseau de neurones qui se chevauchaient ; cases de schéma trop hautes sur mobile |

## Limites des vérifications

- **Pas de test automatisé de bout en bout sur un vrai navigateur** (type Playwright) : l'interface est testée en jsdom ; le navigateur réel n'a été piloté qu'à la main sur un échantillon de pages.
- **Contraste et lecteurs d'écran** : les couleurs ont été choisies pour un contraste suffisant (thèmes clair et sombre) et la structure sémantique est testée, mais aucun audit de contraste automatisé (axe, Lighthouse) ni test avec un vrai lecteur d'écran n'a été fait.
- **Vidéos** : l'existence, le titre, la chaîne, la durée et les sous-titres publiés sont vérifiés par programme ; le contenu n'a pas été visionné en entier.
- **Tableaux du PDF** : reconstruits d'après le sens (voir `docs/REVISIONS.md`, C22) ; le rendu visuel du PDF n'a pas pu être examiné.
- **Déploiement** : la configuration de réécriture de `vercel.json` ne peut pas être testée localement ; voir la section de déploiement du README.

## Ajouts de la version « crédits de savoir »

- **Anti-doublons** : appliquer deux fois les récompenses, recharger la page cinq fois, refaire un quiz, réinitialiser un quiz, cocher/décocher/recocher une leçon, valider deux fois un exercice — aucun crédit supplémentaire.
- **Seuils** : 79 % → rien ; 80 % → +15 ; 100 % → +15 et +5 ; leçon terminée sans contrôle réussi → rien ; contrôle réussi sans leçon terminée → rien ; défi de révision sans leçon étudiée → rien.
- **Registre altéré** : montants recalculés d'après le barème, clés inconnues ou dupliquées ignorées, scores impossibles écartés, coûts de bonus corrigés.
- **Dépenses** : refus sans solde, aucun retrait avant confirmation, annulation sans effet, retrait exact du coût, second déblocage refusé, solde jamais négatif, niveau indépendant des dépenses.
- **Niveaux** : les crédits seuls ne suffisent pas (modules validés exigés) ; compétences « à découvrir » sans données.
- **Migration** : une sauvegarde v1 est lue, passée en v2 et les crédits mérités sont versés une seule fois.
- **Sauvegarde** : aller-retour par code (compressé ou non), espaces tolérés, codes invalides ou tronqués refusés, aucune donnée modifiée en cas d'échec.
- **Vérification manuelle** (navigateur réel) : migration d'une sauvegarde v1 (35 crédits attendus, 35 obtenus), tableau de bord, profil, parcours, leçon experte avec schéma ; aucune erreur de console.

## Ajouts de la version « interface GitHub et badges » (13 tests)

- Badges : aucun badge sans fait d'apprentissage ; « Premier pas » exige leçon terminée ET contrôle réussi ; idempotence ; « Sans faute » ignore les petits quiz ; « Persévérance » exige un nouvel essai ; « Module validé » ; « Prévoyant » ; sauvegarde altérée ignorée.
- Graphique d'activité : 20 semaines × 7 jours, aucune activité inventée, placement par date et niveaux 0 à 4, jours futurs ignorés.
- Interface : notification d'un nouveau badge, section Badges du profil avec conditions des badges non obtenus, texte alternatif du graphique (y compris sans activité), recherche placée dans l'en-tête et focalisée par la touche « / ».
- Vérification manuelle (navigateur réel) : en-tête, barre latérale, tableau de bord, graphique, badges en thèmes clair et sombre.

## Ajouts de la version « petites améliorations » (58 tests)

- **Contraste WCAG** (38 tests) : 19 paires texte/fond calculées sur les vraies variables CSS, thèmes clair et sombre (texte courant ≥ 4,5:1, texte principal et en-tête ≥ 7:1).
- **Révision espacée** : rien avant l'étude, suggestion après 3 jours, espacement à 7 jours après une révision, tri et dates invalides.
- **Atelier** : estimation de tokens (fourchette, caractères et non octets), part de fenêtre plafonnée, validation JSON et pistes d'erreurs fréquentes, assemblage de prompt, conseils non bloquants ; interface en direct (estimation, erreur JSON, copie).
- **Site installable** : manifeste valide, icônes PNG réelles, service worker qui n'intercepte ni les requêtes externes ni les non-GET, métadonnées de partage, réécriture Vercel qui exclut sw.js, manifeste et icônes.
- **Non vérifié automatiquement** : l'installation effective sur un téléphone et le fonctionnement hors ligne réel (à essayer à la main : ouvrir le site, couper le réseau, recharger).

## Ajouts de la version « NeuronalLogic Studio » (153 tests)

**Cœur (`tests/studio-core.test.ts`, 120 tests)** : catalogue (46 composants, 6 catégories, définitions complètes, MCP jamais présenté comme un modèle) ; connexions (acceptation, refus de type avec cause et correction, modèle ≠ outil, client MCP ↔ serveur MCP seulement, auto-connexion, doublon, sens inverse, héritage de type des blocs de contrôle) ; vérificateur (chaque règle, niveaux, structure vs logique, un schéma relié mais risqué n'est pas déclaré correct) ; les 5 modèles valides sans erreur ni avertissement et le modèle incorrect avec ses 8 défauts ; simulation (déterministe, données fictives signalées, RAG avec et sans passage pertinent, MCP, refus d'approbation, erreur d'authentification, composants en attente, arrêt sûr sur boucle) ; mise en page ; import/export (aller-retour sans perte, fichier non JSON / trop gros / mauvais format / mauvaise version, limites, éléments invalides écartés et signalés, nom hostile conservé comme texte, projets illisibles mis de côté) ; magasin d'édition (annulation/rétablissement, regroupement des frappes, duplication, limite de composants, effacement annulable) ; défis (critères objectifs, correction réelle exigée) ; tutoriel (chaque étape validée par une action détectée).

**Interface et crédits (`tests/studio-ui.test.tsx`, 33 tests)** : bibliothèque et recherche ; ajout au clic ; refus de connexion annoncé (`role="alert"`) avec correction ; connexion sans souris ; paramètres + annuler/rétablir ; confirmation d'effacement ; enregistrement automatique ; zones mobiles ; vérification, simulation pas à pas (avant/arrière) et impossibilité de simuler sans entrée ; import invalide / valide avec rapport, export au format documenté, projets (dupliquer, supprimer avec confirmation) ; tutoriel complet jusqu'aux crédits (une seule fois, refus tant que le quiz n'est pas réussi, pause/reprise/passage persistants) ; défis : aucun crédit sans critères remplis, aucun doublon, sauvegarde falsifiée ignorée, badge « Architecte », « consulté ≠ maîtrisé » ; pages du guide (sommaire, composants, architectures, dépannage, page inconnue, liens de documentation valides) ; navigation ; stockage corrompu.

**Total de la suite : 774 tests.**

**Non vérifié automatiquement** : le glisser-déposer à la souris et le tracé d'une connexion à la souris (jsdom ne les simule pas : ils sont couverts par le formulaire « Connecter à… » et la logique `studio.connect`, mais pas par un test de geste réel) ; le zoom et le pincement tactiles ; l'accessibilité au lecteur d'écran réel ; le rendu mobile (vérifié visuellement dans un navigateur à 375 px, pas sur un vrai téléphone).
