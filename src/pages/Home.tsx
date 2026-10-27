import { Link } from 'react-router-dom';
import { LESSONS, MODULES, lessonById, lessonsOfModule } from '../content';
import { balance, levelStatus, moduleSkills, recommendNext, totalEarned } from '../lib/credits';
import { useProgress } from '../lib/progress';
import { dueReviews } from '../lib/review';
import { ActivityGraph } from '../components/Activity';
import { Icon } from '../components/Icon';
import { LevelBadge, ProgressBar, usePageTitle } from '../components/ui';

export function Home() {
  usePageTitle('Comprendre l’intelligence artificielle');
  const progress = useProgress();
  const done = LESSONS.filter((l) => progress.completed[l.id]).length;
  const started = done > 0 || progress.ledger.length > 0 || Object.keys(progress.quizzes).length > 0 || !!progress.lastLesson;
  const last = progress.lastLesson ? lessonById.get(progress.lastLesson) : undefined;
  const next = recommendNext(progress);
  const resume = last && !progress.completed[last.id] ? last : next ?? last ?? LESSONS[0];
  const lvl = levelStatus(progress);
  const due = dueReviews(progress).length;
  const activity = [...progress.ledger].reverse().slice(0, 4);
  const inProgress = moduleSkills(progress).filter((s) => s.status === 'en-cours' || s.status === 'a-renforcer').slice(0, 3);

  return (
    <>
      {!started ? (
        <section className="hero">
          <p className="eyebrow">Formation gratuite · du débutant à l’expert</p>
          <h1>Comprendre l’intelligence artificielle, brique par brique.</h1>
          <p className="lead">
            Des réseaux de neurones aux API, du prompting au MCP, des modèles aux agents : apprends comment les systèmes d’IA fonctionnent, comment les assembler et comment vérifier ce qu’ils répondent.
          </p>
          <div className="row" style={{ marginTop: 18 }}>
            <Link className="btn" to={`/lecon/${LESSONS[0].id}`}>Commencer la formation</Link>
            <Link className="btn secondary" to="/parcours">Voir le parcours</Link>
            <Link className="btn secondary" to="/notions">Les 50 notions</Link>
          </div>
        </section>
      ) : (
        <section aria-labelledby="h-welcome" className="hero dash">
          <p className="eyebrow">Tableau de bord</p>
          <h1 id="h-welcome">Bon retour dans ta formation</h1>
          <p className="lead">
            {done} leçon{done > 1 ? 's' : ''} terminée{done > 1 ? 's' : ''} sur {LESSONS.length}. Niveau : <strong>{lvl.level.name}</strong>.
          </p>
          <div className="row" style={{ marginTop: 14 }}>
            <Link className="btn" to={`/lecon/${resume.id}`}>Reprendre mon apprentissage</Link>
            <Link className="btn secondary" to="/defis">Défis de révision</Link>
          </div>
          <div className="dash-grid">
            <div className="dash-block">
              <p className="eyebrow">Progression globale</p>
              <ProgressBar value={done} max={LESSONS.length} label="Progression globale de la formation" tone="ok" />
              <p className="small muted">{Math.round((done / LESSONS.length) * 100)} % des leçons terminées.</p>
            </div>
            <div className="dash-block">
              <p className="eyebrow">Crédits de savoir</p>
              <p className="big"><Icon name="spark" size={20} /> {balance(progress)}</p>
              <p className="small muted">{totalEarned(progress)} gagnés au total · <Link to="/progression">voir le détail</Link></p>
            </div>
            <div className="dash-block">
              <p className="eyebrow">Prochaine leçon recommandée</p>
              {next ? <p><Link to={`/lecon/${next.id}`}><strong>{next.title}</strong></Link></p> : <p>Toutes les leçons sont terminées. <Link to="/projet-final">Projet final</Link></p>}
            </div>
          </div>
          {due > 0 && <p className="small muted">Bon moment pour revoir {due} notion{due > 1 ? 's' : ''} étudiée{due > 1 ? 's' : ''} : <Link to="/defis">voir les défis de révision</Link>.</p>}
          <h2 className="h-sm">Activité d’apprentissage</h2>
          <ActivityGraph />
          <div className="dash-grid two">
            <div>
              <h2 className="h-sm">Dernières activités</h2>
              {activity.length === 0 ? (
                <p className="small muted">Aucune récompense pour l’instant : termine une leçon et réussis son contrôle de compréhension.</p>
              ) : (
                <ul className="res-list small">
                  {activity.map((e) => (
                    <li key={e.key} className="row between" style={{ flexWrap: 'nowrap' }}><span>{e.label}</span><strong className="nowrap">+{e.credits}</strong></li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h2 className="h-sm">Compétences en cours d’acquisition</h2>
              {inProgress.length === 0 ? (
                <p className="small muted">Aucune pour l’instant : la progression est en cours de constitution.</p>
              ) : (
                <ul className="res-list small">
                  {inProgress.map((s) => (
                    <li key={s.moduleId}><Link to={`/module/${s.moduleId}`}>{s.title}</Link> — {s.lessonsDone}/{s.lessonsTotal} leçons{s.status === 'a-renforcer' ? ' · à renforcer' : ''}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="promises" role="list">
        <div role="listitem"><strong>100 % gratuit</strong><span>Aucun achat, abonnement, publicité ni contenu verrouillé.</span></div>
        <div role="listitem"><strong>Sans compte</strong><span>Tu commences tout de suite. Ta progression reste sur ton appareil.</span></div>
        <div role="listitem"><strong>Comprendre, pas réciter</strong><span>Exemples, schémas, pièges courants et quiz qui expliquent leurs corrections.</span></div>
      </div>

      <h2 style={{ marginTop: 8 }}>Les {MODULES.length} modules</h2>
      <ol className="module-list">
        {MODULES.map((m) => {
          const lessons = lessonsOfModule(m.id);
          const n = lessons.filter((l) => progress.completed[l.id]).length;
          return (
            <li className="module-row" key={m.id}>
              <span className="num" aria-hidden="true">{m.number}</span>
              <div>
                <h3><Link to={`/module/${m.id}`}>{m.title}</Link></h3>
                <p>{m.tagline}</p>
                <ProgressBar value={n} max={lessons.length} label={`Progression du module ${m.number}`} tone="ok" />
              </div>
              <div className="side">
                <LevelBadge level={m.level} />
                <div>{lessons.length} leçons</div>
                <div>{n === 0 ? 'À découvrir' : n === lessons.length ? 'Terminé' : 'En cours'}</div>
              </div>
            </li>
          );
        })}
      </ol>

      <h2>À la fin, tu sauras…</h2>
      <ul>
        <li>expliquer l’IA, le deep learning, les LLM, les tokens et l’attention — sans les confondre avec le cerveau humain ;</li>
        <li>décrire le trajet d’une requête entre frontend, backend, API, base de données et modèle ;</li>
        <li>distinguer RAG, fine-tuning, mémoire et contexte, et choisir le bon outil pour un besoin ;</li>
        <li>distinguer prompt, skill, outil, workflow, agent et serveur MCP — et placer les bonnes permissions ;</li>
        <li>rédiger un prompt structuré, vérifier une réponse, repérer une injection de prompt ;</li>
        <li>spécifier, construire, évaluer et sécuriser un petit assistant, puis aborder les sujets experts.</li>
      </ul>
      <p className="muted small">
        Ce cours est un support pédagogique général. Les noms de produits, prix et fonctionnalités évoluent vite : pour une décision technique, consulte la documentation actuelle du fournisseur. <Link to="/a-propos">En savoir plus</Link>.
      </p>
    </>
  );
}
