import { q } from '../../content/helpers';
import type { Question } from '../../content/types';
import type { Graph } from '../types';

/** Ce que le tutoriel observe pour savoir qu'une étape est réalisée. */
export interface Flags {
  /** Le canevas a été déplacé ou zoomé. */
  viewport: boolean;
  /** Un bloc a été déplacé. */
  moved: boolean;
  /** Une simulation s'est terminée avec succès. */
  simulated: boolean;
}

export interface TutorialStep {
  id: string;
  title: string;
  /** Court : la consigne à réaliser. */
  task: string;
  /** Explication affichée au bon moment, sans masquer le canevas. */
  explain: string;
  /** Aide quand l'action n'est pas encore détectée. */
  hint: string;
  done: (g: Graph, f: Flags) => boolean;
}

const hasNode = (g: Graph, c: string) => g.nodes.some((n) => n.data.c === c);
const edgeBetween = (g: Graph, a: string, b: string) =>
  g.edges.some((e) => g.nodes.find((n) => n.id === e.source)?.data.c === a && g.nodes.find((n) => n.id === e.target)?.data.c === b);

export const TUTORIAL: TutorialStep[] = [
  {
    id: 'canevas', title: 'Découvrir le canevas',
    task: 'Déplace le canevas (glisse sur le fond) ou zoome (molette, boutons + / −, ou pincement).',
    explain: 'Le Studio sert à concevoir une architecture d’IA en reliant des blocs. Un bloc est un composant (utilisateur, modèle, base…). Une connexion indique ce qui circule d’un bloc à un autre. Pour sélectionner un bloc, clique dessus : l’inspecteur t’explique ce qu’il est.',
    hint: 'Glisse avec la souris ou le doigt sur une zone vide du canevas, ou utilise les boutons + et − en bas à gauche.',
    done: (_g, f) => f.viewport,
  },
  {
    id: 'utilisateur', title: 'Ajouter un composant',
    task: 'Place un bloc « Utilisateur » : fais-le glisser depuis la bibliothèque, ou clique sur « Ajouter » à côté de son nom.',
    explain: 'Le bloc « Utilisateur » représente l’origine d’une interaction : une personne qui formule une demande. Remarque son port de sortie à droite : c’est par là que part le message.',
    hint: 'Cherche « Utilisateur » dans la bibliothèque (catégorie « Entrées et sorties »). Tu peux ensuite le déplacer où tu veux.',
    done: (g) => hasNode(g, 'utilisateur'),
  },
  {
    id: 'llm', title: 'Ajouter un modèle d’IA',
    task: 'Ajoute un bloc « Modèle de langage (LLM) ».',
    explain: 'Un modèle de langage reçoit un contexte et génère du texte en calculant une suite probable de mots. Ce n’est pas une personne qui comprend le monde comme un humain : il peut se tromper, et il n’exécute aucune action lui-même.',
    hint: 'Catégorie « Intelligence artificielle ».',
    done: (g) => hasNode(g, 'llm'),
  },
  {
    id: 'connexion', title: 'Créer une connexion',
    task: 'Relie le port de sortie de l’Utilisateur au port « Contexte » du Modèle de langage (glisse d’un port à l’autre).',
    explain: 'Une connexion va toujours d’une sortie (à droite d’un bloc) vers une entrée (à gauche). Ici, un texte circule : c’est un flux de données. Si une connexion est impossible, le Studio t’explique pourquoi et propose une correction.',
    hint: 'Pas de souris ? Sélectionne l’Utilisateur, puis utilise « Connecter à… » dans l’inspecteur. Si le Studio refuse, lis le message : il explique l’erreur.',
    done: (g) => edgeBetween(g, 'utilisateur', 'llm'),
  },
  {
    id: 'sortie', title: 'Ajouter la sortie',
    task: 'Ajoute une « Sortie texte » et relie-y la sortie « Réponse générée » du modèle.',
    explain: 'Voilà le parcours élémentaire d’une requête : une demande part de l’utilisateur, traverse le modèle, et arrive dans une sortie. (Dans une vraie application, une « Application » s’intercale pour garder les secrets et contrôler les échanges.)',
    hint: 'Catégorie « Entrées et sorties ». La sortie « Réponse générée » est le premier port à droite du modèle.',
    done: (g) => edgeBetween(g, 'llm', 'sortie-texte'),
  },
  {
    id: 'simulation', title: 'Lancer une simulation',
    task: 'Clique sur « Simuler » dans la barre d’outils, puis avance étape par étape.',
    explain: 'La simulation illustre le parcours des données : le message part de l’utilisateur, arrive au modèle, une réponse est produite, puis affichée. Attention : c’est une démonstration pédagogique. Aucun vrai modèle d’IA n’est appelé et la réponse est fictive.',
    hint: 'Si « Simuler » signale un problème, lis-le : il indique ce qui manque.',
    done: (_g, f) => f.simulated,
  },
  {
    id: 'comprehension', title: 'Vérifier ta compréhension',
    task: 'Réponds aux trois questions ci-dessous.',
    explain: 'Trois questions sur ce que tu viens de construire. Chaque correction explique la réponse.',
    hint: '',
    done: () => false,
  },
];

export const TUTORIAL_QUIZ_ID = 'studio-tuto';

export const TUTORIAL_QUESTIONS: Question[] = [
  q('st-1', 'Dans ta première architecture, qu’est-ce que la connexion « Utilisateur → Modèle » représente ?',
    [['Un flux de données : le message de l’utilisateur circule vers le modèle.', 'Une connexion relie une sortie à une entrée et indique ce qui circule et dans quel sens.'],
     ['Une dépendance de configuration, comme un prompt système.', 'Une dépendance transporte un réglage, pas la demande d’une personne.'],
     ['Le modèle comprend l’utilisateur comme le ferait une personne.', 'Le modèle calcule une suite de texte probable ; il ne comprend pas comme un humain.']],
    0, 'Une connexion de données porte un texte du bloc de départ vers le bloc d’arrivée.'),
  q('st-2', 'Pendant la simulation, la réponse s’affiche. Que peut-on en conclure ?',
    [['Que l’architecture fonctionnera forcément en vrai.', 'La simulation illustre le parcours avec des données fictives ; elle ne prouve rien sur une vraie implémentation.'],
     ['Que le parcours est illustré avec des données fictives : aucun vrai modèle n’a été appelé.', 'La simulation est une démonstration pédagogique, gratuite et sans clé d’API.'],
     ['Que la réponse est vraie.', 'La réponse est inventée par le Studio pour l’exemple.']],
    1, 'La simulation sert à comprendre les échanges, pas à valider un système réel.'),
  q('st-3', 'Pourquoi, dans une vraie application, insère-t-on une Application entre l’utilisateur et le modèle ?',
    [['Pour garder les clés secrètes, vérifier les droits, préparer le contexte et contrôler la réponse.', 'C’est l’application qui orchestre et protège ; le modèle n’est qu’une brique.'],
     ['Parce qu’un modèle ne peut pas recevoir de texte directement.', 'Il en reçoit : le problème est le contrôle et la sécurité, pas la possibilité technique.'],
     ['Pour rendre le modèle plus intelligent.', 'L’application n’améliore pas le modèle : elle l’entoure de règles et de contrôles.']],
    0, 'Application = orchestration, secrets, droits, contrôle.'),
];
