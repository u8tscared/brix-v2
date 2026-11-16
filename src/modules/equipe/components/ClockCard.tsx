import { useEffect, useState } from 'react';
import { Coffee, Loader2, MapPin, Play, Square } from 'lucide-react';
import { Avatar, Badge, Card, cn, Select, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { todayISO } from '@/lib/format';
import { hhmm, toMin } from '../data';
import { locate } from '../service';
import { useEquipe } from '../store';
import { nowHHMM, punchFor } from '../lib/timesheet';

/** Gros bouton Arrivée / Départ, avec pause et chantier détecté. */
export function ClockCard() {
  const employees = useBrix((s) => s.employees);
  const chantiers = useBrix((s) => s.chantiers);
  const events = useBrix((s) => s.events);
  const { live, edits, clockIn, clockOut, togglePause } = useEquipe();
  const [who, setWho] = useState(employees.find((e) => e.role !== 'patron' && !e.clockedInAt)?.id ?? employees[0]?.id);
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const emp = employees.find((e) => e.id === who);
  if (!emp) return null;
  const today = todayISO();
  const l = live.find((x) => x.employeeId === emp.id && x.date === today);
  const p = punchFor(emp, today, edits, live);
  const working = !!p?.inProgress;
  const done = !!l?.end;
  const paused = !!l?.pauses.some((x) => !x.to);
  const chantier = chantiers.find((c) => c.id === (l?.chantierId ?? p?.chantierId));
  const planned = events.find((e) => e.employeeId === emp.id && e.date === today && e.chantierId);

  const arrive = async () => {
    setBusy(true);
    const pos = await locate(planned?.chantierId ?? 'ch_lefevre');
    setBusy(false);
    const ch = chantiers.find((c) => c.id === pos.chantierId);
    clockIn({ employeeId: emp.id, date: today, start: nowHHMM(), pauses: [], chantierId: pos.chantierId, where: ch ? undefined : 'Position hors chantier', lat: pos.lat, lng: pos.lng });
    toast(ch ? `Arrivée pointée sur ${ch.name}${pos.real ? '' : ' (position de démo)'}` : 'Arrivée pointée. Aucun chantier à moins de 400 m.');
  };
  const leave = () => {
    const at = nowHHMM();
    if (!l) clockIn({ employeeId: emp.id, date: today, start: emp.clockedInAt ?? at, pauses: toMin(at) > 13 * 60 ? [{ from: '12:00', to: '13:00' }] : [], chantierId: p?.chantierId });
    clockOut(emp.id, at);
    toast(`Départ pointé à ${at.replace(':', ' h ')}. Bonne soirée ${emp.firstName}.`);
  };
  const pause = () => {
    if (!l) clockIn({ employeeId: emp.id, date: today, start: emp.clockedInAt ?? nowHHMM(), pauses: [], chantierId: p?.chantierId });
    togglePause(emp.id, nowHHMM());
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <Avatar initials={emp.initials} color={emp.color} size={32} />
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold">Pointer pour</div>
          <div className="hidden text-[11.5px] text-ink-3 sm:block">Chacun pointe depuis son téléphone, ou ici en cas d’oubli.</div>
        </div>
        <Select value={who} onChange={(e) => setWho(e.target.value)} className="!h-10 w-[150px] text-[13px]" aria-label="Salarié">
          {employees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName[0]}.</option>)}
        </Select>
      </div>
      <div className="space-y-3 p-4">
        <button
          onClick={working ? leave : arrive}
          disabled={busy || done}
          className={cn(
            'flex h-[104px] w-full items-center gap-4 rounded-[22px] px-5 text-left text-white transition active:scale-[.985] disabled:opacity-60',
            working ? 'bg-ink' : 'bg-ok',
          )}
        >
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white/15">
            {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : working ? <Square className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current" />}
          </span>
          <span className="min-w-0">
            <span className="block font-display text-[21px] font-semibold leading-tight">{busy ? 'Recherche du chantier…' : done ? 'Journée terminée' : working ? 'Départ' : 'Arrivée'}</span>
            <span className="mt-0.5 block text-[13px] text-white/75">
              {done ? `${p ? hhmm(p.hours) : ''} travaillées aujourd’hui` : working ? `Depuis ${p!.start.replace(':', ' h ')} · ${hhmm(p!.hours)} aujourd’hui` : 'Un appui, la position est vérifiée'}
            </span>
          </span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={pause} disabled={!working} className={cn('flex h-11 items-center gap-2 rounded-xl border px-4 text-[13.5px] font-medium transition disabled:opacity-40', paused ? 'border-[#dbe2fb] bg-[#eef2ff] text-brand' : 'border-line2 bg-white hover:bg-sub')}>
            <Coffee className="h-4 w-4" />{paused ? 'Reprendre' : 'Pause'}
          </button>
          <div className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 rounded-xl bg-sub px-3 text-[12.5px] text-ink-2">
            <MapPin className="h-4 w-4 shrink-0 text-ink-3" />
            <span className="truncate">{chantier ? <><span className="font-medium text-ink">{chantier.name}</span> · {chantier.address}</> : planned ? `Prévu : ${planned.title}` : 'Aucun chantier prévu'}</span>
            {chantier && working && <Badge tone="ok" className="ml-auto">Détecté</Badge>}
          </div>
        </div>
        {l?.pauses.length ? <div className="text-[12px] text-ink-3">Pauses : {l.pauses.map((x) => `${x.from}–${x.to ?? 'en cours'}`).join(', ')}</div> : null}
      </div>
    </Card>
  );
}
