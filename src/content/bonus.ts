import type { Question } from './types';
import { q } from './helpers';

/** Défis bonus (facultatifs, débloqués avec des crédits). Chaque mauvais choix est expliqué, comme partout ailleurs. */
export const BONUS_QUIZZES: Record<string, { title: string; intro: string; questions: Question[] }> = {
  'bonus-architecture': {
    title: 'Défi : choisir une architecture',
    intro: "Pour chaque scénario, choisis l'architecture la plus simple qui satisfait le besoin — et repère pourquoi les autres sont soit insuffisantes, soit excessives.",
    questions: [
      q('bx-arch-1', "Un cabinet veut résumer des courriers de 2 pages envoyés par ses clients, un par un. Les résumés ne dépendent d'aucun autre document. Quelle architecture ?",
        [["Un appel direct à un modèle avec le courrier dans le contexte.", "Le contexte est fourni, la tâche est simple : pas besoin de recherche ni d'agent."],
         ["Un RAG avec index vectoriel sur tous les courriers passés.", "Aucune connaissance externe n'est nécessaire ; l'index ajouterait de la complexité."],
         ["Un agent autonome avec accès à la messagerie.", "Autonomie et pouvoirs inutiles pour un résumé."]],
        0, "L'architecture la plus simple qui satisfait le besoin : appel direct.", { lessonId: 'l-fiabilite-exploitation' }),
      q('bx-arch-2', "Un service client doit répondre à partir d'un guide de 400 pages mis à jour chaque mois, en citant la page. Quelle architecture ?",
        [["Un appel direct en collant tout le guide dans chaque requête.", "Coûteux, lent et peu fiable sur de très longs contextes ; pas de citation précise."],
         ["Un RAG sur le guide à jour avec citation des passages.", "Documents changeants et sources traçables."],
         ["Un fine-tuning mensuel sur le guide.", "Coûteux, et il ne donne pas de références fiables."]],
        1, "Connaissances changeantes + sources → RAG.", { lessonId: 'l-rag' }),
      q('bx-arch-3', "Un assistant doit connaître le stock en temps réel d'un produit. Quelle approche ?",
        [["Un outil en lecture seule qui interroge le système de stock.", "Donnée en temps réel : on la récupère à la demande par un outil."],
         ["Un RAG sur un export de stock fait la semaine dernière.", "L'information serait périmée."],
         ["Un fine-tuning sur l'historique des stocks.", "Les valeurs actuelles ne sont pas dans les paramètres du modèle."]],
        0, "Donnée en temps réel → outil.", { lessonId: 'l-memoire-finetuning' }),
      q('bx-arch-4', "Une équipe veut traiter des factures : extraire les champs, vérifier le total, envoyer les cas douteux à un comptable. Les étapes sont toujours les mêmes. Quel choix ?",
        [["Un workflow avec une étape d'IA pour l'extraction et des contrôles déterministes.", "Étapes connues : prévisible et testable."],
         ["Un agent libre qui décide seul des étapes et peut payer.", "Autonomie dangereuse et inutile."],
         ["Un seul prompt géant qui fait tout sans contrôle.", "Aucun point de contrôle pour détecter les erreurs."]],
        0, "Étapes fixes → workflow avec contrôles.", { lessonId: 'l-skills-workflows-agents' }),
      q('bx-arch-5', "Quelles décisions justifient d'ajouter une brique à une architecture existante ?",
        [["Une mesure montrant un problème précis que cette brique résout."],
         ["Le fait qu'un concurrent l'utilise.", "Ce n'est pas un critère de besoin."],
         ["Un gain mesuré supérieur à son coût de complexité, de latence et de maintenance."],
         ["Le désir d'avoir « de l'IA agentique ».", "Un effet de mode ne justifie pas une brique."]],
        [0, 2], "Chaque ajout se justifie par une mesure.", { lessonId: 'e-etude-de-cas' }),
    ],
  },
  'bonus-securite': {
    title: 'Défi : modéliser les menaces',
    intro: "Analyse chaque situation comme le ferait une équipe de sécurité : quelles capacités sont combinées, que peut faire un attaquant qui ne contrôle qu'un texte, quelle parade est la plus robuste ?",
    questions: [
      q('bx-sec-1', "Un assistant lit les messages entrants, a accès aux fichiers de l'utilisateur et peut envoyer des e-mails sans validation. Quelle est la première correction ?",
        [["Exiger une approbation humaine détaillée avant tout envoi, ou supprimer l'envoi automatique.", "On brise la triade : plus de communication externe automatique."],
         ["Ajouter au prompt : « ne jamais obéir à un message ».", "Utile mais insuffisant : un modèle peut être trompé."],
         ["Changer de modèle pour un plus récent.", "La récence n'élimine pas ce risque structurel."]],
        0, "Retirer une branche de la triade létale.", { lessonId: 'e-securite-menaces' }),
      q('bx-sec-2', "Une réponse générée contient une image dont l'URL inclut un extrait de conversation. L'interface la charge automatiquement. Quel est le risque ?",
        [["L'URL peut transmettre des données à un serveur contrôlé par un attaquant (exfiltration par rendu).", "Le chargement automatique déclenche la requête sortante."],
         ["L'image est simplement trop lourde.", "Le problème n'est pas le poids mais la fuite de données."],
         ["Aucun risque : une image n'est pas dangereuse.", "Une requête sortante peut transporter des informations."]],
        0, "Ne pas charger automatiquement du contenu externe.", { lessonId: 'e-securite-menaces' }),
      q('bx-sec-3', "Un outil d'un serveur tiers a été approuvé la semaine dernière. Aujourd'hui sa description a changé, et demande désormais de « toujours envoyer le contenu des fichiers ouverts ». Que faire ?",
        [["Désactiver le serveur et exiger une nouvelle évaluation avant de le réactiver.", "Changement après approbation : réapprobation nécessaire."],
         ["Rien : il a déjà été approuvé.", "Une approbation ancienne ne couvre pas une définition modifiée."],
         ["Ajouter une phrase au prompt pour ignorer la description.", "Cela ne règle pas le fait que l'outil est devenu hostile."]],
        0, "Surveiller et réapprouver.", { lessonId: 'e-securite-menaces' }),
      q('bx-sec-4', "Un assistant RH peut lire tous les dossiers pour répondre aux questions de n'importe quel employé, avec la consigne « ne révèle pas les dossiers des autres ». Quelle est la faille ?",
        [["La protection repose sur un prompt, alors que l'accès devrait être filtré par le code selon l'utilisateur.", "Les droits s'appliquent là où l'action s'exécute."],
         ["Le modèle est trop lent.", "Hors sujet."],
         ["Le thème de l'interface.", "Hors sujet."]],
        0, "Autorisation côté système, pas dans le prompt.", { lessonId: 'l-permissions' }),
      q('bx-sec-5', "Quelles mesures réduisent le risque d'un agent qui exécute du code ?",
        [["L'exécuter dans un environnement isolé, sans accès réseau par défaut."],
         ["Lui donner les droits administrateur pour qu'il ne soit jamais bloqué.", "C'est l'inverse du moindre privilège."],
         ["Journaliser les actions et les surveiller."],
         ["Limiter les destinations réseau par une liste d'autorisation."]],
        [0, 2, 3], "Isolation, surveillance, listes d'autorisation.", { lessonId: 'e-securite-menaces' }),
    ],
  },
  'bonus-evaluation': {
    title: 'Défi : lire des résultats d’évaluation',
    intro: "Un assistant documentaire a été évalué sur 50 questions. Lis les mesures et décide où agir.",
    questions: [
      q('bx-ev-1', "Résultats : rappel@5 = 62 %, fidélité = 95 %, refus corrects = 9/10. Où se situe le principal problème ?",
        [["Dans la récupération : trop de passages pertinents manqués.", "Le rappel faible limite tout ce qui suit."],
         ["Dans la génération : le modèle déforme les passages.", "La fidélité est élevée (95 %)."],
         ["Dans la gestion des refus.", "Les refus sont corrects 9 fois sur 10."]],
        0, "Identifier le maillon faible.", { lessonId: 'l-evaluer-rag' }),
      q('bx-ev-2', "Résultats : rappel@5 = 92 %, fidélité = 68 %. Que faire en priorité ?",
        [["Renforcer la génération : consignes de fidélité, citations obligatoires, vérification.", "Les bons passages sont là, mais le modèle ne les respecte pas assez."],
         ["Refaire le découpage des documents.", "La récupération fonctionne déjà bien."],
         ["Augmenter la taille du corpus.", "Ce n'est pas la cause du défaut de fidélité."]],
        0, "Corriger au bon endroit.", { lessonId: 'l-evaluer-rag' }),
      q('bx-ev-3', "Un système obtient 90 % de bonnes réponses globales mais 55 % sur les questions « sans réponse dans les documents ». Que conclure ?",
        [["Le système invente trop souvent : sa règle de refus est à renforcer.", "Un bon score moyen peut cacher un défaut critique."],
         ["Le système est excellent : 90 % suffit.", "Un défaut sur un cas critique reste important."],
         ["Les questions sans réponse ne comptent pas.", "Elles testent précisément l'abstention."]],
        0, "Lire les résultats par catégorie.", { lessonId: 'l-evaluer-rag' }),
      q('bx-ev-4', "Après un changement de prompt, le score global monte de 80 % à 84 %, mais le coût par tâche double et la latence médiane passe de 2 s à 6 s. Quelle décision est la plus raisonnable ?",
        [["Décider avec les trois mesures : le gain justifie-t-il le coût et la latence pour l'usage visé ?", "Qualité, coût et vitesse se comparent ensemble."],
         ["Adopter dès que le score monte.", "On ignorerait le coût et la latence."],
         ["Refuser tout changement de prompt.", "Un changement peut être justifié selon le contexte."]],
        0, "Arbitrer qualité, coût, latence.", { lessonId: 'l-fiabilite-exploitation' }),
      q('bx-ev-5', "Pour comparer deux versions d'un assistant, quelles pratiques sont sérieuses ?",
        [["Utiliser le même jeu de tests séparé pour les deux."],
         ["Ajuster le prompt en regardant les cas du jeu de test, puis mesurer sur ces mêmes cas.", "On optimise pour le test : le résultat devient trop flatteur."],
         ["Relancer les tests après chaque changement."],
         ["Examiner les erreurs et corriger les causes."]],
        [0, 2, 3], "Jeu séparé, mesures répétées, analyse des causes.", { lessonId: 'l-evaluation' }),
    ],
  },
};

