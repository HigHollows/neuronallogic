// Lit src/content/videos.source.json, interroge YouTube (oEmbed + page publique) et écrit src/content/videos.json.
// Rien n'est inventé : si une vidéo est introuvable, le script échoue et affiche laquelle.
// Usage : npm run verify:videos
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = new URL('../src/content/videos.source.json', import.meta.url);
const OUT = new URL('../src/content/videos.json', import.meta.url);
const UA = { 'user-agent': 'Mozilla/5.0', 'accept-language': 'en-US,en;q=0.9' };

async function check(src) {
  const o = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${src.id}&format=json`);
  if (!o.ok) throw new Error(`${src.id} : introuvable (HTTP ${o.status})`);
  const meta = await o.json();
  const html = await (await fetch(`https://www.youtube.com/watch?v=${src.id}`, { headers: UA })).text();
  const len = html.match(/"lengthSeconds":"(\d+)"/)?.[1];
  const date = html.match(/"publishDate":"([^"]+)"/)?.[1];
  const tracks = html.match(/"captionTracks":\[(.*?)\],"audioTracks"/s)?.[1] ?? '';
  const langs = [...tracks.matchAll(/"languageCode":"([a-zA-Z-]+)"/g)].map((m) => m[1]);
  return {
    ...src,
    title: meta.title,
    channel: meta.author_name,
    seconds: len ? Number(len) : null,
    publishedAt: date ? date.slice(0, 10) : null,
    frenchSubtitles: langs.some((l) => l.toLowerCase().startsWith('fr')),
    verifiedAt: new Date().toISOString().slice(0, 10),
  };
}

const sources = JSON.parse(readFileSync(SRC, 'utf8'));
const out = [];
const failures = [];
for (const s of sources) {
  try {
    out.push(await check(s));
    process.stdout.write('.');
  } catch (e) {
    failures.push(e.message);
    process.stdout.write('x');
  }
}
console.log();
if (failures.length) {
  console.error('Échecs :\n' + failures.join('\n'));
  console.error('Aucun fichier écrit : corrige videos.source.json (remplacer ou retirer les vidéos).');
  process.exit(1);
}
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`${out.length} vidéos vérifiées -> src/content/videos.json`);
