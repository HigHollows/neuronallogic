import { createContext, useContext } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, Handle, useReactFlow, Position, type EdgeProps, type NodeProps, type Node } from '@xyflow/react';
import { Icon } from '../../components/Icon';
import { EDGE_KINDS, KIND_OF } from '../connections';
import { componentById } from '../data/components';
import { studio } from '../store';
import type { Graph, Level } from '../types';

/** Ce que le canevas doit savoir en plus des blocs : problèmes détectés et blocs actifs dans la simulation. */
export interface CanvasInfo {
  levels: Map<string, Level>;
  active: Set<string>;
}
export const CanvasContext = createContext<CanvasInfo>({ levels: new Map(), active: new Set() });

const LEVEL_TEXT: Record<Level, string> = { error: 'erreur', warning: 'avertissement', info: 'information' };
const LEVEL_MARK: Record<Level, string> = { error: '✕', warning: '!', info: 'i' };

type BlockData = { c: string; params: Record<string, string | number | boolean> };

export function BlockNode({ id, data, selected }: NodeProps<Node<BlockData, 'block'>>) {
  const def = componentById.get(data.c);
  const info = useContext(CanvasContext);
  if (!def) return <div className="sblock">Composant inconnu</div>;
  const level = info.levels.get(id);
  const active = info.active.has(id);
  const preview = def.params.find((p) => p.kind === 'text' || p.kind === 'longtext');
  const text = preview ? String(data.params[preview.key] ?? '') : '';
  return (
    <div className={`sblock cat-${def.category}${selected ? ' sel' : ''}${active ? ' active' : ''}`} data-testid={`block-${id}`}>
      <div className="sblock-head">
        <Icon name={def.icon} size={16} />
        <strong>{def.name}</strong>
        {level && <span className={`sblock-flag ${level}`} title={`Un ${LEVEL_TEXT[level]} est signalé sur ce composant`}><span aria-hidden="true">{LEVEL_MARK[level]}</span><span className="sr-only">{LEVEL_TEXT[level]} signalé(e)</span></span>}
      </div>
      {text && <div className="sblock-preview">{text.length > 60 ? `${text.slice(0, 60)}…` : text}</div>}
      <div className="sblock-ports">
        <div className="sblock-in">
          {def.inputs.map((p) => (
            <div key={p.id} className="sport in">
              <Handle type="target" position={Position.Left} id={p.id} aria-label={`Entrée ${p.label}`} />
              <span>{p.label}{p.required ? <abbr title="obligatoire"> *</abbr> : null}</span>
            </div>
          ))}
        </div>
        <div className="sblock-out">
          {def.outputs.map((p) => (
            <div key={p.id} className="sport out">
              <span>{p.label}</span>
              <Handle type="source" position={Position.Right} id={p.id} aria-label={`Sortie ${p.label}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const NODE_TYPES = { block: BlockNode };

/** Légende des cinq types de connexions (trait + libellé + sens : jamais la couleur seule). */
export function EdgeLegend() {
  return (
    <ul className="legend" aria-label="Légende des connexions">
      {(Object.keys(EDGE_KINDS) as (keyof typeof EDGE_KINDS)[]).map((k) => (
        <li key={k} title={EDGE_KINDS[k].meaning}>
          <svg width="34" height="10" aria-hidden="true"><line x1="1" y1="5" x2="33" y2="5" stroke={EDGE_KINDS[k].color} strokeWidth={EDGE_KINDS[k].width} strokeDasharray={EDGE_KINDS[k].dash} /></svg>
          <span>{EDGE_KINDS[k].label}</span>
        </li>
      ))}
    </ul>
  );
}

/** Miniature d'une architecture (aperçu des modèles et des guides). Texte alternatif fourni par l'appelant. */
export function MiniDiagram({ graph, label }: { graph: Graph; label: string }) {
  const W = 230;
  const H = 70;
  const xs = graph.nodes.map((n) => n.position.x);
  const ys = graph.nodes.map((n) => n.position.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs) + 230, minY = Math.min(...ys), maxY = Math.max(...ys) + 70;
  const sx = (W - 8) / Math.max(1, maxX - minX), sy = (H - 8) / Math.max(1, maxY - minY);
  const s = Math.min(sx, sy);
  const pos = new Map(graph.nodes.map((n) => [n.id, { x: 4 + (n.position.x - minX) * s, y: 4 + (n.position.y - minY) * s }]));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="mini-diagram">
      {graph.edges.map((e) => {
        const a = pos.get(e.source), b = pos.get(e.target);
        if (!a || !b) return null;
        const kind = EDGE_KINDS[KIND_OF[componentOutType(graph, e.source, e.sourceHandle)] ?? 'data'];
        return <line key={e.id} x1={a.x + 230 * s} y1={a.y + 25 * s} x2={b.x} y2={b.y + 25 * s} stroke={kind.color} strokeWidth="1.4" strokeDasharray={kind.dash} />;
      })}
      {graph.nodes.map((n) => {
        const p = pos.get(n.id)!;
        return <rect key={n.id} x={p.x} y={p.y} width={230 * s} height={Math.max(8, 50 * s)} rx="3" fill="var(--accent-weak)" stroke="var(--accent)" strokeWidth="1" />;
      })}
    </svg>
  );
}

/**
 * Connexion animée : la forme du marqueur qui voyage le long du trait et sa vitesse dépendent du type de connexion
 * (rond = données, carré = requête, triangle = réponse, losange = appel d'outil, petit rond lent = dépendance).
 * Le déplacement montre le sens du flux. Le bouton « Animations » les coupe (désactivées par défaut si le système demande moins de mouvement).
 */
export interface FlowEdgeData extends Record<string, unknown> { kind: keyof typeof EDGE_KINDS; color: string; width: number; dash: string; animate: boolean; dim: boolean; hot: boolean; label: string; bend?: { dx: number; dy: number } }

const SPEED: Record<string, number> = { data: 2.4, request: 2, response: 2, tool: 2.8, dependency: 5 };

export function FlowEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd, selected }: EdgeProps) {
  const d = data as FlowEdgeData;
  const rf = useReactFlow();
  const mx = (sourceX + targetX) / 2, my = (sourceY + targetY) / 2;
  let path: string, lx: number, ly: number;
  if (d.bend) {
    // Le tracé passe par un point que l'utilisateur a déplacé ; tangentes horizontales pour rester lisible.
    const wx = mx + d.bend.dx, wy = my + d.bend.dy;
    const k1 = Math.max(40, Math.abs(wx - sourceX) / 2), k3 = Math.max(40, Math.abs(targetX - wx) / 2);
    path = `M ${sourceX} ${sourceY} C ${sourceX + k1} ${sourceY}, ${wx - k1} ${wy}, ${wx} ${wy} S ${targetX - k3} ${targetY}, ${targetX} ${targetY}`;
    lx = wx; ly = wy;
  } else {
    [path, lx, ly] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  }
  const grab = (e: React.PointerEvent<SVGCircleElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    studio.beginGesture();
    studio.select([], [id]);
    const move = (ev: PointerEvent) => { const p = rf.screenToFlowPosition({ x: ev.clientX, y: ev.clientY }); studio.setBend(id, { dx: Math.round(p.x - mx), dy: Math.round(p.y - my) }); };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); studio.endGesture(); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  const dur = `${(SPEED[d.kind] ?? 2.4) * (d.hot ? 0.6 : 1)}s`;
  const r = d.hot ? 5 : 3.5;
  let shape;
  if (d.kind === 'request') shape = <rect x={-r} y={-r} width={r * 2} height={r * 2} />;
  else if (d.kind === 'response') shape = <polygon points={`${-r - 1},${-r} ${r + 2},0 ${-r - 1},${r}`} />;
  else if (d.kind === 'tool') shape = <polygon points={`0,${-r - 1} ${r + 1},0 0,${r + 1} ${-r - 1},0`} />;
  else shape = <circle r={d.kind === 'dependency' ? r - 1 : r} />;
  return (
    <g style={{ opacity: d.dim ? 0.2 : 1 }}>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={{ stroke: d.color, strokeWidth: d.width + (d.hot ? 2 : 0) + (selected ? 1 : 0), strokeDasharray: d.dash || undefined }} />
      {d.animate && (
        <g fill={d.color} stroke="var(--surface)" strokeWidth="1" pointerEvents="none" aria-hidden="true">
          {shape}
          <animateMotion dur={dur} repeatCount="indefinite" path={path} rotate={d.kind === 'response' ? 'auto' : undefined} />
        </g>
      )}
      {(selected || d.hot || d.bend) && (
        <circle className="edge-grip" cx={lx} cy={ly} r={7} fill="var(--surface)" stroke={d.color} strokeWidth="2.5" onPointerDown={grab} onDoubleClick={(e) => { e.stopPropagation(); studio.resetBend(id); }}>
          <title>Tire pour déplacer le tracé de cette connexion · double-clic : remettre droit</title>
        </circle>
      )}
      <EdgeLabelRenderer>
        <div className="edge-label nodrag nopan" style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly + 16}px)`, opacity: d.dim ? 0.3 : 1 }}>{d.label}</div>
      </EdgeLabelRenderer>
    </g>
  );
}

export const EDGE_TYPES = { flow: FlowEdge };

function componentOutType(g: Graph, nodeId: string, port: string) {
  const n = g.nodes.find((x) => x.id === nodeId);
  const o = n && componentById.get(n.data.c)?.outputs.find((p) => p.id === port);
  return o && o.emits !== '*' ? o.emits : 'texte';
}
