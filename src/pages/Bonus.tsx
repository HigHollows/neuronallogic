import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QuizRunner } from '../components/QuizRunner';
import { usePageTitle } from '../components/ui';
import { lessonById, moduleById } from '../content';
import { BONUS_QUIZZES, SHEETS } from '../content/bonus';
import { DISTINCTIONS } from '../content/revision';
import { balance, isUnlocked, missedQuestions, weakLessons, weakTerms } from '../lib/credits';
import { BONUS, REWARDS } from '../lib/creditsConfig';
import { actions, useProgress } from '../lib/progress';
import { termById } from '../content/glossary';
import { NotFound } from './NotFound';

const KIND = { exercice: 'Défi pratique', fiche: 'Fiche de synthèse', parcours: 'Parcours de révision' } as const;

export function BonusListPage() {
  usePageTitle('Activités bonus');
  const progress = useProgress();
  const [asking, setAsking] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const bal = balance(progress);

  function confirm(id: string) {
    const r = actions.unlock(id);
    setAsking(null);
    setMsg(r.ok ? `« ${r.bonus.title} » débloqué. ${r.bonus.cost} crédits dépensés.` : r.reason === 'solde-insuffisant' ? 'Solde insuffisant : aucun crédit n’a été dépensé.' : 'Cette activité est déjà débloquée.');
  }

  return (
    <>
      <h1>Activités bonus</h1>
      <div className="callout note">
        <strong>Tout le cours reste gratuit et accessible.</strong>
        <p>
          Les leçons, quiz, corrections, exercices, ressources et le projet final n’exigent jamais de crédits. Les crédits servent seulement à débloquer des activités <em>facultatives</em> de mise en pratique. Rien n’est débité sans ta confirmation, après affichage du coût. Les crédits ne s’achètent pas et ne s’échangent pas.
        </p>
      </div>
      <p>Solde disponible : <strong>{bal} crédits</strong>. <Link to="/progression">Voir comment en gagner</Link>.</p>
      <p role="status" aria-live="polite" className="small">{msg}</p>
      <ul className="quiz-list">
        {BONUS.map((b) => {
          const open = isUnlocked(progress, b.id);
          return (
            <li key={b.id}>
              <div className="info">
                <p className="eyebrow" style={{ margin: 0 }}>{KIND[b.kind]}</p>
                <h2>{b.title}</h2>
                <p>{b.description}</p>
                {asking === b.id && (
                  <div className="confirm-box" role="alertdialog" aria-labelledby={`c-${b.id}`}>
                    <p id={`c-${b.id}`}>
                      Dépenser <strong>{b.cost} crédits</strong> pour débloquer « {b.title} » ? Il te resterait <strong>{bal - b.cost} crédits</strong>.
                    </p>
                    <div className="row">
                      <button className="btn" onClick={() => confirm(b.id)}>Confirmer la dépense de {b.cost} crédits</button>
                      <button className="btn secondary" onClick={() => setAsking(null)}>Annuler</button>
                    </div>
                  </div>
                )}
              </div>
              <div className="row">
                {open ? (
                  <Link className="btn secondary small" to={b.to}>Ouvrir</Link>
                ) : bal >= b.cost ? (
                  <button className="btn secondary small" onClick={() => setAsking(b.id)} aria-label={`Débloquer ${b.title} pour ${b.cost} crédits`}>Débloquer · {b.cost} crédits</button>
                ) : (
                  <span className="small muted">{b.cost} crédits · il en manque {b.cost - bal}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Sheet({ id }: { id: string }) {
  const sheet = SHEETS[id];
  if (!sheet) return null;
  return (
    <article className="sheet">
      <p className="muted small">Fiche complémentaire à imprimer. Elle résume le cours : elle ne le remplace pas.</p>
      {sheet.moduleIds.map((mid) => {
        const m = moduleById.get(mid)!;
        return (
          <section key={mid}>
            <h2>Module {m.number} — {m.title}</h2>
            <ul>{m.synthesis.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </section>
        );
      })}
      <h2>Distinctions à savoir expliquer</h2>
      <ul>
        {DISTINCTIONS.filter((d) => sheet.distinctions.includes(d.pair)).map((d) => (
          <li key={d.pair}><strong>{d.pair}</strong> — {d.diff}</li>
        ))}
      </ul>
      <button className="btn secondary" onClick={() => window.print()}>Imprimer cette fiche</button>
    </article>
  );
}

function PersonalPath() {
  const progress = useProgress();
  const weak = weakLessons(progress);
  const terms = weakTerms(progress);
  const missed = missedQuestions(progress);
  if (missed.length === 0) {
    return <p className="empty">Pas encore assez de données pour construire un parcours : fais quelques quiz et vérifications de leçon. Quand des questions seront manquées, ce parcours proposera de les revoir dans l’ordre.</p>;
  }
  return (
    <>
      <p>D’après tes dernières tentatives, voici un ordre de révision. Il est calculé uniquement à partir de tes réponses enregistrées sur cet appareil.</p>
      <ol>
        {weak.map((w) => {
          const l = lessonById.get(w.lessonId);
          return l ? (
            <li key={w.lessonId}>
              Relis <Link to={`/lecon/${l.id}`}>{l.title}</Link> ({w.missed} question{w.missed > 1 ? 's' : ''} manquée{w.missed > 1 ? 's' : ''}), puis refais sa vérification de fin de leçon.
            </li>
          ) : null;
        })}
        {terms.length > 0 && (
          <li>
            Notions à retravailler : {terms.map((t, i) => <span key={t}>{i > 0 && ', '}<Link to={`/notions/${t}`}>{termById.get(t)?.fr}</Link></span>)}.
          </li>
        )}
        <li>Termine par <Link to="/defis">un défi de révision</Link> sur ces notions.</li>
      </ol>
    </>
  );
}

export function BonusPage() {
  const { id = '' } = useParams();
  const def = BONUS.find((b) => b.id === id);
  usePageTitle(def ? def.title : 'Activité introuvable');
  const progress = useProgress();
  if (!def) return <NotFound what="Activité bonus" />;
  if (!isUnlocked(progress, id)) {
    return (
      <>
        <h1>{def.title}</h1>
        <p>Cette activité facultative n’est pas encore débloquée. Elle coûte {def.cost} crédits et tu choisis librement de la débloquer.</p>
        <Link className="btn" to="/bonus">Voir les activités bonus</Link>
      </>
    );
  }
  const quiz = BONUS_QUIZZES[id];
  return (
    <>
      <p className="crumbs"><Link to="/bonus">Activités bonus</Link> › {def.title}</p>
      <h1>{def.title}</h1>
      {quiz && (
        <>
          <p className="muted">{quiz.intro} Réussi à 80 % ou plus, ce défi compte comme un exercice pratique ({REWARDS.exercise} crédits, une seule fois).</p>
          <QuizRunner key={id} quizId={id} title={quiz.title} questions={quiz.questions} />
        </>
      )}
      {def.kind === 'fiche' && <Sheet id={id} />}
      {id === 'revision-perso' && <PersonalPath />}
    </>
  );
}
