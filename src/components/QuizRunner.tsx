import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Question } from '../content/types';
import { isCorrect, scoreQuiz, verdict } from '../lib/quiz';
import { actions, useProgress, type LedgerEntry } from '../lib/progress';
import { THRESHOLDS } from '../lib/creditsConfig';
import { lessonById } from '../content';

type Mode = 'immediate' | 'final';
type Phase = 'intro' | 'running' | 'done';

/** Explique, sans pression, pourquoi des crédits ont été (ou non) obtenus. */
function rewardMessage(quizId: string, percent: number, earned: LedgerEntry[]): string {
  if (earned.length > 0) return '';
  if (quizId === 'studio-tuto') return percent >= 80 ? 'Quiz réussi. Les 20 crédits du tutoriel sont versés quand tu cliques sur « Terminer le tutoriel » (une seule fois).' : 'Pas encore : relis les explications et recommence, sans limite.';
  const kind = quizId.startsWith('check-') ? 'lesson' : quizId.startsWith('revue-') ? 'review' : quizId === 'revue-erreurs' ? 'none' : quizId.startsWith('bonus-') || quizId === 'quiz-exercices' ? 'exercise' : 'quiz';
  if (quizId === 'revue-erreurs') return 'Ce quiz de révision de tes erreurs ne rapporte pas de crédits : il sert uniquement à progresser.';
  const need = kind === 'lesson' ? Math.round(THRESHOLDS.lessonCheckPass * 100) : kind === 'review' ? Math.round(THRESHOLDS.reviewPass * 100) : Math.round(THRESHOLDS.quizPass * 100);
  if (percent < need) return `Aucun crédit cette fois : le seuil est de ${need} % de bonnes réponses. Relis les explications et recommence quand tu veux.`;
  if (kind === 'lesson') return 'Contrôle réussi. Les 10 crédits de la leçon sont versés quand tu la marques aussi comme terminée (une seule fois).';
  return 'Seuil atteint, mais ces crédits ont déjà été obtenus : une récompense n’est versée qu’une seule fois.';
}

interface Props {
  quizId: string;
  title: string;
  questions: Question[];
  /** Si vrai, démarre directement (quiz court d'une leçon) sans écran d'introduction. */
  compact?: boolean;
}

