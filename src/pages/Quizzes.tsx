import { Link, useParams } from 'react-router-dom';
import { QUIZZES, quizById } from '../content';
import { QuizRunner } from '../components/QuizRunner';
import { actions, useProgress } from '../lib/progress';
import { usePageTitle } from '../components/ui';
import { NotFound } from './NotFound';

export function QuizListPage() {
  usePageTitle('Quiz');
  const progress = useProgress();
  return (
    <>
      <h1>Quiz</h1>
      <p className="muted">
        Chaque correction explique la bonne réponse et les erreurs de compréhension que les mauvaises réponses représentent. Tu peux recommencer autant que tu veux ; ton meilleur score est enregistré sur cet appareil. Les petites questions de vérification sont aussi à la fin de chaque leçon.
      </p>
      <ul className="quiz-list">
        {QUIZZES.map((q) => {
          const r = progress.quizzes[q.id];
          return (
            <li key={q.id}>
              <div className="info">
                <h2><Link to={`/quiz/${q.id}`}>{q.title}</Link></h2>
                <p>{q.description}</p>
              </div>
              <div className="row">
                <span className="small muted">{q.questions.length} questions{r ? ` · meilleur : ${r.best}/${r.total}` : ''}</span>
                <Link className="btn secondary small" to={`/quiz/${q.id}`}>{r ? 'Refaire' : 'Commencer'}</Link>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function QuizPage() {
  const { id = '' } = useParams();
  const quiz = quizById.get(id);
  usePageTitle(quiz ? quiz.title : 'Quiz introuvable');
  const progress = useProgress();
  if (!quiz) return <NotFound what="Quiz" />;
  const r = progress.quizzes[quiz.id];
  return (
    <>
      <p className="crumbs"><Link to="/quiz">Quiz</Link> › {quiz.title}</p>
      <h1>{quiz.title}</h1>
      <p className="muted">{quiz.description}</p>
      <QuizRunner key={quiz.id} quizId={quiz.id} title={quiz.title} questions={quiz.questions} />
      {r && (
        <p className="small muted">
          <button className="btn danger small" onClick={() => { if (confirm('Effacer le score enregistré pour ce quiz ?')) actions.resetQuiz(quiz.id); }}>
            Effacer mon score de ce quiz
          </button>
        </p>
      )}
    </>
  );
}
