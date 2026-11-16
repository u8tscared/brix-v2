import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CalendarClock, CloudRain, Phone } from 'lucide-react';
import { Avatar, Button, Card, CardHeader, Progress, cn, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { ROLE_LABEL } from '@/lib/catalog';
import { capitalize, dateLong, dateShort, money, relative, todayISO } from '@/lib/format';
import type { ChantierView } from '../../lib/useChantier';
import { hoursOf, lotsOf } from '../../lib/metrics';
import { forecast, isOutdoor, isRainy } from '../../lib/weather';
import { WeatherIcon } from '../common/bits';

const dayShort = (iso: string) => capitalize(new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', ''));

export function Overview({ v, missingPhoto }: { v: ChantierView; missingPhoto?: string }) {
  const navigate = useNavigate();
  const events = useBrix((s) => s.events);
  const { ch, m, devis, team } = v;
  const lots = lotsOf(ch, devis);
  const meteo = forecast(5, ch.city);
  const outdoor = isOutdoor(`${ch.name} ${devis?.title ?? ''}`);
  const rainDay = meteo.find(isRainy);
  const today = todayISO();
  const upcoming = events.filter((e) => e.chantierId === ch.id && e.date >= today).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const weekHours = (id: string) => events.filter((e) => e.chantierId === ch.id && e.employeeId === id && e.date >= today).reduce((s, e) => s + hoursOf(e), 0);

  const steps: { when: string; text: string; warn?: boolean }[] = [
    ...(missingPhoto ? [{ when: "Aujourd'hui", text: missingPhoto, warn: true }] : []),
    { when: 'Bientôt', text: ch.nextStep },
    ...upcoming
      .filter((e, i, arr) => arr.findIndex((x) => x.date === e.date) === i)
      .slice(0, 3)
      .map((e) => ({ when: capitalize(relative(e.date)), text: `${e.title} · ${e.start}` })),
    { when: dateShort(ch.endDate), text: 'Fin prévue du chantier et réception' },
  ];

  const hoursRatio = m.plannedHours ? (m.spentHours / m.plannedHours) * 100 : 0;
  const hoursOver = m.spentHours > (m.plannedHours * ch.progress) / 100 + 2;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] [&>*]:min-w-0">
      <div className="space-y-4">
        <Card>
          <CardHeader title="Avancement par lot" meta={devis ? `devis ${devis.number}` : undefined} />
          <div className="space-y-3.5 p-4">
            {lots.map((l) => (
              <div key={l.name}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="truncate">{l.name}</span>
                  <span className="num shrink-0 text-ink-2">
                    <span className="hidden text-ink-3 sm:inline">{money(l.amount, true)} · </span>
                    <span className="font-medium text-ink">{l.progress} %</span>
                  </span>
                </div>
                <Progress value={l.progress} tone={l.progress === 100 ? 'ok' : 'ink'} />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Marge" meta="mise à jour avec les heures pointées et les achats" />
          <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
            {[
              ['Budget HT', money(ch.budgetHt, true), 'devis signé'],
              ['Coûts engagés', money(ch.costHt, true), 'achats et heures'],
              ['Coût final estimé', money(m.projectedCost, true), `prévu ${money(m.plannedCost, true)}`],
              ['Marge finale estimée', money(ch.budgetHt - m.projectedCost, true), `${Math.round(m.realMarginRate)} % au lieu de ${Math.round(m.plannedMarginRate)} %`],
            ].map(([l, val, sub], i) => (
              <div key={l} className="bg-white p-4">
                <div className="text-xs text-ink-2">{l}</div>
                <div className={cn('num mt-1 text-[18px] font-semibold tracking-[-0.02em]', i === 3 && m.marginDelta < -6 && 'text-bad')}>{val}</div>
                <div className="mt-0.5 text-xs text-ink-3">{sub}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-line p-4">
            <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
              <span>Heures passées</span>
              <span className="num">
                <span className={cn('font-semibold', hoursOver && 'text-warn')}>{m.spentHours} h</span>
                <span className="text-ink-3"> sur {m.plannedHours} h prévues</span>
              </span>
            </div>
            <div className="relative">
              <Progress value={hoursRatio} tone={hoursOver ? 'warn' : 'ink'} />
              <span className="absolute -top-1 h-3.5 w-0.5 rounded bg-ink-3" style={{ left: `${ch.progress}%` }} title="Avancement réel" />
            </div>
            <div className="mt-1.5 text-xs text-ink-3">{hoursOver ? `Plus d'heures que l'avancement ne le justifie (repère à ${ch.progress} %).` : `En ligne avec l'avancement (repère à ${ch.progress} %).`}</div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Prochaines étapes" />
          <ol className="relative px-4 py-3">
            {steps.map((s, i) => (
              <li key={i} className="relative flex gap-3 pb-3 last:pb-0">
                <span className={cn('relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white', s.warn ? 'bg-warn' : i === 0 || (i === 1 && !missingPhoto) ? 'bg-ink' : 'bg-line2')} />
                {i < steps.length - 1 && <span className="absolute left-[4.5px] top-4 h-full w-px bg-line" />}
                <div className="min-w-0">
                  <div className="text-xs text-ink-3">{s.when}</div>
                  <div className={cn('text-[13.5px]', s.warn && 'text-warn')}>{s.text}</div>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader title="Météo sur place" meta={ch.city} icon={undefined} />
          <div className="grid grid-cols-5 divide-x divide-line">
            {meteo.map((w) => (
              <div key={w.date} className={cn('flex flex-col items-center gap-1 px-1 py-3', isRainy(w) && 'bg-[#f3f7ff]')}>
                <span className="text-[11.5px] font-medium text-ink-2">{w.date === todayISO() ? "Auj." : dayShort(w.date)}</span>
                <WeatherIcon sky={w.sky} className="h-5 w-5" />
                <span className="num text-[13px] font-semibold">{w.tMax}°</span>
                <span className="num text-[11px] text-ink-3">{w.rainProb} %</span>
              </div>
            ))}
          </div>
          {rainDay && (
            <div className={cn('flex items-start gap-2.5 border-t border-line p-3.5 text-[13px]', outdoor ? 'bg-[#fffdf7]' : '')}>
              {outdoor ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" /> : <CloudRain className="mt-0.5 h-4 w-4 shrink-0 text-[#3b82f6]" />}
              <div className="min-w-0 flex-1">
                {outdoor ? (
                  <>
                    <b className="font-semibold">Pluie {dateLong(rainDay.date)}</b> : travaux extérieurs à éviter ce jour-là.
                  </>
                ) : (
                  <>Pluie {dateLong(rainDay.date)}. Travaux en intérieur : pas d'impact, pensez aux bâches pour le matériel.</>
                )}
              </div>
              {outdoor && (
                <Button size="sm" onClick={() => toast('Bob a décalé les travaux extérieurs au lendemain (démo)', 'info')}>
                  Décaler
                </Button>
              )}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Équipe" meta={`${team.length} personne${team.length > 1 ? 's' : ''}`} action={<Button size="sm" variant="ghost" onClick={() => navigate('/app/planning')}>Planning</Button>} />
          {team.length === 0 && <p className="p-4 text-[13px] text-ink-3">Personne n'est encore affecté à ce chantier.</p>}
          {team.map((e) => (
            <div key={e.id} className="flex min-h-[60px] items-center gap-3 border-b border-line px-4 py-2 last:border-b-0">
              <Avatar initials={e.initials} color={e.color} size={34} />
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-medium">{e.firstName} {e.lastName}</div>
                <div className="text-xs text-ink-3">
                  {ROLE_LABEL[e.role]} · {weekHours(e.id) ? `${weekHours(e.id)} h prévues` : 'pas de créneau prévu'}
                  {e.clockedInAt && <span className="text-ok"> · pointé à {e.clockedInAt}</span>}
                </div>
              </div>
              <a href={`tel:${e.phone.replace(/\s/g, '')}`} className="grid h-11 w-11 place-items-center rounded-full bg-vi-50 text-vi-700 transition hover:bg-vi-100" aria-label={`Appeler ${e.firstName}`}>
                <Phone className="h-4 w-4" />
              </a>
            </div>
          ))}
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-[13px] text-ink-2">
            <CalendarClock className="h-4 w-4" /> Du {dateLong(ch.startDate)} au {dateLong(ch.endDate)}
          </div>
        </Card>
      </div>
    </div>
  );
}
