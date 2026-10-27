import { Link, useLocation } from 'react-router-dom';
import { usePageTitle } from '../components/ui';

export function NotFound({ what = 'page' }: { what?: string }) {
  usePageTitle('Page introuvable');
  const { pathname } = useLocation();
  return (
    <>
      <h1>{what === 'page' ? 'Page introuvable' : `${what} introuvable`}</h1>
      <p>
        L’adresse <code>{pathname}</code> ne correspond à aucun contenu. Elle a peut-être été mal saisie, ou le contenu a changé de place.
      </p>
      <div className="row">
        <Link className="btn" to="/">Retour à l’accueil</Link>
        <Link className="btn secondary" to="/parcours">Voir le parcours</Link>
        <Link className="btn secondary" to="/recherche">Rechercher</Link>
      </div>
    </>
  );
}
