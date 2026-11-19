import { ArrowUpRight, Banknote, FileText, HardHat, Inbox, Navigation, Phone, Send, ShieldAlert } from 'lucide-react';
import { DrawCheck, SuccessDot } from '@/components/motion';
import { Card, IconTile, cn, toast, type HaloTone } from '@/components/ui';
import { BrandSymbol } from '@/components/brand/Logo';
import type { CockpitData } from '../useCockpitData';
import { CardTitle } from './CardTitle';
import { useTodayItems, type TodayItem } from './useTodayItems';

const ACTION_ICON = { phone: Phone, send: Send, open: ArrowUpRight, route: Navigation };
const KIND: Record<TodayItem['kind'], { tone: HaloTone; icon: JSX.Element }> = {
  chantier: { tone: 'peach', icon: <HardHat /> },
  devis: { tone: 'violet', icon: <FileText /> },
  argent: { tone: 'mag', icon: <Banknote /> },
  demande: { tone: 'blue', icon: <Inbox /> },
  equipe: { tone: 'amber', icon: <ShieldAlert /> },
};

/** « À faire aujourd'hui » : 3 à 5 choses concrètes, à cocher. Cocher dessine une coche et barre la ligne. */
export function TodayActions({ data, className }: { data: CockpitData; className?: string }) {
  const { items, done, toggle } = useTodayItems(data);
  if (!items.length) return null;
  const n = items.filter((i) => done[i.key]).length;
  const all = n === items.length;
  return (
    <Card className={cn('flex flex-col p-5 pb-3', className)} aria-label="À faire aujourd'hui">
      <CardTitle
        title="À faire aujourd’hui"
        meta={all ? 'Tout est fait. Belle journée.' : `${items.length - n} chose${items.length - n > 1 ? 's' : ''} comptent encore`}
        right={
          <div className="mt-1.5 flex items-center gap-1" role="img" aria-label={`${n} sur ${items.length} faites`}>
            {items.map((i) => (
              <i key={i.key} className={cn('h-1.5 rounded-full transition-all duration-500 ease-spring', done[i.key] ? 'w-4 bg-[#10b981]' : 'w-1.5 bg-[#e4dff0]')} />
            ))}
          </div>
        }
      />
      <div className="mt-2 flex-1">
        {items.map((it) => (
          <Row
            key={it.key}
            it={it}
            done={!!done[it.key]}
            onToggle={() => {
              if (!done[it.key]) toast('Bien joué, c’est coché.', 'ok', { label: 'Annuler', run: () => toggle(it.key) });
              toggle(it.key);
            }}
          />
        ))}
      </div>
      {all && (
        <div className="mt-2 flex items-center gap-2 rounded-full bg-pale-g px-3.5 py-2 text-[13px] font-medium text-deep-g">
          <DrawCheck className="h-4 w-4" /> Journée bouclée. Brix AI prépare demain cette nuit.
        </div>
      )}
    </Card>
  );
}

function Row({ it, done, onToggle }: { it: TodayItem; done: boolean; onToggle: () => void }) {
  const A = ACTION_ICON[it.action.icon];
  const k = KIND[it.kind];
  return (
    <div className={cn('group relative flex items-center gap-3 border-b border-[#f2eff8] py-3 transition-opacity duration-300 last:border-b-0', done && 'opacity-55')}>
      <button onClick={onToggle} aria-pressed={done} aria-label={done ? 'Décocher' : 'Marquer comme fait'} className="-m-2 grid h-10 w-10 shrink-0 place-items-center rounded-full">
        {done ? <SuccessDot size={22} /> : <span className="h-[22px] w-[22px] rounded-full border-[1.75px] border-[#dcd6ea] transition-colors duration-200 group-hover:border-ink-3" />}
      </button>
      <IconTile icon={k.icon} tone={k.tone} size="row" className="max-sm:hidden" />
      <button onClick={it.open} className="min-w-0 flex-1 text-left">
        <span className="relative inline-block max-w-full">
          <b className="block truncate text-[14px] font-semibold leading-snug tracking-[-0.01em]">{it.title}</b>
          <span className={cn('absolute inset-x-0 top-1/2 h-px origin-left bg-ink-3 transition-transform duration-300 ease-out-quint', done ? 'scale-x-100' : 'scale-x-0')} aria-hidden />
        </span>
        <span className="block truncate text-[12.5px] text-ink-3">{it.sub}</span>
        {it.bob && !done && (
          <span className="mt-2 flex items-start gap-2 rounded-[14px] bg-pale-v/70 px-2.5 py-2 text-[12.5px] leading-snug text-ink-2">
            <BrandSymbol className="mt-[3px] h-3 w-3 shrink-0" color="#6d28d9" />
            <span>{it.bob}</span>
          </span>
        )}
      </button>
      <button
        onClick={() => {
          it.action.run();
          if (it.action.icon === 'send') toast('Brix AI prépare la relance.', 'info');
        }}
        disabled={done}
        className="inline-flex h-10 shrink-0 items-center gap-1.5 self-center rounded-full bg-white px-3 text-[13px] font-medium text-ink shadow-[0_1px_2px_rgba(60,30,120,.08),0_0_0_1px_#ece8f6] transition duration-300 ease-spring hover:-translate-y-px active:scale-95 disabled:opacity-40 max-sm:w-10 max-sm:justify-center max-sm:px-0"
        aria-label={it.action.label}
      >
        <A className="h-4 w-4 text-deep-v" strokeWidth={1.9} />
        <span className="max-sm:hidden">{it.action.label}</span>
      </button>
    </div>
  );
}
