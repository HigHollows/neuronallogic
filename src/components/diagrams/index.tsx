import type { ReactElement } from 'react';
import type { DiagramId, DiagramRef } from '../../content/types';
import { Flow, Sequence } from './parts';

function IaMlDl() {
  return (
    <div className="nested" role="group" aria-label="IA contient machine learning, qui contient deep learning, qui contient les LLM">
      <span className="lbl">Intelligence artificielle<small>classer, prédire, générer, planifier — avec ou sans apprentissage</small></span>
      <div className="nested">
        <span className="lbl">Machine learning<small>apprendre des régularités à partir de données</small></span>
        <div className="nested">
          <span className="lbl">Deep learning<small>réseaux de neurones à plusieurs couches</small></span>
          <div className="nested">
            <span className="lbl">LLM<small>réseaux entraînés sur du texte (Transformers)</small></span>
          </div>
        </div>
      </div>
    </div>
  );
}

function NeuralNet() {
  const layers = [
    { x: 90, n: 4, label: 'Entrée' },
    { x: 320, n: 5, label: 'Couche cachée' },
    { x: 550, n: 3, label: 'Sortie' },
  ];
  const y = (i: number, n: number) => 60 + (i + 0.5) * (220 / n);
  const lines: ReactElement[] = [];
  layers.slice(0, -1).forEach((l, li) => {
    const next = layers[li + 1];
    for (let a = 0; a < l.n; a++)
      for (let b = 0; b < next.n; b++)
        lines.push(<line key={`${li}-${a}-${b}`} x1={l.x} y1={y(a, l.n)} x2={next.x} y2={y(b, next.n)} stroke="var(--border)" strokeWidth="1.4" />);
  });
  return (
    <svg viewBox="0 0 640 336" role="img" aria-label="Réseau de neurones à trois couches : 4 unités d'entrée, 5 unités cachées, 3 unités de sortie, toutes reliées par des connexions pondérées" style={{ width: '100%', height: 'auto' }}>
      {lines}
      {layers.map((l, li) => (
        <g key={li}>
          {Array.from({ length: l.n }).map((_, i) => (
            <circle key={i} cx={l.x} cy={y(i, l.n)} r="15" fill="var(--accent)" stroke="var(--surface)" strokeWidth="3" />
          ))}
          <text x={l.x} y="32" textAnchor="middle" fontSize="19" fontWeight="700" fill="var(--text)">{l.label}</text>
        </g>
      ))}
      <text x="320" y="322" textAnchor="middle" fontSize="14" fill="var(--muted)">chaque trait = une connexion portant un poids · la sortie donne un score par classe</text>
    </svg>
  );
}

function TrainingLoop() {
  return (
    <>
      <Flow
        label="Entraînement (répété sur de nombreux exemples)"
        steps={[
          { title: 'Exemple', text: "Le modèle reçoit une entrée et son objectif attendu." },
          { title: 'Propagation avant', text: 'Il calcule une sortie.' },
          { title: 'Perte', text: "Une fonction mesure l'écart avec l'objectif." },
          { title: 'Rétropropagation', text: 'Calcul de la contribution de chaque paramètre à l’erreur (gradients).' },
          { title: 'Optimisation', text: 'Les paramètres sont ajustés pour réduire la perte.' },
        ]}
        loopNote="On recommence avec d’autres exemples, jusqu’à ce que la perte sur des données séparées cesse de s’améliorer."
      />
      <Flow
        label="Inférence (modèle entraîné, paramètres figés)"
        steps={[
          { title: 'Nouvelle entrée' },
          { title: 'Propagation avant', text: 'Mêmes calculs, aucune correction.' },
          { title: 'Sortie', text: 'Prédiction ou réponse.' },
        ]}
      />
    </>
  );
}