function QuestionView({
  q,
  selected,
  onToggle,
  reveal,
  index,
  total,
}: {
  q: Question;
  selected: number[];
  onToggle: (i: number) => void;
  reveal: boolean;
  index: number;
  total: number;
}) {
  const name = useId();
  const ok = isCorrect(q, selected);
  return (
    <fieldset>
      <div className="qmeta">
        <span>
          Question {index + 1} sur {total}
        </span>
        <span>{q.type === 'multiple' ? 'Plusieurs réponses possibles' : 'Une seule réponse'}</span>
      </div>
      <legend>{q.prompt}</legend>
      {q.context && (
        <div className="quiz-context">
          {q.context.kind === 'code' ? (
            <pre className="codeblock" style={{ margin: 0, background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', overflowX: 'auto' }} tabIndex={0}>
              <code>{q.context.text}</code>
            </pre>
          ) : (
            <blockquote style={{ margin: 0, borderLeft: '4px solid var(--border)', paddingLeft: 14 }}>{q.context.text}</blockquote>
          )}
        </div>
      )}
      {q.choices.map((c, i) => {
        const isSel = selected.includes(i);
        const isRight = q.correct.includes(i);
        let cls = 'choice';
        if (reveal) {
          if (isSel && isRight) cls += ' right';
          else if (isSel && !isRight) cls += ' wrong';
          else if (!isSel && isRight) cls += ' missed';
        } else if (isSel) cls += ' sel';
        return (
          <label key={i} className={cls}>
            <input
              type={q.type === 'multiple' ? 'checkbox' : 'radio'}
              name={name}
              checked={isSel}
              disabled={reveal}
              onChange={() => onToggle(i)}
            />
            <span>
              {reveal && isSel && isRight && <span className="tag result-ok">Bonne réponse</span>}
              {reveal && isSel && !isRight && <span className="tag result-bad">Réponse erronée</span>}
              {reveal && !isSel && isRight && <span className="tag result-ok">À cocher</span>}
              {c.text}
              {reveal && c.feedback && (isSel || isRight) && <span className="fb">{c.feedback}</span>}
            </span>
          </label>
        );
      })}
      {reveal && (
        <div className="explain" role="status">
          <strong className={ok ? 'result-ok' : 'result-bad'}>{ok ? 'Correct.' : 'Pas tout à fait.'}</strong> {q.explanation}
          {q.lessonId && lessonById.get(q.lessonId) && (
            <>
              {' '}
              <Link to={`/lecon/${q.lessonId}`}>Revoir la leçon</Link>
            </>
          )}
        </div>
      )}
    </fieldset>
  );
}

export function QuizRunner({ quizId, title, questions, compact }: Props) {
  const progress = useProgress();
  const previous = progress.quizzes[quizId];
  const [mode, setMode] = useState<Mode>('immediate');
  const [phase, setPhase] = useState<Phase>(compact ? 'running' : 'intro');
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [validated, setValidated] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const recorded = useRef(false);
  const [earned, setEarned] = useState<LedgerEntry[]>([]);

  const q = questions[idx];
  const selected = q ? answers[q.id] ?? [] : [];
  const score = useMemo(() => scoreQuiz(questions, answers), [questions, answers]);

  useEffect(() => {
    if (phase === 'done') headingRef.current?.focus();
  }, [phase]);

  function toggle(i: number) {
    if (!q) return;
    setAnswers((a) => {
      const cur = a[q.id] ?? [];
      if (q.type === 'single') return { ...a, [q.id]: [i] };
      return { ...a, [q.id]: cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i] };
    });
  }

  function finish() {
    if (!recorded.current) {
      const details: Record<string, boolean> = {};
      for (const qq of questions) details[qq.id] = isCorrect(qq, answers[qq.id] ?? []);
      setEarned(actions.recordQuiz(quizId, score.correct, score.total, details));
      recorded.current = true;
    }
    setPhase('done');
  }

  function next() {
    if (idx + 1 >= questions.length) finish();
    else {
      setIdx(idx + 1);
      setValidated(false);
    }
  }

  function restart() {
    setAnswers({});
    setIdx(0);
    setValidated(false);
    setPhase('running');
    recorded.current = false;
    setEarned([]);
  }

  if (questions.length === 0) return <p className="empty">Ce quiz ne contient pas encore de questions.</p>;

  if (phase === 'intro') {
    return (
      <section className="quiz" aria-label={title}>
        <p>
          {questions.length} questions. Choisis quand tu veux voir les corrections :
        </p>
        <div className="mode-pick" role="radiogroup" aria-label="Moment de la correction">
          <label>
            <input type="radio" name={`mode-${quizId}`} checked={mode === 'immediate'} onChange={() => setMode('immediate')} />
            <span>
              <strong>Après chaque question</strong>
              <br />
              <span className="muted small">Idéal pour apprendre pendant le quiz.</span>
            </span>
          </label>
          <label>
            <input type="radio" name={`mode-${quizId}`} checked={mode === 'final'} onChange={() => setMode('final')} />
            <span>
              <strong>À la fin du quiz</strong>
              <br />
              <span className="muted small">Plus proche d’un vrai test.</span>
            </span>
          </label>
        </div>
        {previous && (
          <p className="muted">
            Meilleur score : <strong>{previous.best} / {previous.total}</strong> — dernier : {previous.last} / {previous.total} ({previous.attempts} tentative{previous.attempts > 1 ? 's' : ''}).
          </p>
        )}
        <button className="btn" onClick={() => setPhase('running')}>
          {previous ? 'Recommencer le quiz' : 'Commencer le quiz'}
        </button>
      </section>
    );
  }

  if (phase === 'done') {
    return (
      <section className="quiz" aria-label={`Résultat — ${title}`}>
        <h2 ref={headingRef} tabIndex={-1} style={{ marginTop: 0 }}>Résultat</h2>
        <p className="score" aria-live="polite">
          {score.correct} / {score.total} <span className="muted" style={{ fontSize: '1.1rem', fontWeight: 400 }}>({score.percent} %)</span>
        </p>
        <p>{verdict(score.percent)}</p>
        <div className="credit-result" role="status">
          {earned.length > 0 ? (
            <ul>
              {earned.map((e) => (
                <li key={e.key}><strong>+{e.credits} crédits</strong> — {e.label}</li>
              ))}
            </ul>
          ) : (
            <p>{rewardMessage(quizId, score.percent, earned)}</p>
          )}
        </div>
        {previous && (
          <p className="muted small">
            Meilleur score enregistré sur cet appareil : {previous.best} / {previous.total}.
          </p>
        )}
        <div className="row">
          <button className="btn" onClick={restart}>Recommencer</button>
        </div>
        <h3>Correction détaillée</h3>
        {questions.map((qq, i) => (
          <div key={qq.id} className="review-item">
            <QuestionView q={qq} selected={answers[qq.id] ?? []} onToggle={() => {}} reveal index={i} total={questions.length} />
          </div>
        ))}
      </section>
    );
  }

  const reveal = mode === 'immediate' && validated;
  const last = idx + 1 >= questions.length;
  return (
    <section className="quiz" aria-label={title}>
      <div className="bar" role="progressbar" aria-label="Avancement du quiz" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={idx + (reveal ? 1 : 0)} style={{ marginBottom: 14 }}>
        <span style={{ width: `${((idx + (reveal ? 1 : 0)) / questions.length) * 100}%` }} />
      </div>
      <QuestionView q={q} selected={selected} onToggle={toggle} reveal={reveal} index={idx} total={questions.length} />
      <div className="row" style={{ marginTop: 12 }}>
        {mode === 'immediate' && !validated ? (
          <button className="btn" disabled={selected.length === 0} onClick={() => setValidated(true)}>
            Valider ma réponse
          </button>
        ) : (
          <button className="btn" disabled={mode === 'final' && selected.length === 0} onClick={next}>
            {last ? 'Voir mon score' : 'Question suivante'}
          </button>
        )}
        {selected.length === 0 && <span className="muted small">Sélectionne au moins une réponse.</span>}
      </div>
    </section>
  );
}
