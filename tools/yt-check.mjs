// Vérifie des vidéos YouTube : titre, chaîne, durée, date, sous-titres réellement publiés.
// Usage : node tools/yt-check.mjs <id> [<id> ...]   |   node tools/yt-check.mjs --search "requête"
const UA = { 'user-agent': 'Mozilla/5.0', 'accept-language': 'en-US,en;q=0.9' };
async function info(id) {
  const o = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
  if (!o.ok) return { id, ok: false, status: o.status };
  const j = await o.json();
  const html = await (await fetch(`https://www.youtube.com/watch?v=${id}`, { headers: UA })).text();
  const len = html.match(/"lengthSeconds":"(\d+)"/)?.[1];
  const date = html.match(/"publishDate":"([^"]+)"/)?.[1];
  const tracks = html.match(/"captionTracks":\[(.*?)\],"audioTracks"/s)?.[1] ?? '';
  const langs = [...tracks.matchAll(/"languageCode":"([a-zA-Z-]+)"/g)].map(m => m[1]);
  const kinds = [...tracks.matchAll(/"kind":"(\w+)"/g)].map(m => m[1]);
  return { id, ok: true, title: j.title, author: j.author_name, seconds: len ? +len : null, date, captionLangs: [...new Set(langs)], asr: kinds.includes('asr') };
}
const args = process.argv.slice(2);
if (args[0] === '--search') {
  const html = await (await fetch('https://www.youtube.com/results?search_query=' + encodeURIComponent(args[1]), { headers: UA })).text();
  const ids = [...new Set([...html.matchAll(/"videoId":"([\w-]{11})"/g)].map(m => m[1]))].slice(0, 8);
  for (const id of ids) console.log(JSON.stringify(await info(id)));
} else for (const id of args) console.log(JSON.stringify(await info(id)));
