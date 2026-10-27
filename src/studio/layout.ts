import { cycles } from './checker';
import { nodeDef } from './connections';
import type { Graph, SNode } from './types';

export const NODE_WIDTH = 230;
const GAP_X = 120;
const GAP_Y = 36;

/** Hauteur estimée d'un bloc d'après son nombre de ports (le rendu réel peut légèrement différer). */
export function estimatedHeight(n: SNode): number {
  const d = nodeDef(n);
  const ports = Math.max(d?.inputs.length ?? 1, d?.outputs.length ?? 1, 1);
  return 64 + ports * 26;
}

/**
 * Organisation automatique en colonnes de gauche à droite : un composant se place après tous ceux qui l'alimentent.
 * Les connexions « de retour » (cycles) sont ignorées pour le calcul des colonnes.
 */
export function autoLayout(g: Graph): Graph {
  const inCycle = new Set<string>();
  for (const comp of cycles(g)) for (const a of comp) for (const b of comp) inCycle.add(`${a}>${b}`);
  const forward = g.edges.filter((e) => !inCycle.has(`${e.source}>${e.target}`) && e.source !== e.target);

  const layer = new Map<string, number>(g.nodes.map((n) => [n.id, 0]));
  for (let pass = 0; pass < g.nodes.length; pass++) {
    let changed = false;
    for (const e of forward) {
      const want = (layer.get(e.source) ?? 0) + 1;
      if (want > (layer.get(e.target) ?? 0)) { layer.set(e.target, want); changed = true; }
    }
    if (!changed) break;
  }
  // Pour les composants d'une même composante cyclique, on garde l'ordre d'apparition (colonne de leur premier élément atteint).
  const columns = new Map<number, SNode[]>();
  for (const n of g.nodes) {
    const l = layer.get(n.id) ?? 0;
    columns.set(l, [...(columns.get(l) ?? []), n]);
  }
  const order = new Map<string, number>();
  [...columns.keys()].sort((a, b) => a - b).forEach((l) => {
    const col = columns.get(l)!;
    // Barycentre : on trie par la position moyenne des prédécesseurs pour limiter les croisements.
    col.sort((a, b) => bary(a.id) - bary(b.id));
    col.forEach((n, i) => order.set(n.id, i));
  });
  function bary(id: string): number {
    const preds = forward.filter((e) => e.target === id).map((e) => order.get(e.source));
    const known = preds.filter((x): x is number => x !== undefined);
    return known.length ? known.reduce((s, v) => s + v, 0) / known.length : g.nodes.findIndex((n) => n.id === id);
  }

  const pos = new Map<string, { x: number; y: number }>();
  for (const [l, col] of columns) {
    let y = 40;
    for (const n of col) {
      pos.set(n.id, { x: 40 + l * (NODE_WIDTH + GAP_X), y });
      y += estimatedHeight(n) + GAP_Y;
    }
  }
  return { ...g, nodes: g.nodes.map((n) => ({ ...n, position: pos.get(n.id) ?? n.position })) };
}
