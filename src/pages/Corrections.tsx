import { usePageTitle } from '../components/ui';
import data from '../content/corrections.json';

type Item = (typeof data.items)[number];

export function CorrectionsPage() {
  usePageTitle('Corrections apportées au manuel');
  const types = data.types as Record<string, string>;
  const order = Object.keys(types);
  return (
    <>
      <h1>Corrections apportées au manuel</h1>
      <p className="muted">{data.intro}</p>
      <p className="small muted">Dernière vérification : {data.checkedOn}. {data.items.length} entrées.</p>
      {order.map((t) => {
        const list = (data.items as Item[]).filter((i) => i.type === t);
        if (list.length === 0) return null;
        return (
          <section key={t} aria-labelledby={`t-${t}`}>
            <h2 id={`t-${t}`}>{types[t]} ({list.length})</h2>
            {list.map((i) => (
              <article key={i.id} className="step" id={i.id}>
                <p className="eyebrow" style={{ marginTop: 14 }}>Chapitre(s) du manuel : {i.chapter}</p>
                <dl style={{ margin: 0 }}>
                  <dt className="small muted"><strong>Passage concerné</strong></dt>
                  <dd style={{ margin: '0 0 8px' }}>{i.passage}</dd>
                  <dt className="small muted"><strong>Problème identifié</strong></dt>
                  <dd style={{ margin: '0 0 8px' }}>{i.problem}</dd>
                  <dt className="small muted"><strong>Correction apportée</strong></dt>
                  <dd style={{ margin: '0 0 8px' }}>{i.correction}</dd>
                  <dt className="small muted"><strong>Justification</strong></dt>
                  <dd style={{ margin: 0 }}>{i.justification}</dd>
                </dl>
              </article>
            ))}
          </section>
        );
      })}
      <h2>Éléments vérifiés et conservés</h2>
      <ul>{data.verified.map((v, i) => <li key={i}>{v}</li>)}</ul>
    </>
  );
}
