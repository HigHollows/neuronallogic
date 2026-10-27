import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LESSONS, MODULES, lessonsOfModule } from '../content';
import { actions, useProgress } from '../lib/progress';
import { ProgressBar, Tick } from './ui';
import { Icon } from './Icon';
import { CreditsChip, RewardToast } from './Credits';

const LINKS: { to: string; label: string; icon: string; end?: boolean }[] = [
  { to: '/', label: 'Accueil', icon: 'home', end: true },
  { to: '/parcours', label: 'Parcours de formation', icon: 'path' },
  { to: '/notions', label: 'Glossaire des 50 notions', icon: 'book' },
  { to: '/quiz', label: 'Quiz', icon: 'quiz' },
  { to: '/exercices', label: 'Exercices', icon: 'exercise' },
  { to: '/defis', label: 'Défis de révision', icon: 'review' },
  { to: '/atelier', label: 'Atelier d’outils', icon: 'tool' },
  { to: '/studio', label: 'Studio IA', icon: 'network' },
  { to: '/ressources', label: 'Ressources', icon: 'sheet' },
  { to: '/projet-final', label: 'Projet final', icon: 'flag' },
  { to: '/bonus', label: 'Activités bonus', icon: 'gift' },
  { to: '/revision', label: 'Fiche de révision', icon: 'sheet' },
  { to: '/progression', label: 'Profil et progression', icon: 'profile' },
];

function Logo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" width="30" height="30">
      <rect width="32" height="32" rx="7" fill="currentColor" />
      <g stroke="var(--logo-fg)" strokeWidth="1.6" fill="none"><path d="M8 10l8 6-8 6M8 16l8-6M8 16l8 6M16 10l8 6M16 16h8M16 22l8-6" /></g>
      <g fill="var(--logo-fg)"><circle cx="8" cy="10" r="2.2" /><circle cx="8" cy="16" r="2.2" /><circle cx="8" cy="22" r="2.2" /><circle cx="16" cy="10" r="2.2" /><circle cx="16" cy="16" r="2.2" /><circle cx="16" cy="22" r="2.2" /><circle cx="24" cy="16" r="2.4" /></g>
    </svg>
  );
}

function ThemeToggle() {
  const progress = useProgress();
  const systemDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const dark = progress.theme ? progress.theme === 'dark' : systemDark;
  useEffect(() => {
    if (progress.theme) document.documentElement.dataset.theme = progress.theme;
  }, [progress.theme]);
  return (
    <button
      className="gh-icon-btn"
      onClick={() => actions.setTheme(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Passer au thème clair' : 'Passer au thème sombre'}
      title={dark ? 'Thème clair' : 'Thème sombre'}
    >
      <span aria-hidden="true">{dark ? '☀' : '☾'}</span>
    </button>
  );
}

/** Recherche de l'en-tête. Le raccourci « / » (comme sur GitHub) place le curseur dans le champ. */
function SearchForm() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <form
      className="gh-search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const v = q.trim();
        if (v) navigate(`/recherche?q=${encodeURIComponent(v)}`);
      }}
    >
      <label className="sr-only" htmlFor="global-search">Rechercher dans le cours</label>
      <Icon name="search" size={16} />
      <input ref={ref} id="global-search" type="search" placeholder="Rechercher dans le cours" value={q} onChange={(e) => setQ(e.target.value)} />
      <kbd aria-hidden="true">/</kbd>
    </form>
  );
}

function Sidebar({ open, close }: { open: boolean; close: () => void }) {
  const progress = useProgress();
  const { pathname } = useLocation();
  const done = LESSONS.filter((l) => progress.completed[l.id]).length;
  const currentLesson = pathname.startsWith('/lecon/') ? LESSONS.find((l) => l.id === pathname.split('/')[2]) : undefined;
  const currentModule = currentLesson?.moduleId ?? (pathname.startsWith('/module/') ? pathname.split('/')[2] : undefined);
  return (
    <>
      <div className={`scrim ${open ? 'open' : ''}`} onClick={close} aria-hidden="true" />
      <aside className={`sidebar ${open ? 'open' : ''}`} id="sidebar" aria-label="Navigation du cours">
        <div className="side-progress">
          <div className="row between" style={{ marginBottom: 4 }}>
            <span>Progression</span>
            <strong>{done} / {LESSONS.length} leçons</strong>
          </div>
          <ProgressBar value={done} max={LESSONS.length} label="Progression globale du cours" tone="ok" />
        </div>
        <nav aria-label="Pages principales">
          <ul className="nav-list">
            {LINKS.map((l) => (
              <li key={l.to}>
                <NavLink to={l.to} end={l.end} className="nav-link" onClick={close}><Icon name={l.icon} />{l.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Modules et leçons">
          <p className="nav-group">Les {MODULES.length} modules</p>
          {MODULES.map((m) => {
            const lessons = lessonsOfModule(m.id);
            const n = lessons.filter((l) => progress.completed[l.id]).length;
            return (
              <details className="mod" key={m.id} open={currentModule === m.id}>
                <summary>
                  <span>{m.number}. {m.title}</span>
                  <span className="count">{n}/{lessons.length}</span>
                </summary>
                <ul className="lessons">
                  <li>
                    <NavLink to={`/module/${m.id}`} className="nav-link" onClick={close}>Présentation du module</NavLink>
                  </li>
                  {lessons.map((l) => (
                    <li key={l.id}>
                      <NavLink to={`/lecon/${l.id}`} className="nav-link" onClick={close}>
                        <Tick done={!!progress.completed[l.id]} />
                        <span>
                          {l.title}
                          {progress.completed[l.id] && <span className="sr-only"> (terminée)</span>}
                        </span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

export function Layout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className={`app${pathname === '/studio' ? ' studio-mode' : ''}`}>
      <a href="#contenu" className="skip-link">Aller au contenu</a>
      <header className="gh-header">
        <button className="gh-icon-btn gh-menu" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="sidebar" aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}>
          <span aria-hidden="true">{open ? '✕' : '☰'}</span>
        </button>
        <Link to="/" className="gh-brand" aria-label="NeuronalLogic, accueil">
          <Logo />
          <span>NeuronalLogic</span>
        </Link>
        <SearchForm />
        <span className="gh-spacer" />
        <CreditsChip />
        <ThemeToggle />
      </header>
      <Sidebar open={open} close={() => setOpen(false)} />
      <div className="main-col">
        <main id="contenu" className="content" tabIndex={-1}>
          <Outlet />
        </main>
        <RewardToast />
        <footer className="footer">
          <p>
            <strong>Gratuit, sans compte, sans publicité.</strong> Ta progression est enregistrée uniquement dans ce navigateur (stockage local) : elle n’est pas synchronisée entre appareils et disparaît si tu effaces les données du site. <Link to="/progression">Sauvegarder ou transférer</Link>.
          </p>
          <p>
            Projet pédagogique non commercial, fondé sur le manuel « Comprendre l’intelligence artificielle ». Les vidéos et documentations sont des ressources externes, vérifiées à la date indiquée. <Link to="/a-propos">À propos</Link> · <Link to="/corrections">Corrections apportées au manuel</Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
