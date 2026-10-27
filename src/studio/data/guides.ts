/**
 * Guide du Studio : prise en main, architectures commentées, dépannage. Les pages « composant » sont générées à partir du
 * catalogue (src/studio/data/components.ts), donc toujours cohérentes avec ce que fait l'éditeur.
 */
import { COMPONENTS, componentById } from './components';

export interface GuideSection { h: string; p: string[] }

export interface Guide {
  id: string;
  title: string;
  summary: string;
  sections: GuideSection[];
  /** Modèle du Studio dont le schéma illustre le guide. */
  template?: string;
  /** Parcours des données expliqué en une phrase. */
  path?: string;
  exercise?: string;
  /** Pages liées (ids de guide ou `composant/<id>`). */
  related: string[];
}

export const GETTING_STARTED: Guide = {
  id: 'prise-en-main', title: 'Prise en main du Studio',
  summary: 'Comprendre en cinq minutes ce que le Studio permet de faire — et ce qu’il ne fait pas.',
  related: ['architectures/application-ia', 'depannage'],
  sections: [
    { h: 'À quoi sert le Studio ?', p: ['Le Studio est un outil pour comprendre comment les briques d’un système d’IA s’assemblent : une personne, une application, un modèle, des documents, des outils. Tu poses des blocs sur un canevas et tu les relies par des connexions typées.', 'Ce n’est pas un outil de production : il ne génère pas de code, n’appelle aucun vrai modèle et ne déploie rien. Il sert à raisonner sur une architecture avant de la construire.'] },
    { h: 'Les gestes de base', p: ['Ajouter : fais glisser un composant depuis la bibliothèque, ou utilise le bouton « Ajouter ». Relier : glisse d’un port de sortie (à droite) vers un port d’entrée (à gauche), ou utilise « Connecter à… » dans l’inspecteur, sans souris. Sélectionner : clique sur un bloc ; l’inspecteur affiche sa définition, son rôle, ses paramètres et ce qu’il peut recevoir ou envoyer.', 'Annuler / rétablir : Ctrl+Z et Ctrl+Y (ou les boutons). Supprimer : touche Suppr. Plusieurs blocs : Maj + clic, ou rectangle de sélection. Zoom et déplacement du canevas : molette, pincement, ou boutons.'] },
    { h: 'Pourquoi certaines connexions sont refusées', p: ['Chaque port a un type de donnée (texte, documents, requête, appel d’outil…). Une connexion n’est possible que si ce que produit la sortie est ce qu’attend l’entrée. Quand le Studio refuse, il le dit, explique pourquoi et propose une correction : c’est volontaire, car comprendre l’erreur est l’objet de l’outil.'] },
    { h: 'Les cinq sortes de connexions', p: ['Flux de données (trait plein) : un contenu circule. Requête (tirets) : une demande est envoyée à un service. Réponse (pointillés) : le service répond. Appel d’outil (tirets longs) : une action est demandée. Dépendance (points) : une configuration alimente un composant. La couleur, le style de trait et le libellé les distinguent : la couleur seule ne porte jamais l’information.'] },
    { h: 'Vérifier et simuler', p: ['« Vérifier » classe les remarques en erreurs, avertissements et informations, et distingue la structure (le schéma est-il bien formé ?) de la logique (est-il cohérent et sûr ?). Un schéma peut être bien formé mais incohérent.', '« Simuler » déroule un parcours de données fictives, étape par étape. Aucun modèle réel n’est appelé : c’est une illustration, pas une preuve de fonctionnement.'] },
    { h: 'Où sont enregistrés mes projets ?', p: ['Dans le stockage local de ton navigateur, sur cet appareil uniquement. Ils peuvent être perdus si tu effaces les données du site ou changes d’appareil : exporte régulièrement un fichier JSON pour les garder ailleurs.'] },
  ],
};

