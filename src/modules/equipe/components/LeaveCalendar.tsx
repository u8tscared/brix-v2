import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar, Button, Card, cn } from '@/components/ui';
import { capitalize, monthName, todayISO } from '@/lib/format';
import type { Employee } from '@/lib/types';
import { addDays } from '../data';
import type { LeaveRequest } from '../store';
import { LEAVE_TYPES } from './leaveTypes';

/** Calendrier d'équipe du mois : une ligne par personne, une colonne par jour. */
export function LeaveCalendar({ employees, leaves, focus }: { employees: Employee[]; leaves: LeaveRequest[]; focus?: string }) {
  // Ouvre le mois de la prochaine demande, pour qu'on voie tout de suite qui part.
  const [offset, setOffset] = useState(() => {
    if (!focus) return 0;
    const n = new Date();
    const f = new Date(focus + 'T12:00:00');
    return Math.max(0, (f.getFullYear() - n.getFullYear()) * 12 + f.getMonth() - n.getMonth());
  });
  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + offset);
  const first = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-01`;
  const nDays = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: nDays }, (_, i) => addDays(first, i));
  const today = todayISO();
  const at = (empId: string, d: string) => leaves.find((l) => l.employeeId === empId && l.status !== 'refusee' && l.from <= d && l.to >= d);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-halo-line px-3 py-2.5">
        <Button size="icon-sm" variant="ghost" aria-label="Mois précédent" onClick={() => setOffset(offset - 1)}><ChevronLeft className="h-4 w-4" /></Button>
        <h4 className="min-w-[130px] text-center text-[15px] font-semibold tracking-[-0.02em]">{capitalize(monthName(base))}</h4>
        <Button size="icon-sm" variant="ghost" aria-label="Mois suivant" onClick={() => setOffset(offset + 1)}><ChevronRight className="h-4 w-4" /></Button>
        <div className="flex-1" />
        <div className="hidden items-center gap-3 text-[11.5px] text-ink-2 sm:flex">
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-4 rounded-full bg-[linear-gradient(90deg,#93c5fd,#3b82f6)]" />Validé</span>
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-4 rounded-full border border-dashed border-[#3b82f6] bg-[#e8f0fe]" />En attente</span>
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-4 rounded-full bg-[linear-gradient(90deg,#c4b0f7,#a78bfa)]" />Formation</span>
        </div>
      </div>
      <div className="overflow-x-auto scrollbar-none [mask-image:linear-gradient(90deg,#000_calc(100%-24px),transparent)]">
        <div className="min-w-[760px]">
          <div className="grid border-b border-halo-line text-[10.5px] text-ink-3" style={{ gridTemplateColumns: `132px repeat(${nDays}, minmax(0,1fr))` }}>
            <span />
            {days.map((d) => {
              const dow = new Date(d + 'T12:00:00').getDay();
              return (
                <span key={d} className={cn('py-1.5 text-center', (dow === 0 || dow === 6) && 'bg-halo-track/70', d === today && 'font-semibold text-ink')}>
                  <span className="block">{'DLMMJVS'[dow]}</span>
                  <span className={cn('num mx-auto grid h-5 w-5 place-items-center rounded-full', d === today && 'bg-[image:var(--dawn-d)] text-white')}>{Number(d.slice(8))}</span>
                </span>
              );
            })}
          </div>
          {employees.map((e) => (
            <div key={e.id} className="grid items-center border-b border-halo-line last:border-0" style={{ gridTemplateColumns: `132px repeat(${nDays}, minmax(0,1fr))` }}>
              <span className="flex items-center gap-2 px-3 py-2.5 text-[12.5px] font-medium">
                <Avatar initials={e.initials} color={e.color} size={22} />
                <span className="truncate">{e.firstName}</span>
              </span>
              {days.map((d) => {
                const dow = new Date(d + 'T12:00:00').getDay();
                const l = at(e.id, d);
                const we = dow === 0 || dow === 6;
                const start = l && (l.from === d || dow === 1);
                const end = l && (l.to === d || dow === 5);
                return (
                  <span key={d} className={cn('relative h-11', we && 'bg-halo-track/70')} title={l ? `${LEAVE_TYPES[l.type].label}${l.status === 'en_attente' ? ' (en attente)' : ''}` : undefined}>
                    {l && !we && (
                      <i className={cn(
                        'absolute inset-y-2.5 left-0 right-0 origin-left animate-grow',
                        start && 'left-1 rounded-l-full',
                        end && 'right-1 rounded-r-full',
                        l.status === 'en_attente' ? 'border-y border-dashed border-[#3b82f6] bg-[#e8f0fe]' : l.type === 'formation' ? 'bg-[linear-gradient(90deg,#c4b0f7,#a78bfa)]' : l.type === 'maladie' ? 'bg-[linear-gradient(90deg,#fcd34d,#f59e0b)]' : 'bg-[linear-gradient(90deg,#93c5fd,#3b82f6)]',
                        l.status === 'en_attente' && start && 'border-l',
                        l.status === 'en_attente' && end && 'border-r',
                      )} />
                    )}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
