/**
 * Format de projet du Studio, import/export et stockage local.
 *
 * Format d'export (JSON, version 1) :
 * {
 *   "format": "neuronallogic-studio", "version": 1, "name": "Mon assistant",
 *   "nodes": [ { "id": "llm-1", "component": "llm", "x": 320, "y": 80, "params": { "temperature": 0.7 } } ],
 *   "edges": [ { "source": "app-1", "sourcePort": "contexte", "target": "llm-1", "targetPort": "contexte" } ]
 * }
 * Un fichier importé n'est JAMAIS cru sur parole : forme, limites, composants, ports et paramètres sont validés ;
 * ce qui est invalide est écarté et signalé.
 */
import { componentById } from './data/components';
import type { Graph, SEdge, SNode } from './types';

export const FORMAT = 'neuronallogic-studio';
export const FORMAT_VERSION = 1;
export const LIMITS = { nodes: 200, edges: 400, fileBytes: 1_000_000, projects: 30, nameLength: 80, paramText: 1000, coord: 100_000 } as const;
export const STORAGE_KEY = 'nl:studio:v1';

export interface ProjectFile {
  format: typeof FORMAT;
  version: typeof FORMAT_VERSION;
  name: string;
  nodes: { id: string; component: string; x: number; y: number; params: Record<string, string | number | boolean> }[];
  edges: { source: string; sourcePort: string; target: string; targetPort: string; bend?: { dx: number; dy: number } }[];
}

export function toFile(g: Graph, name: string): ProjectFile {
  return {
    format: FORMAT, version: FORMAT_VERSION, name: name.slice(0, LIMITS.nameLength),
    nodes: g.nodes.map((n) => ({ id: n.id, component: n.data.c, x: Math.round(n.position.x), y: Math.round(n.position.y), params: { ...n.data.params } })),
    edges: g.edges.map((e) => ({ source: e.source, sourcePort: e.sourceHandle, target: e.target, targetPort: e.targetHandle, ...(e.bend ? { bend: { dx: Math.round(e.bend.dx), dy: Math.round(e.bend.dy) } } : {}) })),
  };
}

export const edgeId = (e: { source: string; sourcePort: string; target: string; targetPort: string }) => `${e.source}.${e.sourcePort}->${e.target}.${e.targetPort}`;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const safeId = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(v);

export interface ImportResult {
  ok: boolean;
  /** Raison du refus total (fichier inutilisable). */
  error?: string;
  name: string;
  graph: Graph;
  /** Éléments écartés, avec la raison : l'utilisateur sait ce qui n'a pas été repris. */
  dropped: string[];
}

const EMPTY: Graph = { nodes: [], edges: [] };

/** Valide un contenu JSON (texte) issu d'un fichier ou du stockage. */
export function parseProject(raw: string): ImportResult {
  if (raw.length > LIMITS.fileBytes) return { ok: false, error: `Fichier trop volumineux (maximum ${Math.round(LIMITS.fileBytes / 1000)} Ko).`, name: '', graph: EMPTY, dropped: [] };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Ce fichier n’est pas du JSON valide.', name: '', graph: EMPTY, dropped: [] };
  }
  return validateProject(data);
}

