import type { Block } from '../content/types';
import { Rich } from './Rich';

const CALLOUT_LABEL = { note: 'À savoir', limit: 'Limite', warning: 'Attention', tip: 'Conseil' } as const;

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => (
        <BlockView key={i} b={b} />
      ))}
    </>
  );
}

function BlockView({ b }: { b: Block }) {
  switch (b.type) {
    case 'p':
      return (
        <p>
          <Rich text={b.text} />
        </p>
      );
    case 'ul':
      return (
        <ul>
          {b.items.map((it, i) => (
            <li key={i}>
              <Rich text={it} />
            </li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol>
          {b.items.map((it, i) => (
            <li key={i}>
              <Rich text={it} />
            </li>
          ))}
        </ol>
      );
    case 'table':
      return (
        <div className="table-wrap" role="region" aria-label={b.caption ?? 'Tableau'} tabIndex={0}>
          <table>
            {b.caption && <caption>{b.caption}</caption>}
            <thead>
              <tr>
                {b.head.map((h, i) => (
                  <th key={i} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j}>
                      <Rich text={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'code':
      return (
        <figure className="codeblock">
          {b.lang && <span className="lang">{b.lang}</span>}
          <pre tabIndex={0}>
            <code>{b.text}</code>
          </pre>
          {b.caption && <figcaption>{b.caption}</figcaption>}
        </figure>
      );
    case 'callout':
      return (
        <aside className={`callout ${b.kind}`}>
          <strong>{b.title ?? CALLOUT_LABEL[b.kind]}</strong>
          <p>
            <Rich text={b.text} />
          </p>
        </aside>
      );
    case 'beforeAfter':
      return (
        <>
          <div className="ba">
            <div className="before">
              <p className="ba-label">Avant</p>
              <p>{b.before}</p>
            </div>
            <div className="after">
              <p className="ba-label">Après</p>
              <p>{b.after}</p>
            </div>
          </div>
          <p>
            <strong>Pourquoi c’est mieux :</strong>
          </p>
          <ul className="why">
            {b.why.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </>
      );
  }
}
