import { useNavigate } from 'react-router-dom';
import { CalendarPlus, CalendarRange } from 'lucide-react';
import { Avatar, Button, Card, EmptyState, cn } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { capitalize, dateLong, daysBetween, todayISO } from '@/lib/format';
import type { ChantierView } from '../../lib/useChantier';
import { hoursOf } from '../../lib/metrics';
import { weatherFor, isRainy } from '../../lib/weather';
import { WeatherIcon } from '../common/bits';
import { KIND_STYLE } from '../planning/kinds';

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
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
          <span className="font-semibold">Calendrier du chantier</span>
          <span className="text-ink-2">{list.length} créneaux · {total} h prévues</span>
        </div>
        <div className="relative mt-4 h-9 rounded-lg bg-sub">
          <div className="absolute inset-y-0 left-0 rounded-lg bg-ink/10" style={{ width: `${ch.progress}%` }} />
          {days.map((d) => (
            <span key={d} className={cn('absolute top-2 h-5 w-1.5 -translate-x-1/2 rounded-full', d < today ? 'bg-ink-3' : 'bg-vi-700')} style={{ left: `${pos(d)}%` }} title={dateLong(d)} />
          ))}
          <span className="absolute -top-1 bottom-[-4px] w-0.5 bg-bad" style={{ left: `${pos(today)}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-xs text-ink-3">
          <span>{dateLong(ch.startDate)}</span>
          <span>{dateLong(ch.endDate)}</span>
        </div>
      </Card>

      {list.length === 0 ? (
        <EmptyState icon={<CalendarRange />} title="Aucun créneau prévu" text="Placez l'équipe sur ce chantier depuis le planning." action={<Button variant="primary" icon={<CalendarPlus className="h-4 w-4" />} onClick={() => navigate('/app/planning')}>Ouvrir le planning</Button>} />
      ) : (
        <Card>
          {days.map((d) => {
            const w = weatherFor(d, ch.city);
            return (
              <div key={d} className={cn('border-b border-line last:border-b-0', d < today && 'opacity-60')}>
                <div className="flex items-center gap-2 bg-[#fbfbfd] px-4 py-2 text-xs font-medium text-ink-2">
                  <span className="flex-1">{capitalize(dateLong(d))}</span>
                  <WeatherIcon sky={w.sky} className="h-3.5 w-3.5" />
                  <span className={cn('num', isRainy(w) && 'text-[#3b82f6]')}>{w.tMax}°</span>
                </div>
                {list.filter((e) => e.date === d).map((e) => {
                  const emp = employees.find((x) => x.id === e.employeeId);
                  return (
                    <div key={e.id} className="flex min-h-[52px] items-center gap-3 px-4 py-2">
                      <span className="num w-[86px] shrink-0 text-[12.5px] text-ink-2">{e.start} – {e.end}</span>
                      <span className={cn('h-6 w-1 shrink-0 rounded-full', KIND_STYLE[e.kind].bar)} />
                      <span className="min-w-0 flex-1 truncate text-[13.5px]">{e.title}</span>
                      {emp && <Avatar initials={emp.initials} color={emp.color} size={26} />}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </Card>
      )}
      <div className="flex justify-end">
        <Button icon={<CalendarRange className="h-4 w-4" />} onClick={() => navigate('/app/planning')}>Modifier dans le planning</Button>
      </div>
    </div>
  );
}
