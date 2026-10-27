import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { LEVEL_LABEL } from '../content/modules';
import type { Level } from '../content/types';

export function ProgressBar({ value, max, label, tone }: { value: number; max: number; label: string; tone?: 'ok' }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div
      className={`bar ${tone ?? ''}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${value} sur ${max} (${pct} %)`}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function LevelBadge({ level }: { level: Level }) {
  return <span className={`badge lvl-${level}`}>{LEVEL_LABEL[level]}</span>;
}

export function Tick({ done }: { done: boolean }) {
  return <span className={`tick ${done ? 'done' : ''}`} aria-hidden="true" />;
}

/** Titre de page : met à jour document.title, remonte en haut et place le focus sur le <h1> à chaque changement de route. */
export function usePageTitle(title: string) {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = `${title} — NeuronalLogic`;
  }, [title]);
  useEffect(() => {
    window.scrollTo(0, 0);
    const h1 = document.querySelector<HTMLElement>('main h1');
    if (h1) {
      h1.tabIndex = -1;
      h1.focus({ preventScroll: true });
    }
  }, [pathname]);
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n > 1 ? many : one}`;
}
