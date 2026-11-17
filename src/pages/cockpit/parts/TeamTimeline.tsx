import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { LiveDot } from '@/components/motion';
import { Avatar, cn } from '@/components/ui';
import { useBrix } from '@/lib/store';
import type { PlanningEvent } from '@/lib/types';
import type { CockpitData } from '../useCockpitData';

const START = 7;
const END = 18;
const HOURS = [7, 9, 11, 13, 15, 17];
const toMin = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
const pct = (m: number) => Math.max(0, Math.min(100, ((m - START * 60) / ((END - START) * 60)) * 100));

const KIND: Record<PlanningEvent['kind'], string> = {
  chantier: 'bg-[#fff1e7] text-[#c2410c] shadow-[inset_2px_0_0_#ea580c]',
  rdv: 'bg-vi-50 text-vi-700 shadow-[inset_2px_0_0_#7c3aed]',
  sav: 'bg-[#fdf6e3] text-[#a16207] shadow-[inset_2px_0_0_#ca8a04]',
  formation: 'bg-[#e8f7fa] text-[#0e7490] shadow-[inset_2px_0_0_#0891b2]',
  absence: 'bg-sub text-ink-3 shadow-[inset_2px_0_0_#9794aa]',
  interne: 'bg-sub text-ink-2 shadow-[inset_2px_0_0_#5d5a72]',
};

/** Minutes depuis minuit, mises à jour chaque minute : la ligne « maintenant » avance. */
function useNowMinutes() {
  const read = () => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  };
  const [m, setM] = useState(read);
  useEffect(() => {
    const t = setInterval(() => setM(read()), 30000);
    return () => clearInterval(t);
  }, []);
  return m;
}

/** Équipe du jour : une frise de 7 h à 18 h par personne, avec la ligne « maintenant ». */
export function TeamTimeline({ data, className }: { data: CockpitData; className?: string }) {
  const employees = useBrix((s) => s.employees);
  const navigate = useNavigate();
  const now = useNowMinutes();
  const inDay = now > START * 60 && now < END * 60;
  const onSite = employees.filter((e) => e.clockedInAt).length;
  const label = `${String(Math.floor(now / 60)).padStart(2, '0')}:${String(now % 60).padStart(2, '0')}`;
  return (
    <section className={cn('flex flex-col overflow-hidden rounded-[20px] bg-white shadow-card', className)} aria-label="Équipe aujourd'hui">
      <header className="flex items-center justify-between px-5 pt-4">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.02em]">Équipe aujourd’hui</h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-3"><LiveDot className="scale-75" />{onSite} sur {employees.length} ont pointé</p>
        </div>
        <button onClick={() => navigate('/app/planning')} className="flex items-center gap-1 text-[12.5px] text-ink-2 transition hover:text-ink">Planning <ArrowUpRight className="h-3.5 w-3.5" /></button>
      </header>

      <div className="mt-3 grid grid-cols-[112px_1fr] pr-5">
        <div />
        <div className="relative h-6 text-[11px] text-ink-3">
          {HOURS.map((h) => <span key={h} className="num absolute top-1 -translate-x-1/2" style={{ left: `${pct(h * 60)}%` }}>{h} h</span>)}
          {inDay && (
            <span className="num absolute top-0 z-10 -translate-x-1/2 rounded-full bg-mag-600 px-1.5 py-px text-[10.5px] font-semibold text-white shadow-[0_0_0_3px_#fff] transition-[left] duration-1000 ease-out-quint" style={{ left: `${pct(now)}%` }}>{label}</span>
          )}
        </div>
      </div>

      <div className="relative flex-1 pb-2">
        {employees.map((e, row) => {
          const evs = data.todayEvents.filter((x) => x.employeeId === e.id).sort((a, b) => a.start.localeCompare(b.start));
          const current = evs.find((x) => toMin(x.start) <= now && toMin(x.end) > now);
          return (
            <div key={e.id} className="grid h-[54px] grid-cols-[112px_1fr] items-center border-t border-line pr-5">
              <div className="flex min-w-0 items-center gap-2 pl-5">
                <Avatar initials={e.initials} color={e.color} size={26} />
                <span className="min-w-0">
                  <b className="block truncate text-[12.5px] font-semibold">{e.firstName}</b>
                  <span className={cn('block truncate text-[11px]', e.clockedInAt ? 'text-ok' : 'text-ink-3')}>{e.clockedInAt ? `pointé ${e.clockedInAt.replace(':', ' h ')}` : 'pas pointé'}</span>
                </span>
              </div>
              <div className="relative h-full">
                {HOURS.map((h) => <i key={h} className="absolute inset-y-2 w-px bg-line" style={{ left: `${pct(h * 60)}%` }} />)}
                {evs.map((ev, i) => {
                  const l = pct(toMin(ev.start));
                  const w = Math.max(2, pct(toMin(ev.end)) - l);
                  return (
                    <button
                      key={ev.id}
                      onClick={() => navigate(ev.chantierId ? `/app/chantiers/${ev.chantierId}` : '/app/planning')}
                      title={`${ev.start} à ${ev.end} · ${ev.title}`}
                      className={cn('absolute top-[11px] flex h-8 origin-left animate-grow items-center overflow-hidden rounded-[8px] px-2 text-left text-[11.5px] font-medium transition-[filter] hover:brightness-95', KIND[ev.kind], current?.id === ev.id && 'ring-1 ring-current/30')}
                      style={{ left: `calc(${l}% + 2px)`, width: `calc(${w}% - 4px)`, animationDelay: `${row * 70 + i * 50}ms` }}
                    >
                      <span className="truncate">{ev.title}</span>
                    </button>
                  );
                })}
                {evs.length === 0 && <span className="absolute inset-y-0 left-2 flex items-center text-[11.5px] text-ink-3">Rien de prévu</span>}
              </div>
            </div>
          );
        })}
        {inDay && (
          <div className="pointer-events-none absolute inset-y-0 left-[112px] right-5" aria-hidden>
            <i className="absolute inset-y-0 w-px bg-mag-600/70 transition-[left] duration-1000 ease-out-quint" style={{ left: `${pct(now)}%` }} />
          </div>
        )}
      </div>
    </section>
  );
}