function LlmGeneration() {
  return (
    <Flow
      steps={[
        { title: 'Texte', text: 'Ton message et le contexte.' },
        { title: 'Tokens', text: 'Découpage en unités du vocabulaire.' },
        { title: 'Vecteurs', text: 'Chaque token devient une liste de nombres.' },
        { title: 'Transformer', text: 'Couches d’attention et de calcul sur tout le contexte.' },
        { title: 'Probabilités', text: 'Une probabilité pour chaque token possible ensuite.' },
        { title: 'Choix', text: 'Un token est choisi (la température joue ici).' },
        { title: 'Ajout', text: 'Le token rejoint le contexte.' },
      ]}
      loopNote="Le cycle reprend à l’étape « Tokens/Vecteurs » avec le contexte allongé, jusqu’à un signal de fin de réponse."
    />
  );
}

function RequestFlow() {
  return (
    <>
      <div className="zones">
        <div className="zone">
          <h4>Chez l’utilisateur</h4>
          <div className="node"><b>Frontend</b>Interface, saisie, affichage. Visible et modifiable par l’utilisateur.</div>
        </div>
        <div className="zone">
          <h4>Sur ton serveur</h4>
          <div className="node secret"><b>Backend</b>Authentifie, autorise, valide, orchestre. Garde les clés secrètes.</div>
          <div className="node"><b>Base de données</b>Comptes, droits, historique, documents.</div>
        </div>
        <div className="zone">
          <h4>Services externes</h4>
          <div className="node"><b>Recherche documentaire</b>Passages pertinents (RAG).</div>
          <div className="node"><b>Fournisseur de modèle</b>Génère la réponse via une API.</div>
        </div>
      </div>
      <p className="flow-label">Le trajet, étape par étape</p>
      <Sequence
        actors={['Utilisateur', 'Frontend', 'Backend', 'Base / recherche', 'Modèle']}
        messages={[
          { from: 0, to: 1, text: 'Saisit sa question.' },
          { from: 1, to: 2, text: 'Envoie la requête (HTTP + JSON).' },
          { from: 2, to: 2, text: 'Vérifie l’identité (authentification) et les droits (autorisation) ; valide la demande.' },
          { from: 2, to: 3, text: 'Cherche les passages autorisés les plus pertinents.' },
          { from: 2, to: 4, text: 'Envoie question + passages + règles (avec la clé secrète du serveur).' },
          { from: 4, to: 2, text: 'Renvoie une réponse générée.' },
          { from: 2, to: 2, text: 'Contrôle sources, format et règles ; journalise latence et coût ; gère les erreurs.' },
          { from: 2, to: 1, text: 'Renvoie la réponse, les sources et les incertitudes.' },
          { from: 1, to: 0, text: 'Affiche le résultat, avec une option de recours si besoin.' },
        ]}
      />
    </>
  );
}

function ApiCycle() {
  return (
    <Sequence
      actors={['Logiciel appelant', 'API / serveur', 'Service interne']}
      messages={[
        { from: 0, to: 1, text: <>Envoie une <b>requête</b> : méthode (GET, POST…), adresse (endpoint), données, identification.</> },
        { from: 1, to: 1, text: 'Vérifie la requête : format, identité, droits, quotas.' },
        { from: 1, to: 2, text: 'Effectue l’opération demandée (lecture, calcul, appel à une base ou à un modèle).' },
        { from: 1, to: 0, text: <>Renvoie une <b>réponse</b> avec un code de statut (200, 401, 404, 429, 5xx…) et souvent un corps JSON.</> },
        { from: 0, to: 0, text: 'Traite le résultat… ou l’erreur : message clair, reprise limitée, mode dégradé.' },
      ]}
    />
  );
}

function RagPipeline() {
  return (
    <>
      <Flow
        label="1 · Indexation (en amont, une fois puis à chaque mise à jour)"
        steps={[
          { title: 'Documents', text: 'Autorisés, à jour, sourcés.' },
          { title: 'Découpage', text: 'Morceaux avec titre, source, date.' },
          { title: 'Embeddings', text: 'Un vecteur par morceau.' },
          { title: 'Index', text: 'Vecteurs + métadonnées + droits.' },
        ]}
      />
      <Flow
        label="2 · À chaque question"
        steps={[
          { title: 'Question', text: 'Convertie en vecteur.' },
          { title: 'Recherche', text: 'Passages les plus proches (et mots-clés).' },
          { title: 'Filtres', text: 'Droits d’accès, reclassement.' },
          { title: 'Modèle', text: 'Question + passages + règles.' },
          { title: 'Réponse', text: 'Avec sources et incertitudes.' },
          { title: 'Évaluation', text: 'Récupération et fidélité mesurées.' },
        ]}
      />
    </>
  );
}

