import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LESSONS, MODULES, lessonLevel, lessonReadingMinutes, lessonsOfModule } from '../content';
import { LEVEL_LABEL } from '../content/modules';
import type { Level } from '../content/types';
import { lessonStatus, type LessonStatus } from '../lib/credits';
import { useProgress } from '../lib/progress';
import { LevelBadge, ProgressBar, Tick, usePageTitle } from '../components/ui';

const STATUS_LABEL: Record<LessonStatus, string> = { termine: 'Terminé', 'en-cours': 'En cours', 'a-decouvrir': 'À découvrir' };

export function Path() {
  usePageTitle('Parcours de formation');
  const progress = useProgress();
  const [level, setLevel] = useState<'all' | Level>('all');
  const [status, setStatus] = useState<'all' | LessonStatus>('all');
  const done = LESSONS.filter((l) => progress.completed[l.id]).length;
  const minutes = LESSONS.reduce((s, l) => s + lessonReadingMinutes(l), 0);
  const counts = { debutant: 0, intermediaire: 0, avance: 0 } as Record<Level, number>;
  for (const l of LESSONS) counts[lessonLevel(l)]++;

  return (
    <>
      <h1>Parcours de formation</h1>
      <p className="lead muted">
        {MODULES.length} modules, {LESSONS.length} leçons ({counts.debutant} niveau débutant, {counts.intermediaire} intermédiaire, {counts.avance} expert), environ {Math.round(minutes / 6) / 10} h de lecture au total (hors vidéos, quiz et exercices). Suis l’ordre proposé ou pioche selon ton niveau.
      </p>
      <ProgressBar value={done} max={LESSONS.length} label="Progression globale" tone="ok" />
      <p className="small muted">{done} leçon{done > 1 ? 's' : ''} terminée{done > 1 ? 's' : ''} sur {LESSONS.length}. Tu veux chercher un sujet ? <Link to="/recherche">Recherche dans les cours</Link>.</p>

      <div className="filters" role="group" aria-label="Filtrer les leçons">
        <div className="f">
          <label htmlFor="p-l">Niveau</label>
          <select id="p-l" value={level} onChange={(e) => setLevel(e.target.value as 'all' | Level)}>
            <option value="all">Tous les niveaux</option>
            {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
          </select>
        </div>
        <div className="f">
          <label htmlFor="p-s">Statut</label>
          <select id="p-s" value={status} onChange={(e) => setStatus(e.target.value as 'all' | LessonStatus)}>
            <option value="all">Tous les statuts</option>
            <option value="a-decouvrir">À découvrir</option>
            <option value="en-cours">En cours</option>
            <option value="termine">Terminé</option>
          </select>
        </div>
      </div>

      {MODULES.map((m) => {
        const all = lessonsOfModule(m.id);
        const lessons = all.filter((l) => (level === 'all' || lessonLevel(l) === level) && (status === 'all' || lessonStatus(progress, l.id) === status));
        if (lessons.length === 0) return null;
        const n = all.filter((l) => progress.completed[l.id]).length;
        const modStatus: LessonStatus = n === all.length ? 'termine' : n > 0 || all.some((l) => lessonStatus(progress, l.id) === 'en-cours') ? 'en-cours' : 'a-decouvrir';
        return (
          <section key={m.id} aria-labelledby={`m-${m.id}`}>
            <h2 id={`m-${m.id}`}>
              <Link to={`/module/${m.id}`} style={{ color: 'inherit' }}>Module {m.number} — {m.title}</Link>{' '}
              <LevelBadge level={m.level} />
            </h2>
            <p className="muted">{m.objective}</p>
            <p className="small muted">{STATUS_LABEL[modStatus]} · {n}/{all.length} leçons terminées</p>
            <ol className="res-list" style={{ listStyle: 'none' }}>
              {lessons.map((l) => {
                const st = lessonStatus(progress, l.id);
                const lv = lessonLevel(l);
                return (
                  <li key={l.id} className="row between" style={{ flexWrap: 'nowrap' }}>
                    <span className="row" style={{ flexWrap: 'nowrap', gap: 10, alignItems: 'flex-start' }}>
                      <Tick done={st === 'termine'} />
                      <span>
                        <Link to={`/lecon/${l.id}`}>{l.title}</Link>
                        {lv !== m.level && <> <LevelBadge level={lv} /></>}
                      </span>
                    </span>
                    <span className="muted small nowrap">{STATUS_LABEL[st]} · {lessonReadingMinutes(l)} min</span>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </>
  );
}
