import { useState } from 'react';
import { Mission } from '../types';
import { FontSize } from '../types';

/**
 * Mission brief panel.
 *
 * Sits between the top bar and the editor rather than inside the bar itself.
 * The objective is the thing the student is graded against, so it gets real
 * estate and its own scroll: multi-step and long exercises will not fit in a
 * fixed-height strip, and truncating them would hide the actual task.
 *
 * Collapsed, it is a one-line summary so the editor keeps the vertical space
 * for someone who already knows what they are doing.
 */
export default function MissionBrief({
  mission,
  fontSize,
}: {
  mission: Mission | undefined;
  fontSize: FontSize;
}) {
  const [expanded, setExpanded] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  if (!mission) return null;

  const body = (
    <div className="px-4 py-2.5">
      <p
        className={`text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words ${fontSize}`}
      >
        {mission.desc}
      </p>
    </div>
  );

  return (
    <section
      className="shrink-0 border-b border-ice-300 dark:border-slate-800 bg-blue-50/60 dark:bg-blue-950/20"
      aria-label="Objetivo do exercício"
    >
      {/* Collapsed: a single line that still carries the objective. */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-blue-100/50 dark:hover:bg-blue-900/20 transition-colors"
          title="Expandir objetivo"
        >
          <span className="text-blue-500 font-bold text-[10px] uppercase tracking-wider shrink-0">
            Objetivo
          </span>
          <span className="text-xs text-slate-700 dark:text-slate-300 truncate">
            {mission.desc}
          </span>
          <svg
            className="w-3 h-3 ml-auto shrink-0 text-slate-400 rotate-180"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}

      {/* Expanded: header actions plus a scrollable body. */}
      {expanded && (
        <>
          <div className="flex items-center gap-2 px-4 pt-2 pb-1">
            <span className="text-blue-500 font-bold text-[10px] uppercase tracking-wider shrink-0">
              Objetivo
            </span>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 shrink-0">
              {mission.title}
            </span>
            <div className="ml-auto flex items-center gap-1 shrink-0">
              {/* Only offer scrolling once the text actually overflows, so the
                  control is absent in the common case rather than decorative. */}
              <button
                onClick={() => setScrolled((s) => !s)}
                className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm border border-ice-300 dark:border-slate-700 text-slate-500 hover:text-blue-500 hover:border-blue-400 transition-colors"
                title={
                  scrolled
                    ? 'Expandir para o tamanho total'
                    : 'Limitar a altura com barra de rolagem'
                }
              >
                {scrolled ? 'Expandir tudo' : 'Encaixar'}
              </button>
              <button
                onClick={() => setExpanded(false)}
                className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm border border-ice-300 dark:border-slate-700 text-slate-500 hover:text-blue-500 hover:border-blue-400 transition-colors"
                title="Recolher objetivo"
              >
                Recolher
              </button>
              <button
                onClick={() => setExpanded(false)}
                className="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                title="Recolher objetivo"
                aria-label="Recolher objetivo"
              >
                <svg
                  className="w-3.5 h-3.5 rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" />
                </svg>
              </button>
            </div>
          </div>
          {/* Scroll cap: a long or multi-step brief scrolls instead of pushing
              the editor off screen. `scrolled` toggles the cap, so the student
              can also read the whole thing at once when they want to. */}
          <div
            className={scrolled ? 'max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-ice-300 dark:scrollbar-thumb-slate-700' : ''}
          >
            {body}
          </div>
        </>
      )}
    </section>
  );
}
