import { useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { EXTRA_TERMS, GROUPS, TERMS, termById } from '../content/glossary';
import { lessonById } from '../content';
import { normalize } from '../lib/text';
import { usePageTitle } from '../components/ui';
import { NotFound } from './NotFound';
import { useEffect } from 'react';

export function GlossaryPage() {
  usePageTitle('Glossaire des 50 notions');
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('all');
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  const nq = normalize(q);
  const list = useMemo(
    () =>
      TERMS.filter((t) => (group === 'all' || t.group === group) && (!nq || normalize(`${t.fr} ${t.en ?? ''} ${t.definition} ${t.explanation}`).includes(nq))),
    [nq, group],
  );
  const extras = useMemo(
    () => EXTRA_TERMS.filter((t) => !nq || normalize(`${t.fr} ${t.en ?? ''} ${t.definition}`).includes(nq)),
    [nq],
  );

  return (
    <>
      <h1>Glossaire des 50 notions essentielles</h1>
      <p className="muted">
        Chaque notion a sa fiche : définition, explication, exemple, analogie (avec sa limite), notions liées, erreur fréquente et leçon associée. Pour réviser :{' '}
        <Link to="/quiz/quiz-glossaire">quiz récapitulatif des 50 notions</Link>.
      </p>
      <div className="filters">
        <div className="f grow">
          <label htmlFor="g-q">Filtrer par mot</label>
          <input id="g-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ex. token, RAG, agent…" />
        </div>
        <div className="f">
          <label htmlFor="g-g">Famille</label>
          <select id="g-g" value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="all">Toutes les familles</option>
            {GROUPS.map((g) => (
              <option key={g.id} value={g.id}>{g.title} ({g.range})</option>
            ))}
          </select>
        </div>
      </div>
      <p role="status" className="small muted">
        {list.length} notion{list.length > 1 ? 's' : ''} sur {TERMS.length}{extras.length ? ` · ${extras.length} terme${extras.length > 1 ? 's' : ''} complémentaire${extras.length > 1 ? 's' : ''}` : ''}.
      </p>
      {list.length === 0 ? (
        <p className="empty">Aucune notion ne correspond à « {q} ».{' '}<button className="btn secondary small" onClick={() => { setQ(''); setGroup('all'); }}>Réinitialiser les filtres</button></p>
      ) : (
        <ul className="term-list">
          {list.map((t) => (
            <li key={t.id}>
              <span className="n">{t.n}</span>
              <div>
                <Link className="t" to={`/notions/${t.id}`}>{t.fr}</Link>
                {t.en && <span className="muted small"> · {t.en}</span>}
                <p>{t.definition}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {extras.length > 0 && (
        <>
          <h2 id="complementaire">Glossaire complémentaire</h2>
          <p className="muted">Vingt-trois autres termes utiles, à consulter quand tu les croises dans une documentation. Pas besoin de les mémoriser d’un coup.</p>
          <dl>
            {extras.map((t) => (
              <div key={t.id} id={t.id} style={{ marginBottom: 12 }}>
                <dt><strong>{t.fr}</strong>{t.en && <span className="muted small"> · {t.en}</span>}</dt>
                <dd style={{ margin: '2px 0 0' }}>{t.definition}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </>
  );
}

export function TermPage() {
  const { id = '' } = useParams();
  const t = termById.get(id);
  usePageTitle(t ? t.fr : 'Notion introuvable');
  if (!t) return <NotFound what="Notion" />;
  const lesson = lessonById.get(t.lessonId);
  const group = GROUPS.find((g) => g.id === t.group);
  const prev = TERMS.find((x) => x.n === t.n - 1);
  const next = TERMS.find((x) => x.n === t.n + 1);
  const related = t.related.map((r) => termById.get(r)).filter((r): r is NonNullable<typeof r> => !!r);
  return (
    <>
      <p className="crumbs"><Link to="/notions">Glossaire</Link> › {group?.title} › Notion {t.n} sur 50</p>
      <h1>{t.fr}</h1>
      {t.en && <p className="muted" style={{ marginTop: -8 }}>En anglais : {t.en}</p>}
      <div className="fiche">
        <dl>
          <dt>Définition simple</dt>
          <dd className="def">{t.definition}</dd>
          <dt>Pour aller plus loin</dt>
          <dd>{t.explanation}</dd>
          <dt>Exemple concret</dt>
          <dd>{t.example}</dd>
          {t.analogy && (
            <>
              <dt>Analogie — et sa limite</dt>
              <dd>{t.analogy.text} <span className="muted">Limite : {t.analogy.limit}</span></dd>
            </>
          )}
          <dt>Erreur fréquente à éviter</dt>
          <dd>{t.mistake}</dd>
          <dt>Notions liées</dt>
          <dd>
            <ul className="chips" style={{ margin: 0 }}>
              {related.map((r) => <li key={r.id}><Link className="chip" to={`/notions/${r.id}`}>{r.fr}</Link></li>)}
            </ul>
          </dd>
          <dt>Leçon complète</dt>
          <dd>
            {lesson ? <Link to={`/lecon/${lesson.id}`}>{lesson.title}</Link> : '—'}
            {' · '}
            <Link to={`/lecon/${GROUPS.find((g) => g.id === t.group)?.lessonId}`}>Série de fiches « {group?.title} »</Link>
          </dd>
        </dl>
      </div>
      <nav className="lesson-nav" aria-label="Notion précédente et suivante">
        {prev ? <Link to={`/notions/${prev.id}`}><span className="dir">← Notion {prev.n}</span>{prev.fr}</Link> : <span />}
        {next ? <Link to={`/notions/${next.id}`} className="next"><span className="dir">Notion {next.n} →</span>{next.fr}</Link> : <span />}
      </nav>
    </>
  );
}
