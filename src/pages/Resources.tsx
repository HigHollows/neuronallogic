import { useEffect, useMemo, useState } from 'react';
import { DOCS } from '../content/docs';
import { LESSONS, VIDEOS } from '../content';
import { LEVEL_LABEL, MODULES } from '../content/modules';
import type { DocResource, Level, Video } from '../content/types';
import { DocCard, KIND_LABEL, VideoCard } from '../components/ResourceCards';
import { usePageTitle } from '../components/ui';
import { normalize } from '../lib/text';
import { useLocation } from 'react-router-dom';

const lessonModule = new Map(LESSONS.map((l) => [l.id, l.moduleId]));

type Item = { kind: 'video'; v: Video } | { kind: 'doc'; d: DocResource };

export function ResourcesPage() {
  usePageTitle('Bibliothèque de ressources');
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [theme, setTheme] = useState('all');
  const [level, setLevel] = useState<'all' | Level>('all');
  const [lang, setLang] = useState('all');
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView(), 0);
  }, [hash]);

  const items: Item[] = useMemo(() => [...VIDEOS.map((v) => ({ kind: 'video' as const, v })), ...DOCS.map((d) => ({ kind: 'doc' as const, d }))], []);
  const nq = normalize(q);

  const filtered = items.filter((it) => {
    const r = it.kind === 'video' ? it.v : it.d;
    const kind = it.kind === 'video' ? 'video' : it.d.kind;
    if (type !== 'all' && type !== kind) return false;
    if (theme !== 'all' && !r.lessonIds.some((l) => lessonModule.get(l) === theme)) return false;
    if (level !== 'all' && r.level !== level) return false;
    if (lang !== 'all' && (it.kind === 'video' ? it.v.language : it.d.language) !== lang) return false;
    if (nq) {
      const text = it.kind === 'video'
        ? `${it.v.title} ${it.v.channel} ${it.v.note ?? ''} ${it.v.topics.join(' ')}`
        : `${it.d.title} ${it.d.org} ${it.d.description} ${it.d.topics.join(' ')}`;
      if (!normalize(text).includes(nq)) return false;
    }
    return true;
  });
  const nVid = filtered.filter((i) => i.kind === 'video').length;

  return (
    <>
      <h1>Bibliothèque de ressources</h1>
      <p className="muted">
        {VIDEOS.length} vidéos et {DOCS.length} documentations, toutes <strong>externes</strong> : ce site ne les produit ni ne les héberge. Chaque lien a été testé et chaque vidéo vérifiée (existence, titre, chaîne, durée, sous-titres publiés) à la date indiquée. Le contenu des vidéos n’a pas été revu image par image : les notes décrivent leur intérêt, pas une garantie d’exactitude. La plupart sont en anglais.
      </p>
      <div className="filters" role="search" aria-label="Filtrer les ressources">
        <div className="f grow">
          <label htmlFor="r-q">Recherche</label>
          <input id="r-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ex. MCP, RAG, API…" />
        </div>
        <div className="f">
          <label htmlFor="r-t">Type</label>
          <select id="r-t" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">Tous les types</option>
            <option value="video">Vidéos YouTube</option>
            {(Object.keys(KIND_LABEL) as (keyof typeof KIND_LABEL)[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </select>
        </div>
        <div className="f">
          <label htmlFor="r-th">Thème (module)</label>
          <select id="r-th" value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="all">Tous les thèmes</option>
            {MODULES.map((m) => <option key={m.id} value={m.id}>{m.number}. {m.title}</option>)}
          </select>
        </div>
        <div className="f">
          <label htmlFor="r-l">Niveau</label>
          <select id="r-l" value={level} onChange={(e) => setLevel(e.target.value as 'all' | Level)}>
            <option value="all">Tous les niveaux</option>
            {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
          </select>
        </div>
        <div className="f">
          <label htmlFor="r-lg">Langue</label>
          <select id="r-lg" value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="all">Toutes</option>
            <option value="fr">Français</option>
            <option value="en">Anglais</option>
          </select>
        </div>
      </div>
      <p role="status" className="small muted">
        {filtered.length} ressource{filtered.length > 1 ? 's' : ''} ({nVid} vidéo{nVid > 1 ? 's' : ''}, {filtered.length - nVid} documentation{filtered.length - nVid > 1 ? 's' : ''}).
      </p>
      {filtered.length === 0 ? (
        <p className="empty">
          Aucune ressource ne correspond à ces filtres.{' '}
          <button className="btn secondary small" onClick={() => { setQ(''); setType('all'); setTheme('all'); setLevel('all'); setLang('all'); }}>Réinitialiser</button>
        </p>
      ) : (
        <div className="res-grid">
          <h2 className="sr-only">Liste des ressources</h2>
          {filtered.map((it) => it.kind === 'video' ? <VideoCard key={it.v.id} v={it.v} /> : <DocCard key={it.d.id} d={it.d} />)}
        </div>
      )}
      <p className="small muted" style={{ marginTop: 28 }}>
        Les liens externes peuvent évoluer ; la vérification automatique se relance avec <code>npm run verify:videos</code> et <code>npm run verify:links</code>.
      </p>
    </>
  );
}
