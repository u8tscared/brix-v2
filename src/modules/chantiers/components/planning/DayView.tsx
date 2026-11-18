import { Fragment, useRef } from 'react';
import { AlertTriangle, CloudRain, MapPin, Plus } from 'lucide-react';
import { Avatar, Card, cn } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { capitalize, dateLong, todayISO } from '@/lib/format';
import type { Employee, PlanningEvent } from '@/lib/types';
import { hoursOf } from '../../lib/metrics';
import { isRainy, weatherFor } from '../../lib/weather';
import { WeatherIcon } from '../common/bits';
import { KIND_STYLE, personTone } from './kinds';
import { NowLine } from './WeekGrid';
import { nowMin, sortByStart, toMin } from './utils';
import type { SlotDraft } from './SlotSheet';

/** Bande de jours à toucher, avec la météo. */
export function DayStrip({ days, day, onDay }: { days: string[]; day: string; onDay: (d: string) => void }) {
  const today = todayISO();
  return (
    <div className="glass grid gap-0.5 rounded-[22px] p-1" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0,1fr))` }}>
      {days.map((d) => {
        const w = weatherFor(d);
        const on = d === day;
        return (
          <button key={d} onClick={() => onDay(d)} className={cn('flex h-[64px] flex-col items-center justify-center gap-0.5 rounded-[18px] transition duration-300 ease-spring', on ? 'bg-white text-ink shadow-pill' : 'text-ink-2')}>
            <span className={cn('text-[10.5px] uppercase tracking-wide', d === today ? 'font-semibold text-deep-v' : 'text-ink-3')}>
              {new Date(d + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '').slice(0, 3)}
            </span>
            <span className="num text-[15px] font-semibold leading-none">{new Date(d + 'T12:00').getDate()}</span>
            <WeatherIcon sky={w.sky} className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}

/** Vue jour au téléphone : liste chronologique par personne, glisser à gauche ou à droite pour changer de jour. */
export function DayView({ day, people, events, conflicts, onSlot, onSwipe, outdoorOf }: { day: string; people: Employee[]; events: PlanningEvent[]; conflicts: Set<string>; onSlot: (d: SlotDraft) => void; onSwipe: (dir: 1 | -1) => void; outdoorOf: (e: PlanningEvent) => boolean }) {
  const chantiers = useBrix((s) => s.chantiers);
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const today = todayISO();
  const now = nowMin();
  const w = weatherFor(day);
  const list = events.filter((e) => e.date === day);

  return (
    <div
      onPointerDown={(e) => {
        start.current = { x: e.clientX, y: e.clientY };
        swiped.current = false;
      }}
      onPointerUp={(e) => {
        const s = start.current;
        start.current = null;
        if (!s) return;
        const dx = e.clientX - s.x;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(e.clientY - s.y) * 1.5) {
          swiped.current = true;
          onSwipe(dx < 0 ? 1 : -1);
        }
      }}
      onClickCapture={(e) => {
        if (swiped.current) {
          e.stopPropagation();
          swiped.current = false;
        }
      }}
      className="touch-pan-y space-y-3"
    >
      <div key={day} className="animate-fade-up space-y-3">
        <div className="row-card py-2.5 text-[13px]">
          <span className={cn('grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[11px]', isRainy(w) ? 'bg-pale-b' : 'bg-pale-a')}><WeatherIcon sky={w.sky} className="h-[18px] w-[18px]" /></span>
          <span className="flex-1">
            <b className="font-semibold">{capitalize(dateLong(day))}</b>
            <span className="text-ink-2"> · {w.label}, {w.tMin}° / {w.tMax}°</span>
          </span>
          {isRainy(w) && <span className="num text-xs font-medium text-[#3b82f6]">{w.rainProb} %</span>}
        </div>

        {people.map((p) => {
          const mine = list.filter((e) => e.employeeId === p.id).sort(sortByStart);
          const nowIdx = day === today ? mine.findIndex((e) => toMin(e.end) > now) : -1;
          return (
            <Card key={p.id}>
              <div className="flex items-center gap-2.5 px-4 pb-1 pt-2.5">
                <Avatar initials={p.initials} color={p.color} size={32} />
                <span className="flex-1 text-[14.5px] font-semibold tracking-[-0.015em]">{p.firstName}</span>
                <span className="num text-xs text-ink-3">{mine.reduce((s, e) => s + hoursOf(e), 0)} h</span>
                <button onClick={() => onSlot({ employeeId: p.id, date: day })} className="grid h-11 w-11 place-items-center rounded-full text-ink-2 hover:bg-halo-track" aria-label={`Ajouter un créneau pour ${p.firstName}`}>
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {mine.length === 0 && <p className="px-3.5 py-3 text-[13px] text-ink-3">Rien de prévu.</p>}
              <div className="space-y-1.5 px-2.5 pb-2.5">
                {mine.map((e, i) => {
                  const ch = chantiers.find((c) => c.id === e.chantierId);
                  const past = day === today ? toMin(e.end) <= now : day < today;
                  return (
                    <Fragment key={e.id}>
                      {i === nowIdx && <div className="px-1.5"><NowLine /></div>}
                      <button onClick={() => onSlot({ ...e })} style={personTone(p.color, e.kind)} className={cn('flex w-full items-stretch gap-3 rounded-[16px] px-3 py-2.5 text-left transition duration-200 active:scale-[.99]', past && 'opacity-55')}>
                        <span className="num w-12 shrink-0 pt-0.5 text-[12.5px] leading-tight text-ink-2">
                          {e.start}
                          <br />
                          <span className="text-ink-3">{e.end}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 text-[14px] font-medium">
                            <span className="truncate">{e.title}</span>
                            {conflicts.has(e.id) && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-bad" />}
                            {outdoorOf(e) && isRainy(w) && <CloudRain className="h-3.5 w-3.5 shrink-0 text-[#3b82f6]" />}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-3">
                            {ch ? <><MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{ch.address}, {ch.city}</span></> : KIND_STYLE[e.kind].label}
                          </span>
                        </span>
                      </button>
                    </Fragment>
                  );
                })}
                {day === today && mine.length > 0 && nowIdx === -1 && <div className="px-1.5"><NowLine /></div>}
              </div>
            </Card>
          );
        })}
        <p className="text-center text-xs text-ink-3">Glissez vers la gauche ou la droite pour changer de jour.</p>
      </div>
    </div>
  );
}

/** Mode Solo : un agenda simple, jour par jour. */
export function SoloAgenda({ days, events, me, onSlot }: { days: string[]; events: PlanningEvent[]; me: string; onSlot: (d: SlotDraft) => void }) {
  const today = todayISO();
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {days.map((d) => {
        const w = weatherFor(d);
        const list = events.filter((e) => e.date === d).sort(sortByStart);
        return (
          <Card key={d} tone={d === today ? 'mist' : undefined} className={cn(d === today && 'shadow-[0_0_0_1.5px_#e4d8fd,0_12px_36px_-14px_rgba(60,30,120,.14)]')}>
            <div className="flex items-center gap-2 border-b border-halo-line px-4 py-2.5">
              <span className={cn('flex-1 text-[13.5px] font-semibold', d === today && 'text-deep-v')}>{capitalize(dateLong(d))}</span>
              <WeatherIcon sky={w.sky} className="h-4 w-4" />
              <span className="num text-xs text-ink-2">{w.tMax}°</span>
              <button onClick={() => onSlot({ employeeId: me, date: d })} className="grid h-9 w-9 place-items-center rounded-full text-ink-2 hover:bg-halo-track" aria-label="Ajouter">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {list.length === 0 ? (
              <button onClick={() => onSlot({ employeeId: me, date: d })} className="block w-full px-4 py-4 text-left text-[13px] text-ink-3 hover:text-ink">Journée libre · ajouter un créneau</button>
            ) : (
              list.map((e) => (
                <button key={e.id} onClick={() => onSlot({ ...e })} className="flex min-h-[52px] w-full items-center gap-3 border-b border-halo-line px-4 py-2 text-left last:border-b-0 hover:bg-halo-hover">
                  <span className="num w-[84px] shrink-0 text-[12.5px] text-ink-2">{e.start} – {e.end}</span>
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', KIND_STYLE[e.kind].bar)} />
                  <span className="truncate text-[13.5px]">{e.title}</span>
                </button>
              ))
            )}
          </Card>
        );
      })}
    </div>
  );
}
