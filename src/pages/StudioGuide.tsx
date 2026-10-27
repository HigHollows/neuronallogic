import '../styles/studio.css';
import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { usePageTitle } from '../components/ui';
import { lessonById } from '../content';
import { normalize } from '../lib/text';
import { actions, useProgress } from '../lib/progress';
import { CATEGORIES, componentById, COMPONENTS } from '../studio/data/components';
import { ALL_GUIDES, ARCHITECTURE_GUIDES, GETTING_STARTED, guideById, TROUBLESHOOTING, type Guide } from '../studio/data/guides';
import { templateById } from '../studio/data/templates';
import { MiniDiagram } from '../studio/ui/parts';
import { DATA_LABEL } from '../studio/connections';

const href = (id: string) => `/studio/guide/${id}`;
const titleOf = (id: string): string => (id === 'depannage' ? 'Dépannage' : guideById(id)?.title ?? id);

function Crumbs({ here }: { here?: string }) {
  return (
    <nav aria-label="Fil d’Ariane" className="muted small">
      <Link to="/studio">Studio</Link> › <Link to="/studio/guide">Guide du Studio</Link>{here ? <> › {here}</> : null}
    </nav>
  );
}

export function StudioGuideIndex() {
  usePageTitle('Guide du Studio');
  const progress = useProgress();
  const [q, setQ] = useState('');
  const nq = normalize(q);
  const read = progress.studio.guides;
  const readList = Object.entries(read).sort((a, b) => b[1].localeCompare(a[1]));
  const hit = (s: string) => !nq || normalize(s).includes(nq);
  const arch = ARCHITECTURE_GUIDES.filter((g) => hit(`${g.title} ${g.summary}`));
  const troubles = TROUBLESHOOTING.filter((t) => hit(`${t.title} ${t.observe} ${t.fix}`));
  const comps = COMPONENTS.filter((c) => hit(`${c.name} ${c.short} ${c.keywords.join(' ')}`));
  return (
    <>
      <Crumbs />
      <h1>Guide du Studio</h1>
      <p className="muted">Comprendre le Studio, chaque composant, les architectures courantes et les erreurs fréquentes. <strong>Consulter un guide n’est pas le maîtriser</strong> : il ne rapporte aucun crédit ; ce sont les défis et le tutoriel qui valident une compétence.</p>
      <div className="row"><Link className="btn" to="/studio">Ouvrir le Studio</Link></div>
      <label htmlFor="g-q" className="sr-only">Rechercher dans le guide</label>
      <input id="g-q" type="search" placeholder="Rechercher un composant, une architecture, une erreur…" value={q} onChange={(e) => setQ(e.target.value)} />
      {nq && !arch.length && !troubles.length && !comps.length && !hit(GETTING_STARTED.title) && <p role="status" className="muted">Aucun résultat pour « {q} ».</p>}

      {hit(`${GETTING_STARTED.title} ${GETTING_STARTED.summary}`) && (
        <section aria-labelledby="g-start"><h2 id="g-start">Pour commencer</h2>
          <ul><li><Link to={href(GETTING_STARTED.id)}>{GETTING_STARTED.title}</Link> — {GETTING_STARTED.summary}{read[GETTING_STARTED.id] && <span className="chip ok"> consulté</span>}</li></ul>
        </section>
      )}
      {arch.length > 0 && (
        <section aria-labelledby="g-arch"><h2 id="g-arch">Architectures</h2>
          <ul>{arch.map((g) => <li key={g.id}><Link to={href(g.id)}>{g.title}</Link> — {g.summary}{read[g.id] && <span className="chip ok"> consulté</span>}</li>)}</ul>
        </section>
      )}
      {(troubles.length > 0 || !nq) && (
        <section aria-labelledby="g-dep"><h2 id="g-dep">Dépannage</h2>
          <p><Link to={href('depannage')}>Comprendre les {TROUBLESHOOTING.length} types de remarques du vérificateur</Link>{read.depannage && <span className="chip ok"> consulté</span>}</p>
          {nq && <ul>{troubles.map((t) => <li key={t.code}><Link to={`${href('depannage')}#${t.code}`}>{t.title}</Link></li>)}</ul>}
        </section>
      )}
      {comps.length > 0 && (
        <section aria-labelledby="g-comp"><h2 id="g-comp">Composants ({comps.length})</h2>
          {CATEGORIES.map((cat) => {
            const items = comps.filter((c) => c.category === cat.id);
            return items.length ? (
              <div key={cat.id}><h3>{cat.name}</h3>
                <ul className="cols">{items.map((c) => <li key={c.id}><Link to={href(`composant/${c.id}`)}>{c.name}</Link>{read[`composant/${c.id}`] && <span className="chip ok"> consulté</span>}</li>)}</ul>
              </div>
            ) : null;
          })}
        </section>
      )}
      <section aria-labelledby="g-read"><h2 id="g-read">Guides consultés récemment</h2>
        {readList.length === 0 ? <p className="muted">Aucun guide consulté pour l’instant.</p> : (
          <ul>{readList.slice(0, 8).map(([id, at]) => <li key={id}><Link to={href(id)}>{titleOf(id)}</Link> <span className="muted small">— {at.slice(0, 10)}</span></li>)}</ul>
        )}
      </section>
    </>
  );
}

