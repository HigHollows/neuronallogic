# NeuronalLogic — formation gratuite à l'intelligence artificielle

Plateforme web pédagogique, **gratuite, sans compte, sans publicité**, tirée du manuel *« Comprendre l'intelligence artificielle »* (52 pages, `source/manuel_complet_ia_debutants.pdf`).

- 9 modules et 51 leçons à trois niveaux (22 débutant, 23 intermédiaire, 6 expert) au format cohérent : explication simple, technique, exemple, schéma, idées reçues, cas réel, activité pratique facultative, ressources, résumé, vérification.
- **Crédits de savoir** (système de récompense sobre, 100 % local) : crédits gagnés par des apprentissages vérifiés, 5 niveaux, tableau de bord, profil, défis de révision, activités bonus facultatives (voir plus bas).
- **Interface inspirée de GitHub** (palette Primer claire/sombre, en-tête fixe avec recherche au raccourci `/`, boutons, étiquettes, graphique d'activité façon « contributions »).
- **13 badges** rares, obtenus pour des étapes d'apprentissage réelles.
- **Atelier d'outils** (estimateur de tokens, vérificateur de JSON, constructeur de prompt), **révision espacée** sans pression, **site installable et utilisable hors ligne**, aperçu de partage.
- **Sauvegarde ultra simple** : enregistrement automatique + un code à copier-coller.
- Les **50 notions essentielles** en fiches individuelles + 23 termes complémentaires.
- 14 schémas HTML/SVG accessibles, 32 vidéos et 25 documentations **vérifiées** (aucun lien inventé).
- Quiz de fin de module, quiz des 50 notions, exercices de mise en situation, projet final guidé.
- Progression, scores et dernière leçon enregistrés **localement** (`localStorage`), recherche globale, thème clair/sombre.
- Document de révision du manuel : [`docs/REVISIONS.md`](docs/REVISIONS.md) (affiché aussi sur le site, page *Corrections*).

Aucun backend, aucune base de données, aucune clé d'API : le site est entièrement statique. Il n'appelle **aucun modèle d'IA** pour afficher les cours ou les quiz.

## Pile technique

Vite + React 19 + TypeScript + React Router, tests Vitest + Testing Library. Pas de dépendance d'exécution autre que `react`, `react-dom`, `react-router-dom`. Le projet partait de zéro (dossier vide) : cette pile est un choix simple et maintenable pour un site statique.

## Installation et lancement

Prérequis : Node.js 20 ou plus récent.

```bash
npm install
npm run dev
```

Le site est alors disponible sur http://localhost:5173.

## Tests

```bash
npm test            # 621 tests : intégrité du contenu, logique, parcours utilisateur
npm run typecheck   # contrôle TypeScript
npm run verify:links    # teste en ligne toutes les URL de documentation
npm run verify:videos   # re-vérifie les vidéos YouTube et régénère videos.json
```

Ce que couvrent les tests : navigation vers chaque module, leçon et fiche ; routes inexistantes ; quiz complet (corrections immédiates ou finales, calcul du score, meilleur score, reprise) ; sauvegarde et restauration de la progression après rechargement, stockage corrompu, export/import ; recherche (accents, titres, définitions, mots anglais) ; filtres de ressources ; absence de lecteur vidéo avant clic ; liens externes en `noopener` ; cohérence du contenu (aucune leçon vide, références croisées valides, 50 notions complètes, 50 chapitres du manuel tous reliés à un contenu, chaque mauvais choix d'un quiz expliqué). Le compte rendu des résultats est dans [`docs/TESTS.md`](docs/TESTS.md).

## Structure du projet

```
source/                  PDF d'origine (le texte extrait est ignoré par git)
docs/                    REVISIONS.md (corrections du manuel), TESTS.md
src/lib/credits.ts       Moteur des crédits (logique pure, testée) ; barèmes : src/lib/creditsConfig.ts
src/lib/state.ts         Format de sauvegarde (version 2), lecture défensive, migration depuis la v1
src/lib/saveCode.ts      Code de sauvegarde « copier-coller »
src/content/             Données pédagogiques (aucun texte de cours dans les composants)
  modules.ts             les 8 modules
  lessons/m1.ts … m9.ts  les leçons de base par module (m9 = module expert)
  lessons/extra-debutant.ts, extra-intermediaire.ts   leçons complémentaires, insérées via `after`
  bonus.ts               défis et fiches bonus (débloqués avec des crédits)
  skills.ts              compétences visées par module
  glossary.ts            50 notions + glossaire complémentaire
  quizzes.ts             questions de synthèse, quiz des 50 notions, exercices
  docs.ts                documentations externes
  videos.source.json     vidéos : identifiants + niveau + leçons liées (à éditer)
  videos.json            généré par `npm run verify:videos` (titre, chaîne, durée…)
  corrections.json       corrections du manuel (source du document de révision)
  manualMap.ts           chaque chapitre du manuel → où il vit dans le site
src/components/          interface, quiz, blocs de contenu, schémas (diagrams/)
src/pages/               une page par route
src/lib/                 progression, quiz, recherche, texte (logique pure, testée)
tools/                   vérification des liens et vidéos, génération de REVISIONS.md
tests/                   tests automatisés
```

## Crédits de savoir : fonctionnement

**Principe.** Les crédits récompensent une compréhension démontrée — jamais le temps passé, la connexion quotidienne ou les clics — et ne servent qu'à débloquer des activités **facultatives**. Tout le contenu essentiel (leçons, quiz, corrections, exercices, ressources, projet final) reste gratuit et accessible sans crédit.

| Activité | Condition | Crédits |
|---|---|---|
| Leçon | marquée terminée **et** contrôle de compréhension réussi (≥ 66 %) | +10 |
| Quiz | ≥ 80 % de bonnes réponses | +15 |
| Quiz parfait | 100 % (en plus) | +5 |
| Exercice pratique | scénarios corrigés réussis à 80 %, ou exercice rédigé validé (production minimale + critères) | +20 |
| Module | toutes les leçons terminées **et** quiz de module réussi | +30 |
| Défi de révision | réussi sur une notion déjà étudiée (une fois par notion) | +5 |

**Aucun doublon possible.** Les récompenses ne sont pas déclenchées par des événements mais *déduites de faits enregistrés* (scores, leçons terminées) et inscrites dans un registre sous une clé unique (`lesson:l-ia`, `quiz80:quiz-m1`…). Une clé déjà présente ne peut plus être gagnée : recharger la page, refaire un quiz, décocher puis recocher une leçon ou réinitialiser un quiz ne redonne rien. Les montants du registre sont recalculés d'après le barème à chaque lecture.

**Niveaux** (voir `src/lib/creditsConfig.ts`) : Explorateur de l'IA → Apprenti → Praticien → Concepteur de projets IA → Maître des fondamentaux. Chaque niveau exige des crédits **et** des objectifs pédagogiques (modules validés, étapes du projet final, quiz des 50 notions) : les crédits seuls ne suffisent pas. Pas de classement, pas de comparaison. Les compétences affichées comme « validées » exigent leçons terminées + quiz de module réussi ; sans données, le statut reste « à découvrir » ou « en cours » — aucune statistique de maîtrise n'est inventée.

**Dépenses.** Les crédits débloquent des défis pratiques, des fiches de synthèse et un parcours de révision personnalisé (page *Activités bonus*). Le coût est affiché, une confirmation est demandée, rien n'est jamais retiré automatiquement. Le niveau dépend des crédits *gagnés*, pas du solde.

**Modifier le barème.** Un seul fichier : `src/lib/creditsConfig.ts` (récompenses, seuils, niveaux, catalogue et coûts des bonus). Pour ajouter un type de récompense : ajouter sa clé dans `earnable()` de `src/lib/credits.ts` et son montant dans `rewardAmount()` de `src/lib/state.ts`, puis un test dans `tests/credits.test.ts`.

**Limite assumée.** Tout est stocké dans le navigateur : quelqu'un qui édite son stockage local peut se donner des crédits. Ce système est un encouragement personnel, **pas une certification ni une protection contre la triche** ; il n'y a volontairement ni compte, ni serveur, ni base de données.

## Atelier, révision espacée, hors ligne

- **Atelier** (`/atelier`, `src/lib/atelier.ts`) : estimation *grossière* des tokens (fourchette, clairement présentée comme non exacte), vérification de JSON avec ligne et piste d'erreur, construction d'un prompt à six blocs. Tout reste dans le navigateur.
- **Révision espacée** (`src/lib/review.ts`) : une notion étudiée est suggérée à revoir 3 jours après, puis 7, puis 21 jours après la dernière révision. Simple suggestion : pas de série, pas de rappel insistant. Les délais se règlent dans `REVIEW_INTERVALS_DAYS`.
- **Hors ligne** : `public/sw.js` met en cache les fichiers du site après une première visite (navigation : réseau d'abord ; jamais d'interception des ressources externes comme YouTube). `public/manifest.webmanifest` rend le site installable. Pour forcer le rafraîchissement du cache, change `CACHE` dans `sw.js`. Icônes : `node tools/gen-icons.mjs`.
- **Vérification automatique** : `.github/workflows/verify.yml` (tests, build, liens, vidéos chaque mois) — utile si le dépôt est publié sur GitHub.
- **Contraste** : `tests/contrast.test.ts` calcule les contrastes WCAG des vraies couleurs des deux thèmes (texte courant ≥ 4,5:1).

## Badges et graphique d'activité

Les badges (`src/lib/badges.ts`) sont volontairement peu nombreux (15) et déduits de faits d'apprentissage : première leçon validée, module validé, 100 % à un quiz, quiz réussi après un nouvel essai, 5 défis de révision, quiz des 50 notions, étapes du projet final, module sécurité, module expert, sauvegarde exportée… **Aucun badge pour la connexion, le temps passé ou le nombre de clics.** Chaque badge s'obtient une seule fois, avec une notification discrète ; les badges non obtenus affichent leur condition (pas de mystère artificiel). Pour en ajouter un : une entrée dans `BADGES` et un test.

Le graphique d'activité du tableau de bord et du profil représente les 20 dernières semaines (une case par jour) à partir des activités réellement enregistrées. Il n'y a volontairement **pas de série (« streak ») ni d'objectif quotidien**.

## NeuronalLogic Studio : éditeur d'architectures IA

Page `/studio` : un éditeur visuel pour **comprendre comment les briques d'un système d'IA s'assemblent** (pas un outil de production : aucun code généré, aucun vrai modèle appelé, aucun compte, aucune clé d'API).

**Fonctions** : 46 composants en 6 catégories (bibliothèque avec recherche, ajout par glisser-déposer ou bouton « Ajouter »), canevas (déplacer, relier, zoom, panoramique, sélection multiple, dupliquer, supprimer, annuler/rétablir, réorganisation automatique, effacement avec confirmation), inspecteur (définition, rôle, entrées/sorties, paramètres, formulaire « Connecter à… » sans souris, limites, exemple, lien « Comprendre ce composant »), 5 types de connexions (données, requête, réponse, appel d'outil, dépendance — distingués par la couleur **et** le trait **et** un libellé), connexions incompatibles refusées avec explication et correction, vérificateur (erreur / avertissement / information ; structure ≠ logique ≠ exécution), simulation pas à pas à données fictives (pause, reprise, retour arrière), 6 architectures modèles, 5 défis guidés, tutoriel interactif en 7 étapes, projets enregistrés dans le navigateur, export/import JSON validé.

**Organisation du code** (`src/studio/`) : tout le cœur est **sans React** donc testable seul — `types.ts`, `data/components.ts` (catalogue : ajouter un composant = une entrée), `connections.ts` (typage des ports et règles de refus), `checker.ts` (règles de vérification, une `code` stable par type de remarque), `simulate.ts`, `layout.ts`, `project.ts` (format, limites, stockage), `store.ts` (édition + annulation), `challenges.ts`, `data/templates.ts`, `data/tutorial.ts`, `data/guides.ts`. Seuls `pages/Studio.tsx`, `pages/StudioGuide.tsx` et `studio/ui/parts.tsx` utilisent React / React Flow (`@xyflow/react`, chargé à la demande avec la page).

**Ajouter un composant** : une entrée dans `COMPONENTS` (ports typés, paramètres, définition, rôle, exemple, limites, erreurs fréquentes) ; sa page de guide est générée automatiquement et les tests de complétude le vérifient. **Ajouter une règle de vérification** : une `issue(...)` dans `checker.ts` + une entrée du même `code` dans `TROUBLESHOOTING` (`data/guides.ts`) — un test impose la correspondance.

**Crédits** : +20 par réussite, une seule fois (clé unique dans le registre) : tutoriel terminé (étapes réalisées + quiz de 3 questions réussi) et chaque défi guidé. Pour un défi, les critères sont **ré-évalués par le code sur le schéma** au moment de la validation (`actions.completeStudioChallenge`) : un simple clic ne suffit jamais. Consulter un guide ne rapporte rien (« consulté ≠ maîtrisé »). Deux badges : « Premier schéma » et « Architecte » (3 défis).

**Format d'export** : `{ "format": "neuronallogic-studio", "version": 1, "name", "nodes": [{ "id", "component", "x", "y", "params" }], "edges": [{ "source", "sourcePort", "target", "targetPort" }] }`. À l'import : 1 Mo, 200 composants, 400 connexions, 30 projets maximum ; tout élément invalide est écarté **et signalé**, jamais interprété comme du code. Un stockage illisible est copié dans `nl:studio:v1:rescue:<date>`, jamais supprimé en silence.

**Limites** : les projets vivent dans le stockage du navigateur (perdus si on efface les données du site — d'où l'export) ; la simulation illustre un parcours et ne prouve rien sur un vrai système ; le vérificateur ne connaît que ses règles ; la mise en page automatique peut croiser des connexions dans les schémas à boucles.

## Sauvegarde de la progression

La progression (leçons, scores, crédits, objectifs) s'enregistre **automatiquement** dans le navigateur. Pour la garder ailleurs ou après un effacement : page *Profil et progression* → **Copier mon code de sauvegarde** (une chaîne `NL2:…` à coller dans une note), puis **Restaurer depuis le code** sur n'importe quel navigateur. Un fichier JSON est aussi proposé. Les anciennes sauvegardes (v1, sans crédits) sont migrées automatiquement et les crédits déjà mérités sont versés une seule fois.

## Niveaux de contenu

Chaque leçon a un niveau (débutant, intermédiaire, expert) ; par défaut celui de son module, sinon le champ `level`. Le parcours se filtre par niveau et par statut (à découvrir, en cours, terminé). Pour ajouter une leçon complémentaire sans réécrire l'ordre existant, mets-la dans `extra-debutant.ts` ou `extra-intermediaire.ts` avec `after: 'id-de-la-leçon-précédente'`.

## Comment ajouter ou modifier une leçon

1. Ouvre le fichier du module dans `src/content/lessons/` (par exemple `m4.ts`).
2. Ajoute un objet `Lesson` au tableau, avec un **identifiant stable** (`l-mon-sujet`, ne jamais le renommer ensuite : il sert d'URL et de clé de progression). L'ordre du tableau est l'ordre du parcours.
3. Remplis tous les champs : `objective`, `simple`, `technical`, `example`, `misconceptions` (au moins 2), `realWorld`, `summary`, `related`, `checkQuestions` (3 à 5). Un schéma est facultatif : `diagram` (voir plus bas), tout comme une `activity` (activité pratique non récompensée).
4. Le texte accepte un mini-format : `**gras**`, `*italique*`, `` `code` ``, `[[id-de-notion]]` (lien vers une fiche) et `[texte](https://…)`. Aucun HTML n'est interprété.
5. Les blocs de `technical` et `example.blocks` sont : `p`, `ul`, `ol`, `table`, `code`, `callout` (`note`, `limit`, `warning`, `tip`), `beforeAfter`.
6. Lance `npm test` : les tests signalent une leçon vide, un lien interne cassé, une référence de notion/vidéo/doc inexistante, un schéma sans explication.
7. Le temps de lecture est **calculé** automatiquement (≈190 mots/minute) : ne l'écris pas à la main.

Pour ajouter un **schéma**, crée un composant dans `src/components/diagrams/index.tsx`, ajoute son identifiant au type `DiagramId` (`src/content/types.ts`) et au registre `REGISTRY`, puis référence-le dans `diagram: { id, title, explanation }`. L'explication est obligatoire (test).

## Comment ajouter un quiz ou une question

Une question s'écrit avec l'utilitaire `q()` :

```ts
q('id-unique', "Énoncé ?",
  [["Bonne réponse", "Ce qu'il faut retenir"],
   ["Mauvaise réponse plausible", "Pourquoi cette erreur de compréhension est fausse"],
   ["Autre piège", "Explication"]],
  0,                       // indice de la bonne réponse, ou [0, 2] pour un choix multiple
  "Explication générale de la correction.",
  { lessonId: 'l-rag' })   // facultatif : lien « Revoir la leçon »
```

- Dans une leçon : ajoute-la à `checkQuestions` (3 à 5).
- Défis bonus : `src/content/bonus.ts` (puis déclarer l'activité dans `BONUS` de `creditsConfig.ts`).
- Quiz de fin de module : `MODULE_EXTRA` dans `src/content/quizzes.ts` (s'ajoute aux questions des leçons du module).
- Quiz des 50 notions et exercices : `GLOSSARY_QUIZ`, `EXERCISES`.
- Les tests exigent que **chaque mauvais choix soit expliqué** et que l'identifiant soit unique. L'ordre des choix est mélangé de façon déterministe (graine = identifiant) : n'écris donc pas « toutes les réponses ci-dessus ».

## Comment ajouter une vidéo

1. Trouve la vidéo sur YouTube et note son identifiant (les 11 caractères après `v=`). Pour explorer : `node tools/yt-check.mjs --search "ta recherche"`.
2. Ajoute une entrée dans `src/content/videos.source.json` : `id`, `level`, `topics`, `lessonIds` (leçons où elle apparaît), `language` (langue parlée), `note` (facultatif, ton avis honnête sur l'intérêt et le niveau).
3. Lance `npm run verify:videos`. Le script récupère le **titre, la chaîne, la durée, la date et les sous-titres réellement publiés**, et échoue si une vidéo est introuvable. Rien n'est saisi à la main.
4. Référence l'identifiant dans `videoIds` de la leçon concernée.

Une vidéo est toujours présentée comme **externe** ; le lecteur intégré (`youtube-nocookie.com`) ne se charge qu'au clic. Pour une documentation, ajoute un objet dans `src/content/docs.ts` puis lance `npm run verify:links`.

## Construire la version de production

```bash
npm run build      # contrôle de types + build dans dist/
npm run preview    # prévisualiser dist/ en local
```

Le dossier `dist/` est un site statique (HTML, CSS, JS). Comme l'application utilise des routes « propres » (`/lecon/l-rag`), l'hébergeur doit renvoyer `index.html` pour les chemins inconnus ; c'est déjà configuré pour Vercel dans [`vercel.json`](vercel.json). Les routes inexistantes affichent une vraie page « introuvable » dans l'application.

## Publier gratuitement

Le site étant statique, plusieurs hébergeurs conviennent. Vérifie toujours leurs conditions **au moment de publier** : elles changent.

### Vercel (configuré dans ce dépôt)

Vérifié le 26 octobre 2026 (https://vercel.com/docs/plans/hobby) : l'offre **Hobby est gratuite** (par exemple 100 Go de transfert rapide et 1 million de requêtes CDN par mois inclus), **limitée à un usage personnel non commercial** — ce qui correspond à ce projet — et, en cas de dépassement, certaines fonctions sont suspendues jusqu'à 30 jours. Aucun abonnement n'est nécessaire pour que le site reste accessible.

```bash
npx vercel login         # ouvre le navigateur : connexion à ton compte
npx vercel               # crée et relie le projet, déploie une préversion
npx vercel --prod        # déploie en production
```

Compromis : sous-domaine `*.vercel.app` gratuit tout de suite ; un **nom de domaine personnalisé** est possible (jusqu'à 50 par projet sur Hobby) mais le nom de domaine lui-même s'achète auprès d'un registraire — c'est le seul coût éventuel, et il est facultatif.

### Autres options gratuites (à vérifier avant usage)

- **GitHub Pages**, **Cloudflare Pages**, **Netlify** : tous savent servir un dossier statique. Il faut configurer le repli vers `index.html` pour les routes (`404.html` ou fichier de redirections) ; sinon, remplace `BrowserRouter` par `HashRouter` dans `src/App.tsx` (URL en `#/lecon/…`, aucune configuration serveur).
- Auto-hébergement sur n'importe quel serveur web statique.

Aucun secret n'est présent dans le dépôt ni distribué au navigateur : il n'y a ni clé d'API, ni variable d'environnement, ni appel à un service tiers à l'affichage (les lecteurs vidéo ne se chargent qu'à la demande).

## Limites et contraintes connues

- **Progression locale** : stockée dans le navigateur, non synchronisée entre appareils, perdue si l'on efface les données du site ou en navigation privée. Un export/import JSON est fourni (page *Ma progression*).
- **Vidéos** : la plupart sont en anglais ; seules 6 proposent des sous-titres français publiés par leur auteur. Leur existence, titre, chaîne, durée et sous-titres sont vérifiés automatiquement, mais leur contenu n'a pas été revu image par image.
- **Informations qui évoluent** : spécification MCP (versionnée par date), noms de produits, prix, capacités. Les dates de vérification sont affichées ; relancer `verify:links` et `verify:videos` régulièrement.
- **Tableaux du manuel** : à l'extraction du PDF, les colonnes de plusieurs tableaux étaient désalignées ; elles ont été reconstruites d'après le sens. Une relecture contre le PDF d'origine est recommandée (voir `docs/REVISIONS.md`, entrée C22).
- **Rendu du PDF non examiné visuellement** (pas d'outil de rendu d'image dans l'environnement de développement) : l'analyse repose sur le texte extrait.
- Pas de compte, pas de synchronisation, pas d'éditeur de contenu : ces fonctions ne sont ajoutées que si un besoin réel apparaît.
- Les schémas sont simplifiés volontairement (HTML/SVG, sans bibliothèque de graphes).

## Licence et ressources externes

Le contenu pédagogique a été rédigé pour ce projet à partir du manuel fourni. Les vidéos, cours et documentations liés appartiennent à leurs auteurs et sont toujours présentés comme des ressources externes, avec leurs propres conditions.