export const ARCHITECTURE_GUIDES: Guide[] = [
  {
    id: 'architectures/application-ia', title: 'Application d’IA : le parcours minimal', template: 'assistant-simple',
    summary: 'Pourquoi une application s’intercale entre la personne et le modèle.',
    path: 'Utilisateur → Application → Modèle de langage → Sortie texte, cadré par un prompt système.',
    related: ['composant/application', 'composant/llm', 'composant/prompt-systeme'],
    sections: [
      { h: 'Ce que montre ce schéma', p: ['La personne n’appelle jamais le modèle directement : une application reçoit la demande, prépare le contexte (consignes, historique, documents), appelle le modèle et contrôle la réponse avant de l’afficher.'] },
      { h: 'Pourquoi une application ?', p: ['Elle garde les clés d’API côté serveur, applique les droits, limite les coûts et les boucles, journalise, et peut refuser ou corriger. Mettre la clé d’API dans le navigateur permet à n’importe qui de la voler et de consommer ton quota.'] },
      { h: 'Limites', p: ['Sans source externe, le modèle ne connaît ni tes documents ni l’actualité, et peut produire une réponse fausse mais plausible. Rien ici ne vérifie la réponse.'] },
    ],
    exercise: 'Ajoute un composant « Historique » pour que l’assistant se souvienne de la conversation. Entre quels blocs le place-t-il, et que transporte sa connexion ?',
  },
  {
    id: 'architectures/rag', title: 'RAG : répondre à partir de documents', template: 'assistant-documentaire',
    summary: 'Indexer, retrouver, filtrer, fournir au modèle : plusieurs étapes, pas une base « branchée ».',
    path: 'En amont : Document → Embeddings → Base vectorielle. À chaque question : Recherche → Filtre → Modèle → Sortie.',
    related: ['architectures/rag-ou-fine-tuning', 'composant/recherche-doc', 'composant/base-vectorielle', 'composant/filtre'],
    sections: [
      { h: 'Deux phases distinctes', p: ['L’indexation se fait en amont : les documents sont découpés, convertis en vecteurs et rangés dans un index. La requête se fait à chaque question : la question est comparée à l’index, les meilleurs passages sont retrouvés, puis donnés au modèle comme contexte.'] },
      { h: 'Ce que le RAG ne garantit pas', p: ['Le bon passage peut ne pas être retrouvé ; le modèle peut ignorer ou déformer les passages ; le document peut être faux ou périmé. Il faut évaluer la récupération (a-t-on trouvé le bon passage ?) et la génération (le modèle s’y est-il tenu ?) séparément.'] },
      { h: 'Le filtre', p: ['Un filtre limite ce que le modèle voit : droits d’accès, sources autorisées, nombre de passages. Sans filtre, un utilisateur pourrait obtenir un passage qu’il n’a pas le droit de lire.'] },
    ],
    exercise: 'Dans la simulation, change la question pour qu’aucun passage ne corresponde. Que doit répondre un bon assistant documentaire, et pourquoi est-ce important ?',
  },
  {
    id: 'architectures/rag-ou-fine-tuning', title: 'RAG ou fine-tuning ?',
    summary: 'Donner des connaissances au modèle, ou changer son comportement : deux besoins différents.',
    related: ['architectures/rag'],
    sections: [
      { h: 'Le RAG apporte des connaissances', p: ['Quand l’information change, est privée ou doit être citée, on la fournit au moment de la question. On met à jour les documents, pas le modèle.'] },
      { h: 'Le fine-tuning change le comportement', p: ['Il adapte un modèle (style, format, tâche précise) à partir d’exemples. Il n’est pas adapté pour y « ranger » des faits qui évoluent, et il coûte du temps, des données et une évaluation sérieuse.'] },
      { h: 'Règle pratique', p: ['Commence par un bon prompt, puis un RAG si des connaissances manquent, et n’envisage un fine-tuning que si le comportement reste insuffisant après cela. Les deux ne s’excluent pas.'] },
    ],
    exercise: 'Un service juridique veut un assistant qui cite les textes de loi à jour. RAG, fine-tuning ou les deux ? Justifie en deux phrases.',
  },
  {
    id: 'architectures/mcp-client-serveur', title: 'MCP : client, serveur et outils', template: 'application-mcp',
    summary: 'Qui demande, qui valide, qui communique, qui exécute.',
    path: 'Application → Client MCP → Serveur MCP → Outil externe, puis résultat de retour jusqu’au modèle.',
    related: ['architectures/mcp-ou-api', 'composant/client-mcp', 'composant/serveur-mcp'],
    sections: [
      { h: 'Un protocole, pas un modèle', p: ['MCP (Model Context Protocol) standardise la manière dont une application découvre et appelle des capacités externes. Ce n’est ni un modèle, ni un agent : c’est un langage commun entre un client et un serveur.'] },
      { h: 'Les rôles', p: ['Le modèle formule une demande d’outil, mais ne l’exécute pas. L’application la valide. Le client MCP la transmet au serveur MCP, qui expose les outils, ressources et prompts et exécute l’outil avec ses propres permissions. Le résultat repasse par l’application avant d’atteindre le modèle.'] },
      { h: 'Ce que MCP ne règle pas', p: ['Il ne rend pas un outil fiable ni sûr : permissions, approbations et isolation restent à concevoir. Un outil qui modifie des données doit être validé.'] },
    ],
    exercise: 'Essaie de relier directement le modèle au serveur MCP. Que répond le Studio, et par quel chemin doit passer la demande ?',
  },
  {
    id: 'architectures/mcp-ou-api', title: 'MCP ou API classique ?',
    summary: 'Même objectif (appeler un service), conventions différentes.',
    related: ['architectures/mcp-client-serveur', 'composant/api'],
    sections: [
      { h: 'API classique', p: ['Tu écris un code précis pour chaque service : URL, authentification, format. C’est direct et éprouvé, adapté quand le nombre de services est petit et stable.'] },
      { h: 'MCP', p: ['Un serveur MCP décrit ses capacités de manière standard ; un client compatible les découvre et les utilise sans code sur mesure. C’est utile quand plusieurs applications ou modèles doivent réutiliser les mêmes outils.'] },
      { h: 'Choisir', p: ['Un seul service, une seule application : une API suffit. Beaucoup d’outils partagés entre applications : MCP apporte de la cohérence. Dans les deux cas, authentification et permissions restent indispensables.'] },
    ],
    exercise: 'Ton équipe a trois applications qui utilisent les mêmes cinq outils internes. Quel choix recommandes-tu et pourquoi ?',
  },
  {
    id: 'architectures/agent-outils', title: 'Agent avec outils : une boucle bornée', template: 'agent-outil',
    summary: 'Un agent décide, agit, observe, recommence — sous limites.',
    path: 'Agent → demande d’outil → Application → Approbation humaine → Outil externe → résultat → Agent.',
    related: ['composant/agent', 'composant/approbation-humaine', 'architectures/securite'],
    sections: [
      { h: 'La boucle', p: ['À chaque étape, l’agent choisit de répondre ou de demander un outil ; le résultat revient et l’agent décide de la suite. Sans limite, cette boucle peut tourner indéfiniment et coûter cher.'] },
      { h: 'Les garde-fous', p: ['Un nombre d’étapes maximal, une approbation humaine avant toute action qui modifie des données, et un résultat vérifié. Le Studio signale une boucle sans limite et une écriture sans approbation.'] },
      { h: 'Limites', p: ['Un agent n’est pas plus fiable qu’un modèle : il enchaîne simplement plusieurs décisions faillibles. Chaque décision supplémentaire peut ajouter une erreur.'] },
    ],
    exercise: 'Mets « Étapes maximum » à 0 sur l’agent, puis vérifie. Quel message apparaît, et que risque-t-on en vrai ?',
  },
  {
    id: 'architectures/validation-erreurs', title: 'Validation et gestion des erreurs', template: 'validation-humaine',
    summary: 'Contrôler proportionnellement au risque, et prévoir un chemin de repli.',
    path: 'Modèle → Étape de validation → Validation humaine → Sortie ; rejets → Gestionnaire d’erreurs → message de repli.',
    related: ['composant/etape-validation', 'composant/gestionnaire-erreurs', 'composant/validation-humaine'],
    sections: [
      { h: 'Deux niveaux de contrôle', p: ['Une validation automatique vérifie une forme (format, longueur, champs) mais pas la vérité. Une relecture humaine juge le fond mais coûte du temps et peut devenir machinale.'] },
      { h: 'Un échec doit mener quelque part', p: ['Une erreur sans chemin de repli laisse l’utilisateur devant rien. Prévois un message clair, une nouvelle tentative bornée, ou une escalade vers une personne.'] },
      { h: 'Proportion', p: ['Plus l’action est irréversible ou coûteuse, plus le contrôle doit être fort. Un brouillon de message ne justifie pas la même validation qu’un virement.'] },
    ],
    exercise: 'Où placerais-tu une relecture humaine dans un assistant qui rédige des courriels aux clients ? Et où te contenterais-tu d’une validation automatique ?',
  },
  {
    id: 'architectures/securite', title: 'Sécurité d’une architecture d’IA', template: 'architecture-incorrecte',
    summary: 'Secrets, permissions, approbations, données sensibles.',
    related: ['depannage', 'composant/authentification', 'composant/approbation-humaine'],
    sections: [
      { h: 'Secrets', p: ['Une clé d’API ne doit jamais se trouver dans le navigateur ni dans le code envoyé aux utilisateurs : garde-la dans l’application côté serveur.'] },
      { h: 'Privilèges minimaux', p: ['Un outil ne doit pouvoir faire que ce dont il a besoin : lecture seule quand c’est suffisant, périmètre de données limité, authentification explicite.'] },
      { h: 'Contenus non fiables', p: ['Un document ou une page web récupérés peuvent contenir des instructions cachées (injection indirecte). Traite-les comme des données, jamais comme des ordres, et ne leur donne pas accès à des actions sensibles sans validation.'] },
      { h: 'Action humaine', p: ['Toute action qui modifie des données ou engage quelqu’un doit pouvoir être relue et refusée avant exécution.'] },
    ],
    exercise: 'Ouvre le modèle « Architecture volontairement incorrecte » et liste, avant de vérifier, les défauts de sécurité que tu repères.',
  },
];

