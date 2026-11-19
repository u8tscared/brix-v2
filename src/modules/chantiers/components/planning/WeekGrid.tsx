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
import { KIND_STYLE, personColor, personTone } from './kinds';
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
      <i className="absolute -left-1 h-2.5 w-2.5 rounded-full bg-[#d946ef] shadow-[0_0_0_3px_rgba(217,70,239,.18)]" />
      <i className="h-[2px] w-full rounded bg-[linear-gradient(90deg,#d946ef,#fb923c)]" />
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

  // Souris : on glisse tout de suite. Doigt : appui long (350 ms) avant de glisser, sinon le geste fait défiler la page.
  const onDown = (ev: React.PointerEvent, e: PlanningEvent) => {
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    const touch = ev.pointerType !== 'mouse';
    const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const d: Drag = { id: e.id, x: ev.clientX, y: ev.clientY, ox: ev.clientX - r.left, oy: ev.clientY - r.top, w: r.width, moving: false };
    dragRef.current = d;
    let armed = !touch;
    let aborted = false;
    const blockScroll = (t: TouchEvent) => armed && t.cancelable && t.preventDefault();
    const timer = touch
      ? window.setTimeout(() => {
          armed = true;
          navigator.vibrate?.(8);
          const cur = dragRef.current;
          if (cur) setDrag({ ...cur, moving: true, target: cellAt(cur.x, cur.y) });
          if (dragRef.current) dragRef.current = { ...dragRef.current, moving: true };
        }, 350)
      : 0;
    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('touchmove', blockScroll);
      dragRef.current = null;
      setDrag(null);
    };
    const move = (m: PointerEvent) => {
      const cur = dragRef.current;
      if (!cur) return;
      const dist = Math.hypot(m.clientX - d.x, m.clientY - d.y);
      if (!armed) {
        // Le doigt bouge avant l'appui long : c'est un défilement, on laisse faire.
        if (dist > 8) {
          aborted = true;
          cleanup();
        }
        return;
      }
      const moving = cur.moving || dist > 6;
      const next = { ...cur, x: m.clientX, y: m.clientY, moving, target: moving ? cellAt(m.clientX, m.clientY) : undefined };
      dragRef.current = next;
      if (moving) setDrag(next);
    };
    const cancel = () => cleanup();
    const up = () => {
      const cur = dragRef.current;
      cleanup();
      if (!cur || aborted) return;
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
    window.addEventListener('pointercancel', cancel);
    if (touch) window.addEventListener('touchmove', blockScroll, { passive: false });
  };

  const dragged = drag ? events.find((e) => e.id === drag.id) : undefined;
  const cols = `var(--namecol) repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <div className={cn('overflow-hidden rounded-card bg-white shadow-halo', drag && 'select-none')}>
      <div className="grid [--namecol:150px] xl:[--namecol:200px]" style={{ gridTemplateColumns: cols }}>
        {/* En-tête : jours et météo */}
        <div className="border-b border-halo-line" />
        {days.map((d) => {
          const w = weatherFor(d);
          const isToday = d === today;
          return (
            <div key={d} className={cn('flex items-center justify-between gap-1 border-b border-l border-halo-line px-3 py-2.5', isToday && 'bg-pale-v/60')}>
              <div className="min-w-0">
                <div className={cn('flex items-center gap-1.5 text-[13px] font-semibold tracking-[-0.01em]', isToday && 'text-deep-v')}>
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
              <div className="flex items-center gap-2.5 border-b border-halo-line px-3 py-2.5">
                <Avatar initials={p.initials} color={p.color} size={34} />
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
                    className={cn('group relative min-h-[104px] cursor-cell space-y-1 border-b border-l border-halo-line p-1.5 transition-colors', isToday && 'bg-pale-v/30', isTarget && 'bg-pale-v shadow-[inset_0_0_0_2px_#c4b0f7]')}
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
                            role="button"
                            tabIndex={0}
                            onKeyDown={(k) => (k.key === 'Enter' || k.key === ' ') && (k.preventDefault(), onSlot({ ...e }))}
                            style={personTone(p.color, e.kind)}
                            title={`${e.title} · ${e.start} – ${e.end}${conflict ? ' · conflit d’horaires' : ''}`}
                            className={cn(
                              'relative cursor-grab touch-manipulation select-none rounded-[14px] [-webkit-touch-callout:none] py-1.5 pl-2.5 pr-2 text-left transition duration-300 ease-spring hover:-translate-y-px hover:shadow-raise active:cursor-grabbing',
                              conflict && 'ring-2 ring-bad',
                              past && 'opacity-55',
                              drag?.id === e.id && drag.moving && 'opacity-30',
                            )}
                          >
                            <div className="num flex items-center gap-1 text-[10.5px] text-ink-2">
                              <i className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: e.kind === 'chantier' ? personColor(p.color) : KIND_STYLE[e.kind].dot }} title={KIND_STYLE[e.kind].label} />
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
                    <span className="pointer-events-none absolute bottom-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-white text-ink-3 shadow-pill opacity-0 transition group-hover:opacity-100 touch:opacity-60">
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
        <div className="pointer-events-none fixed z-[95] rotate-[1.5deg] scale-[1.04] rounded-[14px] py-1.5 pl-2.5 pr-2 shadow-pop" style={{ left: drag.x - drag.ox, top: drag.y - drag.oy, width: drag.w, ...personTone(people.find((x) => x.id === dragged.employeeId)?.color ?? '#7c3aed', dragged.kind), background: '#fff' }}>
          <div className="num text-[10.5px] text-ink-2">{dragged.start}–{dragged.end}</div>
          <div className="truncate text-[12px] font-medium">{dragged.title}</div>
        </div>
      )}
    </div>
  );
}
