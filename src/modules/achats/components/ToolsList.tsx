// Outillage et EPI : qui a quoi, et quand le vérifier. Tableau sur ordinateur, cartes sur téléphone.
import { ArrowLeftRight, CheckCircle2, Warehouse } from 'lucide-react';
import { Avatar, Button, IconTile, cn } from '@/components/ui';
import { SuccessDot } from '@/components/motion';
import { useBrix } from '@/lib/store';
import { dateFull, relative } from '@/lib/format';
import type { Tool } from '../data';
import { daysTo, nextCheck } from './fleet';

const COLS = 'lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1.2fr)_200px]';

function CheckPill({ t }: { t: Tool }) {
  const n = nextCheck(t);
  if (!n) return <span className="text-[12px] text-ink-3">Pas de vérification</span>;
  const d = daysTo(n);
  const soon = d <= 30;
  return (
    <span className="flex min-w-0 items-center gap-2 text-[12.5px]">
      <i aria-hidden className={cn('h-2 w-2 shrink-0 rounded-full', d < 0 ? 'bg-[#f43f5e]' : soon ? 'bg-[#f59e0b]' : 'bg-[#10b981]')} />
      <span className="min-w-0 truncate">
        <span className={cn('font-medium', d < 0 ? 'text-deep-r' : soon ? 'text-deep-a' : 'text-ink-2')}>{d < 0 ? `En retard de ${-d} j` : soon ? `Dans ${d} j` : dateFull(n)}</span>
        <span className="text-ink-3"> · {t.checkLabel?.toLowerCase()}</span>
      </span>
    </span>
  );
}

export function ToolsList({ tools, checked, onLend, onCheck }: { tools: Tool[]; checked: Record<string, boolean>; onLend: (t: Tool) => void; onCheck: (t: Tool) => void }) {
  const employees = useBrix((s) => s.employees);
  return (
    <div className="overflow-hidden rounded-card bg-white shadow-halo">
      <div className={cn('hidden gap-3 border-b border-halo-line px-5 py-3 text-[12px] font-medium text-ink-3 lg:grid', COLS)}>
        <span>Outil</span><span>Chez</span><span>Prochaine vérification</span><span />
      </div>
      <div className="stagger-fast">
        {tools.map((t) => {
          const h = employees.find((e) => e.id === t.holderId);
          const n = nextCheck(t);
          const due = n ? daysTo(n) <= 30 : false;
          return (
            <div key={t.id} className={cn('border-b border-halo-line px-4 py-3.5 transition-colors last:border-0 hover:bg-halo-hover lg:grid lg:items-center lg:gap-3 lg:px-5 lg:py-3', COLS)}>
              <div className="flex min-w-0 items-center justify-between gap-3">
                <IconTile name={/epi|harnais|casque/i.test(t.category) ? 'HardHat' : 'Wrench'} dept="achats" size="row" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium">{t.name}</div>
                  <div className="truncate text-[11.5px] text-ink-3">{t.brand} · {t.category}</div>
                </div>
                <span className="shrink-0 lg:hidden">{h ? <Avatar initials={h.initials} color={h.color} size={30} /> : <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-pale-n text-ink-3"><Warehouse className="h-3.5 w-3.5" /></span>}</span>
              </div>
              <div className="hidden min-w-0 items-center gap-2 text-[13px] lg:flex">
                {h ? <><Avatar initials={h.initials} color={h.color} size={24} /><span>{h.firstName}</span><span className="truncate text-[11.5px] text-ink-3">{relative(t.since!)}</span></> : <span className="flex items-center gap-1.5 text-ink-3"><Warehouse className="h-3.5 w-3.5" />Au dépôt</span>}
              </div>
              <div className="mt-2 lg:mt-0"><CheckPill t={t} /></div>
              <div className="mt-3 flex items-center gap-2 lg:mt-0 lg:justify-end">
                <span className="text-[12px] text-ink-3 lg:hidden">{h ? `Chez ${h.firstName}, ${relative(t.since!)}` : 'Au dépôt'}</span>
                <span className="ml-auto flex items-center gap-1.5 lg:ml-0">
                  {checked[t.id] ? (
                    <span className="flex h-9 items-center gap-1.5 px-1 text-[12.5px] font-medium text-deep-g"><SuccessDot size={16} />Fait</span>
                  ) : due ? (
                    <Button size="sm" variant="ghost" icon={<CheckCircle2 />} onClick={() => onCheck(t)}>Vérifié</Button>
                  ) : null}
                  <Button size="sm" variant="secondary" icon={<ArrowLeftRight />} onClick={() => onLend(t)}>{t.holderId ? 'Rendre' : 'Prêter'}</Button>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
