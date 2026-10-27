import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../components/ui';
import { buildPrompt, checkJson, estimateTokens, promptAdvice, windowShare, type PromptParts } from '../lib/atelier';

const WINDOWS = [4_000, 8_000, 32_000, 128_000, 200_000];
const EMPTY: PromptParts = { role: '', objective: '', context: '', inputs: '', constraints: '', format: '' };

function Tokens() {
  const [text, setText] = useState('');
  const [win, setWin] = useState(8_000);
  const e = estimateTokens(text);
  return (
    <section aria-labelledby="t-tokens" className="panel">
      <h2 id="t-tokens" style={{ marginTop: 0 }}>Estimer des tokens</h2>
      <p className="muted small">
        Estimation <strong>grossière</strong> (1 token pour 3 à 4,5 caractères) : ce n’est pas un vrai tokenizer, l’écart avec la réalité peut être important. Pour un décompte exact, utilise l’outil du fournisseur (voir <Link to="/lecon/l-llm">la leçon sur les LLM</Link>). Ton texte reste sur cet écran.
      </p>
      <label htmlFor="tok-text" className="small muted">Texte à mesurer</label>
      <textarea id="tok-text" value={text} onChange={(ev) => setText(ev.target.value)} />
      <div className="stat-grid">
        <div className="stat"><b>{e.chars}</b><span>caractères</span></div>
        <div className="stat"><b>{e.words}</b><span>mots</span></div>
        <div className="stat"><b>{e.low} – {e.high}</b><span>tokens (estimation)</span></div>
      </div>
      <div className="f" style={{ maxWidth: 260 }}>
        <label htmlFor="tok-win" className="small muted">Fenêtre de contexte à comparer</label>
        <select id="tok-win" value={win} onChange={(ev) => setWin(Number(ev.target.value))}>
          {WINDOWS.map((w) => <option key={w} value={w}>{w.toLocaleString('fr-FR')} tokens</option>)}
        </select>
      </div>
      <p role="status">Ce texte occuperait environ {windowShare(e.low, win)} % à {windowShare(e.high, win)} % de la fenêtre. Rappelle-toi que la réponse du modèle compte aussi dans la fenêtre.</p>
    </section>
  );
}

function JsonTool() {
  const [text, setText] = useState('{ "ville": "Lyon", "mesures": [14.5, 18], "alerte": null }');
  const r = checkJson(text);
  return (
    <section aria-labelledby="t-json" className="panel">
      <h2 id="t-json" style={{ marginTop: 0 }}>Vérifier du JSON</h2>
      <p className="muted small">Colle un JSON (par exemple la sortie d’un modèle) : l’outil dit s’il est valide et, sinon, où est l’erreur. Valide ne veut pas dire exact : voir <Link to="/lecon/l-sorties-structurees">les sorties structurées</Link>.</p>
      <label htmlFor="json-text" className="small muted">JSON à vérifier</label>
      <textarea id="json-text" value={text} onChange={(ev) => setText(ev.target.value)} style={{ fontFamily: 'var(--mono)', fontSize: '0.85rem' }} spellCheck={false} />
      <p role="status" className={r.ok ? 'result-ok' : 'result-bad'}>
        {r.ok ? `JSON valide — ${r.kind} (${r.summary}).` : `JSON invalide : ${r.message}`}
      </p>
      {!r.ok && r.line !== null && <p className="small">Ligne {r.line}, colonne {r.column}.</p>}
      {!r.ok && r.hint && <p className="small"><strong>Piste :</strong> {r.hint}</p>}
    </section>
  );
}

function PromptTool() {
  const [p, setP] = useState<PromptParts>(EMPTY);
  const [msg, setMsg] = useState('');
  const out = buildPrompt(p);
  const advice = promptAdvice(p);
  const field = (key: keyof PromptParts, label: string, hint: string, rows = 2) => (
    <div style={{ marginBottom: 10 }}>
      <label htmlFor={`pf-${key}`} className="small"><strong>{label}</strong> <span className="muted">— {hint}</span></label>
      <textarea id={`pf-${key}`} rows={rows} style={{ minHeight: 0 }} value={p[key]} onChange={(ev) => setP({ ...p, [key]: ev.target.value })} />
    </div>
  );
  return (
    <section aria-labelledby="t-prompt" className="panel">
      <h2 id="t-prompt" style={{ marginTop: 0 }}>Construire un prompt</h2>
      <p className="muted small">Remplis les blocs ; l’outil assemble un prompt structuré (voir <Link to="/lecon/l-prompt">la leçon sur les prompts</Link>). Un prompt oriente la réponse sans la garantir.</p>
      {field('role', 'Rôle', 'le point de vue utile')}
      {field('objective', 'Objectif', 'le résultat à produire')}
      {field('context', 'Contexte', 'public, niveau, situation')}
      {field('inputs', 'Données', 'texte à traiter, séparé des consignes', 3)}
      {field('constraints', 'Contraintes', 'ton, longueur, exclusions')}
      {field('format', 'Format de sortie', 'tableau, étapes, JSON…')}
      {advice.length > 0 && out && (
        <ul className="small muted">{advice.map((a) => <li key={a}>{a}</li>)}</ul>
      )}
      <label htmlFor="pf-out" className="small muted">Prompt assemblé</label>
      <textarea id="pf-out" readOnly value={out} placeholder="Le prompt apparaîtra ici." style={{ minHeight: 140 }} />
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn secondary" disabled={!out} onClick={async () => { try { await navigator.clipboard.writeText(out); setMsg('Prompt copié.'); } catch { setMsg('Copie impossible : sélectionne le texte et copie-le.'); } }}>Copier le prompt</button>
        <button className="btn secondary" onClick={() => { setP(EMPTY); setMsg(''); }}>Tout effacer</button>
      </div>
      <p role="status" className="small" aria-live="polite">{msg}</p>
    </section>
  );
}

export function AtelierPage() {
  usePageTitle('Atelier d’outils');
  return (
    <>
      <h1>Atelier d’outils</h1>
      <p className="muted">
        Trois petits outils pour manipuler ce que tu apprends. Tout s’exécute dans ton navigateur : rien de ce que tu écris ici n’est envoyé, enregistré ou récompensé.
      </p>
      <Tokens />
      <JsonTool />
      <PromptTool />
    </>
  );
}
