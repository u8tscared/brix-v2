import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, CloudRain, Plus, Route, X } from 'lucide-react';
import { Button, Card, IconTile, PageHeader, toast } from '@/components/ui';
import { useMediaQuery } from '@/components/layout/useMediaQuery';
import { useBrix } from '@/lib/store';
import { dateShort, todayISO } from '@/lib/format';
import type { PlanningEvent } from '@/lib/types';
import { isOutdoor, isRainy, weatherFor } from './lib/weather';
import { optimizeRoutes, type RouteOptimization } from './service';
import { KIND_STYLE, KINDS } from './components/planning/kinds';
import { addDays, conflictsOf, freeSlot, mondayOf, weekDays } from './components/planning/utils';
import { WeekGrid } from './components/planning/WeekGrid';
import { DayStrip, DayView, SoloAgenda } from './components/planning/DayView';
import { SlotSheet, type SlotDraft } from './components/planning/SlotSheet';

export default function Planning() {
  const { events, employees, chantiers, company } = useBrix();
  const isMobile = !useMediaQuery('(min-width: 768px)');
  const [week, setWeek] = useState(0);
  const [weekend, setWeekend] = useState(false);
  const [day, setDay] = useState(todayISO());
  const [draft, setDraft] = useState<SlotDraft | null>(null);
  const [opt, setOpt] = useState<RouteOptimization | null>(null);
  const [optimizing, setOptimizing] = useState(false);

  const solo = company.size === 'solo' || employees.length <= 1;
  const monday = mondayOf(week);
  const days = weekDays(monday, weekend || solo || isMobile ? 7 : 5);
  const weekEvents = useMemo(() => events.filter((e) => days.includes(e.date)), [events, days.join()]);
  const conflicts = useMemo(() => conflictsOf(events), [events]);
  const chantierOf = (id?: string) => chantiers.find((c) => c.id === id);
  const outdoorOf = (e: PlanningEvent) => e.kind !== 'absence' && isOutdoor(`${e.title} ${chantierOf(e.chantierId)?.name ?? ''}`);
  const rainAlerts = weekEvents.filter((e) => outdoorOf(e) && isRainy(weatherFor(e.date)));
  const weekConflicts = weekEvents.filter((e) => conflicts.has(e.id));
  const people = employees;
  const nConflicts = Math.max(1, Math.round(weekConflicts.length / 2));

  const goWeek = (n: number) => {
    setWeek(n);
    setOpt(null);
    setDay(n === 0 ? todayISO() : mondayOf(n));
  };
  const swipe = (dir: 1 | -1) => {
    const next = addDays(day, dir);
    setDay(next);
    const nm = mondayOf(0, next);
    if (nm !== monday) setWeek((w) => w + dir);
  };

  const create = () => {
    const d = isMobile ? day : days.includes(todayISO()) ? todayISO() : days[0];
    const emp = employees[0]?.id ?? 'e_me';
    const [start, end] = freeSlot(events, emp, d);
    setDraft({ employeeId: emp, date: d, start, end });
  };

  const optimize = async () => {
    setOptimizing(true);
    const r = await optimizeRoutes(weekEvents, (id) => chantierOf(id)?.city ?? 'Villeurbanne');
    setOptimizing(false);
    setOpt(r);
  };

  const sunday = addDays(monday, 6);
  const range = `${dateShort(monday)} au ${dateShort(weekend || solo || isMobile ? sunday : addDays(monday, 4))}`;

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<IconTile name="CalendarRange" dept="chantiers" size="lg" />}
        title="Planning"
        subtitle={solo ? 'Votre semaine, avec la météo.' : `${people.length} personnes, ${weekEvents.length} créneaux cette semaine`}
        actions={
          <>
            {!solo && (
              <Button icon={<Route className="h-4 w-4" />} loading={optimizing} onClick={optimize} className="hidden md:inline-flex">
                Optimiser les trajets
              </Button>
            )}
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={create}>
              Nouveau créneau
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-[12px] bg-white shadow-card">
          <button onClick={() => goWeek(week - 1)} className="grid h-10 w-10 place-items-center text-ink-2 hover:text-ink" aria-label="Semaine précédente"><ChevronLeft className="h-4 w-4" /></button>
          <span className="num min-w-[150px] text-center text-[13.5px] font-medium">Du {range}</span>
          <button onClick={() => goWeek(week + 1)} className="grid h-10 w-10 place-items-center text-ink-2 hover:text-ink" aria-label="Semaine suivante"><ChevronRight className="h-4 w-4" /></button>
        </div>
        {week !== 0 && <Button size="sm" onClick={() => goWeek(0)}>Cette semaine</Button>}
        {!solo && !isMobile && (
          <label className="ml-1 flex h-10 cursor-pointer items-center gap-2 text-[13px] text-ink-2">
            <input type="checkbox" checked={weekend} onChange={(e) => setWeekend(e.target.checked)} className="h-4 w-4 accent-[#17171f]" /> Week-end
          </label>
        )}
        <div className="flex-1" />
        <div className="hidden flex-wrap items-center gap-3 text-xs text-ink-2 lg:flex">
          {people.map((p) => (
            <span key={p.id} className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color === '#17171f' ? '#3d3758' : p.color }} />{p.firstName}</span>
          ))}
          <i className="mx-1 h-4 w-px bg-line2" />
          {KINDS.filter((k) => k !== 'chantier' && k !== 'absence').map((k) => (
            <span key={k} className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full" style={{ background: KIND_STYLE[k].dot }} />{KIND_STYLE[k].label}</span>
          ))}
        </div>
      </div>

      {(weekConflicts.length > 0 || rainAlerts.length > 0) && (
        <div className="grid gap-2 md:grid-cols-2">
          {weekConflicts.length > 0 && (
            <div className="flex items-center gap-2.5 rounded-xl border border-[#fbd1d1] bg-bad-bg px-3.5 py-2.5 text-[13px] text-bad">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="flex-1">{nConflicts} conflit{nConflicts > 1 ? 's' : ''} d’horaires cette semaine : {employees.find((p) => p.id === weekConflicts[0].employeeId)?.firstName} le {dateShort(weekConflicts[0].date).replace(/\.$/, "")}.</span>
              <Button size="sm" variant="secondary" onClick={() => setDraft({ ...weekConflicts[0] })}>Voir</Button>
            </div>
          )}
          {rainAlerts.length > 0 && (
            <div className="flex items-center gap-2.5 rounded-xl border border-[#d5e3fb] bg-[#f3f7ff] px-3.5 py-2.5 text-[13px] text-brand">
              <CloudRain className="h-4 w-4 shrink-0" />
              <span className="flex-1">Pluie prévue le {dateShort(rainAlerts[0].date)} sur « {rainAlerts[0].title} », des travaux sont dehors.</span>
              <Button size="sm" variant="secondary" onClick={() => setDraft({ ...rainAlerts[0] })}>Décaler</Button>
            </div>
          )}
        </div>
      )}

      {opt && (
        <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-white"><Route className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1 text-[13.5px]">
            <div className="font-semibold">
              Bob a trouvé <span className="num">{opt.kmBefore - opt.kmAfter} km</span> et <span className="num">{Math.floor(opt.minutesSaved / 60) ? `${Math.floor(opt.minutesSaved / 60)} h ` : ''}{opt.minutesSaved % 60} min</span> de route en moins cette semaine
            </div>
            <div className="text-ink-2">
              <span className="num">{opt.kmBefore} km → {opt.kmAfter} km</span> en regroupant les chantiers voisins et en évitant le périphérique aux heures de pointe. Démo : calcul simulé.
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" onClick={() => { toast("Trajets réorganisés, l'équipe est prévenue (démo)"); setOpt(null); }}>Appliquer</Button>
            <Button variant="ghost" size="icon" onClick={() => setOpt(null)} aria-label="Fermer"><X className="h-4 w-4" /></Button>
          </div>
        </Card>
      )}

      {solo ? (
        <SoloAgenda days={days} events={weekEvents.filter((e) => e.employeeId === (employees[0]?.id ?? e.employeeId))} me={employees[0]?.id ?? 'e_me'} onSlot={setDraft} />
      ) : isMobile ? (
        <div className="space-y-3">
          <DayStrip days={days} day={day} onDay={setDay} />
          <DayView day={day} people={people} events={events} conflicts={conflicts} onSlot={setDraft} onSwipe={swipe} outdoorOf={outdoorOf} />
          <Button className="w-full" icon={<Route className="h-4 w-4" />} loading={optimizing} onClick={optimize}>Optimiser les trajets</Button>
        </div>
      ) : (
        <>
          <WeekGrid days={days} people={people} events={weekEvents} conflicts={conflicts} onSlot={setDraft} outdoorOf={outdoorOf} />
          <p className="text-xs text-ink-3">Glissez un créneau vers un autre jour ou une autre personne. Cliquez dans une case vide pour ajouter un créneau.</p>
        </>
      )}

      <SlotSheet draft={draft} onClose={() => setDraft(null)} />
    </div>
  );
}
