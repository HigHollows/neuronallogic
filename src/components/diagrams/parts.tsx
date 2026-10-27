import type { ReactNode } from 'react';

export interface FlowStep {
  title: string;
  text?: string;
}

/** Suite d'étapes numérotées : horizontale sur grand écran, verticale sur mobile. */
export function Flow({ label, steps, loopNote }: { label?: string; steps: FlowStep[]; loopNote?: string }) {
  return (
    <>
      {label && <p className="flow-label">{label}</p>}
      <ol className="flow">
        {steps.map((s, i) => (
          <li key={i}>
            <div className="box">
              <b>{s.title}</b>
              {s.text}
            </div>
          </li>
        ))}
      </ol>
      {loopNote && <p className="loop-note">{loopNote}</p>}
    </>
  );
}

export interface SeqMessage {
  from: number;
  to: number;
  text: ReactNode;
}

/** Échanges numérotés entre acteurs. Équivalent textuel d'un diagramme de séquence, lisible partout. */
export function Sequence({ actors, messages }: { actors: string[]; messages: SeqMessage[] }) {
  return (
    <ol className="seq">
      {messages.map((m, i) => (
        <li key={i}>
          <div>
            <div className="who">
              <span className={`actor a${m.from % 4}`}>{actors[m.from]}</span>
              <span className="arrow" aria-label={m.from === m.to ? 'agit sur lui-même' : 'vers'}>
                {m.from === m.to ? '↺' : '→'}
              </span>
              {m.from !== m.to && <span className={`actor a${m.to % 4}`}>{actors[m.to]}</span>}
            </div>
            <p className="msg">{m.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
