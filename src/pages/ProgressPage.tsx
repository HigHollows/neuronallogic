import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ActivityGraph, BadgeGrid } from '../components/Activity';
import { SaveWidget } from '../components/SaveWidget';
import { ProgressBar, usePageTitle } from '../components/ui';
import { LESSONS, MODULES, QUIZZES, lessonById, lessonsOfModule } from '../content';
import { READY_CHECKLIST, readinessMessage } from '../content/revision';
import { balance, levelStatus, moduleSkills, recommendNext, totalEarned, totalSpent, type SkillStatus } from '../lib/credits';
import { LEVELS, REWARDS, THRESHOLDS } from '../lib/creditsConfig';
import { actions, useProgress } from '../lib/progress';

const SKILL_LABEL: Record<SkillStatus, string> = { validee: 'Validée', 'a-renforcer': 'À renforcer', 'en-cours': 'En cours', 'a-decouvrir': 'À découvrir' };

function Goals() {
  const progress = useProgress();
  const [text, setText] = useState('');
  return (
    <>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          actions.addGoal(text);
          setText('');
        }}
      >
        <div style={{ flex: '1 1 260px' }}>
          <label htmlFor="goal" className="sr-only">Nouvel objectif d’apprentissage</label>
          <input id="goal" type="text" value={text} onChange={(e) => setText(e.target.value)} maxLength={160} placeholder="ex. Comprendre le RAG avant la fin du mois" />
        </div>
        <button className="btn secondary" type="submit" disabled={!text.trim()}>Ajouter l’objectif</button>
      </form>
      {progress.goals.length === 0 ? (
        <p className="muted small">Aucun objectif pour l’instant. Un objectif simple et précis aide à avancer.</p>
      ) : (
        <ul className="check-list" style={{ marginTop: 12 }}>
          {progress.goals.map((g) => (
            <li key={g.id}>
              <label>
                <input type="checkbox" checked={g.done} onChange={() => actions.toggleGoal(g.id)} />
                <span style={{ textDecoration: g.done ? 'line-through' : 'none' }}>{g.text}</span>
              </label>
              <button className="btn danger small" style={{ marginTop: 4 }} onClick={() => actions.removeGoal(g.id)} aria-label={`Supprimer l’objectif : ${g.text}`}>Supprimer</button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function ProgressPage() {
  usePageTitle('Profil et progression');
  const progress = useProgress();
  const done = LESSONS.filter((l) => progress.completed[l.id]).length;
  const ready = READY_CHECKLIST.filter((c) => progress.checklist[c.id]).length;
  const last = progress.lastLesson ? lessonById.get(progress.lastLesson) : undefined;
  const next = recommendNext(progress);
  const lvl = levelStatus(progress);
  const skills = moduleSkills(progress);
  const earned = totalEarned(progress);
  const history = [...progress.ledger].reverse().slice(0, 15);
  const validated = skills.filter((s) => s.status === 'validee');

  return (
    <>
      <h1>Profil et progression</h1>

      <section aria-labelledby="h-level" className="panel">
        <p className="eyebrow">Niveau actuel</p>
        <h2 id="h-level" style={{ marginTop: 0 }}>{lvl.level.name}</h2>
        <p>{lvl.level.description}</p>
        {lvl.next ? (
          <>
            <p><strong>Pour devenir « {lvl.next.name} »</strong> — les crédits ne suffisent pas, il faut aussi des objectifs pédagogiques :</p>
            <ul>{lvl.missing.map((m, i) => <li key={i}>{m}</li>)}</ul>
          </>
        ) : (
          <p>Tu as atteint le niveau le plus élevé. Continue avec le module expert et un projet réel.</p>
        )}
        <details>
          <summary>Voir tous les niveaux</summary>
          <ol>
            {LEVELS.map((l) => (
              <li key={l.id} style={{ fontWeight: l.id === lvl.level.id ? 700 : 400 }}>
                {l.name} — {l.minCredits} crédits
                {l.requires.modulesValidated ? `, ${l.requires.modulesValidated} module(s) validé(s)` : ''}
                {l.requires.projectSteps ? `, ${l.requires.projectSteps} étapes du projet final` : ''}
                {l.requires.glossaryQuiz ? ', quiz des 50 notions réussi' : ''}
              </li>
            ))}
          </ol>
        </details>
        <p className="small muted">Les niveaux sont personnels : aucun classement, aucune comparaison avec d’autres personnes.</p>
      </section>

      <div className="stat-grid">
        <div className="stat"><b>{balance(progress)}</b><span>crédits disponibles</span></div>
        <div className="stat"><b>{earned}</b><span>crédits gagnés au total</span></div>
        <div className="stat"><b>{done} / {LESSONS.length}</b><span>leçons terminées</span></div>
        <div className="stat"><b>{validated.length} / {MODULES.length}</b><span>modules validés</span></div>
      </div>
      {totalSpent(progress) > 0 && <p className="small muted">{totalSpent(progress)} crédits dépensés en activités bonus (le niveau ne dépend que des crédits gagnés).</p>}
      <ProgressBar value={done} max={LESSONS.length} label="Progression globale" tone="ok" />
      <p>
        {last && <>Dernière leçon consultée : <Link to={`/lecon/${last.id}`}>{last.title}</Link>. </>}
        {next ? <>Prochaine étape : <Link to={`/lecon/${next.id}`}>{next.title}</Link>.</> : 'Toutes les leçons sont terminées : bravo ! Passe au projet final ou aux défis de révision.'}
      </p>

      <h2>Activité d’apprentissage</h2>
      <ActivityGraph />

      <h2>Badges</h2>
      <BadgeGrid />

      <h2>Comment gagner des crédits de savoir</h2>
      <p className="muted">Les crédits récompensent une compréhension démontrée — jamais le temps passé, la connexion ou les clics. Chaque récompense n’est versée qu’<strong>une seule fois</strong>.</p>
      <div className="table-wrap" role="region" aria-label="Barème des crédits" tabIndex={0}>
        <table>
          <thead><tr><th scope="col">Activité</th><th scope="col">Condition</th><th scope="col">Crédits</th></tr></thead>
          <tbody>
            <tr><th scope="row">Leçon</th><td>Leçon marquée terminée <em>et</em> contrôle de compréhension réussi (≥ {Math.round(THRESHOLDS.lessonCheckPass * 100)} %)</td><td>+{REWARDS.lesson}</td></tr>
            <tr><th scope="row">Quiz</th><td>Au moins {Math.round(THRESHOLDS.quizPass * 100)} % de bonnes réponses</td><td>+{REWARDS.quiz80}</td></tr>
            <tr><th scope="row">Quiz parfait</th><td>100 % de bonnes réponses (en plus)</td><td>+{REWARDS.quiz100}</td></tr>
            <tr><th scope="row">Exercice pratique</th><td>Scénarios corrigés réussis à {Math.round(THRESHOLDS.quizPass * 100)} %, ou exercice rédigé validé selon des critères</td><td>+{REWARDS.exercise}</td></tr>
            <tr><th scope="row">Module</th><td>Toutes les leçons terminées <em>et</em> quiz de fin de module réussi</td><td>+{REWARDS.module}</td></tr>
            <tr><th scope="row">Défi de révision</th><td>Défi réussi sur une notion déjà étudiée (une fois par notion)</td><td>+{REWARDS.review}</td></tr>
          </tbody>
        </table>
      </div>
      <p className="small muted">
        Ces crédits se stockent dans ton navigateur : ils ne sont <strong>pas protégés contre la modification</strong> par quelqu’un qui éditerait ses données. C’est un encouragement personnel, pas une certification. Ils peuvent débloquer des <Link to="/bonus">activités bonus facultatives</Link>.
      </p>

      <h2>Dernières récompenses</h2>
      {history.length === 0 ? (
        <p className="empty">Aucune récompense pour l’instant. Termine une leçon et réussis son contrôle pour obtenir tes premiers crédits.</p>
      ) : (
        <ul className="res-list">
          {history.map((e) => (
            <li key={e.key} className="row between" style={{ flexWrap: 'nowrap' }}>
              <span>{e.label}</span>
              <span className="nowrap"><strong>+{e.credits}</strong>{e.at ? <span className="muted small"> · {new Date(e.at).toLocaleDateString('fr-FR')}</span> : null}</span>
            </li>
          ))}
        </ul>
      )}

      <h2>Compétences par module</h2>
      <p className="muted small">« Validée » exige les leçons terminées et le quiz de module réussi. Sans tentative, aucun niveau de maîtrise n’est affirmé.</p>
      <div className="table-wrap" role="region" aria-label="Compétences par module" tabIndex={0}>
        <table>
          <thead><tr><th scope="col">Module</th><th scope="col">Statut</th><th scope="col">Détail</th></tr></thead>
          <tbody>
            {skills.map((s) => (
              <tr key={s.moduleId}>
                <th scope="row"><Link to={`/module/${s.moduleId}`}>{s.title}</Link></th>
                <td>{SKILL_LABEL[s.status]}</td>
                <td className="small">
                  {s.lessonsDone}/{s.lessonsTotal} leçons · {s.quiz ? `quiz ${s.quiz.best}/${s.quiz.total}` : 'quiz non tenté'}
                  {s.status === 'validee' && <ul style={{ margin: '4px 0 0' }}>{s.skills.map((x, i) => <li key={i}>{x}</li>)}</ul>}
                  {s.toStrengthen.length > 0 && <div>À renforcer : {s.toStrengthen.map((id, i) => <span key={id}>{i > 0 && ', '}<Link to={`/lecon/${id}`}>{lessonById.get(id)?.title}</Link></span>)}</div>}
                  {s.status === 'a-renforcer' && s.toStrengthen.length === 0 && <div>Refais le quiz du module après avoir relu les leçons.</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Par module</h2>
      <ul className="res-list">
        {MODULES.map((m) => {
          const ls = lessonsOfModule(m.id);
          const n = ls.filter((l) => progress.completed[l.id]).length;
          const r = progress.quizzes[`quiz-${m.id}`];
          return (
            <li key={m.id}>
              <div className="row between">
                <Link to={`/module/${m.id}`}>{m.number}. {m.title}</Link>
                <span className="small muted">{n}/{ls.length} leçons{r ? ` · quiz ${r.best}/${r.total}` : ''}</span>
              </div>
              <ProgressBar value={n} max={ls.length} label={`Module ${m.number}`} tone="ok" />
            </li>
          );
        })}
      </ul>

      <h2>Scores des quiz</h2>
      {QUIZZES.filter((q) => progress.quizzes[q.id]).length === 0 ? (
        <p className="empty">Aucun quiz tenté pour l’instant. <Link to="/quiz">Voir les quiz</Link>.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">Quiz</th><th scope="col">Meilleur</th><th scope="col">Dernier</th><th scope="col">Tentatives</th><th scope="col"><span className="sr-only">Action</span></th></tr></thead>
            <tbody>
              {QUIZZES.filter((q) => progress.quizzes[q.id]).map((q) => {
                const r = progress.quizzes[q.id];
                return (
                  <tr key={q.id}>
                    <th scope="row"><Link to={`/quiz/${q.id}`}>{q.title}</Link></th>
                    <td>{r.best} / {r.total}</td>
                    <td>{r.last} / {r.total}</td>
                    <td>{r.attempts}</td>
                    <td><Link to={`/quiz/${q.id}`}>Recommencer</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h2>Mes objectifs d’apprentissage</h2>
      <Goals />

      <h2>Suis-je prêt ? Auto-évaluation finale</h2>
      <p className="muted">Coche chaque ligne lorsque tu peux l’expliquer sans lire le cours.</p>
      <ul className="check-list">
        {READY_CHECKLIST.map((c) => (
          <li key={c.id}>
            <label>
              <input type="checkbox" checked={!!progress.checklist[c.id]} onChange={() => actions.toggleChecklist(c.id)} />
              <span>{c.text}</span>
            </label>
          </li>
        ))}
      </ul>
      <p role="status"><strong>{ready} / {READY_CHECKLIST.length}</strong> compétences cochées — {readinessMessage(ready)}</p>
      <p className="small muted">Cette auto-évaluation mesure une compréhension introductive, pas une qualification professionnelle.</p>

      <h2>Sauvegarde de ma progression</h2>
      <SaveWidget />

      <h2>Réinitialiser</h2>
      <p className="muted small">Efface progression, scores, crédits et objectifs sur cet appareil. Pense à sauvegarder avant.</p>
      <button className="btn danger" onClick={() => { if (confirm('Effacer toute ta progression, tes crédits et tes objectifs sur cet appareil ? Cette action est définitive.')) actions.resetAll(); }}>
        Tout effacer
      </button>
    </>
  );
}
