import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, ChevronRight, Info, Undo2 } from 'lucide-react';
import { Badge, Button, Card, CardHeader, cn, EmptyState, IconTile, PageHeader, toast } from '@/components/ui';
import { AnimatedNumber, GrowBar } from '@/components/motion';
import type { ReactNode } from 'react';
import { useBrix } from '@/lib/store';
import { money, num, todayISO } from '@/lib/format';
import type { Employee } from '@/lib/types';
import { addDays, hhmm, isoWeek, mondayOf } from './data';
import { PAYROLL_CONSTANTS_2026 as C, type Zone } from './lib/payroll';
import { weekSummary, type ResolvedPunch } from './lib/timesheet';
import { useEquipe } from './store';
import { ClockCard } from './components/ClockCard';
import { PunchEditSheet } from './components/PunchEditSheet';
import { WeekTable } from './components/WeekTable';
import { Timer } from 'lucide-react';

const weekLabel = (monday: string) => {
  const f = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return `Semaine ${isoWeek(monday)} · ${f(monday)} au ${f(addDays(monday, 4))}`;
};

export default function Pointage() {
  const employees = useBrix((s) => s.employees);
  const { edits, live, validatedWeeks, validateWeek } = useEquipe();
  const thisMonday = mondayOf(todayISO());
  const lastMonday = addDays(thisMonday, -7);
  const [monday, setMonday] = useState(validatedWeeks.includes(lastMonday) ? thisMonday : lastMonday);
  const [edit, setEdit] = useState<{ emp: Employee; date: string; p: ResolvedPunch | null } | null>(null);

  const staff = employees.filter((e) => e.role !== 'patron');
  const rows = useMemo(() => staff.map((emp) => ({ emp, w: weekSummary(emp, monday, edits, live) })), [staff, monday, edits, live]);
  const validated = validatedWeeks.includes(monday);
  const current = monday === thisMonday;
  const lastPending = !validatedWeeks.includes(lastMonday) && monday !== lastMonday;

  const tot = rows.reduce((a, { w }) => ({ h: a.h + w.total, hs: a.hs + w.ot25 + w.ot50, paniers: a.paniers + w.paniers }), { h: 0, hs: 0, paniers: 0 });
  const zoneTotals = rows.reduce<Partial<Record<Zone, number>>>((acc, { w }) => {
    Object.entries(w.zoneDays).forEach(([z, n]) => (acc[Number(z) as Zone] = (acc[Number(z) as Zone] ?? 0) + (n ?? 0)));
    return acc;
  }, {});
  const trajet = Object.entries(zoneTotals).reduce((s, [z, n]) => s + (n ?? 0) * C.zones[Number(z) as Zone].trajet, 0);
  const transport = Object.entries(zoneTotals).reduce((s, [z, n]) => s + (n ?? 0) * C.zones[Number(z) as Zone].transport, 0);

  if (employees.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeader icon={<IconTile name="Timer" dept="equipe" size="lg" />} title="Pointage" />
        <EmptyState icon={<Timer />} title="Personne à pointer pour l’instant" text="Invitez votre équipe : chacun pointe en un appui depuis son téléphone." action={<Link to="/app/equipe"><Button variant="primary">Inviter mon équipe</Button></Link>} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader icon={<IconTile name="Timer" dept="equipe" size="lg" />} title="Pointage" subtitle="Arrivée, départ, pauses. Heures sup, paniers et zones se calculent tout seuls." />

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[400px_minmax(0,1fr)]">
        <ClockCard />
        <Card className="flex h-full flex-col">
          <CardHeader title={current ? 'Cette semaine, en bref' : 'La semaine en bref'} meta={`${staff.length} salariés`} />
          <div className="grid flex-1 grid-cols-2">
            <WeekStat label="Heures travaillées" value={<AnimatedNumber value={tot.h} format={(n) => `${Math.round(n)} h`} />} sub={`sur ${staff.length * 35} h prévues`} bar={(tot.h / Math.max(1, staff.length * 35)) * 100} className="border-b border-r" />
            <WeekStat label="Heures sup" value={hhmm(tot.hs)} sub="+25 % puis +50 %" className="border-b" />
            <WeekStat label="Paniers repas" value={<AnimatedNumber value={tot.paniers} />} sub={money(tot.paniers * C.panier)} className="border-r" />
            <WeekStat label="Petits déplacements" value={<AnimatedNumber value={trajet + transport} format={(n) => money(n, true)} />} sub={`trajet ${money(trajet, true)} · transport ${money(transport, true)}`} />
          </div>
          <div className="flex items-start gap-2 border-t border-line px-4 py-3 text-[12px] leading-relaxed text-ink-3 md:px-5">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Heures sup au-delà de 35 h par semaine : +25 % jusqu’à 43 h, +50 % au-delà. La zone se calcule depuis le dépôt jusqu’au chantier pointé.</span>
          </div>
        </Card>
      </div>

      {lastPending && (
        <button onClick={() => setMonday(lastMonday)} className="lift flex w-full items-center gap-3 rounded-[14px] bg-white px-4 py-3 text-left text-[13.5px] shadow-[0_0_0_1px_#fde3b0,0_1px_2px_rgba(19,15,38,.04)]">
          <span className="h-2 w-2 shrink-0 rounded-full bg-warn" />
          <span className="flex-1"><span className="font-semibold">La semaine {isoWeek(lastMonday)} attend votre validation.</span> <span className="text-ink-2">Elle part ensuite dans la paie.</span></span>
          <ChevronRight className="h-4 w-4 text-ink-3" />
        </button>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" aria-label="Semaine précédente" onClick={() => setMonday(addDays(monday, -7))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" aria-label="Semaine suivante" disabled={current} onClick={() => setMonday(addDays(monday, 7))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <h2 className="min-w-0 flex-1 text-[15px] font-semibold sm:text-[16px]">{weekLabel(monday)}</h2>
        {validated ? (
          <>
            <Badge tone="ok" icon={<CheckCircle2 />}>Validée</Badge>
            <Button size="sm" variant="ghost" icon={<Undo2 className="h-3.5 w-3.5" />} onClick={() => validateWeek(monday, false)}>Rouvrir</Button>
          </>
        ) : current ? (
          <Badge tone="neutral">En cours</Badge>
        ) : (
          <Button variant="dawn" className="max-sm:w-full max-sm:justify-center" icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => { validateWeek(monday); toast(`Semaine ${isoWeek(monday)} validée. Les heures partent dans la paie.`, 'ok', { label: 'Voir la paie', run: () => (window.location.hash = '#/app/paie') }); }}>
            Valider la semaine
          </Button>
        )}
      </div>

      <WeekTable monday={monday} rows={rows} onEdit={(emp, date, p) => !validated && setEdit({ emp, date, p })} />
      {validated && <p className="text-[12.5px] text-ink-3">Semaine validée : rouvrez-la pour corriger une journée.</p>}

      <Card>
        <CardHeader title="Zones de petits déplacements BTP" meta="par jour travaillé · trajet soumis, transport non soumis" />
        <div className="grid grid-cols-1 gap-px bg-line lg:grid-cols-5">
          {([1, 2, 3, 4, 5] as Zone[]).map((z) => (
            <div key={z} className="flex items-center gap-3 bg-white px-4 py-2.5 lg:block lg:p-3">
              <div className="w-24 shrink-0 lg:w-auto">
                <div className="text-[13px] font-semibold">Zone {z}</div>
                <div className="text-[11.5px] text-ink-3">{C.zones[z].label.split(' · ')[1]}</div>
              </div>
              <div className="num flex-1 text-right text-[12px] text-ink-2 lg:mt-1.5 lg:text-left">Trajet {money(C.zones[z].trajet)}<span className="hidden text-ink-3 lg:inline"> · soumis</span></div>
              <div className="num flex-1 text-right text-[12px] text-ink-2 lg:text-left">Transport {money(C.zones[z].transport)}<span className="hidden text-ink-3 lg:inline"> · non soumis</span></div>
            </div>
          ))}
        </div>
      </Card>

      <PunchEditSheet emp={edit?.emp ?? null} date={edit?.date ?? null} punch={edit?.p ?? null} onClose={() => setEdit(null)} />
    </div>
  );
}

function WeekStat({ label, value, sub, bar, className }: { label: string; value: ReactNode; sub: string; bar?: number; className?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-col justify-center border-line p-4 md:p-5', className)}>
      <div className="text-[12.5px] font-medium text-ink-2">{label}</div>
      <div className="num mt-2 text-[26px] font-semibold leading-none tracking-[-0.035em]">{value}</div>
      <div className="mt-1.5 truncate text-[12px] text-ink-3">{sub}</div>
      {bar !== undefined && <GrowBar value={bar} className="mt-3" barClassName="bg-[#0891b2]" />}
    </div>
  );
}
