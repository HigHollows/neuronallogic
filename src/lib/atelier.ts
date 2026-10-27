/** Petits outils pédagogiques de l'atelier. Tout s'exécute dans le navigateur : aucun texte saisi n'est envoyé ni enregistré. */

export interface TokenEstimate {
  chars: number;
  words: number;
  /** Fourchette grossière : un vrai tokenizer donne un nombre exact qui dépend du modèle. */
  low: number;
  high: number;
}

/**
 * Estimation GROSSIÈRE du nombre de tokens : entre 1 token pour 4,5 caractères (texte anglais courant) et 1 pour 3 caractères
 * (français, code, texte inhabituel). Ce n'est pas un tokenizer : l'écart avec la réalité peut être important.
 */
export function estimateTokens(text: string): TokenEstimate {
  const chars = [...text].length;
  const words = text.split(/\s+/).filter(Boolean).length;
  return { chars, words, low: Math.ceil(chars / 4.5), high: Math.ceil(chars / 3) };
}

export function windowShare(tokens: number, windowSize: number): number {
  return windowSize <= 0 ? 0 : Math.min(100, Math.round((tokens / windowSize) * 1000) / 10);
}

export type JsonCheck =
  | { ok: true; kind: string; summary: string }
  | { ok: false; message: string; line: number | null; column: number | null; hint: string | null };

function describe(v: unknown): { kind: string; summary: string } {
  if (Array.isArray(v)) return { kind: 'tableau', summary: `${v.length} élément${v.length > 1 ? 's' : ''}` };
  if (v === null) return { kind: 'null', summary: 'absence de valeur' };
  if (typeof v === 'object') {
    const keys = Object.keys(v as object);
    return { kind: 'objet', summary: `${keys.length} champ${keys.length > 1 ? 's' : ''}${keys.length ? ' : ' + keys.slice(0, 6).join(', ') + (keys.length > 6 ? '…' : '') : ''}` };
  }
  return { kind: typeof v === 'string' ? 'texte' : typeof v === 'number' ? 'nombre' : 'booléen', summary: String(v).slice(0, 60) };
}

function guessHint(text: string): string | null {
  if (/'[^']*'\s*:/.test(text)) return "Les noms et textes JSON utilisent des guillemets doubles (\"), pas simples (').";
  if (/,\s*[}\]]/.test(text)) return 'Une virgule en trop avant « } » ou « ] » est interdite en JSON.';
  if (/(^|[{,]\s*)[A-Za-z_]\w*\s*:/.test(text)) return 'Les noms de champs doivent être entre guillemets doubles.';
  if (/\/\/|\/\*/.test(text)) return 'Le JSON n’accepte pas les commentaires.';
  return null;
}

/** Valide un texte JSON et, en cas d'erreur, indique ligne, colonne et une piste fréquente. */
export function checkJson(text: string): JsonCheck {
  if (!text.trim()) return { ok: false, message: 'Aucun texte à vérifier.', line: null, column: null, hint: null };
  try {
    return { ok: true, ...describe(JSON.parse(text)) };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    let line: number | null = null;
    let column: number | null = null;
    const pos = /position (\d+)/.exec(message);
    const lc = /line (\d+) column (\d+)/.exec(message);
    if (lc) {
      line = Number(lc[1]);
      column = Number(lc[2]);
    } else if (pos) {
      const before = text.slice(0, Number(pos[1]));
      line = before.split('\n').length;
      column = before.length - before.lastIndexOf('\n');
    }
    return { ok: false, message, line, column, hint: guessHint(text) };
  }
}

export interface PromptParts {
  role: string;
  objective: string;
  context: string;
  inputs: string;
  constraints: string;
  format: string;
}

/** Assemble un prompt structuré à partir des six blocs ; les blocs vides sont ignorés. */
export function buildPrompt(p: PromptParts): string {
  const lines: string[] = [];
  const add = (label: string, v: string) => v.trim() && lines.push(`${label} : ${v.trim()}`);
  add('Rôle', p.role);
  add('Objectif', p.objective);
  add('Contexte', p.context);
  if (p.inputs.trim()) lines.push(`Données (entre balises) :\n<donnees>\n${p.inputs.trim()}\n</donnees>`);
  add('Contraintes', p.constraints);
  add('Format de sortie', p.format);
  if (lines.length) lines.push("Si une information indispensable manque, pose une question au lieu de l'inventer. Signale les incertitudes et distingue les faits des hypothèses.");
  return lines.join('\n\n');
}

/** Éléments manquants d'un prompt : sert de conseil, jamais de blocage. */
export function promptAdvice(p: PromptParts): string[] {
  const out: string[] = [];
  if (!p.objective.trim()) out.push('Précise l’objectif : quel résultat veux-tu obtenir ?');
  if (!p.context.trim()) out.push('Ajoute le contexte : public, niveau, situation.');
  if (!p.format.trim()) out.push('Indique le format attendu (liste, tableau, longueur…).');
  if (!p.constraints.trim()) out.push('Ajoute des contraintes : ton, limites, ce qu’il ne faut pas faire.');
  return out;
}
