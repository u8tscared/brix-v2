// En-tête de la fiche chantier : identité, avancement, marge réelle contre prévue, temps, point de Brix AI.

import { Link } from 'react-router-dom';
import { CalendarDays, ChevronLeft, MapPin, Navigation, Phone } from 'lucide-react';
import { AnimatedNumber, Ring } from '@/components/motion';
import { Badge, Button, cn } from '@/components/ui';
import { BrandTile } from '@/components/brand/Logo';
import { CHANTIER_STATUS } from '@/lib/status';
import { dateShort, daysBetween, money, todayISO } from '@/lib/format';
import type { ChantierView } from '../../lib/useChantier';
import { RISK_LABEL } from '../../lib/metrics';
import { BAR, TeamAvatars } from '../common/bits';
import { VersusBars } from '../common/KpiBand';

function Meter({ label, value, sub, children, mobile }: { label: string; value: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode; mobile?: React.ReactNode }) {
  return (
    <div className="min-w-0 px-3 py-3.5 sm:p-5">
      <div className="text-[11.5px] font-medium text-ink-2 sm:text-[13px]">{label}</div>
      <div className="num-halo mt-1.5 truncate text-[18px] leading-none sm:mt-2 sm:text-[28px]">{value}</div>
      {sub && <div className="mt-1.5 hidden text-[12px] text-ink-2 sm:block">{sub}</div>}
      {children && <div className="mt-3.5 hidden sm:block">{children}</div>}
      {mobile && <div className="mt-2.5 sm:hidden">{mobile}</div>}
    </div>
  );
}

function MiniBar({ value, className }: { value: number; className: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-halo-track">
      <div className={cn('h-full origin-left animate-grow rounded-full', className)} style={{ width: `${Math.max(3, Math.min(100, value))}%` }} />
    </div>
  );
}

