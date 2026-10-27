import { Link } from 'react-router-dom';
import { usePageTitle } from '../components/ui';
import { DISTINCTIONS, FIVE_PRINCIPLES, MENTAL_MAP } from '../content/revision';

export function RevisionPage() {
  usePageTitle('Fiche de révision');
  return (
    <>
      <h1>Fiche de révision</h1>
      <p className="muted">Si tu sais expliquer chacune de ces différences avec un exemple, tu possèdes déjà une base solide pour discuter d’architecture IA.</p>

      <h2>Les grandes distinctions</h2>
      <div className="table-wrap" role="region" aria-label="Distinctions" tabIndex={0}>
        <table>
          <thead><tr><th scope="col">Ne pas confondre</th><th scope="col">Différence clé</th></tr></thead>
          <tbody>{DISTINCTIONS.map((d) => <tr key={d.pair}><th scope="row">{d.pair}</th><td>{d.diff}</td></tr>)}</tbody>
        </table>
      </div>

      <h2>La carte mentale : sept couches</h2>
      <p>L’IA devient plus facile à comprendre quand on sépare les couches du système.</p>
      <div className="table-wrap" role="region" aria-label="Couches d'un système d'IA" tabIndex={0}>
        <table>
          <thead><tr><th scope="col">Couche</th><th scope="col">Question essentielle</th></tr></thead>
          <tbody>{MENTAL_MAP.map((m) => <tr key={m.layer}><th scope="row">{m.layer}</th><td>{m.question}</td></tr>)}</tbody>
        </table>
      </div>

      <h2>Les cinq principes à retenir</h2>
      <ol>{FIVE_PRINCIPLES.map((p, i) => <li key={i}>{p}</li>)}</ol>
      <p>
        Si tu peux expliquer ces principes à quelqu’un qui débute, dessiner une architecture simple et construire un petit assistant que tu sais tester, tu ne fais plus seulement « utiliser l’IA » : tu commences à comprendre comment les systèmes d’IA fonctionnent.
      </p>
      <p><Link className="btn" to="/quiz/quiz-glossaire">Réviser avec le quiz des 50 notions</Link></p>
    </>
  );
}
