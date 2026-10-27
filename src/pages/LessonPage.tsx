import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { docById } from '../content/docs';
import { Blocks } from '../components/Blocks';
import { Diagram } from '../components/diagrams';
import { QuizRunner } from '../components/QuizRunner';
import { DocCard, VideoCard } from '../components/ResourceCards';
import { Rich } from '../components/Rich';
import { LevelBadge, usePageTitle } from '../components/ui';
import { lessonById, lessonLevel, lessonReadingMinutes, lessonsOfModule, moduleById, neighbours, videoById } from '../content';
import { lessonCheckPassed, weakLessons } from '../lib/credits';
import { REWARDS, THRESHOLDS } from '../lib/creditsConfig';
import { termById } from '../content/glossary';
import { actions, useProgress } from '../lib/progress';
import { NotFound } from './NotFound';

export function LessonPage() {
  const { id = '' } = useParams();
  const lesson = lessonById.get(id);
  usePageTitle(lesson ? lesson.title : 'Leçon introuvable');
  const progress = useProgress();
  const { hash } = useLocation();
  const [shareMsg, setShareMsg] = useState('');

  useEffect(() => {
    if (lesson) actions.setLesson(lesson.id);
  }, [lesson]);

  // Un lien direct vers une section (#s-schema) doit atteindre la section une fois le contenu affiché.
  useEffect(() => {
    if (hash && lesson) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash, lesson]);

  if (!lesson) return <NotFound what="Leçon" />;
  const mod = moduleById.get(lesson.moduleId)!;
  const { prev, next } = neighbours(lesson.id);
  const index = lessonsOfModule(mod.id).findIndex((l) => l.id === lesson.id);
  const done = !!progress.completed[lesson.id];
  const videos = (lesson.videoIds ?? []).map((v) => videoById.get(v)).filter((v): v is NonNullable<typeof v> => !!v);
  const docs = (lesson.docIds ?? []).map((d) => docById.get(d)).filter((d): d is NonNullable<typeof d> => !!d);
  const prereqs = (lesson.prerequisites ?? []).map((p) => lessonById.get(p)).filter((p): p is NonNullable<typeof p> => !!p);
  const relatedTerms = (lesson.related.terms ?? []).map((t) => termById.get(t)).filter((t): t is NonNullable<typeof t> => !!t);
  const relatedLessons = (lesson.related.lessons ?? []).map((l) => lessonById.get(l)).filter((l): l is NonNullable<typeof l> => !!l);
  const glossary = (lesson.glossarySet ?? []).map((t) => termById.get(t)).filter((t): t is NonNullable<typeof t> => !!t);

  const sections: { id: string; label: string }[] = [
    { id: 's-simple', label: 'En clair' },
    { id: 's-technique', label: 'Explication technique' },
    ...(glossary.length ? [{ id: 's-fiches', label: 'Les fiches' }] : []),
    { id: 's-exemple', label: 'Exemple concret' },
    ...(lesson.diagram ? [{ id: 's-schema', label: 'Schéma' }] : []),
    { id: 's-idees', label: 'Idées reçues' },
    { id: 's-reel', label: 'Dans un système réel' },
    ...(lesson.activity ? [{ id: 's-pratique', label: 'Mets en pratique' }] : []),
    ...(videos.length || docs.length ? [{ id: 's-ressources', label: 'Pour aller plus loin' }] : []),
    { id: 's-resume', label: 'À retenir' },
    { id: 's-verif', label: 'Vérifie-toi' },
    { id: 's-liens', label: 'Notions liées' },
  ];

  return (
    <article>
      <p className="crumbs">
        <Link to="/parcours">Parcours</Link> › <Link to={`/module/${mod.id}`}>Module {mod.number} — {mod.title}</Link> › Leçon {mod.number}.{index + 1}
      </p>
      <h1>{lesson.title}</h1>
      <div className="lesson-meta">
        <LevelBadge level={lessonLevel(lesson)} />
        <span>Lecture : environ {lessonReadingMinutes(lesson)} min</span>
        <span>Leçon {index + 1} sur {lessonsOfModule(mod.id).length} du module {mod.number}</span>
        {done && <span className="badge lvl-debutant">Terminée</span>}
      </div>
      <div className="row small" style={{ margin: '-8px 0 14px' }}>
        <button
          className="btn secondary small"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(window.location.origin + '/lecon/' + lesson.id);
              setShareMsg('Lien copié.');
            } catch {
              setShareMsg('Copie impossible : copie l’adresse dans la barre du navigateur.');
            }
          }}
        >
          Copier le lien de la leçon
        </button>
        <button className="btn secondary small" onClick={() => window.print()}>Imprimer</button>
        <span role="status" className="muted" aria-live="polite">{shareMsg}</span>
      </div>
      <p className="objective"><strong>Objectif.</strong> {lesson.objective}</p>
      {prereqs.length > 0 && (
        <p className="small">
          <strong>Avant de commencer :</strong>{' '}
          {prereqs.map((p, i) => (
            <span key={p.id}>{i > 0 && ', '}<Link to={`/lecon/${p.id}`}>{p.title}</Link></span>
          ))}
          .
        </p>
      )}
      <nav className="toc" aria-label="Sur cette page">
        <strong>Sur cette page</strong>
        <ol>
          {sections.map((s) => (
            <li key={s.id}><a href={`#${s.id}`}>{s.label}</a></li>
          ))}
        </ol>
      </nav>

      <section className="lesson-section" id="s-simple" aria-labelledby="h-simple">
        <h2 id="h-simple">En clair</h2>
        {lesson.simple.map((p, i) => <p key={i}><Rich text={p} /></p>)}
      </section>

      <section className="lesson-section" id="s-technique" aria-labelledby="h-tech">
        <h2 id="h-tech">Explication technique</h2>
        <Blocks blocks={lesson.technical} />
      </section>

      {glossary.length > 0 && (
        <section className="lesson-section" id="s-fiches" aria-labelledby="h-fiches">
          <h2 id="h-fiches">Les fiches de cette série</h2>
          <p className="muted">Chaque notion a sa fiche complète (définition, explication, exemple, analogie et sa limite, notions liées, erreur fréquente).</p>
          {glossary.map((t) => (
            <div key={t.id} className="fiche-inline" id={t.id}>
              <h3>
                <span className="n">{t.n}.</span>
                <Link to={`/notions/${t.id}`}>{t.fr}</Link>
                {t.en && <span className="muted small">{t.en}</span>}
              </h3>
              <p><strong>{t.definition}</strong></p>
              <p>{t.explanation}</p>
              <p><em>Exemple :</em> {t.example}</p>
              {t.analogy && <p><em>Analogie :</em> {t.analogy.text} <span className="muted">Limite : {t.analogy.limit}</span></p>}
              <p><em>Erreur fréquente :</em> {t.mistake}</p>
            </div>
          ))}
        </section>
      )}

      <section className="lesson-section" id="s-exemple" aria-labelledby="h-ex">
        <h2 id="h-ex">Exemple concret : {lesson.example.title}</h2>
        <Blocks blocks={lesson.example.blocks} />
      </section>

      {lesson.diagram && (
        <section className="lesson-section" id="s-schema" aria-label="Schémas">
          <h2 id="h-schema">Schéma</h2>
          <Diagram d={lesson.diagram} />
          {lesson.extraDiagrams?.map((d) => <Diagram key={d.id} d={d} />)}
        </section>
      )}
      {!lesson.diagram && lesson.extraDiagrams?.map((d) => <Diagram key={d.id} d={d} />)}

      <section className="lesson-section" id="s-idees" aria-labelledby="h-idees">
        <h2 id="h-idees">Erreurs et idées reçues</h2>
        {lesson.misconceptions.map((m, i) => (
          <div className="myth" key={i}>
            <div className="m"><b>Idée reçue</b>{m.myth}</div>
            <div className="r"><b>En réalité</b>{m.reality}</div>
          </div>
        ))}
      </section>

      <section className="lesson-section" id="s-reel" aria-labelledby="h-reel">
        <h2 id="h-reel">Dans un système réel</h2>
        <p>{lesson.realWorld}</p>
      </section>

      {lesson.activity && (
        <section className="lesson-section" id="s-pratique" aria-labelledby="h-pratique">
          <h2 id="h-pratique">Mets en pratique : {lesson.activity.title}</h2>
          <p className="muted small">Activité facultative pour t’entraîner. Elle ne rapporte pas de crédits : elle sert à comprendre.</p>
          <ol>{lesson.activity.steps.map((st, i) => <li key={i}>{st}</li>)}</ol>
          <p><strong>Ce que tu auras acquis :</strong> {lesson.activity.outcome}</p>
        </section>
      )}

      {(videos.length > 0 || docs.length > 0) && (
        <section className="lesson-section" id="s-ressources" aria-labelledby="h-res">
          <h2 id="h-res">Pour aller plus loin</h2>
          <p className="muted small">Ressources externes, non produites par ce site. Les vidéos sont majoritairement en anglais ; vérifie le niveau avant de te lancer.</p>
          <div className="res-grid">
            {videos.map((v) => <VideoCard key={v.id} v={v} showLessons={false} />)}
            {docs.map((d) => <DocCard key={d.id} d={d} showLessons={false} />)}
          </div>
        </section>
      )}

      <section className="lesson-section" id="s-resume" aria-labelledby="h-resume">
        <h2 id="h-resume">À retenir</h2>
        <ul>{lesson.summary.map((s, i) => <li key={i}>{s}</li>)}</ul>
      </section>

      <section className="lesson-section" id="s-verif" aria-labelledby="h-verif">
        <h2 id="h-verif">Vérifie-toi</h2>
        <p className="muted small">
          Contrôle de compréhension : {lesson.checkQuestions.length} questions. Leçon terminée <em>et</em> contrôle réussi (au moins {Math.round(THRESHOLDS.lessonCheckPass * 100)} %) = <strong>{REWARDS.lesson} crédits</strong>, versés une seule fois. {lessonCheckPassed(progress, lesson.id) ? 'Contrôle déjà réussi.' : ''}
        </p>
        {weakLessons(progress).some((w) => w.lessonId === lesson.id) && (
          <p className="callout limit" style={{ padding: '8px 14px' }}>
            Tu as manqué des questions de cette leçon lors de ta dernière tentative. Relis la partie « En clair » et « Idées reçues », puis recommence ci-dessous ou lance un <Link to="/defis">défi de révision</Link>.
          </p>
        )}
        <QuizRunner key={lesson.id} quizId={`check-${lesson.id}`} title={`Vérification — ${lesson.title}`} questions={lesson.checkQuestions} compact />
      </section>

      <section className="lesson-section" id="s-liens" aria-labelledby="h-liens">
        <h2 id="h-liens">Notions et leçons liées</h2>
        {relatedTerms.length > 0 && (
          <ul className="chips" aria-label="Notions liées">
            {relatedTerms.map((t) => <li key={t.id}><Link className="chip" to={`/notions/${t.id}`}>{t.fr}</Link></li>)}
          </ul>
        )}
        {relatedLessons.length > 0 && (
          <ul className="chips" aria-label="Leçons liées">
            {relatedLessons.map((l) => <li key={l.id}><Link className="chip" to={`/lecon/${l.id}`}>Leçon : {l.title}</Link></li>)}
          </ul>
        )}
      </section>

      <div className="complete-box">
        <span>
          {done ? 'Tu as terminé cette leçon.' : 'Tu as lu la leçon et répondu aux questions ?'}
        </span>
        <button className={done ? 'btn secondary' : 'btn'} onClick={() => actions.toggleLesson(lesson.id)} aria-pressed={done}>
          {done ? '✓ Terminée — annuler' : 'Marquer comme terminée'}
        </button>
      </div>

      <nav className="lesson-nav" aria-label="Navigation entre leçons">
        {prev ? (
          <Link to={`/lecon/${prev.id}`} rel="prev"><span className="dir">← Leçon précédente</span>{prev.title}</Link>
        ) : <span />}
        {next ? (
          <Link to={`/lecon/${next.id}`} rel="next" className="next"><span className="dir">Leçon suivante →</span>{next.title}</Link>
        ) : (
          <Link to="/projet-final" className="next"><span className="dir">Et maintenant →</span>Projet final guidé</Link>
        )}
      </nav>
    </article>
  );
}