export function DetailHeader({ v, bob, onAskBob }: { v: ChantierView; bob: [string, string]; onAskBob: () => void }) {
  const { ch, m, client, team } = v;
  const done = ch.status === 'termine';
  const risk = RISK_LABEL[m.risk];
  const total = Math.max(1, daysBetween(ch.startDate, ch.endDate));
  const elapsed = Math.max(0, Math.min(total, daysBetween(ch.startDate, todayISO())));
  const timePct = (elapsed / total) * 100;
  const hoursPct = m.plannedHours ? Math.min(100, (m.spentHours / m.plannedHours) * 100) : 0;
  const hoursOver = m.spentHours > (m.plannedHours * ch.progress) / 100 + 2;
  const addr = [ch.address, ch.city].filter(Boolean).join(', ');

  return (
    <div className="animate-[page-in_.5s_var(--ease)_both]">
      <Link to="/app/chantiers" className="glass inline-flex h-9 items-center gap-1 rounded-pill pl-2 pr-3.5 text-[13px] font-medium text-ink-2 transition hover:text-ink">
        <ChevronLeft className="h-4 w-4" /> Chantiers
      </Link>

      <div className="mt-3 overflow-hidden rounded-card bg-white shadow-halo">
        {/* Identité */}
        <div className="relative flex gap-4 p-5 md:gap-5 md:p-6">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-28 h-64 w-96 rounded-full bg-dawn-soft opacity-90 blur-2xl" />
          <div className="relative min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone={CHANTIER_STATUS[ch.status].tone} dot pulse={ch.status === 'en_cours'}>{CHANTIER_STATUS[ch.status].label}</Badge>
              {!done && <Badge tone={risk.tone}>{risk.label}</Badge>}
            </div>
            <h1 className="mt-3 text-[26px] font-semibold leading-[1.06] tracking-[-0.04em] md:text-[36px]">{ch.name}</h1>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-ink-2">
              {client && (
                <Link to={`/app/clients/${client.id}`} className="font-medium text-ink underline-offset-4 hover:underline">
                  {client.name}
                </Link>
              )}
              {addr && (
                <a href={`https://maps.google.com/?q=${encodeURIComponent(addr)}`} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-1 hover:text-ink">
                  <MapPin className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{addr}</span>
                </a>
              )}
              <span className="num flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" /> {dateShort(ch.startDate)} au {dateShort(ch.endDate)}
              </span>
              <TeamAvatars team={team} size={26} />
            </div>
          </div>
          <div className="relative shrink-0 sm:hidden">
            <Ring value={ch.progress} size={64} stroke={5} tone={done ? 'ok' : 'dawn'}>
              <span className="num-halo text-[17px]">{ch.progress}<span className="text-[10px] text-ink-3"> %</span></span>
            </Ring>
          </div>
          <div className="relative hidden shrink-0 flex-col items-center sm:flex">
            <Ring value={ch.progress} size={124} stroke={10} tone={done ? 'ok' : 'dawn'}>
              <span className="flex flex-col items-center">
                <span className="num-halo text-[34px] leading-none">
                  <AnimatedNumber value={ch.progress} />
                  <span className="text-[14px] text-ink-3"> %</span>
                </span>
                <span className="mt-1 text-[11.5px] font-medium text-ink-2">fait</span>
              </span>
            </Ring>
          </div>
        </div>

            {/* Au téléphone : y aller, appeler le client */}
            <div className="relative -mt-1 flex gap-2 px-5 pb-4 md:hidden">
              {addr && (
                <a href={`https://maps.google.com/?q=${encodeURIComponent(addr)}`} target="_blank" rel="noreferrer" className="press flex h-11 flex-1 items-center justify-center gap-2 rounded-pill bg-white text-[13.5px] font-medium shadow-[0_1px_2px_rgba(60,30,120,.08),0_0_0_1px_#ece8f6]">
                  <Navigation className="h-4 w-4" /> Itinéraire
                </a>
              )}
              {client?.phone && (
                <a href={`tel:${client.phone.replace(/\s/g, '')}`} className="press flex h-11 flex-1 items-center justify-center gap-2 rounded-pill bg-white text-[13.5px] font-medium shadow-[0_1px_2px_rgba(60,30,120,.08),0_0_0_1px_#ece8f6]">
                  <Phone className="h-4 w-4" /> Appeler
                </a>
              )}
            </div>
        {/* Repères chiffrés */}
        <div className="grid grid-cols-3 border-t border-halo-line [&>*+*]:border-l [&>*+*]:border-halo-line">
          <Meter
            label="Marge"
            value={<span className={cn(m.marginDelta < -6 ? 'text-bad' : m.marginDelta < -2 ? 'text-warn' : 'text-ok')}>{money(ch.budgetHt - m.projectedCost, true)}</span>}
            sub={`sur ${money(ch.budgetHt, true)} HT`}
            mobile={<MiniBar value={(m.realMarginRate / Math.max(1, m.plannedMarginRate)) * 100} className={m.marginDelta < -6 ? BAR.bad : m.marginDelta < -2 ? BAR.warn : BAR.ok} />}
          >
            <VersusBars real={m.realMarginRate} planned={m.plannedMarginRate} realLabel="Réelle" plannedLabel="Prévue" />
          </Meter>
          <Meter label="Heures" value={<>{m.spentHours} h <span className="text-[14px] font-medium text-ink-3">/ {m.plannedHours} h</span></>} sub={hoursOver ? "Plus d'heures que l'avancement ne le justifie" : "En ligne avec l'avancement"} mobile={<MiniBar value={hoursPct} className={hoursOver ? BAR.warn : BAR.vi} />}>
            <div className="relative h-2 rounded-full bg-halo-track">
              <div className={cn('h-full origin-left animate-grow rounded-full', hoursOver ? BAR.warn : BAR.vi)} style={{ width: `${hoursPct}%` }} />
              <span className="absolute -top-1 h-4 w-[3px] rounded-full bg-[#d946ef] ring-2 ring-white" style={{ left: `${ch.progress}%` }} title="Avancement" />
            </div>
          </Meter>
          <Meter
            label="Délai"
            value={done ? 'Terminé' : m.daysLeft < 0 ? <span className="text-bad">+{-m.daysLeft} j</span> : `${m.daysLeft} j`}
            mobile={<MiniBar value={timePct} className="bg-dawn" />}
            sub={done ? `fini le ${dateShort(ch.endDate)}` : m.delayDays > 0 ? `${m.delayDays} j de retard sur le prévu` : 'restants, dans les temps'}
          >
            <div className="relative h-2 rounded-full bg-halo-track">
              <div className="h-full origin-left animate-grow rounded-full bg-[#dcd6ec]" style={{ width: `${timePct}%` }} />
              <div className="absolute inset-y-0 left-0 origin-left animate-grow rounded-full bg-dawn" style={{ width: `${ch.progress}%`, animationDelay: '.15s' }} />
            </div>
          </Meter>
        </div>

        {/* Le point de Brix AI */}
        <div className="flex items-start gap-3 border-t border-halo-line bg-dawn-pale px-5 py-3.5 md:items-center md:px-6">
          <BrandTile size={30} className="shrink-0" />
          <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-ink-2">
            <span className="font-medium text-ink">{bob[0]}</span> {bob[1]}
          </p>
          <Button size="sm" variant="soft" onClick={onAskBob} className="max-md:hidden">
            Demander à Brix AI
          </Button>
        </div>
      </div>
    </div>
  );
}
