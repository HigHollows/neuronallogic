/**
 * Simulation pédagogique d'une architecture.
 *
 * Principes :
 *  - 100 % locale et déterministe : aucune requête réseau, aucune clé d'API, mêmes entrées → mêmes étapes ;
 *  - toutes les données sont FICTIVES et la simulation le dit : « Réponse illustrative », « aucun modèle réel n'est appelé » ;
 *  - elle illustre les échanges entre composants ; elle NE PROUVE PAS qu'une vraie implémentation fonctionnerait.
 */
import { param } from './checker';
import { findNode, nodeDef } from './connections';
import type { DataType, Graph, SEdge, SNode } from './types';

export interface Value {
  type: DataType;
  text: string;
  /** Texte d'origine transporté à travers vecteurs et index (pour que la recherche simulée reste lisible). */
  payload?: string;
}

export interface Step {
  index: number;
  nodeId: string;
  nodeName: string;
  action: string;
  inputs: { port: string; type: DataType; text: string }[];
  outputs: { port: string; type: DataType; text: string; to: string[] }[];
  /** Arêtes parcourues (arrivées + départs) : sert à les mettre en évidence. */
  edgeIds: string[];
  note?: string;
  error?: string;
}

export interface SimResult {
  status: 'ok' | 'incomplete' | 'limit' | 'impossible';
  message: string;
  steps: Step[];
  finals: { node: string; text: string }[];
  /** Composants qui n'ont jamais pu s'exécuter, avec ce qui leur a manqué. */
  waiting: string[];
}

const MAX_STEPS = 80;
const excerpt = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const words = (s: string) => norm(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 4);

