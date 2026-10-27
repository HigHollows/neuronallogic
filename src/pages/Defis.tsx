import { useState } from 'react';
import { Link } from 'react-router-dom';
import { QuizRunner } from '../components/QuizRunner';
import { usePageTitle } from '../components/ui';
import { lessonById } from '../content';
import { termById } from '../content/glossary';
import { missedQuestions, reviewableTerms, reviewQuizId, termQuestions, weakLessons } from '../lib/credits';
import { REWARDS } from '../lib/creditsConfig';
import { dueReviews, REVIEW_INTERVALS_DAYS } from '../lib/review';
import { useProgress } from '../lib/progress';

export function DefisPage() {
  usePageTitle('Défis de révision');
  const progress = useProgress();
  const [mode, setMode] = useState<{ kind: 'erreurs' } | { kind: 'notion'; id: string } | null>(null);
  const missed = missedQuestions(progress);
  const weak = weakLessons(progress);
  const terms = reviewableTerms(progress);
  const rewarded = new Set(progress.ledger.map((e) => e.key));
  const due = dueReviews(progress);

  return (
    <>
      <h1>Défis de révision</h1>
      <p className="muted">
        Revoir ce qu’on a étudié est ce qui fait retenir durablement. Ici, tu retravailles tes erreurs et tu testes des notions déjà vues. Aucune limite de temps, aucun compteur : tu choisis quand et quoi réviser.
      </p>

      {mode?.kind === 'erreurs' && (
        <section aria-labelledby="h-run">
          <h2 id="h-run">Mes questions manquées</h2>
          <QuizRunner key="revue-erreurs" quizId="revue-erreurs" title="Révision de mes erreurs" questions={missed.slice(0, 10)} />
          <button className="btn secondary" onClick={() => setMode(null)}>Retour aux défis</button>
        </section>
      )}
      {mode?.kind === 'notion' && termById.get(mode.id) && (
        <section aria-labelledby="h-run">
          <h2 id="h-run">Défi : {termById.get(mode.id)!.fr}</h2>
          <QuizRunner key={mode.id} quizId={reviewQuizId(mode.id)} title={`Défi de révision : ${termById.get(mode.id)!.fr}`} questions={termQuestions(mode.id).slice(0, 3)} />
          <button className="btn secondary" onClick={() => setMode(null)}>Retour aux défis</button>
        </section>
      )}

      {!mode && (
        <>
          <h2>Bon moment pour revoir</h2>
          <p className="muted">
            Revoir une notion quelques jours après l’avoir étudiée aide à la retenir (ici après {REVIEW_INTERVALS_DAYS[0]} jours, puis {REVIEW_INTERVALS_DAYS[1]}, puis {REVIEW_INTERVALS_DAYS[2]}). C’est une suggestion, sans obligation ni série à maintenir.
          </p>
          {due.length === 0 ? (
            <p className="small muted">Rien à proposer pour l’instant : les notions étudiées récemment seront suggérées après quelques jours.</p>
          ) : (
            <ul className="res-list">
              {due.slice(0, 8).map((d) => (
                <li key={d.term.id} className="row between" style={{ flexWrap: 'nowrap' }}>
                  <span><strong>{d.term.fr}</strong> <span className="muted small">— étudiée ou revue il y a {d.daysSince} jours</span></span>
                  <button className="btn secondary small" onClick={() => setMode({ kind: 'notion', id: d.term.id })}>Réviser</button>
                </li>
              ))}
            </ul>
          )}

          <h2>À revoir en priorité</h2>
          {missed.length === 0 ? (
            <p className="empty">
              Aucune erreur récente enregistrée. Fais un <Link to="/quiz">quiz</Link> ou une vérification de leçon : les questions manquées apparaîtront ici. Tant qu’il n’y a pas assez de données, la progression est simplement « en cours ».
            </p>
          ) : (
            <>
              <p>
                {missed.length} question{missed.length > 1 ? 's' : ''} manquée{missed.length > 1 ? 's' : ''} lors de ta dernière tentative.
              </p>
              <ul>
                {weak.map((w) => (
                  <li key={w.lessonId}>
                    <Link to={`/lecon/${w.lessonId}`}>{lessonById.get(w.lessonId)?.title}</Link> — {w.missed} question{w.missed > 1 ? 's' : ''} à revoir
                  </li>
                ))}
              </ul>
              <button className="btn" onClick={() => setMode({ kind: 'erreurs' })}>Refaire mes questions manquées</button>
              <p className="small muted">Ce quiz de révision ne rapporte pas de crédits : il sert à progresser. Si tu réussis, la question n’apparaîtra plus ici.</p>
            </>
          )}

          <h2>Défis sur une notion étudiée</h2>
          <p className="muted">
            Un défi = jusqu’à 3 questions sur une notion dont tu as terminé la leçon. Réussi (au moins 2 sur 3), il rapporte <strong>{REWARDS.review} crédits, une seule fois par notion</strong> ; tu peux le refaire autant que tu veux pour t’entraîner.
          </p>
          {terms.length === 0 ? (
            <p className="empty">Termine d’abord quelques leçons : les notions correspondantes seront proposées ici.</p>
          ) : (
            <ul className="term-list">
              {terms.map((t) => (
                <li key={t.id}>
                  <span className="n">{t.n}</span>
                  <div>
                    <span className="row between">
                      <strong>{t.fr}</strong>
                      <button className="btn secondary small" onClick={() => setMode({ kind: 'notion', id: t.id })}>Lancer le défi</button>
                    </span>
                    <p>
                      {rewarded.has(`review:${t.id}`) ? 'Défi réussi — crédits déjà obtenus.' : `+${REWARDS.review} crédits à la première réussite.`} {termQuestions(t.id).length} question{termQuestions(t.id).length > 1 ? 's' : ''} disponible{termQuestions(t.id).length > 1 ? 's' : ''}.
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
