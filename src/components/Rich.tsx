import { Link } from 'react-router-dom';
import { Fragment } from 'react';
import { tokenize } from '../lib/rich';
import { termById } from '../content/glossary';

export function ExternalLink({ href, children, className = '' }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`ext ${className}`.trim()}>
      {children}
      <span className="sr-only"> (s’ouvre dans un nouvel onglet)</span>
    </a>
  );
}

/** Affiche un texte au mini-format (gras, italique, code, liens vers les notions, liens externes). */
export function Rich({ text }: { text: string }) {
  return (
    <>
      {tokenize(text).map((tk, i) => {
        switch (tk.t) {
          case 'text':
            return <Fragment key={i}>{tk.v}</Fragment>;
          case 'bold':
            return <strong key={i}>{tk.v}</strong>;
          case 'em':
            return <em key={i}>{tk.v}</em>;
          case 'code':
            return <code key={i}>{tk.v}</code>;
          case 'link':
            return (
              <ExternalLink key={i} href={tk.href}>
                {tk.v}
              </ExternalLink>
            );
          case 'term': {
            const term = termById.get(tk.id);
            if (!term) return <Fragment key={i}>{tk.id}</Fragment>;
            return (
              <Link key={i} to={`/notions/${term.id}`} className="term-link">
                {term.fr.replace(/ \(.*\)$/, '')}
              </Link>
            );
          }
        }
      })}
    </>
  );
}