/** Recherche simulée : les phrases du texte source qui partagent le plus de mots-clés avec la question. */
export function retrieve(question: string, source: string, n: number): string[] {
  const q = new Set(words(question));
  return source
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s, i) => ({ s, i, score: words(s).filter((w) => q.has(w)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, Math.max(1, n))
    .map((x) => x.s);
}

interface NodeRun {
  inputs: Record<string, Value[]>;
  fired: number;
  toolCalls: number;
  asked: boolean;
  question?: string;
  data: Value[];
}

export function simulate(g: Graph): SimResult {
  const steps: Step[] = [];
  const runs = new Map<string, NodeRun>(g.nodes.map((n) => [n.id, { inputs: {}, fired: 0, toolCalls: 0, asked: false, data: [] }]));
  const finals: { node: string; text: string }[] = [];
  const queue: { edge: SEdge; value: Value }[] = [];
  const nameOf = (n: SNode) => nodeDef(n)?.name ?? n.data.c;
  const edgesFrom = (id: string, port: string) => g.edges.filter((e) => e.source === id && e.sourceHandle === port);
  const expected = (id: string, port: string) => g.edges.filter((e) => e.target === id && e.targetHandle === port).length;
  const got = (id: string, port: string) => runs.get(id)!.inputs[port] ?? [];
  const lastText = (id: string, port: string) => got(id, port).at(-1)?.text ?? '';

  if (!g.nodes.some((n) => nodeDef(n)?.entry)) {
    return { status: 'impossible', message: 'Simulation impossible : le diagramme n’a aucun point d’entrée (Utilisateur, Entrée texte, Formulaire ou Interface). Ajoute-en un pour lancer un parcours.', steps: [], finals: [], waiting: [] };
  }

  function emit(n: SNode, port: string, value: Value, arrived: string[] = []): { port: string; type: DataType; text: string; to: string[] }[] & { edgeIds?: string[] } {
    const out = edgesFrom(n.id, port);
    for (const e of out) queue.push({ edge: e, value });
    return Object.assign([{ port, type: value.type, text: value.text, to: out.map((e) => nameOf(findNode(g, e.target)!)) }], { edgeIds: [...arrived, ...out.map((e) => e.id)] });
  }

  type Out = { port: string; value: Value };
  interface Reaction { action: string; outs: Out[]; note?: string; error?: string; terminal?: boolean }

  function record(n: SNode, r: Reaction, arrivedEdges: string[], inputsShown: Step['inputs']) {
    const outs: Step['outputs'] = [];
    const ids = [...arrivedEdges];
    for (const o of r.outs) {
      const sent = emit(n, o.port, o.value);
      outs.push(...sent);
      ids.push(...(sent.edgeIds ?? []));
    }
    steps.push({ index: steps.length + 1, nodeId: n.id, nodeName: nameOf(n), action: r.action, inputs: inputsShown, outputs: outs, edgeIds: [...new Set(ids)], note: r.note, error: r.error });
    // Une simple attente (aucune sortie, non terminale) ne compte pas comme une exécution.
    if (r.outs.length > 0 || r.terminal) runs.get(n.id)!.fired++;
  }

  const v = (type: DataType, text: string, payload?: string): Value => ({ type, text, payload });
  const FICTIF = 'Réponse fictive générée par le Studio : aucun modèle réel n’est appelé.';

  function react(n: SNode, port: string, value: Value): Reaction | null {
    const c = n.data.c;
    const run = runs.get(n.id)!;
    const P = (k: string) => param(n, k);
    switch (c) {
      case 'interface':
      case 'utilisateur':
        return { action: 'Reçoit la réponse et l’affiche à la personne.', outs: [], terminal: true };
      case 'message':
        return { action: 'Transmet le message tel quel.', outs: [{ port: 'message', value: v('texte', value.text) }] };
      case 'formulaire':
        return { action: 'Met la saisie en forme de champs.', outs: [{ port: 'donnees', value: v('texte', `Formulaire : { ${value.text} }`) }] };
      case 'sortie-texte':
        finals.push({ node: nameOf(n), text: value.text });
        return { action: 'Affiche le résultat final.', outs: [], terminal: true, note: value.type === 'erreur' ? 'Le résultat affiché est un message d’erreur.' : undefined };
      case 'fin':
        finals.push({ node: nameOf(n), text: value.text });
        return { action: 'Le processus se termine ici.', outs: [], terminal: true };
      case 'validation-humaine':
        return P('decision') === 'rejeter'
          ? { action: 'Une personne relit le résultat et le rejette.', outs: [{ port: 'rejet', value: v('erreur', 'Résultat rejeté par le relecteur : à corriger.') }], note: 'Décision de la personne simulée par le Studio.' }
          : { action: 'Une personne relit le résultat et le valide.', outs: [{ port: 'valide', value: v('texte', value.text) }], note: 'Décision de la personne simulée par le Studio.' };
      case 'historique':
        return { action: 'Ajoute le message aux échanges précédents conservés par l’application.', outs: [{ port: 'contexte', value: v('contexte', `Historique des échanges (fictif) + dernier message : « ${excerpt(value.text)} »`) }] };
      case 'memoire':
        return { action: 'Retient l’information pour les prochaines conversations.', outs: [{ port: 'contexte', value: v('contexte', `Mémoire : ${excerpt(value.text)}`) }] };
      case 'embedder':
        return { action: 'Convertit le contenu en vecteur de nombres (valeurs illustratives).', outs: [{ port: 'vecteurs', value: v('vecteurs', `Vecteur illustratif [0,12 ; −0,40 ; 0,88 ; …] représentant « ${excerpt(value.text, 50)} »`, value.payload ?? value.text) }] };
      case 'embeddings':
        return { action: 'Conserve les vecteurs.', outs: [{ port: 'vecteurs', value: v('vecteurs', value.text, value.payload) }] };
      case 'base-vectorielle': {
        run.data.push(value);
        const payload = run.data.map((d) => d.payload ?? d.text).join('\n');
        return { action: 'Range le vecteur dans l’index de recherche.', outs: [{ port: 'index', value: v('index', `Index de recherche contenant ${run.data.length} vecteur(s)`, payload) }] };
      }
      case 'recherche-doc':
      case 'pipeline-rag': {
        const qPort = 'question';
        const sPort = c === 'recherche-doc' ? 'source' : 'corpus';
        if (got(n.id, qPort).length < expected(n.id, qPort) || got(n.id, sPort).length < expected(n.id, sPort) || (c === 'pipeline-rag' && got(n.id, 'consignes').length < expected(n.id, 'consignes'))) {
          return { action: 'Reçoit une entrée et attend les autres avant de chercher.', outs: [], note: 'La recherche a besoin de la question ET de la source.' };
        }
        if (run.fired > 0) return null;
        const q = lastText(n.id, qPort);
        const src = got(n.id, sPort).map((s) => s.payload ?? s.text).join('\n');
        const found = retrieve(q, src, Number(P('nb') ?? 2));
        const passages = found.length ? found.map((f, i) => `[${i + 1}] ${f}`).join('\n') : '';
        const note = found.length ? undefined : 'Aucun passage ne partage de mots-clés avec la question : le modèle recevra un contexte sans source (et devrait refuser de répondre).';
        if (c === 'recherche-doc') return { action: found.length ? `Retrouve ${found.length} passage(s) pertinent(s) par mots-clés (recherche simulée).` : 'Ne retrouve aucun passage pertinent.', outs: [{ port: 'passages', value: v('passages', passages || 'Aucun passage pertinent') }], note };
        const consignes = lastText(n.id, 'consignes');
        return { action: 'Cherche les passages, puis construit le contexte envoyé au modèle.', outs: [{ port: 'contexte', value: v('contexte', `${consignes ? `Consignes : ${consignes}\n` : ''}Passages :\n${passages || '(aucun)'}\nQuestion : ${q}`) }], note };
      }
      case 'filtre': {
        const key = String(P('motCle') ?? '').trim();
        let list = value.text.split('\n').filter(Boolean);
        if (key) list = list.filter((l) => norm(l).includes(norm(key)));
        list = list.slice(0, Number(P('max') ?? 3));
        return { action: key ? `Garde les passages contenant « ${key} » (${list.length} conservé(s)).` : `Garde au plus ${list.length} passage(s).`, outs: [{ port: 'passages', value: v('passages', list.join('\n') || 'Aucun passage autorisé') }] };
      }
      case 'llm':
      case 'agent': {
        const main = c === 'llm' ? 'contexte' : 'objectif';
        const ready = ['contexte', 'objectif'].includes(port) || port === 'resultat' || port === 'consignes';
        if (!ready) return null;
        if (got(n.id, main).length < expected(n.id, main) || got(n.id, 'consignes').length < expected(n.id, 'consignes')) {
          return { action: 'Reçoit une entrée et attend le reste du contexte.', outs: [], note: 'Un modèle ne répond qu’une fois son contexte complet.' };
        }
        if (got(n.id, main).length === 0) return null;
        const callPort = c === 'llm' ? 'demande' : 'appel';
        const limit = Number(P(c === 'llm' ? 'maxToolCalls' : 'maxSteps') ?? 0);
        const hasResult = got(n.id, 'resultat').length > 0;
        const ctx = got(n.id, main).map((x) => x.text).join(' | ');
        const question = ctx.split('Question : ').at(-1)?.split('\n')[0] ?? ctx;
        if (edgesFrom(n.id, callPort).length > 0 && !hasResult && run.toolCalls < limit && !run.asked) {
          run.toolCalls++;
          run.asked = true;
          return { action: 'Décide de demander un outil (sans l’exécuter lui-même).', outs: [{ port: callPort, value: v('appel-outil', `appel_outil("${excerpt(question, 50)}")`) }], note: `Demande ${run.toolCalls}/${limit}. Le modèle formule la demande ; c’est un autre composant qui exécute. ${FICTIF}` };
        }
        if (run.fired > 0 && !(hasResult && run.asked)) return null;
        run.asked = false;
        const hasPassages = /Passages :|\[1\]/.test(ctx);
        const noSource = /\(aucun\)|Aucun passage/.test(ctx);
        const body = noSource
          ? 'Je ne trouve pas cette information dans les documents fournis.'
          : hasPassages
            ? `D’après les passages fournis : « ${excerpt(ctx.replace(/^[\s\S]*Passages :\n?/, '').split('\nQuestion')[0], 110)} »`
            : `Voici une réponse illustrative à « ${excerpt(question, 60)} ».`;
        const withTool = hasResult ? ` (en tenant compte du résultat de l’outil : « ${excerpt(lastText(n.id, 'resultat'), 50)} »)` : '';
        return { action: c === 'llm' ? 'Génère une réponse à partir de son contexte.' : 'Rédige sa réponse finale.', outs: [{ port: 'reponse', value: v('texte', `${body}${withTool}`) }], note: FICTIF };
      }
      case 'vision':
        if (port !== 'image' && got(n.id, 'image').length === 0) return null;
        return { action: 'Analyse l’image.', outs: [{ port: 'texte', value: v('texte', `Description illustrative d’une image : « ${excerpt(lastText(n.id, 'image'), 60)} »`) }], note: 'Analyse fictive : aucun vrai modèle de vision n’est appelé.' };
      case 'evaluateur': {
        if (got(n.id, 'reponse').length < expected(n.id, 'reponse') || got(n.id, 'reference').length < expected(n.id, 'reference')) return { action: 'Attend la réponse et la référence.', outs: [] };
        if (run.fired > 0) return null;
        const ref = got(n.id, 'reference').map((r) => r.text).join(' ');
        const ok = !ref || words(lastText(n.id, 'reponse')).some((w) => words(ref).includes(w));
        return { action: 'Compare la réponse aux sources.', outs: [{ port: 'verdict', value: v('decision', ok ? 'Conforme : la réponse partage des éléments avec les sources.' : 'Non conforme : rien dans la réponse ne s’appuie sur les sources.') }], note: 'Évaluation simulée par recouvrement de mots-clés, beaucoup plus simple qu’une vraie évaluation.' };
      }
      case 'application': {
        if (port === 'message') {
          run.question = value.text;
          const outs: Out[] = [];
          const dataEdges = g.edges.filter((e) => e.target === n.id && e.targetHandle === 'retours' && ['passages', 'reponse'].includes(String(nodeDef(findNode(g, e.source)!)?.outputs.find((p) => p.id === e.sourceHandle)?.emits)));
          if (edgesFrom(n.id, 'recherche').length) outs.push({ port: 'recherche', value: v('texte', value.text) });
          if (edgesFrom(n.id, 'requete').length) outs.push({ port: 'requete', value: v('requete', `GET /donnees?q=${encodeURIComponent(excerpt(value.text, 40))}`) });
          if (dataEdges.length === 0 && edgesFrom(n.id, 'contexte').length) outs.push({ port: 'contexte', value: v('contexte', `Consigne de l’application + question de l’utilisateur : « ${value.text} »`) });
          return { action: 'Reçoit la demande, vérifie, puis lance les étapes prévues.', outs, note: outs.length === 0 ? 'Aucune sortie reliée : l’application ne sait pas quoi faire de la demande.' : undefined };
        }
        // retours
        const t = value.type;
        if (t === 'passages' || t === 'reponse') {
          run.data.push(value);
          const dataEdges = g.edges.filter((e) => e.target === n.id && e.targetHandle === 'retours' && ['passages', 'reponse'].includes(String(nodeDef(findNode(g, e.source)!)?.outputs.find((p) => p.id === e.sourceHandle)?.emits))).length;
          if (run.data.length < dataEdges) return { action: 'Reçoit des données et attend les autres.', outs: [] };
          const extra = run.data.map((d) => d.text).join('\n');
          return { action: 'Assemble la question et les données reçues dans un contexte pour le modèle.', outs: edgesFrom(n.id, 'contexte').length ? [{ port: 'contexte', value: v('contexte', `Passages :\n${extra}\nQuestion : ${run.question ?? ''}`) }] : [], note: edgesFrom(n.id, 'contexte').length ? undefined : 'Le contexte n’est relié à aucun modèle.' };
        }
        if (t === 'resultat-outil') return { action: 'Contrôle le résultat de l’outil puis le fournit au modèle.', outs: edgesFrom(n.id, 'resultat').length ? [{ port: 'resultat', value: v('resultat-outil', value.text) }] : [], note: edgesFrom(n.id, 'resultat').length ? undefined : 'Le résultat de l’outil n’est relié à aucun modèle : il est perdu.' };
        if (t === 'appel-outil') return { action: 'Reçoit la demande d’outil du modèle ; elle décide de l’exécuter (ou non).', outs: edgesFrom(n.id, 'appel').length ? [{ port: 'appel', value: v('appel-outil', value.text) }] : [], note: edgesFrom(n.id, 'appel').length ? 'La validation a lieu ici, avant toute exécution.' : 'Aucun outil n’est relié : la demande est refusée.' };
        if (t === 'erreur') return { action: 'Reçoit une erreur et la transforme en message clair.', outs: [{ port: 'sortie', value: v('texte', `Désolé, une erreur est survenue : ${excerpt(value.text, 80)}`) }] };
        return { action: 'Reçoit un résultat et le renvoie comme réponse finale.', outs: [{ port: 'sortie', value: v('texte', value.text) }] };
      }
      case 'serveur':
        return { action: 'Traite la requête et prépare une réponse.', outs: [{ port: 'reponse', value: v('reponse', `200 OK — traitement terminé pour « ${excerpt(value.text, 40)} »`) }] };
      case 'api':
      case 'service-externe':
      case 'base-de-donnees': {
        const data = String(P('donnees') ?? '');
        return { action: c === 'base-de-donnees' ? 'Lit les données demandées.' : 'Répond à la requête.', outs: [{ port: 'reponse', value: v('reponse', `200 OK — ${data}`) }], note: 'Données fictives du Studio.' };
      }
      case 'requete-http':
        return { action: 'Met les données en forme de requête HTTP.', outs: [{ port: 'requete', value: v('requete', `${String(P('methode') ?? 'POST')} /api — corps : ${excerpt(value.text, 60)}`) }] };
      case 'reponse-http': {
        const status = String(P('statut') ?? '200');
        return status === '200'
          ? { action: 'Lit le code 200 puis extrait le contenu.', outs: [{ port: 'corps', value: v('texte', value.text.replace(/^200 OK — /, '')) }] }
          : { action: `Lit le code ${status} : la requête a échoué.`, outs: [{ port: 'erreur', value: v('erreur', `Erreur HTTP ${status}`) }], note: 'Toujours lire le code de statut avant d’utiliser le contenu.' };
      }
      case 'authentification':
        return P('jetonValide') === false
          ? { action: 'Vérifie l’identité : jeton invalide.', outs: [{ port: 'refus', value: v('erreur', '401 Unauthorized — identité non reconnue') }] }
          : { action: 'Vérifie l’identité : jeton valide.', outs: [{ port: 'autorisee', value: v('requete', value.text) }], note: 'Authentifier ne dit pas encore ce que la personne a le droit de faire (autorisation).' };
      case 'gestion-erreurs':
      case 'gestionnaire-erreurs': {
        const out = c === 'gestion-erreurs' ? 'message' : 'repli';
        return { action: 'Intercepte l’erreur et prépare une réponse claire.', outs: [{ port: out, value: v('texte', `Le service est momentanément indisponible (${excerpt(value.text, 50)}). Réessaie dans un instant.`) }] };
      }
      case 'client-mcp':
        return port === 'demande'
          ? { action: 'Transforme la demande validée en requête MCP (tools/call).', outs: [{ port: 'requete', value: v('requete', `tools/call — ${excerpt(value.text, 60)}`) }], note: 'MCP est un protocole de communication : il standardise l’appel, il ne garantit ni la fiabilité ni la sécurité.' }
          : { action: 'Reçoit la réponse du serveur MCP et en extrait le résultat.', outs: [{ port: 'resultat', value: v('resultat-outil', value.text.replace(/^200 OK — /, '')) }] };
      case 'serveur-mcp':
        return port === 'requete'
          ? (edgesFrom(n.id, 'appel').length
              ? { action: 'Reçoit tools/call et exécute l’outil qu’il expose.', outs: [{ port: 'appel', value: v('appel-outil', value.text) }], note: 'Le serveur agit avec les permissions dont il dispose, rien de plus.' }
              : { action: 'Reçoit la requête MCP et répond avec ses capacités.', outs: [{ port: 'reponse', value: v('reponse', '200 OK — capacités : outils, ressources, prompts') }] })
          : port === 'resultat'
            ? { action: 'Renvoie le résultat de l’outil au client MCP.', outs: [{ port: 'reponse', value: v('reponse', `200 OK — ${value.text}`) }] }
            : null;
      case 'outil-externe':
      case 'fonction-agent':
      case 'connecteur': {
        const w = P('effet') === 'ecriture';
        return { action: w ? 'Exécute l’action (elle modifie des données — simulation).' : 'Exécute l’action en lecture seule.', outs: [{ port: 'resultat', value: v('resultat-outil', `${nameOf(n)} : ${String(P('resultatSimule') ?? 'résultat fictif')}`) }], note: w ? 'Une action qui modifie des données devrait avoir été approuvée avant.' : 'Résultat fictif du Studio.' };
      }
      case 'condition': {
        const vrai = P('resultatSimule') !== 'faux';
        return { action: `Évalue « ${String(P('condition') ?? '')} » : ${vrai ? 'vrai' : 'faux'} (issue simulée).`, outs: [{ port: vrai ? 'vrai' : 'faux', value: { ...value } }] };
      }
      case 'branche': {
        const main = P('utilisee') !== 'alternative';
        return { action: main ? 'Suit le chemin principal.' : 'Bascule sur le chemin alternatif.', outs: [{ port: main ? 'principale' : 'alternative', value: { ...value } }] };
      }
      case 'routeur': {
        const voie = String(P('voie') ?? 'a');
        return { action: `Oriente la demande vers la voie ${voie.toUpperCase()}.`, outs: [{ port: `voie-${voie}`, value: { ...value } }], note: `Critère : ${String(P('critere') ?? '')}` };
      }
      case 'etape-validation':
        return P('resultatSimule') === 'invalide'
          ? { action: `Contrôle « ${String(P('regle') ?? '')} » : non conforme.`, outs: [{ port: 'invalide', value: v('erreur', `Règle non respectée : ${String(P('regle') ?? '')}`) }] }
          : { action: `Contrôle « ${String(P('regle') ?? '')} » : conforme.`, outs: [{ port: 'valide', value: { ...value } }], note: 'La validation automatique contrôle la forme et des règles, pas la vérité du contenu.' };
      case 'boucle': {
        if (port === 'arret') return { action: 'La condition d’arrêt est remplie : sortie de la boucle.', outs: [{ port: 'fin', value: v('texte', run.data.at(-1)?.text ?? value.text) }] };
        run.data.push(value);
        const max = Number(P('maxIter') ?? 1);
        return run.data.length >= max
          ? { action: `Limite de ${max} itération(s) atteinte : sortie de la boucle.`, outs: [{ port: 'fin', value: { ...value } }], note: 'Sans cette limite, la boucle pourrait ne jamais s’arrêter.' }
          : { action: `Itération ${run.data.length}/${max} : répète les étapes prévues.`, outs: [{ port: 'iteration', value: { ...value } }] };
      }
      case 'approbation-humaine':
        return P('decision') === 'refuser'
          ? { action: 'Une personne examine l’action et la refuse : elle n’est pas exécutée.', outs: [{ port: 'refuse', value: v('erreur', 'Action refusée par la personne.') }], note: 'Décision de la personne simulée par le Studio.' }
          : { action: 'Une personne examine l’action et l’autorise.', outs: [{ port: 'approuve', value: { ...value } }], note: 'Décision de la personne simulée par le Studio. Une approbation utile montre l’action, ses arguments et ses effets.' };
      default:
        return null;
    }
  }

  // ── Départ : composants sans entrée (documents, consignes…) puis points d'entrée ──
  const starters = [...g.nodes.filter((n) => nodeDef(n)?.inputs.length === 0 && !nodeDef(n)?.entry), ...g.nodes.filter((n) => nodeDef(n)?.entry)]
    .sort((a, b) => Number(!!nodeDef(a)?.entry) - Number(!!nodeDef(b)?.entry));
  for (const n of starters) {
    const c = n.data.c;
    const P = (k: string) => param(n, k);
    let value: Value | null = null;
    let port = '';
    let action = 'Émet son contenu.';
    if (c === 'utilisateur' || c === 'interface') { port = c === 'utilisateur' ? 'message' : 'saisie'; value = v('texte', String(P('message') ?? '')); action = 'La personne formule sa demande.'; }
    else if (c === 'entree-texte') { port = 'texte'; value = v('texte', String(P('texte') ?? '')); action = 'Un texte est saisi.'; }
    else if (c === 'formulaire') { port = 'donnees'; value = v('texte', `Formulaire : { ${String(P('contenu') ?? '')} }`); action = 'Le formulaire est rempli.'; }
    else if (c === 'document') { port = 'contenu'; value = v('documents', `${String(P('titre') ?? 'Document')} : ${String(P('texte') ?? '')}`, String(P('texte') ?? '')); action = 'Le document est mis à disposition.'; }
    else if (c === 'source-connaissances') { port = 'corpus'; value = v('documents', String(P('texte') ?? ''), String(P('texte') ?? '')); action = 'Le corpus est mis à disposition.'; }
    else if (c === 'prompt-systeme') { port = 'consignes'; value = v('config', String(P('texte') ?? '')); action = 'Les consignes de fond sont fournies (dépendance).'; }
    else if (c === 'ressource-mcp') { port = 'capacite'; value = v('config', `Ressource ${String(P('uri') ?? '')}`); action = 'Expose une ressource.'; }
    else if (c === 'prompt-mcp') { port = 'capacite'; value = v('config', `Modèle de prompt ${String(P('nom') ?? '')}`); action = 'Propose un modèle de message.'; }
    if (!value) continue;
    record(n, { action, outs: [{ port, value }], note: c === 'utilisateur' || c === 'interface' || c === 'entree-texte' || c === 'formulaire' ? 'Donnée d’exemple saisie dans l’inspecteur (fictive).' : 'Contenu fictif du Studio.' }, [], []);
  }

  // ── Propagation ──
  let guard = 0;
  while (queue.length) {
    if (++guard > MAX_STEPS) {
      steps.push({ index: steps.length + 1, nodeId: steps.at(-1)?.nodeId ?? '', nodeName: 'Simulation', action: 'Arrêt de sécurité', inputs: [], outputs: [], edgeIds: [], error: `La simulation s’arrête après ${MAX_STEPS} étapes : le parcours semble tourner en boucle.` });
      return { status: 'limit', message: `Arrêt après ${MAX_STEPS} étapes : probable boucle sans condition d’arrêt. Lance « Vérifier mon architecture » pour la localiser.`, steps, finals, waiting: [] };
    }
    const { edge, value } = queue.shift()!;
    const target = findNode(g, edge.target);
    if (!target) continue;
    const run = runs.get(target.id)!;
    (run.inputs[edge.targetHandle] ??= []).push(value);
    const reaction = react(target, edge.targetHandle, value);
    if (!reaction) continue;
    const def = nodeDef(target)!;
    record(target, reaction, [edge.id], [{ port: def.inputs.find((p) => p.id === edge.targetHandle)?.label ?? edge.targetHandle, type: value.type, text: value.text }]);
  }

  // ── Bilan : qui n'a jamais pu s'exécuter ? ──
  const waiting: string[] = [];
  for (const n of g.nodes) {
    const def = nodeDef(n)!;
    if (runs.get(n.id)!.fired > 0 || def.entry) continue;
    const missing = def.inputs.filter((p) => p.required && (runs.get(n.id)!.inputs[p.id]?.length ?? 0) === 0).map((p) => p.label);
    if (g.edges.some((e) => e.target === n.id) || missing.length) waiting.push(`« ${def.name} » ne s’est pas exécuté${missing.length ? ` — il n’a jamais reçu : ${missing.join(', ')}` : ''}.`);
  }
  const done = finals.length > 0 || steps.some((s) => nodeDef(findNode(g, s.nodeId)!)?.terminal || ['utilisateur', 'interface'].includes(findNode(g, s.nodeId)?.data.c ?? '') && s.action.startsWith('Reçoit'));
  if (waiting.length === 0 && done) return { status: 'ok', message: 'Simulation terminée : tous les composants activés ont reçu ce qu’il leur fallait et le résultat est arrivé à destination. Cela illustre le parcours ; cela ne prouve pas qu’une vraie implémentation fonctionnerait.', steps, finals, waiting };
  return { status: 'incomplete', message: done ? 'Simulation terminée, mais certains composants ne se sont jamais exécutés (voir ci-dessous).' : 'Simulation incomplète : le résultat n’est jamais arrivé à une destination finale.', steps, finals, waiting };
}