export interface Troubleshoot { code: string; title: string; observe: string; why: string; fix: string; retain: string }

export const TROUBLESHOOTING: Troubleshoot[] = [
  { code: 'vide', title: 'Le canevas est vide', observe: 'Le vérificateur ne trouve aucun composant.', why: 'Il n’y a rien à analyser : ce n’est pas une erreur.', fix: 'Ajoute un composant, ou ouvre une architecture modèle.', retain: 'Une architecture commence par une entrée (la personne) et une sortie (le résultat).' },
  { code: 'connexion-invalide', title: 'Connexion incompatible', observe: 'Une connexion relie une sortie à une entrée qui n’accepte pas ce type de donnée, ou enfreint une règle (par exemple modèle → outil).', why: 'Ce que produit le bloc de départ n’est pas ce qu’attend le bloc d’arrivée : le système ne saurait pas quoi faire de la donnée. Certaines liaisons sont aussi interdites par principe (un modèle n’exécute pas un outil).', fix: 'Supprime la connexion et passe par le composant intermédiaire proposé dans le message de refus (souvent l’Application).', retain: 'Une connexion n’a de sens que si le type de donnée correspond et si le rôle du composant le permet.' },
  { code: 'entree-manquante', title: 'Entrée obligatoire non reliée', observe: 'Un composant a une entrée obligatoire sans connexion.', why: 'Sans cette entrée, le composant ne peut pas produire sa sortie : le parcours s’arrête avant lui.', fix: 'Relie une source compatible à l’entrée indiquée (le message précise laquelle).', retain: 'Un composant ne peut agir qu’avec tout ce qu’il lui faut.' },
  { code: 'composant-isole', title: 'Composant isolé', observe: 'Un composant n’est relié à rien.', why: 'Il ne participe à aucun parcours : il est inutile, ou une connexion a été oubliée.', fix: 'Relie-le au reste du schéma, ou supprime-le.', retain: 'Chaque bloc doit avoir un rôle dans un parcours.' },
  { code: 'sortie-non-reliee', title: 'Sortie importante sans destination', observe: 'Une sortie principale n’est envoyée nulle part.', why: 'Le résultat produit est perdu : personne ne le reçoit.', fix: 'Relie la sortie à la suite du parcours (souvent une Sortie texte ou l’Application).', retain: 'Tout résultat doit arriver quelque part.' },
  { code: 'cycle-sans-limite', title: 'Boucle sans limite', observe: 'Le schéma contient une boucle dont aucun composant ne borne le nombre de tours.', why: 'Un modèle qui redemande un outil indéfiniment ne s’arrête jamais : coûts, blocage, abus.', fix: 'Renseigne « Appels d’outils maximum » (modèle), « Étapes maximum » (agent) ou « Itérations maximum » (boucle) avec une valeur positive.', retain: 'Toute boucle doit avoir une condition d’arrêt ou une limite.' },
  { code: 'cycle-borne', title: 'Boucle bornée', observe: 'Le schéma contient une boucle, avec une limite.', why: 'C’est une information, pas un défaut : les agents et les appels d’outils reposent sur des boucles.', fix: 'Aucune correction nécessaire ; vérifie seulement que la valeur est raisonnable.', retain: 'Une boucle bornée est normale ; une boucle sans limite ne l’est pas.' },
  { code: 'parametre-invalide', title: 'Paramètre invalide', observe: 'Un paramètre obligatoire est vide ou hors des valeurs permises.', why: 'Le composant ne peut pas fonctionner correctement avec cette valeur.', fix: 'Corrige le paramètre dans l’inspecteur : l’aide indique ce qui est attendu.', retain: 'Les paramètres font partie de l’architecture, pas seulement les connexions.' },
  { code: 'echange-incomplet', title: 'Échange sans retour', observe: 'Une requête ou un appel d’outil est envoyé, mais aucune réponse ou aucun résultat ne revient.', why: 'L’émetteur attend indéfiniment : il ne saura jamais si l’appel a réussi.', fix: 'Relie la réponse (ou le résultat) vers un composant qui peut la traiter, souvent l’Application.', retain: 'Une requête appelle toujours une réponse, même en cas d’échec.' },
  { code: 'pas-entree', title: 'Aucun point d’entrée', observe: 'Aucun composant ne représente l’origine d’une interaction.', why: 'Sans personne ni événement qui déclenche le parcours, rien ne démarre (et la simulation est impossible).', fix: 'Ajoute un Utilisateur, une Entrée texte, un Formulaire ou une Interface.', retain: 'Tout système réagit à quelque chose.' },
  { code: 'pas-sortie', title: 'Aucun résultat final', observe: 'Aucun composant ne présente de résultat.', why: 'Le parcours ne mène nulle part : personne ne reçoit de réponse.', fix: 'Ajoute une Sortie texte, une Interface ou une Fin de processus.', retain: 'Un système doit répondre à quelqu’un.' },
  { code: 'cle-navigateur', title: 'Clé d’API exposée', observe: 'Une application garde sa clé d’API dans le navigateur.', why: 'Tout ce qui est envoyé au navigateur est lisible par l’utilisateur : la clé peut être copiée et utilisée à ses frais.', fix: 'Mets le paramètre de la clé d’API sur « Serveur » : le navigateur appelle ton serveur, qui appelle le modèle.', retain: 'Un secret ne doit jamais quitter le serveur.' },
  { code: 'ecriture-sans-approbation', title: 'Action qui modifie des données sans approbation', observe: 'Un outil marqué « Modifie des données » peut être appelé sans passer par une approbation humaine.', why: 'Une erreur du modèle (ou une injection) pourrait modifier ou supprimer des données sans que personne ne puisse l’empêcher.', fix: 'Place une Approbation humaine entre l’Application et l’outil, ou rends l’outil en lecture seule.', retain: 'Plus une action est irréversible, plus elle doit être validée.' },
  { code: 'modele-sans-consignes', title: 'Modèle sans consignes', observe: 'Un modèle n’a pas de prompt système.', why: 'Sans cadre, son ton, son périmètre et ses refus sont imprévisibles.', fix: 'Relie un Prompt système à l’entrée « Consignes ».', retain: 'Les consignes de fond cadrent le comportement du modèle.' },
  { code: 'rag-sans-filtre', title: 'Recherche sans filtre', observe: 'Des passages retrouvés arrivent au modèle sans filtre.', why: 'Rien ne limite ce que le modèle peut lire (droits, sources, volume).', fix: 'Insère un Filtre entre la recherche et le modèle.', retain: 'La récupération de documents doit respecter les droits d’accès.' },
  { code: 'appel-direct-modele', title: 'Entrée reliée directement au modèle', observe: 'Le message de la personne arrive au modèle sans application.', why: 'Rien ne protège les secrets, ne contrôle les droits ni ne borne le coût.', fix: 'Insère une Application entre la personne et le modèle (acceptable pour un tutoriel, pas pour un vrai système).', retain: 'Dans un vrai système, une application orchestre et protège.' },
];

export const troubleById = new Map(TROUBLESHOOTING.map((t) => [t.code, t]));

/** Page de guide générée pour un composant du catalogue. */
export function componentGuide(id: string): Guide | null {
  const c = componentById.get(id);
  if (!c) return null;
  return {
    id: `composant/${id}`, title: c.name, summary: c.short, related: ['prise-en-main'],
    sections: [
      { h: 'Définition', p: [c.definition] },
      { h: 'Rôle dans une architecture', p: [c.role] },
      { h: 'Exemple', p: [c.example] },
      { h: 'Limites', p: [c.limits] },
      { h: 'Erreurs fréquentes', p: c.mistakes },
      { h: 'À ne pas confondre', p: [c.confusions] },
    ],
  };
}

export const ALL_GUIDES: Guide[] = [GETTING_STARTED, ...ARCHITECTURE_GUIDES];
export const guideById = (id: string): Guide | null => ALL_GUIDES.find((g) => g.id === id) ?? componentGuide(id.replace(/^composant\//, ''));
export const COMPONENT_GUIDE_IDS = COMPONENTS.map((c) => `composant/${c.id}`);
