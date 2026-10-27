/**
 * Magasin d'édition du Studio : toute la logique d'édition (ajout, suppression, connexions validées, annulation…) vit ici,
 * sans React ni React Flow, donc testable seule. Le canevas ne fait que l'afficher et lui transmettre les gestes.
 */
import { useSyncExternalStore } from 'react';
import { validateConnection, type ConnectionRequest, type ConnectionResult } from './connections';
import { componentById } from './data/components';
import { autoLayout } from './layout';
import { edgeId, LIMITS } from './project';
import type { Flags } from './data/tutorial';
import type { Graph, SEdge, SNode } from './types';

const HISTORY_MAX = 100;

export interface StudioState {
  projectId: string | null;
  name: string;
  nodes: SNode[];
  edges: SEdge[];
  past: Graph[];
  future: Graph[];
  dirty: boolean;
  flags: Flags;
  /** Dernier message d'information ou de refus, annoncé aux lecteurs d'écran. */
  message: { kind: 'info' | 'refus'; text: string; fix?: string } | null;
  counter: number;
}

const blank = (): StudioState => ({
  projectId: null, name: 'Nouveau projet', nodes: [], edges: [], past: [], future: [], dirty: false,
  flags: { viewport: false, moved: false, simulated: false }, message: null, counter: 1,
});

let state: StudioState = blank();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const set = (patch: Partial<StudioState>) => { state = { ...state, ...patch }; emit(); };

/** Copie d'un graphe sans l'état purement visuel (sélection, mesures). */
const snap = (nodes: SNode[], edges: SEdge[]): Graph => ({
  nodes: nodes.map((n) => ({ id: n.id, type: 'block', position: { ...n.position }, data: { c: n.data.c, params: { ...n.data.params } } })),
  edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle, ...(e.bend ? { bend: { ...e.bend } } : {}) })),
});

function pushHistory() {
  const past = [...state.past, snap(state.nodes, state.edges)].slice(-HISTORY_MAX);
  state = { ...state, past, future: [] };
}

const graphOf = (): Graph => ({ nodes: state.nodes, edges: state.edges });

