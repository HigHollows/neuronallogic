import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  applyEdgeChanges, applyNodeChanges, Background, BackgroundVariant, Controls, MarkerType, ReactFlow, ReactFlowProvider, SelectionMode, useReactFlow,
  type Connection, type Edge, type EdgeChange, type Node, type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import '../styles/studio.css';
import { Icon } from '../components/Icon';
import { QuizRunner } from '../components/QuizRunner';
import { usePageTitle } from '../components/ui';
import { lessonById } from '../content';
import { quizPassed, STUDIO_QUIZ_ID } from '../lib/credits';
import { REWARDS } from '../lib/creditsConfig';
import { actions, useProgress } from '../lib/progress';
import { check, summarize } from '../studio/checker';
import { CHALLENGES, evaluateChallenge } from '../studio/challenges';
import { connectableSources, connectableTargets, describeEdge, EDGE_KINDS } from '../studio/connections';
import { CATEGORIES, COMPONENTS, componentById } from '../studio/data/components';
import { TEMPLATES, type Template } from '../studio/data/templates';
import { TUTORIAL, TUTORIAL_QUESTIONS } from '../studio/data/tutorial';
import {
  deleteProject, duplicateProject, fileToGraph, LIMITS, loadLibrary, parseProject, saveLibrary, toFile, upsertProject, type Library,
} from '../studio/project';
import { simulate, type SimResult } from '../studio/simulate';
import { studio, useStudio } from '../studio/store';
import type { Graph, Issue, Level, SNode } from '../studio/types';
import { CanvasContext, EDGE_TYPES, EdgeLegend, MiniDiagram, NODE_TYPES, type FlowEdgeData } from '../studio/ui/parts';
import { normalize } from '../lib/text';

type Panel = 'inspect' | 'check' | 'sim' | 'projects' | 'models' | 'challenges';
type View = 'library' | 'canvas' | 'panel';

const PANELS: { id: Panel; label: string }[] = [
  { id: 'inspect', label: 'Inspecteur' },
  { id: 'check', label: 'Vérification' },
  { id: 'sim', label: 'Simulation' },
  { id: 'models', label: 'Modèles' },
  { id: 'challenges', label: 'Défis' },
  { id: 'projects', label: 'Projets' },
];

const LEVEL_LABEL: Record<Level, string> = { error: 'Erreur', warning: 'Avertissement', info: 'Information' };
const sigOf = (g: Graph) => JSON.stringify([g.nodes.map((n) => [n.id, n.data.c, n.data.params]), g.edges.map((e) => e.id)]);
const slug = (s: string) => normalize(s).replace(/\s+/g, '-').slice(0, 40) || 'projet';

// ───────────────────────── Bibliothèque ─────────────────────────

function Library({ onAdd }: { onAdd: (id: string) => void }) {
  const [q, setQ] = useState('');
  const nq = normalize(q);
  const list = COMPONENTS.filter((c) => !nq || normalize(`${c.name} ${c.short} ${c.keywords.join(' ')}`).includes(nq));
  return (
    <section className="slib" aria-labelledby="slib-h">
      <h2 id="slib-h">Bibliothèque</h2>
      <label className="sr-only" htmlFor="slib-q">Rechercher un composant</label>
      <input id="slib-q" type="search" placeholder="Rechercher un composant" value={q} onChange={(e) => setQ(e.target.value)} />
      <p className="muted small" id="slib-help">Fais glisser un composant sur le canevas, ou utilise « Ajouter ».</p>
      {list.length === 0 && <p role="status" className="muted">Aucun composant ne correspond à « {q} ».</p>}
      {CATEGORIES.map((cat) => {
        const items = list.filter((c) => c.category === cat.id);
        if (!items.length) return null;
        return (
          <details key={cat.id} open={!!nq || cat.id === 'io' || cat.id === 'ia'} className="slib-cat">
            <summary>{cat.name} <span className="count">{items.length}</span></summary>
            <ul>
              {items.map((c) => (
                <li key={c.id} className="slib-item" draggable onDragStart={(e) => { e.dataTransfer.setData('application/x-nl-component', c.id); e.dataTransfer.effectAllowed = 'move'; }}>
                  <div className="slib-text">
                    <strong><Icon name={c.icon} size={14} /> {c.name}</strong>
                    <span>{c.short}</span>
                  </div>
                  <button className="btn secondary small" onClick={() => onAdd(c.id)} aria-label={`Ajouter ${c.name}`}>Ajouter</button>
                </li>
              ))}
            </ul>
          </details>
        );
      })}
    </section>
  );
}

// ───────────────────────── Inspecteur ─────────────────────────