function McpArchitecture() {
  return (
    <div className="mcp-grid">
      <div className="mcp-host">
        <h4>Hôte MCP (l’application d’IA)</h4>
        <div className="mcp-client"><b>Client MCP 1</b> — connexion dédiée</div>
        <div className="mcp-client"><b>Client MCP 2</b> — connexion dédiée</div>
        <div className="mcp-client"><b>Client MCP 3</b> — connexion dédiée</div>
      </div>
      <div className="conn" aria-hidden="true">⇄ JSON-RPC</div>
      <div>
        <div className="mcp-server"><b>Serveur A — local</b><br />ex. fichiers · lancé sur ta machine (stdio)</div>
        <div className="mcp-server"><b>Serveur B — local</b><br />ex. base de données (stdio)</div>
        <div className="mcp-server"><b>Serveur C — distant</b><br />ex. service en ligne (HTTP)</div>
      </div>
    </div>
  );
}

function McpLifecycle() {
  return (
    <Sequence
      actors={['Hôte + client MCP', 'Modèle', 'Serveur MCP']}
      messages={[
        { from: 0, to: 2, text: 'Se connecte au serveur (local ou distant).' },
        { from: 0, to: 2, text: 'Vérifie version du protocole et capacités (selon la version : requête de découverte ou métadonnées de chaque requête).' },
        { from: 0, to: 2, text: <>Demande la liste des outils : <code>tools/list</code>. Le serveur répond avec noms, descriptions, schémas.</> },
        { from: 0, to: 1, text: 'Fournit au modèle les outils disponibles avec la question.' },
        { from: 1, to: 0, text: 'Propose un appel d’outil avec des arguments.' },
        { from: 0, to: 0, text: 'Valide l’appel : arguments, droits, confirmation de l’utilisateur si l’action est sensible.' },
        { from: 0, to: 2, text: <>Transmet l’appel : <code>tools/call</code>.</> },
        { from: 2, to: 2, text: 'Exécute l’action avec les permissions dont il dispose (et seulement elles).' },
        { from: 2, to: 0, text: 'Renvoie le résultat (ou une erreur).' },
        { from: 0, to: 1, text: 'Donne le résultat au modèle, qui poursuit ou répond.' },
      ]}
    />
  );
}

function AgentLoop() {
  return (
    <>
      <Flow
        steps={[
          { title: 'Objectif', text: 'Fixé par l’utilisateur ou l’application.' },
          { title: 'Observer', text: 'Contexte, résultats précédents.' },
          { title: 'Décider', text: 'Le modèle choisit la prochaine étape.' },
          { title: 'Contrôler', text: 'Validation, droits, approbation si sensible.' },
          { title: 'Agir', text: 'L’application exécute l’outil.' },
          { title: 'Évaluer', text: 'Objectif atteint ? sinon, on boucle.' },
        ]}
        loopNote="Tant que l’objectif n’est pas atteint — et dans la limite d’un nombre d’étapes, d’un budget et d’un délai fixés à l’avance."
      />
      <p className="small muted">Différence avec un workflow : dans un workflow, la suite des étapes est écrite à l’avance ; ici, c’est le modèle qui choisit la suivante.</p>
    </>
  );
}