export const studio = {
  get: () => state,
  subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; },
  graph: graphOf,

  /** Remet le magasin à zéro (tests, nouveau projet). */
  reset(name = 'Nouveau projet', projectId: string | null = null) {
    state = { ...blank(), name, projectId };
    emit();
  },

  load(g: Graph, name: string, projectId: string | null) {
    const maxIdx = g.nodes.reduce((m, n) => Math.max(m, Number(n.id.match(/-(\d+)$/)?.[1] ?? 0)), 0);
    state = { ...blank(), name, projectId, nodes: snap(g.nodes, g.edges).nodes, edges: snap(g.nodes, g.edges).edges, counter: maxIdx + 1 };
    emit();
  },

  markSaved(projectId: string) { set({ projectId, dirty: false }); },
  rename(name: string) { set({ name: name.slice(0, LIMITS.nameLength), dirty: true }); },
  setMessage(message: StudioState['message']) { set({ message }); },
  clearMessage() { if (state.message) set({ message: null }); },
  setFlag(k: keyof Flags, v = true) { if (state.flags[k] !== v) set({ flags: { ...state.flags, [k]: v } }); },

  addNode(componentId: string, at?: { x: number; y: number }): string | null {
    const def = componentById.get(componentId);
    if (!def) return null;
    if (state.nodes.length >= LIMITS.nodes) {
      set({ message: { kind: 'refus', text: `Limite atteinte : ${LIMITS.nodes} composants au maximum dans un projet.`, fix: 'Supprime des composants ou crée un second projet.' } });
      return null;
    }
    pushHistory();
    const id = `${componentId}-${state.counter}`;
    const k = state.nodes.length;
    const position = at ?? { x: 60 + (k % 4) * 40, y: 60 + k * 36 };
    const params: SNode['data']['params'] = {};
    const node: SNode = { id, type: 'block', position, data: { c: componentId, params }, selected: true };
    set({ nodes: [...state.nodes.map((n) => ({ ...n, selected: false })), node], edges: state.edges.map((e) => ({ ...e, selected: false })), counter: state.counter + 1, dirty: true, message: { kind: 'info', text: `« ${def.name} » ajouté au canevas.` } });
    return id;
  },

  removeNodes(ids: string[]) {
    if (!ids.length) return;
    pushHistory();
    const gone = new Set(ids);
    set({ nodes: state.nodes.filter((n) => !gone.has(n.id)), edges: state.edges.filter((e) => !gone.has(e.source) && !gone.has(e.target)), dirty: true, message: { kind: 'info', text: `${ids.length} composant(s) supprimé(s) avec leurs connexions.` } });
  },

  removeEdges(ids: string[]) {
    if (!ids.length) return;
    pushHistory();
    const gone = new Set(ids);
    set({ edges: state.edges.filter((e) => !gone.has(e.id)), dirty: true, message: { kind: 'info', text: `${ids.length} connexion(s) supprimée(s).` } });
  },

  /** Supprime la sélection courante (composants et connexions). */
  removeSelected() {
    const nodeIds = state.nodes.filter((n) => n.selected).map((n) => n.id);
    const edgeIds = state.edges.filter((e) => e.selected).map((e) => e.id);
    if (!nodeIds.length && !edgeIds.length) return;
    pushHistory();
    const gone = new Set(nodeIds);
    const goneE = new Set(edgeIds);
    set({ nodes: state.nodes.filter((n) => !gone.has(n.id)), edges: state.edges.filter((e) => !goneE.has(e.id) && !gone.has(e.source) && !gone.has(e.target)), dirty: true, message: { kind: 'info', text: 'Sélection supprimée.' } });
  },

  duplicateSelected(): string[] {
    const sel = state.nodes.filter((n) => n.selected);
    if (!sel.length) return [];
    if (state.nodes.length + sel.length > LIMITS.nodes) {
      set({ message: { kind: 'refus', text: `Limite atteinte : ${LIMITS.nodes} composants au maximum.` } });
      return [];
    }
    pushHistory();
    let counter = state.counter;
    const map = new Map<string, string>();
    const copies: SNode[] = sel.map((n) => {
      const id = `${n.data.c}-${counter++}`;
      map.set(n.id, id);
      return { id, type: 'block', position: { x: n.position.x + 40, y: n.position.y + 40 }, data: { c: n.data.c, params: { ...n.data.params } }, selected: true };
    });
    const edges: SEdge[] = state.edges
      .filter((e) => map.has(e.source) && map.has(e.target))
      .map((e) => ({ id: '', source: map.get(e.source)!, target: map.get(e.target)!, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle }))
      .map((e) => ({ ...e, id: edgeId({ source: e.source, sourcePort: e.sourceHandle, target: e.target, targetPort: e.targetHandle }) }));
    set({ nodes: [...state.nodes.map((n) => ({ ...n, selected: false })), ...copies], edges: [...state.edges, ...edges], counter, dirty: true, message: { kind: 'info', text: `${copies.length} composant(s) dupliqué(s).` } });
    return copies.map((c) => c.id);
  },

  /** Tente de créer une connexion. Une connexion refusée n'est jamais silencieuse : le message explique et propose une correction. */
  connect(req: ConnectionRequest): ConnectionResult {
    const res = validateConnection(graphOf(), req);
    if (!res.ok) {
      set({ message: { kind: 'refus', text: `Connexion refusée. ${res.reason}`, fix: res.fix } });
      return res;
    }
    if (state.edges.length >= LIMITS.edges) {
      const r: ConnectionResult = { ok: false, code: 'inconnu', reason: `Limite atteinte : ${LIMITS.edges} connexions au maximum.`, fix: 'Supprime des connexions inutiles.' };
      set({ message: { kind: 'refus', text: r.reason, fix: r.fix } });
      return r;
    }
    pushHistory();
    const edge: SEdge = { id: edgeId({ source: req.source, sourcePort: req.sourceHandle, target: req.target, targetPort: req.targetHandle }), source: req.source, target: req.target, sourceHandle: req.sourceHandle, targetHandle: req.targetHandle };
    set({ edges: [...state.edges, edge], dirty: true, message: { kind: 'info', text: 'Connexion créée.' } });
    return res;
  },

  setParam(nodeId: string, key: string, value: string | number | boolean, coalesce = true) {
    const node = state.nodes.find((n) => n.id === nodeId);
    if (!node || node.data.params[key] === value) return;
    // Une série de frappes dans un même champ ne produit qu'une étape d'annulation.
    if (!coalesce || lastParamKey !== `${nodeId}.${key}`) pushHistory();
    lastParamKey = `${nodeId}.${key}`;
    set({ nodes: state.nodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, params: { ...n.data.params, [key]: value } } } : n)), dirty: true });
  },

  endParamEdit() { lastParamKey = ''; },

  /** Déplace le tracé d'une connexion (pendant un geste : voir beginGesture / endGesture). `null` : tracé droit. */
  setBend(id: string, bend: { dx: number; dy: number } | null) {
    state = { ...state, edges: state.edges.map((e) => { if (e.id !== id) return e; const { bend: _old, ...rest } = e; return bend ? { ...rest, bend } : rest; }) };
    emit();
  },
  /** Décale le tracé par pas (alternative au glisser, au clavier). */
  nudgeBend(id: string, dx: number, dy: number) {
    const e = state.edges.find((x) => x.id === id);
    if (!e) return;
    pushHistory();
    const b = { dx: (e.bend?.dx ?? 0) + dx, dy: (e.bend?.dy ?? 0) + dy };
    set({ edges: state.edges.map((x) => (x.id === id ? { ...x, bend: b } : x)), dirty: true });
  },
  resetBend(id: string) {
    if (!state.edges.find((x) => x.id === id)?.bend) return;
    pushHistory();
    set({ edges: state.edges.map((x) => { if (x.id !== id) return x; const { bend: _b, ...rest } = x; return rest; }), dirty: true, message: { kind: 'info', text: 'Tracé de la connexion remis en ligne droite.' } });
  },

  /** Début d'un geste continu (déplacement) : une seule étape d'annulation. */
  beginGesture() { pushHistory(); gestureStart = snap(state.nodes, state.edges); },
  endGesture() {
    if (!gestureStart) return;
    const now = snap(state.nodes, state.edges);
    const same = JSON.stringify(now) === JSON.stringify(gestureStart);
    gestureStart = null;
    if (same) set({ past: state.past.slice(0, -1) });
    else set({ dirty: true, flags: { ...state.flags, moved: true } });
  },

  /** Changements non destructifs venant du canevas (position pendant le glisser, sélection, mesures). */
  applyView(nodes: SNode[], edges: SEdge[]) { state = { ...state, nodes, edges }; emit(); },

  select(nodeIds: string[], edgeIds: string[]) {
    const n = new Set(nodeIds), e = new Set(edgeIds);
    state = { ...state, nodes: state.nodes.map((x) => (!!x.selected === n.has(x.id) ? x : { ...x, selected: n.has(x.id) })), edges: state.edges.map((x) => (!!x.selected === e.has(x.id) ? x : { ...x, selected: e.has(x.id) })) };
    emit();
  },

  undo() {
    const prev = state.past.at(-1);
    if (!prev) return false;
    const future = [snap(state.nodes, state.edges), ...state.future].slice(0, HISTORY_MAX);
    set({ nodes: prev.nodes, edges: prev.edges, past: state.past.slice(0, -1), future, dirty: true, message: { kind: 'info', text: 'Action annulée.' } });
    return true;
  },

  redo() {
    const next = state.future[0];
    if (!next) return false;
    const past = [...state.past, snap(state.nodes, state.edges)].slice(-HISTORY_MAX);
    set({ nodes: next.nodes, edges: next.edges, past, future: state.future.slice(1), dirty: true, message: { kind: 'info', text: 'Action rétablie.' } });
    return true;
  },

  autoLayout() {
    if (!state.nodes.length) return;
    pushHistory();
    const g = autoLayout(graphOf());
    set({ nodes: g.nodes.map((n) => ({ ...n, selected: state.nodes.find((x) => x.id === n.id)?.selected })), dirty: true, message: { kind: 'info', text: 'Schéma réorganisé automatiquement.' } });
  },

  /** Efface le canevas (la confirmation est demandée par l'interface avant d'appeler cette méthode). */
  clear() {
    pushHistory();
    set({ nodes: [], edges: [], dirty: true, message: { kind: 'info', text: 'Canevas effacé. Tu peux annuler cette action.' } });
  },
};

let lastParamKey = '';
let gestureStart: Graph | null = null;

export function useStudio(): StudioState {
  return useSyncExternalStore(studio.subscribe, studio.get, studio.get);
}
