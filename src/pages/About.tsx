import { Link } from 'react-router-dom';
import { usePageTitle } from '../components/ui';
import { VIDEOS } from '../content';
import { DOCS } from '../content/docs';

export function AboutPage() {
  usePageTitle('À propos');
  return (
    <>
      <h1>À propos de NeuronalLogic</h1>
      <p>
        NeuronalLogic est un projet pédagogique <strong>non commercial</strong> qui transforme le manuel « Comprendre l’intelligence artificielle » en parcours interactif.
      </p>

      <h2>Engagements de gratuité</h2>
      <ul>
        <li>Aucun achat, abonnement, paiement récurrent, publicité, crédit payant ou formule « premium ».</li>
        <li>Aucun contenu pédagogique verrouillé : tout est accessible dès la première visite. Les « crédits de savoir » se gagnent en apprenant, ne s’achètent pas, ne s’échangent pas et ne débloquent que des activités bonus facultatives.</li>
        <li>Aucun compte obligatoire. Aucune dépendance à un service d’IA payant pour afficher les cours ou les quiz : tout le contenu est écrit à l’avance et distribué avec le site.</li>
        <li>Les services externes mentionnés (fournisseurs d’API, plateformes vidéo) ont leurs propres conditions ; aucun n’est indispensable à la formation, et la page <Link to="/ressources">Ressources</Link> signale leurs limites.</li>
      </ul>

      <h2>Données personnelles</h2>
      <p>
        Le site n’utilise ni traceur publicitaire ni outil de mesure d’audience. Ta progression et tes scores sont enregistrés dans le stockage local de ton navigateur (voir <Link to="/progression">Ma progression</Link>) ; ils ne quittent pas ton appareil. Les lecteurs vidéo intégrés ne se chargent qu’à ta demande, en mode sans cookies de YouTube ; avant ce clic, aucune requête n’est envoyée à YouTube. Les liens externes s’ouvrent dans un nouvel onglet.
      </p>

      <h2>Fiabilité du contenu</h2>
      <ul>
        <li>Le manuel est la base ; il n’est pas considéré comme infaillible. Chaque correction, précision ou mise à jour est consignée sur la page <Link to="/corrections">Corrections apportées au manuel</Link>.</li>
        <li>Les analogies sont toujours accompagnées de leurs limites. Les informations qui évoluent vite (protocoles, produits, prix) portent une date de vérification.</li>
        <li>{DOCS.length} documentations et {VIDEOS.length} vidéos ont été vérifiées le 26 octobre 2026. Les vidéos n’ont pas été revues intégralement par l’auteur du site : leur existence, leur titre, leur chaîne, leur durée et leurs sous-titres publiés ont été contrôlés automatiquement.</li>
        <li>Ce site est un support pédagogique général : ce n’est ni une certification, ni un conseil juridique, médical, financier ou de sécurité informatique adapté à un cas particulier.</li>
      </ul>

      <h2>Limites connues</h2>
      <ul>
        <li>Le site peut être installé et utilisé hors ligne après une première visite, mais les vidéos et documentations externes, elles, nécessitent une connexion.</li>
        <li>La progression locale n’est pas synchronisée entre appareils et peut disparaître si les données du navigateur sont effacées (export/import disponible).</li>
        <li>La plupart des vidéos sont en anglais ; peu proposent des sous-titres français publiés.</li>
        <li>Les schémas sont écrits en HTML/SVG : ils sont accessibles et responsives, mais restent simplifiés.</li>
        <li>Les tableaux du manuel PDF ont été reconstruits d’après leur sens ; une relecture contre le PDF d’origine est recommandée.</li>
      </ul>
    </>
  );
}