export function validateProject(data: unknown): ImportResult {
  const bad = (error: string): ImportResult => ({ ok: false, error, name: '', graph: EMPTY, dropped: [] });
  if (!isObj(data)) return bad('Le contenu n’est pas un projet du Studio.');
  if (data.format !== FORMAT) return bad('Ce fichier n’est pas un projet NeuronalLogic Studio (champ « format » absent ou différent).');
  if (data.version !== FORMAT_VERSION) return bad(`Version de format non prise en charge : ${String(data.version)}.`);
  if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) return bad('Le projet doit contenir une liste de « nodes » et une liste de « edges ».');
  if (data.nodes.length > LIMITS.nodes) return bad(`Trop de composants (${data.nodes.length}) : la limite est de ${LIMITS.nodes}.`);
  if (data.edges.length > LIMITS.edges) return bad(`Trop de connexions (${data.edges.length}) : la limite est de ${LIMITS.edges}.`);

  const dropped: string[] = [];
  const nodes: SNode[] = [];
  const ids = new Set<string>();
  for (const [k, raw] of (data.nodes as unknown[]).entries()) {
    if (!isObj(raw) || !safeId(raw.id) || typeof raw.component !== 'string') { dropped.push(`Composant n°${k + 1} ignoré : structure invalide.`); continue; }
    const def = componentById.get(raw.component);
    if (!def) { dropped.push(`Composant « ${raw.id} » ignoré : le type « ${String(raw.component).slice(0, 40)} » n’existe pas.`); continue; }
    if (ids.has(raw.id)) { dropped.push(`Composant « ${raw.id} » ignoré : identifiant en double.`); continue; }
    const x = Number(raw.x), y = Number(raw.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > LIMITS.coord || Math.abs(y) > LIMITS.coord) { dropped.push(`Composant « ${raw.id} » ignoré : position invalide.`); continue; }
    const params: Record<string, string | number | boolean> = {};
    if (isObj(raw.params)) {
      for (const p of def.params) {
        const v = raw.params[p.key];
        if (v === undefined) continue;
        if (p.kind === 'number') {
          const nv = Number(v);
          if (Number.isFinite(nv)) params[p.key] = Math.min(p.max ?? 1e9, Math.max(p.min ?? -1e9, nv));
          else dropped.push(`Paramètre « ${p.key} » de « ${raw.id} » ignoré : nombre invalide.`);
        } else if (p.kind === 'bool') {
          if (typeof v === 'boolean') params[p.key] = v;
        } else if (typeof v === 'string') {
          if (p.kind === 'select' && !p.options?.some((o) => o.value === v)) dropped.push(`Paramètre « ${p.key} » de « ${raw.id} » ignoré : valeur inconnue.`);
          else params[p.key] = v.slice(0, LIMITS.paramText);
        }
      }
    }
    ids.add(raw.id);
    nodes.push({ id: raw.id, type: 'block', position: { x, y }, data: { c: def.id, params } });
  }
  const edges: SEdge[] = [];
  const seen = new Set<string>();
  for (const [k, raw] of (data.edges as unknown[]).entries()) {
    if (!isObj(raw) || typeof raw.source !== 'string' || typeof raw.target !== 'string' || typeof raw.sourcePort !== 'string' || typeof raw.targetPort !== 'string') { dropped.push(`Connexion n°${k + 1} ignorée : structure invalide.`); continue; }
    const s = nodes.find((n) => n.id === raw.source), t = nodes.find((n) => n.id === raw.target);
    if (!s || !t) { dropped.push(`Connexion n°${k + 1} ignorée : un composant relié est absent.`); continue; }
    if (!componentById.get(s.data.c)?.outputs.some((p) => p.id === raw.sourcePort) || !componentById.get(t.data.c)?.inputs.some((p) => p.id === raw.targetPort)) { dropped.push(`Connexion n°${k + 1} ignorée : port inexistant.`); continue; }
    const id = edgeId(raw as { source: string; sourcePort: string; target: string; targetPort: string });
    if (seen.has(id)) { dropped.push(`Connexion n°${k + 1} ignorée : doublon.`); continue; }
    seen.add(id);
    const b = isObj(raw.bend) && Number.isFinite(raw.bend.dx) && Number.isFinite(raw.bend.dy) && Math.abs(raw.bend.dx as number) <= LIMITS.coord && Math.abs(raw.bend.dy as number) <= LIMITS.coord ? { dx: Math.round(raw.bend.dx as number), dy: Math.round(raw.bend.dy as number) } : undefined;
    edges.push({ id, source: raw.source, sourceHandle: raw.sourcePort, target: raw.target, targetHandle: raw.targetPort, ...(b ? { bend: b } : {}) });
  }
  const name = typeof data.name === 'string' && data.name.trim() ? data.name.trim().slice(0, LIMITS.nameLength) : 'Projet importé';
  return { ok: true, name, graph: { nodes, edges }, dropped };
}

