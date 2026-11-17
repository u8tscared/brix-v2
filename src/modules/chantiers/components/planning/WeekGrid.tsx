import { Fragment, useRef, useState } from 'react';
import { AlertTriangle, CloudRain, Plus } from 'lucide-react';
import { Avatar, cn, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { ROLE_LABEL } from '@/lib/catalog';
import { capitalize, todayISO } from '@/lib/format';
import type { Employee, PlanningEvent } from '@/lib/types';
import { hoursOf } from '../../lib/metrics';
import { isOutdoor, isRainy, weatherFor } from '../../lib/weather';
import { WeatherIcon } from '../common/bits';
import { KIND_STYLE, personTone } from './kinds';
import { fromMin, nowMin, sortByStart, toMin } from './utils';
import type { SlotDraft } from './SlotSheet';

interface Drag {
  id: string;
  x: number;
  y: number;
  ox: number;
  oy: number;
  w: number;
  moving: boolean;
  target?: string;
}

export function NowLine() {
  return (
    <div className="relative my-0.5 flex h-2 items-center" aria-label={`Maintenant, ${fromMin(nowMin())}`}>
      <i className="absolute -left-1 h-2 w-2 rounded-full bg-bad" />
      <i className="h-[2px] w-full rounded bg-bad" />
    </div>
  );
}

export function WeekGrid({ days, people, events, conflicts, onSlot, outdoorOf }: { days: string[]; people: Employee[]; events: PlanningEvent[]; conflicts: Set<string>; onSlot: (d: SlotDraft) => void; outdoorOf: (e: PlanningEvent) => boolean }) {
  const upsertEvent = useBrix((s) => s.upsertEvent);
  const today = todayISO();
  const now = nowMin();
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);

  const cellAt = (x: number, y: number) => (document.elementFromPoint(x, y)?.closest('[data-cell]') as HTMLElement | null)?.dataset.cell;

  const onDown = (ev: React.PointerEvent, e: PlanningEvent) => {
    if (ev.button !== 0) return;
    const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const d: Drag = { id: e.id, x: ev.clientX, y: ev.clientY, ox: ev.clientX - r.left, oy: ev.clientY - r.top, w: r.width, moving: false };
    dragRef.current = d;
    const move = (m: PointerEvent) => {
      const cur = dragRef.current!;
      const moving = cur.moving || Math.hypot(m.clientX - d.x, m.clientY - d.y) > 6;
      const next = { ...cur, x: m.clientX, y: m.clientY, moving, target: moving ? cellAt(m.clientX, m.clientY) : undefined };
      dragRef.current = next;
      if (moving) setDrag(next);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const cur = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!cur) return;
      if (!cur.moving) return onSlot({ ...e });
      if (!cur.target) return;
      const [employeeId, date] = cur.target.split('|');
      if (employeeId === e.employeeId && date === e.date) return;
      const before = { ...e };
      upsertEvent({ ...e, employeeId, date });
      const who = people.find((p) => p.id === employeeId)?.firstName;
      toast(`Créneau déplacé${who && employeeId !== e.employeeId ? ` vers ${who}` : ''}`, 'ok', { label: 'Annuler', run: () => upsertEvent(before) });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const dragged = drag ? events.find((e) => e.id === drag.id) : undefined;
  const cols = `var(--namecol) repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <div className={cn('overflow-hidden rounded-[18px] bg-white shadow-card', drag && 'select-none')}>
      <div className="grid [--namecol:150px] xl:[--namecol:200px]" style={{ gridTemplateColumns: cols }}>
        {/* En-tête : jours et météo */}
        <div className="border-b border-line bg-[#fbfbfd]" />
        {days.map((d) => {
          const w = weatherFor(d);
          const isToday = d === today;
          return (
            <div key={d} className={cn('flex items-center justify-between gap-1 border-b border-l border-line px-2.5 py-2', isToday ? 'bg-vi-50/60' : 'bg-[#fbfbfd]')}>
              <div className="min-w-0">
                <div className={cn('text-[12.5px] font-semibold', isToday && 'text-vi-700')}>
                  {capitalize(new Date(d + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', ''))} {new Date(d + 'T12:00').getDate()}
                </div>
                <div className="hidden truncate text-[11px] text-ink-3 xl:block">{isToday ? "Aujourd'hui" : w.label}</div>
              </div>
              <span className="flex shrink-0 items-center gap-1" title={`${w.label}, ${w.tMin}° / ${w.tMax}°, pluie ${w.rainProb} %`}>
                <WeatherIcon sky={w.sky} className="h-4 w-4" />
                <span className={cn('num text-[12px]', isRainy(w) ? 'text-[#3b82f6]' : 'text-ink-2')}>{w.tMax}°</span>
              </span>
            </div>
          );
        })}

        {people.map((p) => {
          const mine = events.filter((e) => e.employeeId === p.id && days.includes(e.date));
          const total = mine.reduce((s, e) => s + (e.kind === 'absence' ? 0 : hoursOf(e)), 0);
          return (
            <Fragment key={p.id}>
              <div className="flex items-center gap-2.5 border-b border-line px-3 py-2.5">
                <Avatar initials={p.initials} color={p.color} size={32} />
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-medium">{p.firstName}<span className="hidden xl:inline"> {p.lastName}</span></div>
                  <div className="truncate text-[11.5px] text-ink-3">
                    <span className="hidden xl:inline">{ROLE_LABEL[p.role]} · </span><span className={cn('num', total > 39 && 'font-medium text-warn')}>{total} h</span>
                  </div>
                </div>
              </div>
              {days.map((d) => {
                const key = `${p.id}|${d}`;
                const list = mine.filter((e) => e.date === d).sort(sortByStart);
                const isToday = d === today;
                const nowIdx = isToday ? list.findIndex((e) => toMin(e.end) > now) : -1;
                const isTarget = drag?.moving && drag.target === key;
                return (
                  <div
                    key={key}
                    data-cell={key}
                    onClick={(ev) => {
                      if (ev.target === ev.currentTarget) {
                        const [start, end] = list.length ? [list[list.length - 1].end > '16:00' ? '17:00' : list[list.length - 1].end, '18:00'] : ['08:00', '12:00'];
                        onSlot({ employeeId: p.id, date: d, start, end });
                      }
                    }}
                    className={cn('group relative min-h-[104px] cursor-cell space-y-1 border-b border-l border-line p-1.5 transition-colors', isToday && 'bg-vi-50/30', isTarget && 'bg-vi-50 shadow-[inset_0_0_0_2px_#b9a2f5]')}
                  >
                    {list.map((e, i) => {
                      const conflict = conflicts.has(e.id);
                      const rain = outdoorOf(e) && isRainy(weatherFor(e.date));
                      const past = isToday ? toMin(e.end) <= now : d < today;
                      return (
                        <Fragment key={e.id}>
                          {isToday && i === nowIdx && <NowLine />}
                          <div
                            onPointerDown={(ev) => onDown(ev, e)}
                            style={personTone(p.color, e.kind)}
                            title={`${e.title} · ${e.start} – ${e.end}${conflict ? ' · conflit d’horaires' : ''}`}
                            className={cn(
                              'relative cursor-grab touch-none rounded-[8px] py-1.5 pl-2 pr-1.5 text-left transition duration-200 ease-out-quint hover:-translate-y-px hover:shadow-raise active:cursor-grabbing',
                              conflict && 'ring-2 ring-bad',
                              past && 'opacity-55',
                              drag?.id === e.id && drag.moving && 'opacity-30',
                            )}
                          >
                            <div className="num flex items-center gap-1 text-[10.5px] text-ink-2">
                              {e.kind !== 'chantier' && <i className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: KIND_STYLE[e.kind].dot }} title={KIND_STYLE[e.kind].label} />}
                              {e.start}–{e.end}
                              {conflict && <AlertTriangle className="ml-auto h-3 w-3 text-bad" />}
                              {rain && <CloudRain className={cn('h-3 w-3 text-[#3b82f6]', !conflict && 'ml-auto')} />}
                            </div>
                            <div className="truncate text-[12px] font-medium leading-tight">{e.title}</div>
                          </div>
                        </Fragment>
                      );
                    })}
                    {isToday && list.length > 0 && nowIdx === -1 && <NowLine />}
                    <span className="pointer-events-none absolute bottom-1 right-1 grid h-6 w-6 place-items-center rounded-md text-ink-3 opacity-0 transition group-hover:opacity-100">
                      <Plus className="h-3.5 w-3.5" />
                    </span>
                  </div>
                );
              })}
            </Fragment>
          );
        })}
      </div>

      {drag?.moving && dragged && (
        <div className="pointer-events-none fixed z-[95] rotate-[1.5deg] scale-[1.04] rounded-[8px] py-1.5 pl-2 pr-1.5 shadow-pop" style={{ left: drag.x - drag.ox, top: drag.y - drag.oy, width: drag.w, ...personTone(people.find((x) => x.id === dragged.employeeId)?.color ?? '#7c3aed', dragged.kind), background: '#fff' }}>
          <div className="num text-[10.5px] text-ink-2">{dragged.start}–{dragged.end}</div>
          <div className="truncate text-[12px] font-medium">{dragged.title}</div>
        </div>
      )}
    </div>
  );
}