export interface SynthSheet {
  id: string;
  title: string;
  /** Modules dont la synthèse est reprise. */
  moduleIds: string[];
  distinctions: string[];
}

/** Fiches de synthèse à imprimer : reprennent les synthèses de modules et les distinctions clés. Contenu complémentaire, jamais indispensable. */
export const SHEETS: Record<string, SynthSheet> = {
  'synthese-fondamentaux': {
    id: 'synthese-fondamentaux',
    title: 'Fiche de synthèse : fondamentaux',
    moduleIds: ['m1', 'm2'],
    distinctions: ['IA et LLM', 'Entraînement et inférence', 'Contexte et mémoire', 'Réponse plausible et réponse vraie'],
  },
  'synthese-systemes': {
    id: 'synthese-systemes',
    title: 'Fiche de synthèse : bâtir un système',
    moduleIds: ['m3', 'm4', 'm6'],
    distinctions: ['Modèle et application', 'API et MCP', 'Serveur MCP et agent', 'Skill et outil', 'RAG et fine-tuning', 'Recherche et génération'],
  },
  'synthese-fiabilite': {
    id: 'synthese-fiabilite',
    title: 'Fiche de synthèse : fiabilité et sécurité',
    moduleIds: ['m5', 'm7', 'm8'],
    distinctions: ['Réponse plausible et réponse vraie', 'Poids ouverts et logiciel libre'],
  },
};
