import { ArrowUpRight, Navigation, Phone, Send } from 'lucide-react';
import { DrawCheck, Ring, SuccessDot } from '@/components/motion';
import { cn, toast } from '@/components/ui';
import { BobMark } from '@/modules/bob/components/VoiceOrb';
import type { CockpitData } from '../useCockpitData';
import { useTodayItems, type TodayItem } from './useTodayItems';

const ACTION_ICON = { phone: Phone, send: Send, open: ArrowUpRight, route: Navigation };
const KIND_DOT: Record<TodayItem['kind'], string> = { chantier: 'bg-[#ea580c]', devis: 'bg-vi-600', argent: 'bg-mag-600', demande: 'bg-vi-400', equipe: 'bg-[#0891b2]' };

/** « Aujourd'hui » : 3 à 5 choses concrètes, à cocher. Cocher dessine une coche et barre la ligne. */
export function TodayActions({ data, className }: { data: CockpitData; className?: string }) {
  const { items, done, toggle } = useTodayItems(data);
  if (!items.length) return null;
  const n = items.filter((i) => done[i.key]).length;
  const all = n === items.length;
  return (
    <section className={cn('flex flex-col', className)} aria-label="Aujourd'hui">
      <div className="mb-2.5 flex items-end justify-between px-1">
        <div>
          <h2 className="text-[17px] font-semibold tracking-[-0.025em]">Aujourd’hui</h2>
          <p className="text-[12.5px] text-ink-3">{all ? 'Tout est fait. Belle journée.' : `${items.length - n} chose${items.length - n > 1 ? 's' : ''} comptent encore`}</p>
        </div>
        <div className="flex items-center gap-1" aria-label={`${n} sur ${items.length} faites`}>
          {items.map((i) => (
            <i key={i.key} className={cn('h-1.5 rounded-full transition-all duration-500 ease-out-quint', done[i.key] ? 'w-4 bg-ok' : 'w-1.5 bg-line2')} />
          ))}
        </div>
      </div>
      <div className="stagger-fast flex-1 overflow-hidden rounded-[18px] bg-white shadow-card">
        {items.map((it) => (
          <Row key={it.key} it={it} done={!!done[it.key]} onToggle={() => {
            if (!done[it.key]) toast('Bien joué, c’est coché.', 'ok', { label: 'Annuler', run: () => toggle(it.key) });
            toggle(it.key);
          }} />
        ))}
        {all && (
          <div className="flex items-center gap-2 border-t border-line bg-ok-bg/60 px-4 py-3 text-[13px] font-medium text-ok">
            <DrawCheck className="h-4 w-4" /> Journée bouclée. Bob prépare demain cette nuit.
          </div>
        )}
      </div>
    </section>
  );
}

function Row({ it, done, onToggle }: { it: TodayItem; done: boolean; onToggle: () => void }) {
  const A = ACTION_ICON[it.action.icon];
  return (
    <div className={cn('group relative flex gap-3 border-b border-line px-4 py-3.5 transition-[background,opacity] duration-300 last:border-b-0 md:px-5', done ? 'opacity-60' : 'hover:bg-[#fbfaff]')}>
      <button onClick={onToggle} aria-pressed={done} aria-label={done ? 'Décocher' : 'Marquer comme fait'} className="relative -m-2 grid h-10 w-10 shrink-0 place-items-center self-start rounded-full">
        {done ? <SuccessDot size={22} /> : <span className="h-[22px] w-[22px] rounded-full border-[1.75px] border-line2 transition-colors duration-200 group-hover:border-ink-3" />}
      </button>
      <button onClick={it.open} className="min-w-0 flex-1 text-left">
        <span className="relative inline-flex max-w-full items-center gap-2">
          <i className={cn('h-1.5 w-1.5 shrink-0 rounded-full', KIND_DOT[it.kind])} aria-hidden />
          <b className="truncate text-[14.5px] font-semibold leading-snug tracking-[-0.01em]">{it.title}</b>
          <span className={cn('absolute left-3.5 right-0 top-1/2 h-px origin-left bg-ink-3 transition-transform duration-300 ease-out-quint', done ? 'scale-x-100' : 'scale-x-0')} aria-hidden />
        </span>
        <span className="mt-0.5 block truncate pl-3.5 text-[12.5px] text-ink-2">{it.sub}</span>
        {it.bob && !done && (
          <span className="mt-2 ml-3.5 flex items-start gap-2 rounded-[12px] bg-sub px-2.5 py-2 text-[12.5px] leading-snug text-ink-2">
            <BobMark size={18} className="mt-px" />
            <span>{it.bob}</span>
          </span>
        )}
      </button>
      <div className="flex shrink-0 items-center gap-2 self-center">
        {it.progress !== undefined && (
          <Ring value={it.progress} size={42} stroke={3.5} tone="vi" className="hidden sm:inline-grid">
            {it.progress}%
          </Ring>
        )}
        <button
          onClick={() => {
            it.action.run();
            if (it.action.icon === 'send') toast('Bob prépare la relance.', 'info');
          }}
          disabled={done}
          className="flex h-10 items-center gap-1.5 rounded-full bg-vi-50 px-3 text-[13px] font-semibold text-vi-700 transition hover:bg-vi-100 active:scale-95 disabled:opacity-40 max-sm:w-10 max-sm:justify-center max-sm:px-0"
          aria-label={it.action.label}
        >
          <A className="h-4 w-4" strokeWidth={1.9} />
          <span className="max-sm:hidden">{it.action.label}</span>
        </button>
      </div>
    </div>
  );
}