function Related({ g }: { g: Guide }) {
  if (!g.related.length) return null;
  return (
    <section aria-labelledby="g-rel"><h2 id="g-rel">Pour aller plus loin</h2>
      <ul>{g.related.map((id) => <li key={id}><Link to={href(id)}>{titleOf(id)}</Link></li>)}</ul>
    </section>
  );
}

function ComponentExtras({ id }: { id: string }) {
  const c = componentById.get(id);
  if (!c) return null;
  const lesson = c.lessonId ? lessonById.get(c.lessonId) : undefined;
  return (
    <>
      <section aria-labelledby="c-ports"><h2 id="c-ports">Entrées, sorties et paramètres</h2>
        <h3>Entrées</h3>
        {c.inputs.length ? <ul>{c.inputs.map((p) => <li key={p.id}><strong>{p.label}</strong>{p.required ? ' (obligatoire)' : ''} — accepte : {p.accepts.map((a) => (a === '*' ? 'tout type' : DATA_LABEL[a])).join(', ')}</li>)}</ul> : <p className="muted">Aucune entrée.</p>}
        <h3>Sorties</h3>
        {c.outputs.length ? <ul>{c.outputs.map((p) => <li key={p.id}><strong>{p.label}</strong> — {p.emits === '*' ? 'type hérité de l’entrée' : DATA_LABEL[p.emits]}</li>)}</ul> : <p className="muted">Aucune sortie : le parcours se termine ici.</p>}
        <h3>Paramètres</h3>
        {c.params.length ? <ul>{c.params.map((p) => <li key={p.key}><strong>{p.label}</strong> — {p.help}</li>)}</ul> : <p className="muted">Aucun paramètre.</p>}
      </section>
      {lesson && <p>Dans le cours : <Link to={`/lecon/${lesson.id}`}>{lesson.title}</Link></p>}
    </>
  );
}

export function StudioGuidePage() {
  const { '*': rest = '' } = useParams();
  const id = rest.replace(/\/$/, '');
  const { hash } = useLocation();
  const isTrouble = id === 'depannage';
  const guide = isTrouble ? null : guideById(id);
  usePageTitle(isTrouble ? 'Dépannage du Studio' : guide?.title ?? 'Guide introuvable');
  useEffect(() => { if (isTrouble || guide) actions.markGuideRead(isTrouble ? 'depannage' : guide!.id); }, [isTrouble, guide]);
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash, id]);

  if (isTrouble) {
    return (
      <>
        <Crumbs here="Dépannage" />
        <h1>Dépannage : comprendre les remarques du vérificateur</h1>
        <p className="muted">Chaque remarque de « Vérifier » renvoie ici. Pour chacune : ce que tu observes, pourquoi c’est un problème, comment corriger, et ce qu’il faut retenir.</p>
        {TROUBLESHOOTING.map((t) => (
          <section key={t.code} id={t.code} aria-labelledby={`h-${t.code}`} className={hash === `#${t.code}` ? 'target' : ''}>
            <h2 id={`h-${t.code}`}>{t.title}</h2>
            <dl className="defs">
              <dt>Ce que tu observes</dt><dd>{t.observe}</dd>
              <dt>Pourquoi c’est un problème</dt><dd>{t.why}</dd>
              <dt>Comment corriger</dt><dd>{t.fix}</dd>
              <dt>À retenir</dt><dd>{t.retain}</dd>
            </dl>
          </section>
        ))}
        <p><Link className="btn" to="/studio">Retour au Studio</Link></p>
      </>
    );
  }
  if (!guide) {
    return (
      <>
        <Crumbs here="Introuvable" />
        <h1>Guide introuvable</h1>
        <p>Cette page du guide n’existe pas.</p>
        <p><Link to="/studio/guide">Retour au sommaire du guide</Link></p>
      </>
    );
  }
  const tpl = guide.template ? templateById.get(guide.template) : undefined;
  const isComponent = guide.id.startsWith('composant/');
  return (
    <>
      <Crumbs here={guide.title} />
      <h1>{guide.title}</h1>
      <p className="muted">{guide.summary}</p>
      {tpl && (
        <section aria-labelledby="g-schema"><h2 id="g-schema">Le schéma</h2>
          <MiniDiagram graph={tpl.graph} label={`Schéma « ${tpl.name} » : ${tpl.graph.nodes.map((n) => componentById.get(n.data.c)?.name).join(', ')}`} />
          {guide.path && <p><strong>Parcours des données :</strong> {guide.path}</p>}
          <p><Link className="btn small" to={`/studio?modele=${tpl.id}`}>Ouvrir ce schéma dans le Studio</Link></p>
        </section>
      )}
      {guide.sections.map((s) => (
        <section key={s.h}><h2>{s.h}</h2>{s.p.map((p, i) => <p key={i}>{p}</p>)}</section>
      ))}
      {isComponent && <ComponentExtras id={guide.id.replace('composant/', '')} />}
      {guide.exercise && <section aria-labelledby="g-ex"><h2 id="g-ex">Exercice</h2><p className="callout tip">{guide.exercise}</p></section>}
      <Related g={guide} />
      <p className="muted small">{ALL_GUIDES.length + COMPONENTS.length} pages dans le guide.</p>
    </>
  );
}
