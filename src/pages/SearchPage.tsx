import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getIndex } from '../content/searchIndex';
import { search, type SearchKind } from '../lib/search';
import { usePageTitle } from '../components/ui';

const KIND_LABEL: Record<SearchKind, string> = {
  lecon: 'Leçon',
  notion: 'Notion',
  ressource: 'Documentation',
  video: 'Vidéo',
  module: 'Module',
  studio: 'Studio',
};

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  usePageTitle(q ? `Recherche : ${q}` : 'Recherche');
  const results = useMemo(() => (q.trim() ? search(getIndex(), q) : []), [q]);

  return (
    <>
      <h1>Recherche</h1>
      <form role="search" onSubmit={(e) => e.preventDefault()} className="filters">
        <div className="f grow">
          <label htmlFor="s-q">Titres, définitions et leçons</label>
          <input id="s-q" type="search" value={q} onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })} placeholder="ex. injection de prompt, embedding, 429…" autoFocus />
        </div>
      </form>
      <div role="status" aria-live="polite" className="small muted">
        {q.trim() ? `${results.length} résultat${results.length > 1 ? 's' : ''} pour « ${q} »` : 'Saisis un mot pour chercher dans les leçons, les 50 notions, les ressources et les vidéos.'}
      </div>
      {q.trim() && results.length === 0 && (
        <p className="empty">
          Aucun résultat. Essaie un mot plus court ou un synonyme. Tu peux aussi parcourir le <Link to="/notions">glossaire</Link> ou le <Link to="/parcours">parcours</Link>.
        </p>
      )}
      <div>
        {results.map((r) => (
          <div className="search-hit" key={`${r.entry.kind}-${r.entry.id}`}>
            <span className="kind">{KIND_LABEL[r.entry.kind]}</span>
            <h2><Link to={r.entry.to}>{r.entry.title}</Link></h2>
            <p>{r.snippet}</p>
          </div>
        ))}
      </div>
    </>
  );
}
