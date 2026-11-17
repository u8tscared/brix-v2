// Liste des articles : tableau sur ordinateur, cartes sur téléphone.
// Un article bas n'est pas crié en rouge : un point ambre et une jauge suffisent.
import { PackageMinus } from 'lucide-react';
import { Button, cn } from '@/components/ui';
import { SuccessDot } from '@/components/motion';
import { money, num } from '@/lib/format';
import { LOCATIONS, type Article, type LocationKey } from '../data';
import { isLow, totalQty, vanLow } from '../store';

const lowAt = (a: Article, loc: LocationKey) => (loc === 'depot' ? isLow(a) : vanLow(a, loc));
const COLS = 'lg:grid-cols-[minmax(0,2.3fr)_repeat(3,minmax(0,.62fr))_minmax(0,1fr)_minmax(0,.7fr)_96px]';

function Qty({ a, loc }: { a: Article; loc: LocationKey }) {
  const low = lowAt(a, loc);
  return (
    <span className={cn('num inline-flex items-center gap-1.5', low ? 'font-semibold text-[#b45309]' : a.qty[loc] === 0 ? 'text-ink-3' : '')}>
      {low && <i aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />}
      {num(a.qty[loc], 1)}
    </span>
  );
}

/** Jauge du dépôt : où on en est par rapport au seuil (le seuil est au tiers de la barre). */
function Level({ a }: { a: Article }) {
  const pct = Math.min(100, (a.qty.depot / (a.min * 3)) * 100);
  const low = isLow(a);
  return (
    <span className="relative block h-1.5 w-full overflow-hidden rounded-full bg-sub">
      <span className={cn('absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out-quint', low ? 'bg-[#f59e0b]' : 'bg-[#0d9488]')} style={{ width: `${Math.max(4, pct)}%` }} />
      <span aria-hidden className="absolute inset-y-0 left-1/3 w-[2px] bg-white" />
    </span>
  );
}

export function StockList({ list, flash, onOut }: { list: Article[]; flash: string | null; onOut: (id: string) => void }) {
  return (
    <div className="overflow-hidden rounded-[16px] bg-white shadow-card">
      <div className={cn('hidden gap-3 border-b border-line px-4 py-2.5 text-[11.5px] font-medium text-ink-3 lg:grid', COLS)}>
        <span>Article</span>
        {LOCATIONS.map((l) => <span key={l.key} className="text-right">{l.short}</span>)}
        <span>Niveau au dépôt</span>
        <span className="text-right">Valeur</span>
        <span />
      </div>
      {list.length === 0 && <div className="px-4 py-12 text-center text-[13px] text-ink-3">Aucun article ne correspond à votre recherche.</div>}
      <div className="stagger-fast">
        {list.map((a) => {
          const done = flash === a.id;
          return (
            <div key={a.id} className={cn('relative border-b border-line px-4 py-3.5 transition-colors duration-500 last:border-0 lg:grid lg:items-center lg:gap-3 lg:py-3', COLS, done && 'bg-[#e7f6f3]')}>
              <div className="flex min-w-0 items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[14px] font-medium">{a.name}</span>
                    {done && <SuccessDot size={16} />}
                  </div>
                  <div className="truncate text-[11.5px] text-ink-3">{a.ref} · {a.supplier} · {money(a.cost)} / {a.unit}</div>
                </div>
              </div>
              {LOCATIONS.map((l) => <span key={l.key} className="hidden text-right text-[13px] lg:block"><Qty a={a} loc={l.key} /></span>)}
              <span className="hidden items-center gap-2 lg:flex">
                <Level a={a} />
                <span className="num w-9 shrink-0 text-right text-[11.5px] text-ink-3">{a.min}</span>
              </span>
              <span className="num hidden text-right text-[13px] text-ink-2 lg:block">{money(totalQty(a) * a.cost, true)}</span>
              <span className="hidden justify-end lg:flex">
                <Button size="sm" variant="ghost" icon={<PackageMinus />} onClick={() => onOut(a.id)}>Sortir</Button>
              </span>

              {/* Téléphone */}
              <div className="mt-2.5 lg:hidden">
                <Level a={a} />
                <div className="mt-2.5 flex items-center gap-1.5">
                  {LOCATIONS.map((l) => (
                    <span key={l.key} className={cn('flex h-9 min-w-0 items-center gap-1.5 rounded-[10px] px-2.5 text-[12.5px]', lowAt(a, l.key) ? 'bg-[#fef6e7]' : 'bg-sub')}>
                      <span className="text-ink-3">{l.short}</span>
                      <Qty a={a} loc={l.key} />
                    </span>
                  ))}
                  <button onClick={() => onOut(a.id)} className="press ml-auto grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-2 shadow-[0_0_0_1px_var(--line2)] hover:bg-sub" aria-label={`Sortir ${a.name}`}>
                    <PackageMinus className="h-[18px] w-[18px]" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