function ConnectForm({ node, graph }: { node: SNode; graph: Graph }) {
  const def = componentById.get(node.data.c)!;
  const others = graph.nodes.filter((n) => n.id !== node.id);
  const [out, setOut] = useState(def.outputs[0]?.id ?? '');
  const [target, setTarget] = useState(others[0]?.id ?? '');
  const tNode = graph.nodes.find((n) => n.id === target);
  const tDef = tNode && componentById.get(tNode.data.c);
  const [port, setPort] = useState('');
  useEffect(() => { setOut(def.outputs[0]?.id ?? ''); }, [node.id, def]);
  useEffect(() => { if (!others.some((n) => n.id === target)) setTarget(others[0]?.id ?? ''); }, [others, target]);
  useEffect(() => { setPort(tDef?.inputs[0]?.id ?? ''); }, [tDef]);
  if (!def.outputs.length) return <p className="muted small">Ce composant n’a pas de sortie : on peut seulement lui envoyer des données.</p>;
  if (!others.length) return <p className="muted small">Ajoute un deuxième composant pour pouvoir les relier.</p>;
  return (
    <form className="sform" onSubmit={(e) => { e.preventDefault(); if (out && target && port) studio.connect({ source: node.id, sourceHandle: out, target, targetHandle: port }); }}>
      <label>Depuis la sortie
        <select value={out} onChange={(e) => setOut(e.target.value)}>{def.outputs.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
      </label>
      <label>Vers le composant
        <select value={target} onChange={(e) => setTarget(e.target.value)}>{others.map((n) => <option key={n.id} value={n.id}>{componentById.get(n.data.c)?.name} ({n.id})</option>)}</select>
      </label>
      <label>Entrée
        <select value={port} onChange={(e) => setPort(e.target.value)} disabled={!tDef?.inputs.length}>{(tDef?.inputs ?? []).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
      </label>
      <button className="btn small" type="submit" disabled={!port}>Connecter</button>
    </form>
  );
}

function ParamEditors({ node }: { node: SNode }) {
  const def = componentById.get(node.data.c)!;
  if (!def.params.length) return <p className="muted small">Ce composant n’a pas de paramètre.</p>;
  return (
    <div className="sparams">
      {def.params.map((p) => {
        const val = node.data.params[p.key] ?? p.default;
        const id = `par-${node.id}-${p.key}`;
        return (
          <div key={p.key} className="sparam">
            {p.kind === 'bool' ? (
              <label className="inline"><input type="checkbox" checked={!!val} onChange={(e) => { studio.setParam(node.id, p.key, e.target.checked, false); }} /> {p.label}</label>
            ) : (
              <>
                <label htmlFor={id}>{p.label}{p.required ? ' *' : ''}</label>
                {p.kind === 'select' ? (
                  <select id={id} value={String(val)} onChange={(e) => studio.setParam(node.id, p.key, e.target.value, false)}>{p.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                ) : p.kind === 'number' ? (
                  <input id={id} type="number" value={Number(val)} min={p.min} max={p.max} step="any" onChange={(e) => { const v = e.target.value === '' ? 0 : Number(e.target.value); if (Number.isFinite(v)) studio.setParam(node.id, p.key, v); }} onBlur={() => studio.endParamEdit()} />
                ) : p.kind === 'longtext' ? (
                  <textarea id={id} rows={3} maxLength={LIMITS.paramText} value={String(val)} onChange={(e) => studio.setParam(node.id, p.key, e.target.value)} onBlur={() => studio.endParamEdit()} />
                ) : (
                  <input id={id} type="text" maxLength={LIMITS.paramText} value={String(val)} onChange={(e) => studio.setParam(node.id, p.key, e.target.value)} onBlur={() => studio.endParamEdit()} />
                )}
              </>
            )}
            <span className="muted small">{p.help}</span>
          </div>
        );
      })}
    </div>
  );
}

function Inspector({ graph, onOpenTemplate }: { graph: Graph; onOpenTemplate: (t: Template) => void }) {
  const sel = graph.nodes.filter((n) => n.selected);
  const selEdges = graph.edges.filter((e) => e.selected);
  const [showExample, setShowExample] = useState(false);
  useEffect(() => setShowExample(false), [sel[0]?.id]);

  if (sel.length > 1) {
    return (
      <div>
        <h3>{sel.length} composants sélectionnés</h3>
        <p className="muted">Tu peux les déplacer ensemble, les dupliquer ou les supprimer.</p>
        <div className="row"><button className="btn secondary small" onClick={() => studio.duplicateSelected()}>Dupliquer</button><button className="btn danger small" onClick={() => studio.removeSelected()}>Supprimer la sélection</button></div>
      </div>
    );
  }
  if (sel.length === 0 && selEdges.length === 1) {
    const e = selEdges[0];
    const info = describeEdge(graph, e);
    return (
      <div>
        <h3>Connexion : {EDGE_KINDS[info?.kind ?? 'data'].label}</h3>
        {info ? <p>{info.explanation}</p> : <p className="muted">Connexion invalide : un des ports n’existe plus.</p>}
        <h4>Faire de la place</h4>
        <p className="muted small">Tire le rond au milieu de la connexion pour la déplacer (double-clic : remettre droit), ou utilise ces boutons.</p>
        <div className="row" role="group" aria-label="Décaler le tracé de la connexion">
          <button className="btn secondary small" onClick={() => studio.nudgeBend(e.id, 0, -40)}>↑ Haut</button>
          <button className="btn secondary small" onClick={() => studio.nudgeBend(e.id, 0, 40)}>↓ Bas</button>
          <button className="btn secondary small" onClick={() => studio.nudgeBend(e.id, -40, 0)}>← Gauche</button>
          <button className="btn secondary small" onClick={() => studio.nudgeBend(e.id, 40, 0)}>→ Droite</button>
          <button className="btn secondary small" disabled={!e.bend} onClick={() => studio.resetBend(e.id)}>Remettre droit</button>
        </div>
        <button className="btn danger small" onClick={() => studio.removeEdges([e.id])}>Supprimer la connexion</button>
      </div>
    );
  }
  if (sel.length === 0) {
    return (
      <div>
        <h3>Rien n’est sélectionné</h3>
        <p className="muted">Clique sur un composant pour comprendre son rôle, régler ses paramètres et voir à quoi il peut se relier. Clique sur une connexion pour comprendre ce qu’elle transporte.</p>
        <EdgeLegend />
      </div>
    );
  }
  const node = sel[0];
  const def = componentById.get(node.data.c);
  if (!def) return <p role="alert">Composant inconnu : « {node.data.c} ».</p>;
  const targets = connectableTargets(def.id);
  const sources = connectableSources(def.id);
  const tpl = TEMPLATES.find((t) => t.graph.nodes.some((n) => n.data.c === def.id));
  const lesson = def.lessonId ? lessonById.get(def.lessonId) : undefined;
  return (
    <div className="sinspect">
      <h3><Icon name={def.icon} /> {def.name}</h3>
      <p className="muted small">{CATEGORIES.find((c) => c.id === def.category)?.name} · identifiant {node.id}</p>
      <p>{def.definition}</p>
      <h4>Rôle</h4>
      <p>{def.role}</p>
      <h4>Entrées</h4>
      {def.inputs.length ? <ul>{def.inputs.map((p) => <li key={p.id}><strong>{p.label}</strong>{p.required ? ' (obligatoire)' : ''}</li>)}</ul> : <p className="muted small">Aucune : ce composant démarre un parcours ou fournit un contenu.</p>}
      <h4>Sorties</h4>
      {def.outputs.length ? <ul>{def.outputs.map((p) => <li key={p.id}><strong>{p.label}</strong></li>)}</ul> : <p className="muted small">Aucune : le parcours se termine ici.</p>}
      <h4>Paramètres</h4>
      <ParamEditors node={node} />
      <h4>Connecter à…</h4>
      <ConnectForm node={node} graph={graph} />
      <details>
        <summary>Composants connectables</summary>
        {targets.length ? <ul>{targets.map((t) => <li key={t.from}><strong>{t.from}</strong> → {t.to.length ? t.to.slice(0, 8).join(', ') + (t.to.length > 8 ? '…' : '') : <em>aucun composant compatible</em>}</li>)}</ul> : null}
        {sources.length ? <ul>{sources.map((t) => <li key={t.into}><strong>{t.into}</strong> ← {t.from.length ? t.from.slice(0, 8).join(', ') + (t.from.length > 8 ? '…' : '') : <em>aucun composant compatible</em>}</li>)}</ul> : null}
      </details>
      <h4>Limites</h4>
      <p>{def.limits}</p>
      <div className="row">
        <button className="btn secondary small" aria-expanded={showExample} onClick={() => setShowExample((v) => !v)}>Voir un exemple</button>
        {tpl && <button className="btn secondary small" onClick={() => onOpenTemplate(tpl)}>Ouvrir le modèle « {tpl.name} »</button>}
        <Link className="btn small" to={`/studio/guide/composant/${def.id}`}>Comprendre ce composant</Link>
      </div>
      {showExample && <p className="callout note"><strong>Exemple</strong>{def.example}</p>}
      {lesson && <p className="small">Pour approfondir : <Link to={`/lecon/${lesson.id}`}>{lesson.title}</Link></p>}
      <div className="row"><button className="btn secondary small" onClick={() => studio.duplicateSelected()}>Dupliquer</button><button className="btn danger small" onClick={() => studio.removeSelected()}>Supprimer</button></div>
    </div>
  );
}

// ───────────────────────── Vérification ─────────────────────────

function CheckPanel({ graph, report, onRun, onFocus }: { graph: Graph; report: { issues: Issue[]; sig: string } | null; onRun: () => void; onFocus: (nodeId: string) => void }) {
  const sum = report ? summarize(report.issues) : null;
  const stale = report && report.sig !== sigOf(graph);
  return (
    <div>
      <h3>Vérifier mon architecture</h3>
      <p className="muted">La vérification applique des règles simples sur le schéma. Elle ne prouve pas qu’un système réel fonctionnerait : elle repère des incohérences connues.</p>
      <button className="btn" onClick={onRun}>Lancer la vérification</button>
      {stale && <p role="status" className="callout limit"><strong>Résultat périmé</strong>Le schéma a changé depuis la dernière vérification. Relance-la.</p>}
      {report && sum && (
        <>
          <p className="scheck-sum" role="status">
            <span className="chip err">{sum.errors} erreur(s)</span> <span className="chip warn">{sum.warnings} avertissement(s)</span> <span className="chip info">{sum.infos} information(s)</span>
          </p>
          <ul className="small">
            <li><strong>Structure</strong> (le schéma est-il bien formé ?) : {sum.structureOk ? 'aucun défaut détecté' : 'des défauts sont signalés'}.</li>
            <li><strong>Logique</strong> (l’architecture est-elle cohérente et sûre ?) : {sum.logicOk ? 'aucune incohérence détectée par les règles du Studio' : 'des incohérences sont signalées'}.</li>
            <li><strong>Exécution</strong> : jamais testée en vrai. La simulation illustre un parcours fictif.</li>
          </ul>
          {sum.errors + sum.warnings === 0 && <p className="callout tip"><strong>Aucune erreur ni avertissement</strong>Cela ne veut pas dire que l’architecture est « bonne » : seuls les cas prévus par les règles sont contrôlés. Relis aussi ses limites.</p>}
          {(['error', 'warning', 'info'] as Level[]).map((lvl) => {
            const list = report.issues.filter((i) => i.level === lvl);
            if (!list.length) return null;
            return (
              <section key={lvl} aria-label={`${LEVEL_LABEL[lvl]}s`}>
                <h4>{LEVEL_LABEL[lvl]}s ({list.length})</h4>
                <ul className="issues">
                  {list.map((i, k) => (
                    <li key={`${i.code}-${i.nodeId ?? ''}-${i.edgeId ?? ''}-${k}`} className={`issue ${lvl}`}>
                      <strong>{i.title}</strong> <span className="chip tiny">{i.family === 'structure' ? 'structure' : 'logique'}</span>
                      <p><em>Pourquoi : </em>{i.why}</p>
                      <p><em>Comment corriger : </em>{i.fix}</p>
                      <div className="row">
                        {i.nodeId && <button className="btn secondary small" onClick={() => onFocus(i.nodeId!)}>Voir le composant</button>}
                        <Link className="small" to={`/studio/guide/${i.doc ?? 'depannage'}`}>En savoir plus</Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}

// ───────────────────────── Simulation ─────────────────────────

function SimPanel({ graph, sim, idx, playing, setIdx, setPlaying, onRun }: {
  graph: Graph; sim: SimResult | null; idx: number; playing: boolean; setIdx: (n: number) => void; setPlaying: (b: boolean) => void; onRun: () => void;
}) {
  const step = sim && idx >= 0 ? sim.steps[idx] : undefined;
  return (
    <div>
      <h3>Simulation pas à pas</h3>
      <p className="callout limit"><strong>Données fictives</strong>La simulation illustre le parcours des données avec des valeurs inventées par le Studio. Aucun modèle d’IA réel n’est appelé, aucune clé d’API n’est nécessaire, rien ne quitte ton navigateur.</p>
      <button className="btn" onClick={onRun} disabled={graph.nodes.length === 0}>{sim ? 'Relancer la simulation' : 'Lancer la simulation'}</button>
      {sim && (
        <>
          <p role="status" className={`callout ${sim.status === 'ok' ? 'tip' : 'limit'}`}><strong>{sim.status === 'ok' ? 'Parcours complet' : sim.status === 'impossible' ? 'Simulation impossible' : 'Parcours incomplet'}</strong>{sim.message}</p>
          {sim.steps.length > 0 && (
            <div className="row" role="group" aria-label="Commandes de la simulation">
              <button className="btn secondary small" onClick={() => { setPlaying(false); setIdx(Math.max(0, idx - 1)); }} disabled={idx <= 0}>Étape précédente</button>
              <button className="btn secondary small" onClick={() => setPlaying(!playing)} aria-pressed={playing}>{playing ? 'Pause' : idx >= sim.steps.length - 1 ? 'Rejouer' : 'Lecture automatique'}</button>
              <button className="btn small" onClick={() => { setPlaying(false); setIdx(Math.min(sim.steps.length - 1, idx + 1)); }} disabled={idx >= sim.steps.length - 1}>Étape suivante</button>
            </div>
          )}
          {step && (
            <article className="sstep" aria-live="polite">
              <h4>Étape {step.index} sur {sim.steps.length} — {step.nodeName}</h4>
              <p><strong>Ce qui se passe :</strong> {step.action}</p>
              {step.inputs.length > 0 && <p><strong>Reçoit :</strong> {step.inputs.map((i) => `${i.port} — « ${i.text} »`).join(' ; ')}</p>}
              {step.outputs.length > 0 && <p><strong>Envoie :</strong> {step.outputs.map((o) => `${o.port} — « ${o.text} » → ${o.to.length ? o.to.join(', ') : 'nulle part'}`).join(' ; ')}</p>}
              {step.note && <p className="muted small">{step.note}</p>}
              {step.error && <p role="alert" className="callout warning"><strong>Problème</strong>{step.error}</p>}
            </article>
          )}
          {sim.finals.length > 0 && idx >= sim.steps.length - 1 && <p><strong>Résultat affiché (fictif) :</strong> « {sim.finals.map((f) => f.text).join(' / ')} »</p>}
          {sim.waiting.length > 0 && <ul className="small">{sim.waiting.map((w) => <li key={w}>{w}</li>)}</ul>}
        </>
      )}
    </div>
  );
}

// ───────────────────────── Modèles, défis, projets ─────────────────────────

function ModelsPanel({ onOpen }: { onOpen: (t: Template) => void }) {
  return (
    <div>
      <h3>Architectures modèles</h3>
      <p className="muted">Chaque modèle s’ouvre dans un nouveau projet : ton travail en cours est conservé.</p>
      <ul className="smodels">
        {TEMPLATES.map((t) => (
          <li key={t.id} className="smodel">
            <MiniDiagram graph={t.graph} label={`Aperçu du schéma « ${t.name} » : ${t.graph.nodes.length} composants et ${t.graph.edges.length} connexions`} />
            <h4>{t.name}</h4>
            <p><strong>Objectif :</strong> {t.objective}</p>
            <p><strong>Parcours :</strong> {t.path}</p>
            <p><strong>Limites :</strong> {t.limits}</p>
            {t.exercise && <p className="callout tip"><strong>Exercice</strong>{t.exercise}</p>}
            <div className="row">
              <button className="btn small" onClick={() => onOpen(t)}>Ouvrir ce modèle</button>
              {t.docs.map((d) => <Link key={d} className="small" to={`/studio/guide/${d}`}>{d.startsWith('composant/') ? 'Guide du composant' : d === 'depannage' ? 'Dépannage' : 'Guide associé'}</Link>)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChallengesPanel({ graph, onStart }: { graph: Graph; onStart: (templateId: string) => void }) {
  const progress = useProgress();
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  return (
    <div>
      <h3>Défis guidés</h3>
      <p className="muted">Chaque défi est vérifié sur ton schéma actuel, avec des critères précis : un simple clic ne valide rien. {REWARDS.studio} crédits par défi, une seule fois.</p>
      <ul className="smodels">
        {CHALLENGES.map((c) => {
          const res = evaluateChallenge(c, graph);
          const done = progress.studio.done[c.id];
          return (
            <li key={c.id} className="smodel">
              <h4>{c.title} {done && <span className="chip ok">Réussi</span>}</h4>
              <p>{c.brief}</p>
              <ul className="criteria" aria-label={`Critères du défi ${c.title}`}>
                {res.results.map((r) => <li key={r.text} className={r.ok ? 'ok' : 'ko'}><span aria-hidden="true">{r.ok ? '✓' : '○'}</span> {r.text}<span className="sr-only">{r.ok ? ' — rempli' : ' — pas encore rempli'}</span></li>)}
              </ul>
              <div className="row">
                {c.starter && <button className="btn secondary small" onClick={() => onStart(c.starter!)}>Partir du modèle</button>}
                <button className="btn small" disabled={!!done} onClick={() => {
                  const r = actions.completeStudioChallenge(c.id, graph);
                  setFeedback((f) => ({ ...f, [c.id]: r.ok ? (r.added.length ? `Défi réussi : +${r.added.reduce((n, e) => n + e.credits, 0)} crédits.` : 'Défi déjà réussi : aucun crédit supplémentaire.') : `Pas encore. Il manque : ${r.failed.join(' ')}` }));
                }}>{done ? 'Déjà validé' : 'Valider mon schéma'}</button>
                <Link className="small" to={`/studio/guide/${c.doc}`}>Guide associé</Link>
              </div>
              {feedback[c.id] && <p role="status">{feedback[c.id]}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ProjectsPanel({ lib, current, onOpen, onDuplicate, onAskDelete, onExport, onImport, onSave, importReport }: {
  lib: Library; current: string | null; onOpen: (id: string) => void; onDuplicate: (id: string) => void; onAskDelete: (id: string) => void;
  onExport: () => void; onImport: (file: File) => void; onSave: () => void; importReport: string[];
}) {
  const st = useStudio();
  return (
    <div>
      <h3>Projets</h3>
      <p className="callout limit"><strong>Stockage dans ce navigateur</strong>Tes projets sont enregistrés uniquement sur cet appareil. Ils disparaissent si tu effaces les données du site. Exporte un fichier pour les conserver ailleurs.</p>
      <label htmlFor="proj-name">Nom du projet</label>
      <input id="proj-name" type="text" maxLength={LIMITS.nameLength} value={st.name} onChange={(e) => studio.rename(e.target.value)} />
      <div className="row">
        <button className="btn small" onClick={onSave}>Enregistrer</button>
        <button className="btn secondary small" onClick={onExport}>Exporter en JSON</button>
        <label className="btn secondary small filebtn">Importer un fichier
          <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ''; }} />
        </label>
      </div>
      {importReport.length > 0 && <div role="status" className="callout limit"><strong>Éléments ignorés à l’import</strong><ul>{importReport.slice(0, 10).map((r) => <li key={r}>{r}</li>)}</ul>{importReport.length > 10 && <p>… et {importReport.length - 10} autre(s).</p>}</div>}
      <h4>Mes projets ({lib.projects.length} / {LIMITS.projects})</h4>
      {lib.projects.length === 0 ? <p className="muted">Aucun projet enregistré pour l’instant. Ton travail est enregistré automatiquement dès que tu modifies le canevas.</p> : (
        <ul className="sprojects">
          {lib.projects.map((p) => (
            <li key={p.id}>
              <div><strong>{p.name}</strong>{p.id === current && <span className="chip ok"> ouvert</span>}<br /><span className="muted small">{p.file.nodes.length} composants · {p.file.edges.length} connexions · {p.updatedAt.slice(0, 10)}</span></div>
              <div className="row">
                <button className="btn secondary small" onClick={() => onOpen(p.id)} disabled={p.id === current} aria-label={`Ouvrir ${p.name}`}>Ouvrir</button>
                <button className="btn secondary small" onClick={() => onDuplicate(p.id)} aria-label={`Dupliquer ${p.name}`}>Dupliquer</button>
                <button className="btn danger small" onClick={() => onAskDelete(p.id)} aria-label={`Supprimer ${p.name}`}>Supprimer</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── Tutoriel ─────────────────────────

function Coach({ graph }: { graph: Graph }) {
  const progress = useProgress();
  const st = useStudio();
  const tut = progress.studio.tutorial;
  const [hint, setHint] = useState(false);
  const [fold, setFold] = useState(() => typeof window !== 'undefined' && window.innerHeight < 820);
  const step = Math.min(tut.step, TUTORIAL.length - 1);
  const cur = TUTORIAL[step];

  // Chaque étape est validée par une action réellement détectée sur le diagramme.
  useEffect(() => {
    if (tut.status !== 'running' || step >= TUTORIAL.length - 1) return;
    if (cur.done(graph, st.flags)) {
      actions.setTutorial('running', step + 1);
      setHint(false);
    }
  }, [tut.status, step, cur, graph, st.flags]);

  if (tut.status === 'none') {
    return (
      <div className="coach" role="region" aria-label="Tutoriel">
        <p><strong>Première visite ?</strong> Un tutoriel de 7 étapes t’apprend à construire ton premier schéma ({REWARDS.studio} crédits à la fin, une seule fois).</p>
        <div className="row"><button className="btn small" onClick={() => actions.setTutorial('running', 0)}>Commencer le tutoriel</button><button className="btn secondary small" onClick={() => actions.setTutorial('skipped', 0)}>Plus tard</button></div>
      </div>
    );
  }
  if (tut.status === 'skipped' || tut.status === 'done') return null;
  if (tut.status === 'paused') {
    return (
      <div className="coach" role="region" aria-label="Tutoriel">
        <p>Tutoriel en pause à l’étape {step + 1} sur {TUTORIAL.length}.</p>
        <div className="row"><button className="btn small" onClick={() => actions.setTutorial('running', step)}>Reprendre</button><button className="btn secondary small" onClick={() => actions.setTutorial('skipped', 0)}>Abandonner</button></div>
      </div>
    );
  }
  const last = step === TUTORIAL.length - 1;
  return (
    <div className="coach" role="region" aria-label="Tutoriel">
      <p className="muted small">Étape {step + 1} sur {TUTORIAL.length} <button className="linkbtn" aria-expanded={!fold} onClick={() => setFold((f) => !f)}>{fold ? 'Afficher l’explication' : 'Réduire l’explication'}</button></p>
      <h2>{cur.title}</h2>
      <p><strong>À faire :</strong> {cur.task}</p>
      {!fold && <p className="small">{cur.explain}</p>}
      {!last && hint && <p className="callout note small"><strong>Indice</strong>{cur.hint}</p>}
      {last && (
        <>
          <QuizRunner key="studio-tuto" quizId={STUDIO_QUIZ_ID} title="Vérifier ta compréhension" questions={TUTORIAL_QUESTIONS} compact />
          <button className="btn" disabled={!quizPassed(progress, STUDIO_QUIZ_ID)} onClick={() => actions.setTutorial('done', TUTORIAL.length)}>Terminer le tutoriel</button>
        </>
      )}
      <div className="row">
        {!last && <button className="btn secondary small" onClick={() => setHint((h) => !h)} aria-expanded={hint}>{hint ? 'Masquer l’indice' : 'J’ai besoin d’aide'}</button>}
        {step > 0 && <button className="btn secondary small" onClick={() => actions.setTutorial('running', step - 1)}>Étape précédente</button>}
        <button className="btn secondary small" onClick={() => actions.setTutorial('paused', step)}>Pause</button>
        <button className="btn secondary small" onClick={() => actions.setTutorial('skipped', 0)}>Passer le tutoriel</button>
      </div>
    </div>
  );
}

// ───────────────────────── Page ─────────────────────────

export function StudioPage() {
  return (
    <ReactFlowProvider>
      <StudioInner />
    </ReactFlowProvider>
  );
}

interface Confirm { text: string; label: string; yes: () => void }

function StudioInner() {
  usePageTitle('Studio IA');
  const st = useStudio();
  const progress = useProgress();
  const rf = useReactFlow();
  const [loaded] = useState(() => loadLibrary());
  const rescued = loaded.rescued;
  const [lib, setLib] = useState<Library>(loaded.library);
  const [params, setParams] = useSearchParams();
  const libRef = useRef(lib);
  libRef.current = lib;
  const [panel, setPanel] = useState<Panel>('inspect');
  const [view, setView] = useState<View>('canvas');
  const [report, setReport] = useState<{ issues: Issue[]; sig: string } | null>(null);
  const [sim, setSim] = useState<SimResult | null>(null);
  const [simIdx, setSimIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [importReport, setImportReport] = useState<string[]>([]);
  const [saveNote, setSaveNote] = useState('');
  const [fit, setFit] = useState(0);
  const [animate, setAnimate] = useState(() => !(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches));
  const [hideLib, setHideLib] = useState(false);
  const [hidePanel, setHidePanel] = useState(false);

  // Les messages d'information disparaissent seuls (les refus restent jusqu'à fermeture).
  useEffect(() => {
    if (st.message?.kind !== 'info') return;
    const t = setTimeout(() => studio.clearMessage(), 6000);
    return () => clearTimeout(t);
  }, [st.message]);

  const graph: Graph = useMemo(() => ({ nodes: st.nodes, edges: st.edges }), [st.nodes, st.edges]);
  const sel = st.nodes.filter((n) => n.selected);

  // Ouvre le dernier projet à l'arrivée sur la page (une seule fois).
  const booted = useRef(false);
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const s = studio.get();
    if (s.projectId || s.nodes.length) return;
    const p = libRef.current.projects.find((x) => x.id === libRef.current.currentId);
    if (p) { studio.load(fileToGraph(p.file), p.name, p.id); setFit((n) => n + 1); }
  }, []);

  useEffect(() => { if (fit > 0) { const t = setTimeout(() => rf.fitView({ padding: 0.2, maxZoom: 1 }), 60); return () => clearTimeout(t); } }, [fit, rf]);

  // Le Guide propose « Ouvrir ce schéma dans le Studio » : /studio?modele=<id>
  const wanted = params.get('modele');
  const persist = useCallback((id: string | null, name: string, g: Graph): string | null => {
    const cur = libRef.current;
    if (!id && cur.projects.length >= LIMITS.projects) {
      studio.setMessage({ kind: 'refus', text: `Limite atteinte : ${LIMITS.projects} projets enregistrés au maximum.`, fix: 'Exporte puis supprime un projet dans l’onglet « Projets » : le Studio ne supprime jamais rien sans te le demander.' });
      return null;
    }
    const r = upsertProject(cur, id, name, g);
    libRef.current = r.library;
    setLib(r.library);
    if (!saveLibrary(r.library)) { setSaveNote('Enregistrement impossible : le stockage du navigateur est plein ou désactivé. Exporte ton projet en JSON.'); return r.id; }
    setSaveNote('');
    studio.markSaved(r.id);
    return r.id;
  }, []);

  // Enregistrement automatique (différé) à chaque modification.
  useEffect(() => {
    if (!st.dirty) return;
    const t = setTimeout(() => { if (studio.get().nodes.length || studio.get().projectId) persist(studio.get().projectId, studio.get().name, studio.graph()); }, 600);
    return () => clearTimeout(t);
  }, [st.dirty, st.nodes, st.edges, st.name, persist]);

  const flush = useCallback(() => { const s = studio.get(); if (s.dirty && (s.nodes.length || s.projectId)) persist(s.projectId, s.name, studio.graph()); }, [persist]);


  const openTemplate = useCallback((t: Template) => {
    const g = structuredClone(t.graph);
    flush();
    studio.load(g, t.name, null);
    const id = persist(null, t.name, g);
    if (id) studio.markSaved(id);
    setReport(null); setSim(null); setPlaying(false); setImportReport([]);
    setFit((n) => n + 1);
    setPanel('models'); setView('canvas');
    studio.setMessage({ kind: 'info', text: `Modèle « ${t.name} » ouvert dans un nouveau projet. Lis son objectif dans l’onglet « Modèles », puis vérifie ou simule.` });
  }, [flush, persist]);

  useEffect(() => {
    if (!wanted) return;
    const t = TEMPLATES.find((x) => x.id === wanted);
    setParams({}, { replace: true });
    if (t) openTemplate(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted]);

  // Simulation automatique (lecture).
  useEffect(() => {
    if (!playing || !sim) return;
    if (simIdx >= sim.steps.length - 1) { setPlaying(false); return; }
    const t = setTimeout(() => setSimIdx((i) => i + 1), 1400);
    return () => clearTimeout(t);
  }, [playing, simIdx, sim]);

  // ── Rapport de vérification et blocs signalés ──
  const levels = useMemo(() => {
    const m = new Map<string, Level>();
    const rank: Record<Level, number> = { error: 3, warning: 2, info: 1 };
    if (report && report.sig === sigOf(graph)) for (const i of report.issues) if (i.nodeId && i.level !== 'info' && (!m.has(i.nodeId) || rank[i.level] > rank[m.get(i.nodeId)!])) m.set(i.nodeId, i.level);
    return m;
  }, [report, graph]);
  const step = sim && sim.steps[simIdx];
  const activeNodes = useMemo(() => new Set(step && panel === 'sim' ? [step.nodeId] : []), [step, panel]);
  const activeEdges = useMemo(() => new Set(step && panel === 'sim' ? step.edgeIds : []), [step, panel]);
  const badEdges = useMemo(() => new Set(report && report.sig === sigOf(graph) ? report.issues.filter((i) => i.edgeId && i.level === 'error').map((i) => i.edgeId!) : []), [report, graph]);

  const selIds = useMemo(() => new Set(st.nodes.filter((n) => n.selected).map((n) => n.id)), [st.nodes]);
  const flowEdges: Edge[] = useMemo(() => st.edges.map((e) => {
    const info = describeEdge(graph, e);
    const kind = EDGE_KINDS[info?.kind ?? 'data'];
    const bad = badEdges.has(e.id);
    const touches = selIds.has(e.source) || selIds.has(e.target);
    const data: FlowEdgeData = { kind: info?.kind ?? 'data', color: bad ? '#c0392b' : kind.color, width: kind.width, dash: kind.dash, animate, dim: selIds.size > 0 && !touches && !e.selected, hot: activeEdges.has(e.id) || !!e.selected || touches, label: kind.label, bend: e.bend };
    return {
      id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle, selected: e.selected, type: 'flow', data,
      ariaLabel: `Connexion ${kind.label} de ${info?.from ?? e.source} (${info?.fromPort ?? e.sourceHandle}) vers ${info?.to ?? e.target} (${info?.toPort ?? e.targetHandle})`,
      markerEnd: { type: MarkerType.ArrowClosed, color: data.color, width: 16, height: 16 },
    };
  }), [st.edges, graph, activeEdges, badEdges, animate, selIds]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const keep = changes.filter((c) => c.type !== 'remove');
    if (keep.length) { const s = studio.get(); studio.applyView(applyNodeChanges(keep, s.nodes as unknown as Node[]) as unknown as SNode[], s.edges); }
  }, []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    const keep = changes.filter((c) => c.type !== 'remove');
    if (keep.length) { const s = studio.get(); studio.applyView(s.nodes, applyEdgeChanges(keep, s.edges as unknown as Edge[]) as unknown as typeof s.edges); }
  }, []);
  const onConnect = useCallback((c: Connection) => {
    if (c.source && c.target && c.sourceHandle && c.targetHandle) studio.connect({ source: c.source, sourceHandle: c.sourceHandle, target: c.target, targetHandle: c.targetHandle });
  }, []);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('application/x-nl-component');
    if (!id) return;
    const pos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    studio.addNode(id, { x: Math.round(pos.x - 115), y: Math.round(pos.y - 20) });
  };

  const addFromLibrary = (id: string) => {
    const c = rf.getViewport();
    const el = document.querySelector('.studio-canvas')?.getBoundingClientRect();
    const cx = el ? (el.width / 2 - c.x) / c.zoom : 120;
    const cy = el ? (el.height / 3 - c.y) / c.zoom : 80;
    const k = studio.get().nodes.length % 6;
    studio.addNode(id, { x: Math.round(cx - 115 + k * 24), y: Math.round(cy + k * 24) });
    setPanel('inspect'); setView('canvas');
  };

  const focusNode = (id: string) => {
    studio.select([id], []);
    setPanel('inspect'); setView('canvas');
    const n = studio.get().nodes.find((x) => x.id === id);
    if (n) rf.setCenter(n.position.x + 115, n.position.y + 40, { zoom: Math.max(rf.getZoom(), 0.9), duration: 0 });
  };

  const runCheck = () => { const g = studio.graph(); setReport({ issues: check(g), sig: sigOf(g) }); setPanel('check'); setView('panel'); };
  const runSim = () => {
    const r = simulate(studio.graph());
    setSim(r); setSimIdx(0); setPlaying(false); setPanel('sim'); setView('panel');
    if (r.status === 'ok') studio.setFlag('simulated');
  };

  const exportJson = () => {
    const s = studio.get();
    const blob = new Blob([JSON.stringify(toFile(studio.graph(), s.name), null, 2)], { type: 'application/json' });
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${slug(s.name)}.studio.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      studio.setMessage({ kind: 'info', text: 'Projet exporté : garde ce fichier pour le réimporter plus tard, sur cet appareil ou un autre.' });
    } catch { studio.setMessage({ kind: 'refus', text: 'Export impossible dans ce navigateur.' }); }
  };

  const importFile = (file: File) => {
    if (file.size > LIMITS.fileBytes) { studio.setMessage({ kind: 'refus', text: `Fichier trop volumineux (maximum ${Math.round(LIMITS.fileBytes / 1000)} Ko).`, fix: 'Vérifie que c’est bien un export du Studio.' }); return; }
    const reader = new FileReader();
    reader.onerror = () => studio.setMessage({ kind: 'refus', text: 'Le fichier n’a pas pu être lu.' });
    reader.onload = () => {
      const r = parseProject(String(reader.result ?? ''));
      if (!r.ok) { studio.setMessage({ kind: 'refus', text: `Import refusé. ${r.error ?? ''}`, fix: 'Choisis un fichier exporté depuis le Studio (format .studio.json).' }); return; }
      flush();
      studio.load(r.graph, r.name, null);
      const id = persist(null, r.name, r.graph);
      if (id) studio.markSaved(id);
      setImportReport(r.dropped);
      setReport(null); setSim(null); setFit((n) => n + 1);
      studio.setMessage({ kind: 'info', text: `Projet « ${r.name} » importé dans un nouveau projet${r.dropped.length ? ` (${r.dropped.length} élément(s) invalide(s) ignoré(s))` : ''}.` });
    };
    reader.readAsText(file);
  };

  const newProject = () => {
    flush();
    studio.reset('Nouveau projet');
    const next = { ...libRef.current, currentId: null };
    libRef.current = next; setLib(next); saveLibrary(next);
    setReport(null); setSim(null); setImportReport([]);
    studio.setMessage({ kind: 'info', text: 'Nouveau projet vide. L’ancien est resté enregistré dans l’onglet « Projets ».' });
  };

  const openProject = (id: string) => {
    const p = libRef.current.projects.find((x) => x.id === id);
    if (!p) return;
    flush();
    const next = { ...libRef.current, currentId: id };
    libRef.current = next; setLib(next); saveLibrary(next);
    studio.load(fileToGraph(p.file), p.name, p.id);
    setReport(null); setSim(null); setFit((n) => n + 1);
  };

  const dupProject = (id: string) => {
    const r = duplicateProject(libRef.current, id);
    if (!r) { studio.setMessage({ kind: 'refus', text: `Impossible de dupliquer : limite de ${LIMITS.projects} projets atteinte.` }); return; }
    libRef.current = r.library; setLib(r.library); saveLibrary(r.library);
    openProject(r.id);
  };

  const removeProject = (id: string) => {
    const next = deleteProject(libRef.current, id);
    libRef.current = next; setLib(next); saveLibrary(next);
    if (studio.get().projectId === id) { studio.reset('Nouveau projet'); }
    studio.setMessage({ kind: 'info', text: 'Projet supprimé.' });
  };

  const onKey = (e: React.KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) studio.redo(); else studio.undo(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); studio.redo(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); studio.duplicateSelected(); }
  };

  const tutRunning = progress.studio.tutorial.status;
  const canUndo = st.past.length > 0;
  const canRedo = st.future.length > 0;

  return (
    <div className="studio" onKeyDown={onKey}>
      <div className="studio-top">
        <h1>Studio IA <span className="muted">— construire pour comprendre</span></h1>
        <div className="studio-toolbar" role="toolbar" aria-label="Outils du Studio">
          <button className="btn secondary small" onClick={() => setConfirm({ text: 'Créer un nouveau projet vide ? Le projet actuel reste enregistré.', label: 'Nouveau projet', yes: newProject })}>Nouveau</button>
          <button className="btn secondary small" onClick={() => { flush(); if (!st.nodes.length && !st.projectId) { setSaveNote('Rien à enregistrer pour l’instant.'); } else if (persist(st.projectId, st.name, graph)) setSaveNote(`Projet « ${st.name} » enregistré dans ce navigateur.`); }}>Enregistrer</button>
          <button className="btn secondary small" onClick={() => studio.undo()} disabled={!canUndo} aria-label="Annuler (Ctrl+Z)">↶ Annuler</button>
          <button className="btn secondary small" onClick={() => studio.redo()} disabled={!canRedo} aria-label="Rétablir (Ctrl+Y)">↷ Rétablir</button>
          <button className="btn secondary small" onClick={() => { studio.autoLayout(); setFit((n) => n + 1); }} disabled={!st.nodes.length}>Réorganiser</button>
          <button className="btn small" onClick={runCheck}>Vérifier</button>
          <button className="btn small" onClick={runSim}>Simuler</button>
          <button className="btn secondary small" onClick={() => actions.setTutorial('running', 0)}>{tutRunning === 'running' ? 'Relancer le tutoriel' : 'Tutoriel'}</button>
          <button className="btn secondary small" aria-pressed={animate} onClick={() => setAnimate((v) => !v)}>Animations : {animate ? 'oui' : 'non'}</button>
          <button className="btn secondary small view-toggle" aria-pressed={hideLib} onClick={() => { setHideLib((v) => !v); setFit((n) => n + 1); }}>{hideLib ? 'Afficher' : 'Masquer'} la bibliothèque</button>
          <button className="btn secondary small view-toggle" aria-pressed={hidePanel} onClick={() => { setHidePanel((v) => !v); setFit((n) => n + 1); }}>{hidePanel ? 'Afficher' : 'Masquer'} le panneau</button>
          <Link className="btn secondary small" to="/studio/guide">Documentation</Link>
          <button className="btn secondary small" onClick={exportJson}>Exporter</button>
          <button className="btn danger small" disabled={!st.nodes.length} onClick={() => setConfirm({ text: 'Effacer tout le canevas ? Tu pourras annuler cette action juste après.', label: 'Effacer le canevas', yes: () => studio.clear() })}>Effacer</button>
        </div>
        <div className="studio-name"><span className="muted small">Projet : </span><strong>{st.name}</strong>{st.dirty ? <span className="muted small"> · modifications en cours d’enregistrement</span> : st.projectId ? <span className="muted small"> · enregistré</span> : null}</div>
        {saveNote && <p role="status" className="small">{saveNote}</p>}
        {rescued > 0 && <p className="callout limit">Des projets illisibles ont été mis de côté sans être supprimés.</p>}
        {confirm && (
          <div role="alertdialog" aria-label={confirm.label} className="callout limit sconfirm">
            <p>{confirm.text}</p>
            <div className="row"><button className="btn danger small" onClick={() => { const c = confirm; setConfirm(null); c.yes(); }}>{confirm.label}</button><button className="btn secondary small" onClick={() => setConfirm(null)}>Annuler</button></div>
          </div>
        )}
        {st.message && (
          <div className={`smsg ${st.message.kind}`} role={st.message.kind === 'refus' ? 'alert' : 'status'}>
            <span>{st.message.text}{st.message.fix ? <> <strong>Comment corriger :</strong> {st.message.fix}</> : null}</span>
            <button className="gh-icon-btn" onClick={() => studio.clearMessage()} aria-label="Fermer le message">×</button>
          </div>
        )}
        <Coach graph={graph} />
        <div className="studio-views" role="tablist" aria-label="Zone affichée (petits écrans)">
          {(['library', 'canvas', 'panel'] as View[]).map((v) => <button key={v} role="tab" aria-selected={view === v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>{v === 'library' ? 'Composants' : v === 'canvas' ? 'Canevas' : 'Panneau'}</button>)}
        </div>
      </div>

      <div className={`studio-body view-${view}${hideLib ? ' no-lib' : ''}${hidePanel ? ' no-panel' : ''}`}>
        <div className="studio-left"><Library onAdd={addFromLibrary} /></div>
        <div className="studio-canvas" onDrop={onDrop} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }} aria-label="Canevas du Studio">
          <CanvasContext.Provider value={{ levels, active: activeNodes }}>
            <ReactFlow
              nodes={st.nodes as unknown as Node[]}
              edges={flowEdges}
              nodeTypes={NODE_TYPES}
              edgeTypes={EDGE_TYPES}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              isValidConnection={() => true}
              onNodeDragStart={() => studio.beginGesture()}
              onNodeDragStop={() => studio.endGesture()}
              onNodesDelete={(ns) => studio.removeNodes(ns.map((n) => n.id))}
              onEdgesDelete={(es) => { const have = new Set(studio.get().edges.map((e) => e.id)); studio.removeEdges(es.map((e) => e.id).filter((id) => have.has(id))); }}
              onMoveStart={(ev) => { if (ev) studio.setFlag('viewport'); }}
              onPaneClick={() => studio.select([], [])}
              fitView
              fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
              minZoom={0.2}
              maxZoom={2}
              selectionOnDrag
              panOnDrag={[1, 2]}
              selectionMode={SelectionMode.Partial}
              multiSelectionKeyCode="Shift"
              deleteKeyCode={['Backspace', 'Delete']}
              proOptions={{ hideAttribution: true }}
              aria-label="Schéma d’architecture"
            >
              <Background variant={BackgroundVariant.Lines} gap={28} color="var(--grid)" />
              <Controls showInteractive={false} onZoomIn={() => studio.setFlag('viewport')} onZoomOut={() => studio.setFlag('viewport')} onFitView={() => studio.setFlag('viewport')} />
            </ReactFlow>
          </CanvasContext.Provider>
          {st.nodes.length === 0 && (
            <div className="studio-empty">
              <p><strong>Le canevas est vide.</strong></p>
              <p className="muted">Ajoute un composant depuis la bibliothèque, ou ouvre un modèle.</p>
              <button className="btn small" onClick={() => { setPanel('models'); setView('panel'); }}>Voir les architectures modèles</button>
            </div>
          )}
          <EdgeLegend />
        </div>
        <aside className="studio-right" aria-label="Panneau latéral">
          <div role="tablist" aria-label="Panneaux" className="studio-tabs">
            {PANELS.map((p) => <button key={p.id} role="tab" aria-selected={panel === p.id} id={`tab-${p.id}`} aria-controls="studio-panel" className={panel === p.id ? 'on' : ''} onClick={() => setPanel(p.id)}>{p.label}</button>)}
          </div>
          <div id="studio-panel" role="tabpanel" aria-labelledby={`tab-${panel}`} className="studio-panel">
            {panel === 'inspect' && <Inspector graph={graph} onOpenTemplate={openTemplate} />}
            {panel === 'check' && <CheckPanel graph={graph} report={report} onRun={runCheck} onFocus={focusNode} />}
            {panel === 'sim' && <SimPanel graph={graph} sim={sim} idx={simIdx} playing={playing} setIdx={setSimIdx} setPlaying={setPlaying} onRun={runSim} />}
            {panel === 'models' && <ModelsPanel onOpen={openTemplate} />}
            {panel === 'challenges' && <ChallengesPanel graph={graph} onStart={(id) => { const t = TEMPLATES.find((x) => x.id === id); if (t) openTemplate(t); }} />}
            {panel === 'projects' && <ProjectsPanel lib={lib} current={st.projectId} onOpen={openProject} onDuplicate={dupProject} onSave={() => { flush(); setSaveNote('Projet enregistré dans ce navigateur.'); }} onExport={exportJson} onImport={importFile} importReport={importReport}
              onAskDelete={(id) => { const p = lib.projects.find((x) => x.id === id); setConfirm({ text: `Supprimer définitivement le projet « ${p?.name ?? ''} » de ce navigateur ? Exporte-le d’abord si tu veux le garder.`, label: 'Supprimer le projet', yes: () => removeProject(id) }); }} />}
          </div>
        </aside>
      </div>
      <p className="sr-only" role="status">{sel.length} composant(s) sélectionné(s), {st.nodes.length} au total.</p>
    </div>
  );
}
