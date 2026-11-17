import { useEffect, useRef, useState } from 'react';
import { Coffee, Loader2, MapPin, Play, Square } from 'lucide-react';
import { Avatar, Badge, Card, cn, toast } from '@/components/ui';
import { DrawCheck, LiveDot } from '@/components/motion';
import { useBrix } from '@/lib/store';
import { todayISO } from '@/lib/format';
import { hhmm, toMin } from '../data';
import { locate } from '../service';
import { useEquipe } from '../store';
import { nowHHMM, punchFor } from '../lib/timesheet';
import { ToneRing, useNow } from '@/modules/finance/components/kit';

const DAY_TARGET_H = 7;
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Pointage au pouce : un grand bouton rond. Arrivée (vert), puis le chrono tourne dans un anneau
 * qui se remplit vers 7 h, puis Départ. Chaque appui se confirme par une coche qui se dessine.
 */
export function ClockCard() {
  const employees = useBrix((s) => s.employees);
  const chantiers = useBrix((s) => s.chantiers);
  const events = useBrix((s) => s.events);
  const { live, edits, clockIn, clockOut, togglePause } = useEquipe();
  const [who, setWho] = useState(employees.find((e) => e.role !== 'patron' && !e.clockedInAt)?.id ?? employees[0]?.id);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<null | 'in' | 'out'>(null);
  const now = useNow(1000);
  const chips = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = chips.current;
    const el = box?.querySelector<HTMLElement>('[aria-checked="true"]');
    if (box && el) box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.offsetWidth / 2, behavior: 'smooth' });
  }, [who]);

  useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(null), 1500);
    return () => clearTimeout(t);
  }, [confirm]);

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

  const secs = working && p ? Math.max(0, now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds() - toMin(p.start) * 60 - p.pauseMin * 60) : 0;
  const chrono = `${Math.floor(secs / 3600)}:${pad(Math.floor((secs % 3600) / 60))}:${pad(secs % 60)}`;
  const progress = working ? (secs / 3600 / DAY_TARGET_H) * 100 : done && p ? (p.hours / DAY_TARGET_H) * 100 : 0;

  const arrive = async () => {
    setBusy(true);
    const pos = await locate(planned?.chantierId ?? 'ch_lefevre');
    setBusy(false);
    const ch = chantiers.find((c) => c.id === pos.chantierId);
    clockIn({ employeeId: emp.id, date: today, start: nowHHMM(), pauses: [], chantierId: pos.chantierId, where: ch ? undefined : 'Position hors chantier', lat: pos.lat, lng: pos.lng });
    setConfirm('in');
    toast(ch ? `Arrivée de ${emp.firstName} sur ${ch.name}${pos.real ? '' : ' (position de démo)'}` : 'Arrivée pointée. Aucun chantier à moins de 400 m.');
  };
  const leave = () => {
    const at = nowHHMM();
    if (!l) clockIn({ employeeId: emp.id, date: today, start: emp.clockedInAt ?? at, pauses: toMin(at) > 13 * 60 ? [{ from: '12:00', to: '13:00' }] : [], chantierId: p?.chantierId });
    clockOut(emp.id, at);
    setConfirm('out');
    toast(`Départ à ${at.replace(':', ' h ')}. Bonne soirée ${emp.firstName}.`);
  };
  const pause = () => {
    if (!l) clockIn({ employeeId: emp.id, date: today, start: emp.clockedInAt ?? nowHHMM(), pauses: [], chantierId: p?.chantierId });
    togglePause(emp.id, nowHHMM());
  };

  return (
    <Card className="overflow-hidden">
      <div ref={chips} className="flex gap-2 overflow-x-auto border-b border-line px-4 py-3 scrollbar-none" role="radiogroup" aria-label="Pointer pour">
        {employees.map((e) => {
          const pe = punchFor(e, today, edits, live);
          const on = e.id === who;
          return (
            <button key={e.id} role="radio" aria-checked={on} onClick={() => setWho(e.id)} className={cn('press flex h-10 shrink-0 items-center gap-2 rounded-full pl-1 pr-3 text-[13px] font-medium transition-[background,box-shadow,color] duration-200', on ? 'bg-ink text-white shadow-ink' : 'bg-sub text-ink-2 hover:text-ink')}>
              <span className="relative">
                <Avatar initials={e.initials} color={e.color} size={32} className={cn(on && 'ring-2 ring-white/20')} />
                {pe?.inProgress && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#22c55e] ring-2 ring-white" />}
              </span>
              {e.firstName}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center px-5 pb-5 pt-6">
        <div className="relative grid h-[208px] w-[208px] place-items-center">
          <ToneRing value={progress} tone={done ? 'ok' : 'teal'} size={208} stroke={6} className="absolute inset-0" />
          {!working && !done && !busy && <span aria-hidden className="absolute inset-[10px] rounded-full bg-[#22c55e]/10" />}
          <button
            onClick={working ? leave : arrive}
            disabled={busy || done}
            aria-label={working ? 'Pointer le départ' : 'Pointer l’arrivée'}
            className={cn(
              'relative grid h-[172px] w-[172px] place-items-center rounded-full text-white transition-[transform,background,box-shadow] duration-300 ease-out-quint active:scale-[.96] disabled:active:scale-100',
              done ? 'bg-ok-bg text-ok' : working ? 'bg-night shadow-[0_18px_40px_-16px_rgba(19,15,38,.6)]' : 'bg-[linear-gradient(160deg,#22c55e,#15803d)] shadow-[0_18px_40px_-14px_rgba(21,128,61,.7),inset_0_1px_0_rgba(255,255,255,.3)] hover:shadow-[0_22px_44px_-14px_rgba(21,128,61,.8),inset_0_1px_0_rgba(255,255,255,.3)]',
            )}
          >
            {confirm ? (
              <span key={confirm} className="grid h-20 w-20 animate-pop place-items-center rounded-full bg-white/15"><DrawCheck className="h-12 w-12" strokeWidth={2.6} /></span>
            ) : busy ? (
              <span className="flex flex-col items-center gap-2"><Loader2 className="h-8 w-8 animate-spin" /><span className="text-[13px] text-white/80">Où êtes-vous…</span></span>
            ) : done ? (
              <span className="flex flex-col items-center">
                <span className="num text-[30px] font-semibold tracking-[-0.03em]">{p ? hhmm(p.hours) : ''}</span>
                <span className="mt-1 text-[13px] font-medium">Journée finie</span>
              </span>
            ) : working ? (
              <span className="flex flex-col items-center">
                <span className="flex items-center gap-1.5 text-[11.5px] font-medium uppercase tracking-[.08em] text-white/55">{paused ? 'En pause' : <><LiveDot />En cours</>}</span>
                <span className={cn('num mt-1.5 text-[34px] font-semibold leading-none tracking-[-0.04em]', paused && 'opacity-50')}>{chrono}</span>
                <span className="mt-3 flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[12.5px] font-medium"><Square className="h-3 w-3 fill-current" />Départ</span>
              </span>
            ) : (
              <span className="flex flex-col items-center">
                <Play className="h-9 w-9 translate-x-0.5 fill-current" />
                <span className="mt-2 text-[22px] font-semibold tracking-[-0.02em]">Arrivée</span>
              </span>
            )}
          </button>
        </div>

        <div className="mt-4 text-center text-[13px] text-ink-2">
          {done ? `Arrivé à ${p?.start.replace(':', ' h ')}, parti à ${l?.end?.replace(':', ' h ')}` : working ? `${emp.firstName} est arrivé à ${p!.start.replace(':', ' h ')}` : `Un appui : l’heure et le chantier sont enregistrés`}
        </div>

        <div className="mt-4 flex w-full items-center gap-2">
          <button onClick={pause} disabled={!working} className={cn('press flex h-12 shrink-0 items-center gap-2 rounded-[14px] px-4 text-[13.5px] font-medium transition disabled:opacity-40', paused ? 'bg-[#e8f7fa] text-[#0e7490] shadow-[inset_0_0_0_1px_#c5e9f0]' : 'bg-white shadow-[0_0_0_1px_var(--line2)] hover:bg-sub')}>
            <Coffee className="h-4 w-4" />{paused ? 'Reprendre' : 'Pause'}
          </button>
          <div className="flex min-h-[48px] min-w-0 flex-1 items-center gap-2 rounded-[14px] bg-sub px-3 text-[12.5px] text-ink-2">
            <MapPin className="h-4 w-4 shrink-0 text-ink-3" />
            <span className="truncate">{chantier ? <span className="font-medium text-ink">{chantier.name}</span> : planned ? `Prévu : ${planned.title}` : 'Aucun chantier prévu'}</span>
            {chantier && working && <Badge tone="ok" className="ml-auto">Sur place</Badge>}
          </div>
        </div>
        {l?.pauses.length ? <div className="mt-2 w-full text-[12px] text-ink-3">Pauses : {l.pauses.map((x) => `${x.from.replace(':', ' h ')} à ${x.to ? x.to.replace(':', ' h ') : 'en cours'}`).join(', ')}</div> : null}
      </div>
    </Card>
  );
}
