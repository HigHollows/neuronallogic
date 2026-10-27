import { useRef, useState } from 'react';
import { actions, getState, useProgress } from '../lib/progress';
import { decodeSave, encodeSave } from '../lib/saveCode';

/**
 * Sauvegarde ultra simple : la progression s'enregistre déjà automatiquement dans ce navigateur.
 * Pour la garder ailleurs ou la protéger d'un effacement : copier un code (ou télécharger un fichier), puis le coller pour restaurer.
 */
export function SaveWidget() {
  const progress = useProgress();
  const [msg, setMsg] = useState('');
  const [code, setCode] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function copy() {
    const c = await encodeSave(getState());
    try {
      await navigator.clipboard.writeText(c);
      setMsg('Code copié. Colle-le dans un message à toi-même ou une note : il suffit pour tout restaurer.');
    } catch {
      setCode(c);
      setMsg('Copie automatique impossible : le code est affiché ci-dessous, sélectionne-le et copie-le.');
    }
    actions.markExported();
  }

  async function restore() {
    const restored = await decodeSave(code);
    if (!restored) return setMsg('Code invalide : vérifie qu’il est complet (il commence par NL1: ou NL2:).');
    actions.importJson(JSON.stringify(restored));
    setCode('');
    setMsg('Progression restaurée depuis le code.');
  }

  function download() {
    const blob = new Blob([actions.exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'neuronallogic-progression.json';
    a.click();
    URL.revokeObjectURL(url);
    actions.markExported();
    setMsg('Fichier téléchargé : conserve-le pour restaurer ta progression plus tard.');
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    const ok = actions.importJson(await file.text());
    setMsg(ok ? 'Progression restaurée depuis le fichier.' : 'Fichier invalide : ce n’est pas une sauvegarde NeuronalLogic.');
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="save-widget">
      <p>
        <strong>Ta progression est enregistrée automatiquement</strong> dans ce navigateur. Elle n’est pas synchronisée entre appareils et disparaît si tu effaces les données du site : garde un code de sauvegarde pour pouvoir la retrouver.
      </p>
      <div className="row">
        <button className="btn" onClick={copy}>Copier mon code de sauvegarde</button>
        <button className="btn secondary" onClick={download}>Télécharger un fichier</button>
      </div>
      <p className="small muted">
        {progress.lastExport ? `Dernière sauvegarde manuelle : ${new Date(progress.lastExport).toLocaleDateString('fr-FR')}.` : 'Aucune sauvegarde manuelle pour l’instant.'} Le code n’est ni un secret ni une protection : il se lit et se modifie facilement.
      </p>
      <label htmlFor="save-code" className="small muted">Restaurer : colle ici un code de sauvegarde</label>
      <textarea id="save-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="NL2:…" rows={3} style={{ minHeight: 80 }} />
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn secondary" onClick={restore} disabled={!code.trim()}>Restaurer depuis le code</button>
        <button className="btn secondary" onClick={() => fileRef.current?.click()}>Restaurer depuis un fichier</button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-label="Fichier de sauvegarde à importer" onChange={(e) => importFile(e.target.files?.[0])} />
      </div>
      <p role="status" className="small" aria-live="polite">{msg}</p>
    </div>
  );
}

