import type { IndexEntry } from '../lib/search';
import { DOCS } from './docs';
import { EXTRA_TERMS, TERMS } from './glossary';
import { LESSONS, VIDEOS, lessonPlainText } from './index';
import { MODULES } from './modules';
import { ALL_GUIDES, COMPONENT_GUIDE_IDS, TROUBLESHOOTING, guideById } from '../studio/data/guides';

/** Index de recherche global : modules, leçons, notions, ressources et vidéos. */
export function buildIndex(): IndexEntry[] {
  const entries: IndexEntry[] = [];
  for (const m of MODULES) {
    entries.push({ id: m.id, kind: 'module', title: `Module ${m.number} — ${m.title}`, subtitle: m.tagline, body: `${m.objective} ${m.synthesis.join(' ')}`, to: `/module/${m.id}` });
  }
  for (const l of LESSONS) {
    entries.push({ id: l.id, kind: 'lecon', title: l.title, subtitle: l.objective, body: lessonPlainText(l), to: `/lecon/${l.id}` });
  }
  for (const t of TERMS) {
    entries.push({
      id: t.id, kind: 'notion', title: t.fr, subtitle: t.definition,
      body: `${t.definition} ${t.explanation} ${t.example} ${t.mistake} ${t.analogy?.text ?? ''}`,
      to: `/notions/${t.id}`, keywords: [t.en ?? ''],
    });
  }
  for (const e of EXTRA_TERMS) {
    entries.push({ id: e.id, kind: 'notion', title: e.fr, subtitle: e.definition, body: e.definition, to: `/notions#${e.id}`, keywords: [e.en ?? ''] });
  }
  for (const d of DOCS) {
    entries.push({ id: d.id, kind: 'ressource', title: d.title, subtitle: `${d.org} — ${d.description}`, body: `${d.description} ${d.org} ${d.topics.join(' ')}`, to: `/ressources#${d.id}` });
  }
  for (const v of VIDEOS) {
    entries.push({ id: v.id, kind: 'video', title: v.title, subtitle: `Vidéo — ${v.channel}`, body: `${v.channel} ${v.note ?? ''} ${v.topics.join(' ')}`, to: `/ressources#${v.id}` });
  }
  for (const g of ALL_GUIDES) {
    entries.push({ id: g.id, kind: 'studio', title: `Studio — ${g.title}`, subtitle: g.summary, body: g.sections.map((x) => `${x.h} ${x.p.join(' ')}`).join(' '), to: `/studio/guide/${g.id}` });
  }
  for (const id of COMPONENT_GUIDE_IDS) {
    const g = guideById(id)!;
    entries.push({ id, kind: 'studio', title: `Studio — composant : ${g.title}`, subtitle: g.summary, body: g.sections.map((x) => `${x.h} ${x.p.join(' ')}`).join(' '), to: `/studio/guide/${id}` });
  }
  for (const t of TROUBLESHOOTING) {
    entries.push({ id: `depannage-${t.code}`, kind: 'studio', title: `Studio — dépannage : ${t.title}`, subtitle: t.observe, body: `${t.observe} ${t.why} ${t.fix} ${t.retain}`, to: `/studio/guide/depannage#${t.code}` });
  }
  entries.push({ id: 'studio', kind: 'studio', title: 'Studio IA — éditeur d’architectures', subtitle: 'Construire des schémas d’IA avec des blocs et des connexions', body: 'Studio éditeur visuel architecture blocs connexions simulation vérification tutoriel défis', to: '/studio' });
  return entries;
}

let cached: IndexEntry[] | null = null;
export function getIndex(): IndexEntry[] {
  return (cached ??= buildIndex());
}
