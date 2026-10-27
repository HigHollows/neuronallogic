/**
 * Code de sauvegarde : toute la progression dans une seule chaîne de texte à copier-coller
 * (message à soi-même, note, e-mail…) pour la restaurer sur un autre navigateur ou après un effacement.
 * Format : « NL2:<base64url> » (JSON compressé en gzip si le navigateur le permet) ou « NL1:<base64url> » (JSON brut).
 * Ce n'est PAS un secret ni une protection : le code est lisible et modifiable par qui le possède.
 */
import { parseState, STATE_VERSION, type ProgressState } from './state';

const toB64 = (bytes: Uint8Array) => {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64 = (s: string) => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

export async function encodeSave(state: ProgressState): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  if (typeof CompressionStream !== 'undefined') {
    try {
      return 'NL2:' + toB64(await pipe(bytes, new CompressionStream('gzip')));
    } catch {
      /* repli sur le format non compressé */
    }
  }
  return 'NL1:' + toB64(bytes);
}

/** Renvoie l'état restauré, ou null si le code est invalide. */
export async function decodeSave(code: string): Promise<ProgressState | null> {
  const m = /^(NL[12]):([A-Za-z0-9_-]+)$/.exec(code.replace(/\s+/g, ''));
  if (!m) return null;
  try {
    let bytes: Uint8Array = fromB64(m[2]);
    if (m[1] === 'NL2') {
      if (typeof DecompressionStream === 'undefined') return null;
      bytes = await pipe(bytes, new DecompressionStream('gzip'));
    }
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as { version?: number };
    if (!parsed || (parsed.version !== 1 && parsed.version !== STATE_VERSION)) return null;
    return parseState(json);
  } catch {
    return null;
  }
}