// ───────────── Stockage local des projets ─────────────

export interface StoredProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  file: ProjectFile;
}

export interface Library {
  version: 1;
  projects: StoredProject[];
  currentId: string | null;
}

export const emptyLibrary = (): Library => ({ version: 1, projects: [], currentId: null });
const newId = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export interface LoadResult {
  library: Library;
  /** Éléments illisibles : conservés dans une copie de sauvegarde (jamais supprimés silencieusement). */
  rescued: number;
}

export function loadLibrary(storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): LoadResult {
  let raw: string | null = null;
  try { raw = storage.getItem(STORAGE_KEY); } catch { return { library: emptyLibrary(), rescued: 0 }; }
  if (!raw) return { library: emptyLibrary(), rescued: 0 };
  const backup = (what: string) => { try { storage.setItem(`${STORAGE_KEY}:rescue:${Date.now()}`, what); } catch { /* stockage plein */ } };
  let data: unknown;
  try { data = JSON.parse(raw); } catch { backup(raw); return { library: emptyLibrary(), rescued: 1 }; }
  if (!isObj(data) || !Array.isArray(data.projects)) { backup(raw); return { library: emptyLibrary(), rescued: 1 }; }
  const projects: StoredProject[] = [];
  let rescued = 0;
  for (const p of data.projects as unknown[]) {
    const v = isObj(p) ? validateProject(p.file) : null;
    if (isObj(p) && v?.ok && typeof p.id === 'string') {
      projects.push({ id: p.id.slice(0, 40), name: v.name, createdAt: String(p.createdAt ?? ''), updatedAt: String(p.updatedAt ?? ''), file: toFile(v.graph, v.name) });
    } else { rescued++; backup(JSON.stringify(p)); }
  }
  const currentId = typeof data.currentId === 'string' && projects.some((p) => p.id === data.currentId) ? data.currentId : projects[0]?.id ?? null;
  return { library: { version: 1, projects: projects.slice(0, LIMITS.projects), currentId }, rescued };
}

export function saveLibrary(lib: Library, storage: Pick<Storage, 'setItem'> = localStorage): boolean {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(lib)); return true; } catch { return false; }
}

export function upsertProject(lib: Library, id: string | null, name: string, g: Graph, now = new Date()): { library: Library; id: string } {
  const file = toFile(g, name);
  const existing = id ? lib.projects.find((p) => p.id === id) : undefined;
  if (existing) {
    return { id: existing.id, library: { ...lib, currentId: existing.id, projects: lib.projects.map((p) => (p.id === existing.id ? { ...p, name: file.name, updatedAt: now.toISOString(), file } : p)) } };
  }
  const created: StoredProject = { id: newId(), name: file.name, createdAt: now.toISOString(), updatedAt: now.toISOString(), file };
  return { id: created.id, library: { ...lib, currentId: created.id, projects: [created, ...lib.projects].slice(0, LIMITS.projects) } };
}

export function duplicateProject(lib: Library, id: string, now = new Date()): { library: Library; id: string } | null {
  const src = lib.projects.find((p) => p.id === id);
  if (!src || lib.projects.length >= LIMITS.projects) return null;
  const copy: StoredProject = { ...src, id: newId(), name: `${src.name} (copie)`.slice(0, LIMITS.nameLength), createdAt: now.toISOString(), updatedAt: now.toISOString(), file: { ...src.file, name: `${src.name} (copie)`.slice(0, LIMITS.nameLength) } };
  return { id: copy.id, library: { ...lib, currentId: copy.id, projects: [copy, ...lib.projects] } };
}

export function deleteProject(lib: Library, id: string): Library {
  const projects = lib.projects.filter((p) => p.id !== id);
  return { ...lib, projects, currentId: lib.currentId === id ? projects[0]?.id ?? null : lib.currentId };
}

export function fileToGraph(f: ProjectFile): Graph {
  const r = validateProject(f);
  return r.graph;
}
