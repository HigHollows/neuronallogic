import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { balance, levelStatus } from '../lib/credits';
import { dismissRewards, useProgress, useRecentRewards } from '../lib/progress';
import { Icon } from './Icon';

/** Pastille discrète du solde, lien vers le profil. */
export function CreditsChip() {
  const s = useProgress();
  const b = balance(s);
  return (
    <Link to="/progression" className="credits-chip" aria-label={`Crédits de savoir : ${b}. Niveau : ${levelStatus(s).level.name}. Voir mon profil`}>
      <Icon name="spark" size={16} />
      <span>{b}</span>
      <span className="chip-label"> crédits</span>
    </Link>
  );
}

/**
 * Notification discrète d'un gain. Zone `aria-live` polie : annoncée aux lecteurs d'écran sans interrompre.
 * L'animation d'apparition est désactivée automatiquement si l'utilisateur demande moins d'animations (CSS).
 * Aucun compteur clignotant ; la notification disparaît seule après quelques secondes ou à la demande.
 */
export function RewardToast() {
  const rewards = useRecentRewards();
  useEffect(() => {
    if (!rewards.length) return;
    const t = setTimeout(dismissRewards, 6000);
    return () => clearTimeout(t);
  }, [rewards]);
  return (
    <div className="toast-zone" role="status" aria-live="polite" aria-atomic="false">
      {rewards.length > 0 && (
        <div className="toast">
          <ul>
            {rewards.slice(-3).map((r) => (
              <li key={r.key}>
                {r.credits > 0 ? <strong>+{r.credits} crédits</strong> : <strong>Nouveau badge</strong>} <span>{r.label}</span>
              </li>
            ))}
          </ul>
          <button className="toast-close" onClick={dismissRewards} aria-label="Fermer la notification">×</button>
        </div>
      )}
    </div>
  );
}
