import { Link, useParams } from 'react-router-dom';
import { DOCS } from '../content/docs';
import { VIDEOS, lessonReadingMinutes, lessonsOfModule, moduleById, quizById } from '../content';
import { useProgress } from '../lib/progress';
import { LevelBadge, ProgressBar, Tick, usePageTitle } from '../components/ui';
import { NotFound } from './NotFound';

export function ModulePage() {
  const { id = '' } = useParams();
  const m = moduleById.get(id);
  usePageTitle(m ? `Module ${m.number} — ${m.title}` : 'Module introuvable');
  const progress = useProgress();
  if (!m) return <NotFound what="Module" />;
  const lessons = lessonsOfModule(m.id);
  const done = lessons.filter((l) => progress.completed[l.id]).length;
  const quiz = quizById.get(`quiz-${m.id}`);
  const result = progress.quizzes[`quiz-${m.id}`];
  const lessonIds = new Set(lessons.map((l) => l.id));
  const nVideos = VIDEOS.filter((v) => v.lessonIds.some((l) => lessonIds.has(l))).length;
  const nDocs = DOCS.filter((d) => d.lessonIds.some((l) => lessonIds.has(l))).length;
  const next = lessons.find((l) => !progress.completed[l.id]);

  return (
    <>
      <p className="crumbs"><Link to="/parcours">Parcours</Link> › Module {m.number}</p>
      <h1>Module {m.number} — {m.title}</h1>
      <div className="lesson-meta">
        <LevelBadge level={m.level} />
        <span>{lessons.length} leçons</span>
        <span>{lessons.reduce((s, l) => s + lessonReadingMinutes(l), 0)} min de lecture</span>
      </div>
      <p className="objective"><strong>Objectif.</strong> {m.objective}</p>
      <ProgressBar value={done} max={lessons.length} label={`Progression du module ${m.number}`} tone="ok" />
      <p className="small muted">{done} / {lessons.length} leçons terminées.</p>
      {next && (
        <p>
          <Link className="btn" to={`/lecon/${next.id}`}>{done === 0 ? 'Commencer ce module' : 'Continuer : ' + next.title}</Link>
        </p>
      )}

      <h2>Les leçons</h2>
      <ol className="res-list" style={{ listStyle: 'none' }}>
        {lessons.map((l, i) => (
          <li key={l.id}>
            <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start', gap: 12 }}>
              <Tick done={!!progress.completed[l.id]} />
              <div>
                <Link to={`/lecon/${l.id}`}><strong>{m.number}.{i + 1} {l.title}</strong></Link>
                {progress.completed[l.id] && <span className="sr-only"> (terminée)</span>}
                <div className="muted small">{lessonReadingMinutes(l)} min · {l.objective}</div>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <h2>Ressources du module</h2>
      <p>
        {nVideos} vidéo{nVideos > 1 ? 's' : ''} et {nDocs} documentation{nDocs > 1 ? 's' : ''} sont associées aux leçons de ce module. Elles apparaissent en bas de chaque leçon et dans la <Link to="/ressources">bibliothèque</Link>.
      </p>

      <h2>Synthèse du module</h2>
      <ul>{m.synthesis.map((s, i) => <li key={i}>{s}</li>)}</ul>

      <h2>Quiz de fin de module</h2>
      {quiz && (
        <p>
          {quiz.questions.length} questions avec correction expliquée.{' '}
          {result && <>Meilleur score : <strong>{result.best} / {result.total}</strong>. </>}
          <Link className="btn secondary small" to={`/quiz/${quiz.id}`}>{result ? 'Refaire le quiz' : 'Faire le quiz'}</Link>
        </p>
      )}
      {m.id === 'm2' && (
        <p>Pour réviser l’ensemble des 50 notions d’un coup : <Link to="/quiz/quiz-glossaire">quiz récapitulatif</Link>.</p>
      )}
    </>
  );
}
