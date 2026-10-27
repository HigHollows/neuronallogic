import { useState } from 'react';
import { Link } from 'react-router-dom';
import { QuizRunner } from '../components/QuizRunner';
import { usePageTitle } from '../components/ui';
import { quizById } from '../content';
import { COMPREHENSION, EXPLAIN_RUBRIC, PROMPT_CRITERIA, PROMPT_MODEL_ANSWER } from '../content/revision';
import { REWARDS, THRESHOLDS } from '../lib/creditsConfig';
import { actions, useProgress } from '../lib/progress';

function ExplainExercise() {
  const [text, setText] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const total = EXPLAIN_RUBRIC.reduce((s, r) => s + (scores[r.id] ?? 0), 0);
  const answered = Object.keys(scores).length === EXPLAIN_RUBRIC.length;
  const words = text.split(/\s+/).filter(Boolean).length;
  const progress = useProgress();
  const already = !!progress.exercises.explain;
  const eligible = answered && total >= THRESHOLDS.explainScore && words >= THRESHOLDS.explainMinWords;
  return (
    <section aria-labelledby="ex1">
      <h2 id="ex1">Exercice 1 — Expliquer un concept simplement</h2>
      <p>
        Choisis un concept : réseau de neurones, API, RAG, MCP, token ou agent IA. Rédige une explication de <strong>100 à 150 mots</strong> pour quelqu’un qui ne connaît aucun terme technique, avec : une définition en une phrase, une analogie concrète, un exemple réel, une limite de l’analogie, et une phrase finale commençant par « À retenir ».
      </p>
      <label htmlFor="ex1-t" className="small muted">Ton texte (il reste sur ton écran : rien n’est envoyé ni enregistré)</label>
      <textarea id="ex1-t" value={text} onChange={(e) => setText(e.target.value)} />
      <p className="small muted" aria-live="polite">
        {words} mot{words > 1 ? 's' : ''} {words > 0 && (words < 100 ? '— un peu court' : words > 150 ? '— un peu long' : '— dans la cible')}
      </p>
      <h3>Auto-évaluation (0, 1 ou 2 points par critère)</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">Critère</th><th scope="col">0 point</th><th scope="col">1 point</th><th scope="col">2 points</th></tr></thead>
          <tbody>
            {EXPLAIN_RUBRIC.map((r) => (
              <tr key={r.id}>
                <th scope="row">{r.label}</th>
                {r.levels.map((label, i) => (
                  <td key={i}>
                    <label style={{ display: 'flex', gap: 8 }}>
                      <input type="radio" name={`rub-${r.id}`} checked={scores[r.id] === i} onChange={() => setScores((s) => ({ ...s, [r.id]: i }))} />
                      <span>{label}</span>
                    </label>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p role="status">
        Total : <strong>{total} / 8</strong>.{' '}
        {answered ? (total >= 6 ? 'Réussi (au moins 6/8). Pour valider vraiment : demande à une autre personne de reformuler le concept sans regarder ton texte.' : 'En dessous de 6/8 : relis la leçon concernée, corrige le critère le plus faible et recommence.') : 'Remplis les quatre critères pour voir ton total.'}
      </p>
      <p className="small muted">
        Validation de l’exercice ({REWARDS.exercise} crédits, une seule fois) : texte d’au moins {THRESHOLDS.explainMinWords} mots <em>et</em> note d’au moins {THRESHOLDS.explainScore}/8. C’est une auto-évaluation : elle repose sur ton honnêteté, et le texte reste sur ton écran.
      </p>
      <button className="btn" disabled={!eligible || already} onClick={() => actions.passExercise('explain')}>
        {already ? 'Exercice déjà validé' : 'Valider cet exercice'}
      </button>
    </section>
  );
}

function PromptExercise() {
  const [text, setText] = useState('');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [show, setShow] = useState(false);
  const n = PROMPT_CRITERIA.filter((c) => checked[c.id]).length;
  const progress = useProgress();
  const already = !!progress.exercises.prompt;
  const words = text.split(/\s+/).filter(Boolean).length;
  const eligible = n >= THRESHOLDS.promptCriteria && words >= THRESHOLDS.promptMinWords;
  return (
    <section aria-labelledby="ex2">
      <h2 id="ex2">Exercice 2 — Améliorer un prompt</h2>
      <p>Prompt initial : <em>« Fais-moi un plan marketing. »</em></p>
      <ol>
        <li>Liste les informations manquantes (produit, cible, marché, budget, délai, objectif, canal).</li>
        <li>Décide lesquelles sont indispensables pour une première version.</li>
        <li>Rédige un prompt qui demande une stratégie, des hypothèses explicites, un calendrier et des indicateurs.</li>
        <li>Ajoute une consigne pour ne pas inventer de chiffres de marché.</li>
        <li>Évalue la réponse selon sa pertinence, sa faisabilité et ses hypothèses.</li>
      </ol>
      <label htmlFor="ex2-t" className="small muted">Ta version améliorée (non envoyée, non enregistrée)</label>
      <textarea id="ex2-t" value={text} onChange={(e) => setText(e.target.value)} />
      <h3>Relis ton prompt : coche ce qu’il contient réellement</h3>
      <ul className="check-list">
        {PROMPT_CRITERIA.map((c) => (
          <li key={c.id}>
            <label>
              <input type="checkbox" checked={!!checked[c.id]} onChange={() => setChecked((s) => ({ ...s, [c.id]: !s[c.id] }))} />
              <span>{c.text}</span>
            </label>
          </li>
        ))}
      </ul>
      <p role="status">{n} critère{n > 1 ? 's' : ''} sur {PROMPT_CRITERIA.length}. {n === PROMPT_CRITERIA.length ? 'Ton prompt est bien cadré. Teste-le sur plusieurs cas.' : 'Relis les critères non cochés : ce sont tes pistes d’amélioration.'}</p>
      <p className="small muted">
        Validation de l’exercice ({REWARDS.exercise} crédits, une seule fois) : prompt d’au moins {THRESHOLDS.promptMinWords} mots <em>et</em> au moins {THRESHOLDS.promptCriteria} critères sur {PROMPT_CRITERIA.length}. Auto-évaluation, texte non enregistré.
      </p>
      <p>
        <button className="btn" disabled={!eligible || already} onClick={() => actions.passExercise('prompt')}>{already ? 'Exercice déjà validé' : 'Valider cet exercice'}</button>
      </p>
      <button className="btn secondary" onClick={() => setShow((s) => !s)} aria-expanded={show}>
        {show ? 'Masquer' : 'Voir'} un exemple de version améliorée
      </button>
      {show && (
        <blockquote style={{ borderLeft: '4px solid var(--accent)', margin: '14px 0', paddingLeft: 16 }}>
          {PROMPT_MODEL_ANSWER}
          <p className="small muted" style={{ margin: '8px 0 0' }}>
            Extension : demande ensuite une critique — « Identifie les trois hypothèses les plus fragiles, les coûts sous-estimés et les raisons pour lesquelles ce plan pourrait échouer. Propose un test peu coûteux pour chaque risque. »
          </p>
        </blockquote>
      )}
    </section>
  );
}

export function ExercisesPage() {
  usePageTitle('Exercices');
  const quiz = quizById.get('quiz-exercices')!;
  const [open, setOpen] = useState<Record<number, boolean>>({});
  return (
    <>
      <h1>Exercices</h1>
      <p className="muted">
        Des mises en situation pour appliquer ce que tu as appris. Les exercices rédactionnels s’auto-évaluent (aucun texte n’est envoyé nulle part) ; les scénarios à choix sont corrigés avec explications.
      </p>

      <h2>Scénarios : choisir, analyser, repérer</h2>
      <p>
        Huit situations : RAG ou fine-tuning ? analyser un appel d’API ? workflow ou agent ? repérer une faille de permission ?
      </p>
      <QuizRunner quizId={quiz.id} title={quiz.title} questions={quiz.questions} />

      <ExplainExercise />
      <PromptExercise />

      <section aria-labelledby="ex34">
        <h2 id="ex34">Exercices 3 et 4 — Concevoir</h2>
        <ul>
          <li><strong>Exercice 3 — Dessiner une application IA.</strong> Du besoin au schéma d’architecture, avec liste de risques et cinq tests d’acceptation : voir la leçon <Link to="/lecon/l-assistant-documentaire">Mini-projet — assistant documentaire</Link>.</li>
          <li><strong>Exercice 4 — Concevoir un outil et son serveur MCP</strong> en lecture seule : voir <Link to="/lecon/l-serveur-mcp">Comment fonctionne un serveur MCP</Link> et <Link to="/lecon/l-outil-workflow">Un outil en lecture seule et un workflow avec contrôles</Link>.</li>
          <li>Pour aller plus loin : le <Link to="/projet-final">projet final guidé</Link>.</li>
        </ul>
      </section>

      <section aria-labelledby="corrige">
        <h2 id="corrige">Questions de compréhension et corrigé indicatif</h2>
        <p className="muted">Essaie de répondre à voix haute ou par écrit avant d’ouvrir la réponse. Pour les exercices de conception, plusieurs solutions peuvent être correctes : la qualité dépend de la clarté du besoin, des risques anticipés et de la capacité à tester le système.</p>
        {COMPREHENSION.map((c, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <button className="btn secondary" aria-expanded={!!open[i]} aria-controls={`cmp-${i}`} onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))}>
              {i + 1}. {c.q}
            </button>
            {open[i] && <p id={`cmp-${i}`} className="explain">{c.a}</p>}
          </div>
        ))}
      </section>
    </>
  );
}
