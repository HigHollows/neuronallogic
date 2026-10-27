import { Link } from 'react-router-dom';
import { ProgressBar, usePageTitle } from '../components/ui';
import { PROJECT_STEPS } from '../content/project';
import { DEPLOY_CHECKLIST } from '../content/revision';
import { actions, useProgress } from '../lib/progress';

export function ProjectPage() {
  usePageTitle('Projet final guidé');
  const progress = useProgress();
  const done = PROJECT_STEPS.filter((s) => progress.projectSteps[s.id]).length;
  const dep = DEPLOY_CHECKLIST.filter((c) => progress.checklist[c.id]).length;
  return (
    <>
      <h1>Projet final guidé : un assistant documentaire</h1>
      <p className="lead muted">
        Huit étapes pour passer de l’idée à un petit assistant spécifié, testé et présenté. Tu peux le réaliser avec n’importe quel assistant ou outil, y compris des solutions gratuites ; <strong>aucune étape n’exige un service payant</strong>. Rien de ce que tu écris ici n’est envoyé : seules tes cases cochées sont mémorisées sur cet appareil.
      </p>
      <p>
        Prérequis conseillés : <Link to="/lecon/l-premier-assistant">spécification d’un assistant</Link>, <Link to="/lecon/l-rag">RAG</Link> et <Link to="/lecon/l-evaluation">évaluation</Link>. Le mini-projet est détaillé dans <Link to="/lecon/l-assistant-documentaire">cette leçon</Link>.
      </p>
      <ProgressBar value={done} max={PROJECT_STEPS.length} label="Avancement du projet final" tone="ok" />
      <p className="small muted">{done} étape{done > 1 ? 's' : ''} sur {PROJECT_STEPS.length} terminée{done > 1 ? 's' : ''}.</p>

      {PROJECT_STEPS.map((s) => {
        const ok = !!progress.projectSteps[s.id];
        return (
          <section key={s.id} className={`step ${ok ? 'done' : ''}`} aria-labelledby={`h-${s.id}`}>
            <h2 id={`h-${s.id}`} style={{ marginTop: 14 }}>{s.title}</h2>
            <p>{s.description}</p>
            <p><strong>Livrable :</strong> {s.deliverable}</p>
            <p className="small muted" style={{ marginBottom: 4 }}>Points à vérifier :</p>
            <ul className="small">{s.checks.map((c, i) => <li key={i}>{c}</li>)}</ul>
            <label className="row" style={{ gap: 10 }}>
              <input type="checkbox" checked={ok} onChange={() => actions.toggleProjectStep(s.id)} style={{ width: 20, height: 20, accentColor: 'var(--accent)' }} />
              <span>Étape terminée</span>
            </label>
          </section>
        );
      })}

      <h2>Check-list avant déploiement</h2>
      <p className="muted">Reprise de la check-list du manuel. Coche seulement ce qui est vrai pour ton projet.</p>
      <ul className="check-list">
        {DEPLOY_CHECKLIST.map((c) => (
          <li key={c.id}>
            <label>
              <input type="checkbox" checked={!!progress.checklist[c.id]} onChange={() => actions.toggleChecklist(c.id)} />
              <span>{c.text}</span>
            </label>
          </li>
        ))}
      </ul>
      <p role="status">{dep} / {DEPLOY_CHECKLIST.length}. {dep === DEPLOY_CHECKLIST.length ? 'Tu peux envisager une mise en service progressive, avec un contrôle humain sur les cas sensibles.' : 'Chaque case non cochée est un risque à traiter avant de mettre le système entre les mains d’autres personnes.'}</p>

      <h2>Et ensuite ?</h2>
      <p>Choisis une direction dans la <Link to="/lecon/l-feuille-de-route">feuille de route</Link>, et fais le point avec la <Link to="/progression">check-list « suis-je prêt ? »</Link>.</p>
    </>
  );
}
