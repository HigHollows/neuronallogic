import { activityGrid, BADGES } from '../lib/badges';
import { useProgress } from '../lib/progress';
import { Icon } from './Icon';

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const fmt = (iso: string) => {
  const [, m, d] = iso.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`;
};

/**
 * Graphique d'activité façon « contributions » : une case par jour sur 20 semaines, plus foncée selon le nombre d'activités
 * d'apprentissage enregistrées (leçons terminées, quiz, exercices, récompenses). Volontairement SANS série (« streak »)
 * ni objectif quotidien : venir tous les jours n'est pas le but.
 */
export function ActivityGraph() {
  const s = useProgress();
  const { columns, activeDays, total } = activityGrid(s);
  const label = total === 0
    ? 'Activité d’apprentissage des 20 dernières semaines : aucune activité enregistrée pour l’instant.'
    : `Activité d’apprentissage des 20 dernières semaines : ${total} activité${total > 1 ? 's' : ''} sur ${activeDays} jour${activeDays > 1 ? 's' : ''}.`;
  return (
    <figure className="activity">
      <div className="activity-grid" role="img" aria-label={label}>
        {columns.map((col, i) => (
          <div className="activity-col" key={i} aria-hidden="true">
            {col.map((c) => (
              <span key={c.date} className={`cell l${c.level}`} title={`${fmt(c.date)} : ${c.count} activité${c.count > 1 ? 's' : ''}`} />
            ))}
          </div>
        ))}
      </div>
      <figcaption className="small muted">
        {label} Moins <span className="legend"><i className="cell l0" /><i className="cell l1" /><i className="cell l2" /><i className="cell l3" /><i className="cell l4" /></span> plus. Pas de série à maintenir : apprendre à ton rythme suffit.
      </figcaption>
    </figure>
  );
}

/** Badges : obtenus en couleur, non obtenus en pointillés avec leur condition (aucun mystère artificiel). */
export function BadgeGrid() {
  const s = useProgress();
  const earned = BADGES.filter((b) => s.badges[b.id]);
  return (
    <>
      <p className="muted small">
        {earned.length} badge{earned.length > 1 ? 's' : ''} sur {BADGES.length}. Les badges marquent des étapes d’apprentissage réelles ; aucun n’est donné pour la connexion ou le temps passé.
      </p>
      <ul className="badge-grid">
        {BADGES.map((b) => {
          const at = s.badges[b.id];
          return (
            <li key={b.id} className={`badge-card ${at ? 'on' : 'off'}`}>
              <span className="badge-icon"><Icon name={b.icon} size={22} /></span>
              <div>
                <strong>{b.name}</strong>
                <p className="small">{at ? `Obtenu le ${new Date(at).toLocaleDateString('fr-FR')}` : b.how}</p>
                {at && <p className="small muted">{b.how}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
