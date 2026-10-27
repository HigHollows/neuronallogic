import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { DocResource, Video } from '../content/types';
import { lessonById } from '../content';
import { formatDuration } from '../lib/text';
import { LevelBadge } from './ui';
import { ExternalLink } from './Rich';

const KIND_LABEL: Record<DocResource['kind'], string> = {
  documentation: 'Documentation',
  cours: 'Cours',
  tutoriel: 'Tutoriel / article',
  reference: 'Fiche de référence',
  code: 'Exemples de code / outil',
};
export { KIND_LABEL };

function LessonLinks({ ids }: { ids: string[] }) {
  const items = ids.map((id) => lessonById.get(id)).filter((l): l is NonNullable<typeof l> => !!l);
  if (items.length === 0) return null;
  return (
    <p className="links">
      Leçon{items.length > 1 ? 's' : ''} liée{items.length > 1 ? 's' : ''} :{' '}
      {items.map((l, i) => (
        <span key={l.id}>
          {i > 0 && ' · '}
          <Link to={`/lecon/${l.id}`}>{l.title}</Link>
        </span>
      ))}
    </p>
  );
}

export function VideoCard({ v, showLessons = true }: { v: Video; showLessons?: boolean }) {
  const [embed, setEmbed] = useState(false);
  const watch = `https://www.youtube.com/watch?v=${v.id}`;
  const search = `https://www.youtube.com/results?search_query=${encodeURIComponent(v.title)}`;
  return (
    <article className="res" id={v.id} aria-labelledby={`t-${v.id}`}>
      <div className="meta">
        <span className="badge">Vidéo YouTube externe</span>
        <LevelBadge level={v.level} />
        <span className="badge">{v.language === 'fr' ? 'En français' : 'En anglais'}</span>
      </div>
      <h3 id={`t-${v.id}`}>{v.title}</h3>
      <p>
        <strong>{v.channel}</strong> · {formatDuration(v.seconds)}
        {v.publishedAt ? ` · publiée le ${v.publishedAt}` : ''}
      </p>
      {v.note && <p>{v.note}</p>}
      <p className="small">
        {v.language === 'en' ? (v.frenchSubtitles ? 'Sous-titres français publiés avec la vidéo (à activer dans le lecteur).' : 'Sous-titres français non détectés : sous-titres anglais ou traduction automatique du lecteur.') : 'Vidéo en français.'}
      </p>
      {embed ? (
        <div className="thumb">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${v.id}`}
            title={`Lecteur : ${v.title}`}
            allow="encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            loading="lazy"
          />
        </div>
      ) : null}
      <div className="actions">
        <ExternalLink href={watch} className="btn small">Regarder sur YouTube</ExternalLink>
        {!embed ? (
          <button className="btn secondary small" onClick={() => setEmbed(true)} aria-label={`Charger le lecteur intégré pour ${v.title}`}>
            Lecteur intégré
          </button>
        ) : (
          <button className="btn secondary small" onClick={() => setEmbed(false)}>Masquer le lecteur</button>
        )}
      </div>
      <p className="small muted">
        Le lecteur intégré ne se charge qu’au clic (mode sans cookies de YouTube). Vidéo vérifiée le {v.verifiedAt} (existence, titre, chaîne, durée). Si elle a disparu :{' '}
        <ExternalLink href={search}>rechercher ce titre</ExternalLink>
        {' '}— et signale-le, la ressource doit alors être vérifiée.
      </p>
      {showLessons && <LessonLinks ids={v.lessonIds} />}
    </article>
  );
}

export function DocCard({ d, showLessons = true }: { d: DocResource; showLessons?: boolean }) {
  return (
    <article className="res" id={d.id} aria-labelledby={`t-${d.id}`}>
      <div className="meta">
        <span className="badge">{KIND_LABEL[d.kind]}</span>
        <LevelBadge level={d.level} />
        <span className="badge">{d.language === 'fr' ? 'En français' : 'En anglais'}</span>
      </div>
      <h3 id={`t-${d.id}`}>{d.title}</h3>
      <p><strong>{d.org}</strong></p>
      <p>{d.description}</p>
      <div className="actions">
        <ExternalLink href={d.url} className="btn small">Ouvrir la ressource</ExternalLink>
      </div>
      <p className="small muted">Lien vérifié le {d.verified} — le contenu externe peut évoluer.</p>
      {showLessons && <LessonLinks ids={d.lessonIds} />}
    </article>
  );
}
