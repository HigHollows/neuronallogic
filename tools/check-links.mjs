// Teste les liens externes du site : documentations (src/content/docs.ts) et URL http(s) citées dans les leçons.
// Les vidéos sont vérifiées par `npm run verify:videos`.
// Usage : npm run verify:links      (code de sortie 1 si un lien est mort)
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../src/content/', import.meta.url);
const sources = [new URL('docs.ts', root), ...readdirSync(new URL('lessons/', root)).map((f) => new URL(`lessons/${f}`, root))];
const urls = new Map();
for (const f of sources) {
  const text = readFileSync(f, 'utf8');
  for (const m of text.matchAll(/https?:\/\/[^\s'"`)\]]+/g)) {
    const url = m[0].replace(/[.,;]+$/, '');
    if (/exemple\.(org|fr|test)|example\./.test(url) || /localhost/.test(url)) continue; // URL fictives des exemples pédagogiques
    if (!urls.has(url)) urls.set(url, f.pathname.split('/').pop());
  }
}

async function check(url) {
  for (const method of ['HEAD', 'GET']) {
    try {
      const res = await fetch(url, { method, redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (verification des liens NeuronalLogic)' }, signal: AbortSignal.timeout(20000) });
      if (res.ok) return { ok: true, status: res.status, final: res.url };
      if (method === 'GET') return { ok: false, status: res.status, final: res.url };
    } catch (e) {
      if (method === 'GET') return { ok: false, status: String(e.cause?.code ?? e.message), final: url };
    }
  }
}

let bad = 0;
for (const [url, from] of urls) {
  const r = await check(url);
  const moved = r.ok && r.final.replace(/\/$/, '') !== url.replace(/\/$/, '');
  console.log(`${r.ok ? (moved ? 'REDIR' : 'OK   ') : 'MORT '} ${r.status} ${url}${moved ? ' -> ' + r.final : ''}  (${from})`);
  if (!r.ok) bad++;
}
console.log(`\n${urls.size} liens testés, ${bad} en échec.`);
process.exit(bad ? 1 : 0);
