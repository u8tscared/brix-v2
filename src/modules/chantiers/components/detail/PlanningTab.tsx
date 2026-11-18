import { useNavigate } from 'react-router-dom';
import { CalendarPlus, CalendarRange } from 'lucide-react';
import { Avatar, Button, Card, EmptyState, cn } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { capitalize, dateLong, daysBetween, todayISO } from '@/lib/format';
import type { ChantierView } from '../../lib/useChantier';
import { hoursOf } from '../../lib/metrics';
import { weatherFor, isRainy } from '../../lib/weather';
import { WeatherIcon } from '../common/bits';
import { personTone } from '../planning/kinds';

export function PlanningTab({ v }: { v: ChantierView }) {
  const navigate = useNavigate();
  const events = useBrix((s) => s.events);
  const employees = useBrix((s) => s.employees);
  const { ch } = v;
  const today = todayISO();
  const list = events.filter((e) => e.chantierId === ch.id).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const days = [...new Set(list.map((e) => e.date))];
  const total = list.reduce((s, e) => s + hoursOf(e), 0);
  const span = Math.max(1, daysBetween(ch.startDate, ch.endDate));
  const pos = (iso: string) => Math.max(0, Math.min(100, (daysBetween(ch.startDate, iso) / span) * 100));

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
          <span className="text-[15px] font-semibold tracking-[-0.02em]">Calendrier du chantier</span>
          <span className="num text-ink-2">{list.length} créneaux · {total} h prévues</span>
        </div>
        <div className="relative mt-4 h-10 rounded-full bg-halo-track">
          <div className="absolute inset-y-0 left-0 origin-left animate-grow rounded-full bg-dawn-soft shadow-[inset_0_0_0_1px_#efe3fb]" style={{ width: `${ch.progress}%` }} />
          {days.map((d) => (
            <span key={d} className={cn('absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white', d < today ? 'bg-[#c9c3dc]' : 'bg-deep-v')} style={{ left: `${pos(d)}%` }} title={dateLong(d)} />
          ))}
          <span className="absolute -top-1.5 bottom-[-6px] w-[3px] -translate-x-1/2 rounded-full bg-[#d946ef] ring-2 ring-white" style={{ left: `${pos(today)}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-xs text-ink-3">
          <span>{dateLong(ch.startDate)}</span>
          <span>{dateLong(ch.endDate)}</span>
        </div>
      </Card>

      {list.length === 0 ? (
        <EmptyState icon={<CalendarRange />} title="Aucun créneau prévu" text="Placez l'équipe sur ce chantier depuis le planning." action={<Button variant="dawn" icon={<CalendarPlus className="h-4 w-4" />} onClick={() => navigate('/app/planning')}>Ouvrir le planning</Button>} />
      ) : (
        <div className="space-y-4">
          {days.map((d) => {
            const w = weatherFor(d, ch.city);
            return (
              <div key={d} className={cn('space-y-1.5', d < today && 'opacity-60')}>
                <div className="flex items-center gap-2 px-1 text-[12.5px] font-medium text-ink-2">
                  <span className="flex-1">{capitalize(dateLong(d))}</span>
                  <WeatherIcon sky={w.sky} className="h-3.5 w-3.5" />
                  <span className={cn('num', isRainy(w) && 'text-[#3b82f6]')}>{w.tMax}°</span>
                </div>
                {list.filter((e) => e.date === d).map((e) => {
                  const emp = employees.find((x) => x.id === e.employeeId);
                  return (
                    <div key={e.id} style={personTone(emp?.color ?? '#7c3aed', e.kind)} className="flex min-h-[52px] items-center gap-3 rounded-card-sm px-4 py-2">
                      <span className="num w-[86px] shrink-0 text-[12.5px] text-ink-2">{e.start} – {e.end}</span>
                      <span className="min-w-0 flex-1 truncate text-[13.5px]">{e.title}</span>
                      {emp && <Avatar initials={emp.initials} color={emp.color} size={26} />}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
      <div className="flex justify-end">
        <Button icon={<CalendarRange className="h-4 w-4" />} onClick={() => navigate('/app/planning')}>Modifier dans le planning</Button>
      </div>
    </div>
  );
}