function BuildingBlocks() {
  const rows = [
    ['Prompt', 'Que dois-je faire maintenant ?', 'La demande, avec son contexte'],
    ['Skill', 'Quelle méthode réutilisable appliquer ?', 'Des consignes (et parfois des ressources ou des scripts, selon la plateforme)'],
    ['Outil', 'Quelle action concrète exécuter ?', 'Une fonction décrite au modèle, exécutée par l’application'],
    ['Workflow', 'Quelles étapes, dans quel ordre ?', 'Le concepteur, à l’avance'],
    ['Agent', 'Quelle est la prochaine étape ?', 'Le modèle, dans une boucle sous contrôle'],
  ];
  return (
    <div className="table-wrap" role="region" aria-label="Comparaison des briques" tabIndex={0}>
      <table>
        <thead><tr><th scope="col">Brique</th><th scope="col">Question à laquelle elle répond</th><th scope="col">Qui / quoi décide ou contient</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r[0]}><th scope="row">{r[0]}</th><td>{r[1]}</td><td>{r[2]}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function MemoryLayers() {
  const layers = [
    ['Paramètres du modèle', 'Régularités apprises à l’entraînement', 'Jusqu’à une nouvelle version ou adaptation'],
    ['Contexte de la requête', 'Messages et informations fournis maintenant', 'Limitée à la requête'],
    ['Historique / mémoire applicative', 'Messages ou préférences conservés par l’application', 'Selon réglages et politiques du produit'],
    ['Base documentaire (RAG, outils)', 'Documents ou données retrouvés à la demande', 'Selon conservation et indexation'],
  ];
  return (
    <div className="layers">
      {layers.map(([a, b, c]) => (
        <div className="layer" key={a}>
          <div><b>{a}</b></div>
          <div>{b}<br /><small>Durée : {c}</small></div>
        </div>
      ))}
    </div>
  );
}

function AttentionCalc() {
  return (
    <>
      <Flow
        steps={[
          { title: 'Q, K, V', text: 'Chaque token produit une requête, une clé et une valeur (trois projections apprises).' },
          { title: 'Scores Q·Kᵀ', text: 'Similarité de chaque requête avec chaque clé.' },
          { title: 'Masque + échelle', text: 'On masque le futur (masque causal) et on divise par √d.' },
          { title: 'Softmax', text: 'Les scores deviennent des poids positifs de somme 1.' },
          { title: 'Somme pondérée', text: 'On mélange les valeurs V selon ces poids : c’est la sortie.' },
        ]}
        loopNote="Plusieurs têtes d’attention font ce calcul en parallèle ; le tout est répété dans chaque bloc du Transformer. Pendant la génération, K et V du passé sont gardés en cache."
      />
    </>
  );
}

function LethalTrifecta() {
  return (
    <>
      <div className="zones">
        <div className="zone"><h4>Branche 1</h4><div className="node"><b>Données privées</b>Boîte mail, fichiers, bases de données auxquels l’agent a accès.</div></div>
        <div className="zone"><h4>Branche 2</h4><div className="node"><b>Contenu non fiable</b>Pages web, messages d’inconnus, documents externes que l’agent lit.</div></div>
        <div className="zone"><h4>Branche 3</h4><div className="node"><b>Communication externe</b>Envoyer un message, charger une URL, appeler un service.</div></div>
      </div>
      <p className="loop-note">Les trois réunies : un texte piégé peut faire lire des données privées et les envoyer à l’attaquant. <strong>Parade : retirer au moins une branche</strong> pour la tâche en cours (par exemple supprimer l’envoi automatique, ou exiger une approbation humaine).</p>
    </>
  );
}

const REGISTRY: Record<DiagramId, () => ReactElement> = {
  'ia-ml-dl': IaMlDl,
  'neural-net': NeuralNet,
  'training-loop': TrainingLoop,
  'llm-generation': LlmGeneration,
  'request-flow': RequestFlow,
  'api-cycle': ApiCycle,
  'rag-pipeline': RagPipeline,
  'mcp-architecture': McpArchitecture,
  'mcp-lifecycle': McpLifecycle,
  'agent-loop': AgentLoop,
  'building-blocks': BuildingBlocks,
  'memory-layers': MemoryLayers,
  'attention-calc': AttentionCalc,
  'lethal-trifecta': LethalTrifecta,
};

export function Diagram({ d }: { d: DiagramRef }) {
  const View = REGISTRY[d.id];
  return (
    <figure className="diagram" aria-labelledby={`dg-${d.id}`}>
      <h3 id={`dg-${d.id}`}>Schéma — {d.title}</h3>
      <View />
      <figcaption>
        <strong>Ce que montre ce schéma :</strong> {d.explanation}
      </figcaption>
    </figure>
  );
}

export const DIAGRAM_IDS = Object.keys(REGISTRY) as DiagramId[];
