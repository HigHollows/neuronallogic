/** Jeu d'icônes simples et cohérentes (trait 1,75 px, 24×24), décoratives : toujours accompagnées d'un libellé texte. */
const PATHS: Record<string, string> = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  path: 'M4 6h16M4 12h10M4 18h16',
  book: 'M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3V4zM5 17a3 3 0 013-3h11',
  quiz: 'M9 9a3 3 0 115 2c-1 1-2 1.5-2 3M12 18h.01M12 3a9 9 0 100 18 9 9 0 000-18z',
  exercise: 'M4 20l4-1 11-11-3-3L5 16l-1 4zM14 7l3 3',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  sheet: 'M7 3h8l4 4v14H7V3zM15 3v4h4M10 12h6M10 16h6',
  profile: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  gift: 'M4 11h16v9H4v-9zM3 7h18v4H3V7zM12 7v13M12 7c-2 0-4-1-4-2.5S10 2 12 5c2-3 4-1.5 4 0S14 7 12 7z',
  review: 'M4 12a8 8 0 0113.5-5.8L20 8M20 4v4h-4M20 12a8 8 0 01-13.5 5.8L4 16M4 20v-4h4',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-5-5',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z',
  check: 'M5 12l4 4 10-10',
  tool: 'M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.4 2.4-2.6-.6-.6-2.6 2.4-2.2z',
  server: 'M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01',
  database: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  network: 'M12 3v6M12 15v6M5 9h14v6H5zM3 12h2M19 12h2',
  brain: 'M9 4a3 3 0 00-3 3 3 3 0 00-2 5 3 3 0 002 5 3 3 0 003 3V4zM15 4a3 3 0 013 3 3 3 0 012 5 3 3 0 01-2 5 3 3 0 01-3 3V4z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z',
  branch: 'M6 4v10a4 4 0 004 4h4M6 4a2 2 0 100 .01M18 18a2 2 0 100 .01M6 8a4 4 0 004 4h4',
  cog: 'M12 9a3 3 0 100 6 3 3 0 000-6zM12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1',
  cloud: 'M7 18a4 4 0 010-8 5 5 0 019.6-1A4.5 4.5 0 0117 18H7z',
  chat: 'M4 5h16v11H9l-5 4V5z',
  plug: 'M9 3v5M15 3v5M6 8h12v4a6 6 0 01-12 0V8zM12 18v3',
  hand: 'M8 12V6a1.5 1.5 0 013 0v5M11 11V4.5a1.5 1.5 0 013 0V11M14 11V6a1.5 1.5 0 013 0v7a7 7 0 01-7 7c-3 0-5-2-6.5-4.5L4 13a1.5 1.5 0 012.5-1.5L8 13',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9h.01',
  stop: 'M8 3h8l5 5v8l-5 5H8l-5-5V8l5-5z',
  info: 'M12 8h.01M11 12h1v5h1M12 3a9 9 0 100 18 9 9 0 000-18z',
};

export function Icon({ name, size = 18 }: { name: keyof typeof PATHS | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ flex: 'none' }}>
      <path d={PATHS[name] ?? PATHS.info} />
    </svg>
  );
}
