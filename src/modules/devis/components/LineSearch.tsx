import { forwardRef, useMemo, useState } from 'react';
import { BookOpen, Mic, PenLine, Plus } from 'lucide-react';
import { cn } from '@/components/ui';
import { money, uid } from '@/lib/format';
import type { DevisLigne } from '@/lib/types';
import { LIBRARY, searchLibrary, TRADE_LABEL } from '../library';
import { lineFromLib } from '../logic';

/**
 * Ajout de ligne au clavier : recherche dans la bibliothèque de prix.
 * « 8 disj 16 » ajoute 8 disjoncteurs 16 A. Entrée valide le premier résultat.
 */
export const LineSearch = forwardRef<HTMLInputElement, { vatRate: number; onAdd: (l: DevisLigne) => void; onVoice: () => void; big?: boolean }>(function LineSearch({ vatRate, onAdd, onVoice, big }, ref) {
  const [q, setQ] = useState('');
  const [focus, setFocus] = useState(false);
  const [sel, setSel] = useState(0);
  const parsed = useMemo(() => {
    const m = q.match(/^\s*(\d+(?:[.,]\d+)?)\s*(?:x|×)?\s+(.+)$/i);
    return m ? { qty: Number(m[1].replace(',', '.')), term: m[2] } : { qty: 1, term: q };
  }, [q]);
  const results = useMemo(() => (parsed.term.trim().length >= 2 ? searchLibrary(parsed.term, 7) : []), [parsed.term]);
  const options = results.length + (q.trim() ? 1 : 0);

  const pick = (i: number) => {
    if (i < results.length) onAdd(lineFromLib(results[i], vatRate, parsed.qty));
    else if (q.trim()) onAdd({ id: uid('l'), kind: 'ouvrage', designation: parsed.term.trim().replace(/^./, (c) => c.toUpperCase()), quantity: parsed.qty, unit: 'u', unitPriceHt: 0, unitCostHt: 0, vatRate, source: 'manuel' });
    setQ('');
    setSel(0);
  };

  return (
    <div className="relative">
      <div className={cn('flex items-center gap-2 rounded-lg px-2 text-ink-3 transition', focus ? 'bg-white ring-1 ring-vi-200' : 'hover:bg-sub', big ? 'h-12' : 'h-10')}>
        <Plus className="h-4 w-4 shrink-0" />
        <input
          ref={ref}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setSel(0);
          }}
          onFocus={() => setFocus(true)}
          onBlur={() => setTimeout(() => setFocus(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setSel((s) => Math.min(options - 1, s + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSel((s) => Math.max(0, s - 1));
            } else if (e.key === 'Enter' && options) {
              e.preventDefault();
              pick(sel);
            } else if (e.key === 'Escape') {
              setQ('');
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder={big ? 'Chercher un prix ou ajouter une ligne' : `Chercher parmi vos ${LIBRARY.length} prix (touche /) ou dicter à Bob`}
          className="h-full min-w-0 flex-1 bg-transparent text-[13.5px] text-ink placeholder:text-ink-3 focus:outline-none"
          aria-label="Ajouter une ligne depuis la bibliothèque"
        />
        <button onClick={onVoice} className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-ink-3 hover:bg-white hover:text-vi-700" aria-label="Dicter des lignes" type="button">
          <Mic className="h-4 w-4" />
        </button>
      </div>
      {focus && options > 0 && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-line bg-white shadow-pop">
          {results.map((r, i) => (
            <button
              key={r.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(i)}
              onMouseEnter={() => setSel(i)}
              className={cn('flex w-full items-center gap-3 px-3 py-2.5 text-left', sel === i && 'bg-vi-50/70')}
            >
              <BookOpen className="h-4 w-4 shrink-0 text-ink-3" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px]">
                  {parsed.qty !== 1 && <b className="num mr-1 font-semibold text-vi-700">{parsed.qty} ×</b>}
                  {r.designation}
                </div>
                <div className="truncate text-[11.5px] text-ink-3">
                  {TRADE_LABEL[r.trade]} · {[r.ref, r.supplier].filter(Boolean).join(' · ') || r.lot}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="num text-[13px] font-medium">{money(r.price)}</div>
                <div className="text-[11px] text-ink-3">/ {r.unit}</div>
              </div>
            </button>
          ))}
          {q.trim() && (
            <button onMouseDown={(e) => e.preventDefault()} onClick={() => pick(results.length)} onMouseEnter={() => setSel(results.length)} className={cn('flex w-full items-center gap-3 border-t border-line px-3 py-2.5 text-left text-[13px] text-ink-2', sel === results.length && 'bg-vi-50/70')}>
              <PenLine className="h-4 w-4 shrink-0 text-ink-3" />
              Ajouter « {parsed.term.trim()} » en ligne libre
            </button>
          )}
        </div>
      )}
    </div>
  );
});
