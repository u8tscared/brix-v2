import { useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, Camera, CloudRain, CloudSun, FileSignature, Layers, ListChecks, Mic, Phone, Send, StickyNote, TrendingUp, Users } from 'lucide-react';
import { GrowBar } from '@/components/motion';
import { useChantiersLocal } from '../../store';
import { Avatar, Button, Card, CardHeader, IconTile, cn, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { ROLE_LABEL } from '@/lib/catalog';
import { capitalize, dateLong, dateShort, money, relative, todayISO } from '@/lib/format';
import type { ChantierView } from '../../lib/useChantier';
import { hoursOf, lotsOf } from '../../lib/metrics';
import { forecast, isOutdoor, isRainy } from '../../lib/weather';
import { BAR, WeatherIcon } from '../common/bits';

const FEED_ICON: Record<string, JSX.Element> = { photo: <Camera />, vocal: <Mic />, note: <StickyNote />, rapport: <Send />, avenant: <FileSignature /> };

const dayShort = (iso: string) => capitalize(new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', ''));

export function Overview({ v, missingPhoto, onOpenJournal }: { v: ChantierView; missingPhoto?: string; onOpenJournal?: () => void }) {
  const navigate = useNavigate();
  const events = useBrix((s) => s.events);
  const employees = useBrix((s) => s.employees);
  const journal = useChantiersLocal((s) => s.journal);
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

  const feed = journal.filter((j) => j.chantierId === ch.id).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] [&>*]:min-w-0">
      <div className="space-y-4">
        <Card>
          <CardHeader icon={<IconTile size="sm" tone="peach" icon={<Layers />} />} title="Avancement par lot" meta={devis ? `devis ${devis.number}` : undefined} />
          <div className="stagger-fast space-y-4 p-4 md:px-5">
            {lots.map((l) => (
              <div key={l.name}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="truncate">{l.name}</span>
                  <span className="num shrink-0 text-ink-2">
                    <span className="hidden text-ink-3 sm:inline">{money(l.amount, true)} · </span>
                    <span className="font-medium text-ink">{l.progress} %</span>
                  </span>
                </div>
                <GrowBar value={l.progress} className="h-2" barClassName={l.progress === 100 ? BAR.ok : l.progress > 0 ? BAR.dawn : ''} />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader icon={<IconTile size="sm" tone="green" icon={<TrendingUp />} />} title="Marge" meta="mise à jour avec les heures pointées et les achats" />
          <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
            {[
              ['Budget HT', money(ch.budgetHt, true), 'devis signé'],
              ['Coûts engagés', money(ch.costHt, true), 'achats et heures'],
              ['Coût final estimé', money(m.projectedCost, true), `prévu ${money(m.plannedCost, true)}`],
              ['Marge finale estimée', money(ch.budgetHt - m.projectedCost, true), Math.round(m.realMarginRate) === Math.round(m.plannedMarginRate) ? `${Math.round(m.realMarginRate)} %, comme prévu` : `${Math.round(m.realMarginRate)} % au lieu de ${Math.round(m.plannedMarginRate)} %`],
            ].map(([l, val, sub], i) => (
              <div key={l} className={cn('rounded-card-sm p-3.5', i === 3 ? 'bg-dawn-pale' : 'bg-halo-hover')}>
                <div className="text-[12px] font-medium text-ink-2">{l}</div>
                <div className={cn('num-halo mt-1.5 text-[22px]', i === 3 && m.marginDelta < -6 && 'text-bad')}>{val}</div>
                <div className="mt-0.5 text-xs text-ink-3">{sub}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader icon={<IconTile size="sm" tone="violet" icon={<ListChecks />} />} title="Prochaines étapes" />
          <ol className="relative px-5 py-4">
            {steps.map((s, i) => (
              <li key={i} className="relative flex gap-3 pb-3 last:pb-0">
                <span className={cn('relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white', s.warn ? 'bg-warn' : i === 0 || (i === 1 && !missingPhoto) ? 'bg-[image:var(--dawn-d)]' : 'bg-[#dcd6ec]')} />
                {i < steps.length - 1 && <span className="absolute left-[4.5px] top-4 h-full w-px bg-halo-line" />}
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
          <CardHeader icon={<IconTile size="sm" tone="amber" icon={<CloudSun />} />} title="Météo sur place" meta={ch.city} />
          <div className="grid grid-cols-5 gap-1 p-2">
            {meteo.map((w) => (
              <div key={w.date} className={cn('flex flex-col items-center gap-1 rounded-[14px] px-1 py-3', isRainy(w) ? 'bg-pale-b' : w.date === todayISO() && 'bg-halo-hover')}>
                <span className="text-[11.5px] font-medium text-ink-2">{w.date === todayISO() ? "Auj." : dayShort(w.date)}</span>
                <WeatherIcon sky={w.sky} className="h-5 w-5" />
                <span className="num text-[13px] font-semibold">{w.tMax}°</span>
                <span className="num text-[11px] text-ink-3">{w.rainProb} %</span>
              </div>
            ))}
          </div>
          {rainDay && (
            <div className="m-2 mt-0 flex items-start gap-2.5 rounded-card-sm p-3 text-[13px] shadow-halo-sm">
              {outdoor ? <IconTile size="row" tone="amber" icon={<AlertTriangle />} /> : <IconTile size="row" tone="blue" icon={<CloudRain />} />}
              <div className="min-w-0 flex-1 self-center">
                {outdoor ? (
                  <>
                    <b className="font-semibold">Pluie {dateLong(rainDay.date)}</b> : travaux extérieurs à éviter ce jour-là.
                  </>
                ) : (
                  <>Pluie {dateLong(rainDay.date)}. Travaux en intérieur : pas d'impact, pensez aux bâches pour le matériel.</>
                )}
              </div>
              {outdoor && (
                <Button size="sm" onClick={() => toast('Brix AI a décalé les travaux extérieurs au lendemain (démo)', 'info')}>
                  Décaler
                </Button>
              )}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader icon={<IconTile size="sm" dept="equipe" icon={<Users />} />} title="Équipe" meta={`${team.length} personne${team.length > 1 ? 's' : ''}`} action={<Button size="sm" variant="ghost" onClick={() => navigate('/app/planning')}>Planning</Button>} />
          {team.length === 0 && <p className="p-4 text-[13px] text-ink-3">Personne n'est encore affecté à ce chantier.</p>}
          {team.map((e) => (
            <div key={e.id} className="flex min-h-[60px] items-center gap-3 border-b border-halo-line px-4 py-2 last:border-b-0">
              <Avatar initials={e.initials} color={e.color} size={34} />
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-medium">{e.firstName} {e.lastName}</div>
                <div className="text-xs text-ink-3">
                  {ROLE_LABEL[e.role]} · {weekHours(e.id) ? `${weekHours(e.id)} h prévues` : 'pas de créneau prévu'}
                  {e.clockedInAt && <span className="text-deep-g"> · pointé à {e.clockedInAt}</span>}
                </div>
              </div>
              <a href={`tel:${e.phone.replace(/\s/g, '')}`} className="tone-green grid h-11 w-11 place-items-center rounded-full transition duration-300 ease-spring hover:scale-105" aria-label={`Appeler ${e.firstName}`}>
                <Phone className="h-4 w-4" />
              </a>
            </div>
          ))}
        </Card>

        <Card>
          <CardHeader icon={<IconTile size="sm" tone="mag" icon={<Activity />} />} title="Fil d'activité" action={onOpenJournal && <Button size="sm" variant="ghost" onClick={onOpenJournal}>Tout voir</Button>} />
          {feed.length === 0 && <p className="p-4 text-[13px] text-ink-3">Les photos, notes et pointages apparaîtront ici.</p>}
          <ol className="stagger-fast px-4 py-2">
            {feed.map((j, i) => {
              const emp = employees.find((e) => e.id === j.author);
              return (
                <li key={j.id} className="relative flex gap-3 py-2.5">
                  {i < feed.length - 1 && <span className="absolute left-[13px] top-10 h-[calc(100%-28px)] w-px bg-halo-line" />}
                  {emp ? <Avatar initials={emp.initials} color={emp.color} size={27} /> : <span className="grid h-[27px] w-[27px] shrink-0 place-items-center rounded-full bg-pale-v text-deep-v [&_svg]:h-3.5 [&_svg]:w-3.5">{FEED_ICON[j.kind] ?? <Activity />}</span>}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[13px] leading-snug">{j.text}</p>
                    <span className="num text-[11.5px] text-ink-3">{capitalize(relative(j.at.slice(0, 10)))} à {j.at.slice(11, 16).replace(':', ' h ')}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      </div>
    </div>
  );
}
