// Génère docs/REVISIONS.md à partir de src/content/corrections.json (source unique de vérité, aussi affichée sur le site).
// Usage : node tools/gen-revisions.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('../src/content/corrections.json', import.meta.url), 'utf8'));
const lines = [];
lines.push('# Document de révision du manuel', '');
lines.push(`> Généré depuis \`src/content/corrections.json\` — dernière vérification : ${data.checkedOn}.`, '');
lines.push(data.intro, '');
lines.push('| Type | Nombre |', '|---|---|');
for (const [k, label] of Object.entries(data.types)) lines.push(`| ${label} | ${data.items.filter((i) => i.type === k).length} |`);
lines.push('');
for (const [k, label] of Object.entries(data.types)) {
  const items = data.items.filter((i) => i.type === k);
  if (!items.length) continue;
  lines.push(`## ${label}`, '');
  for (const i of items) {
    lines.push(`### ${i.id.toUpperCase()} — chapitre(s) ${i.chapter}`, '');
    lines.push(`- **Passage concerné :** ${i.passage}`);
    lines.push(`- **Problème identifié :** ${i.problem}`);
    lines.push(`- **Correction apportée :** ${i.correction}`);
    lines.push(`- **Justification :** ${i.justification}`, '');
  }
}
lines.push('## Éléments vérifiés et conservés', '');
for (const v of data.verified) lines.push(`- ${v}`);
lines.push('');
mkdirSync(new URL('../docs/', import.meta.url), { recursive: true });
writeFileSync(new URL('../docs/REVISIONS.md', import.meta.url), lines.join('\n'));
console.log(`docs/REVISIONS.md écrit (${data.items.length} entrées).`);
