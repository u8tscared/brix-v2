import { useState } from 'react';
import { ArrowLeftRight, Car, CheckCircle2, Gauge, HardHat, Wrench } from 'lucide-react';
import { Avatar, Badge, Button, Card, CardHeader, Field, Input, PageHeader, Select, Sheet, UnderlineTabs, cn, toast, type Tone } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { dateFull, daysBetween, num, relative, todayISO } from '@/lib/format';
import { addDays } from '@/modules/equipe/data';
import type { Tool, Vehicle } from './data';
import { useAchats } from './store';

type Tab = 'vehicules' | 'outillage';

function due(date: string, soon = 30): { tone: Tone; text: string } {
  const d = daysBetween(todayISO(), date);
  if (d < 0) return { tone: 'bad', text: `dépassé de ${-d} j` };
  if (d <= soon) return { tone: 'warn', text: `dans ${d} j` };
  return { tone: 'neutral', text: dateFull(date) };
}
const nextCheck = (t: Tool) => (t.lastCheck && t.checkMonths ? addDays(t.lastCheck, Math.round(t.checkMonths * 30.44)) : undefined);

function VehicleCard({ v, onKm }: { v: Vehicle; onKm: () => void }) {
  const employees = useBrix((s) => s.employees);
  const driver = employees.find((e) => e.id === v.driverId);
  const kmLeft = v.nextServiceKm - v.km;
  const items = [
    { label: 'Entretien', value: kmLeft <= 1000 ? `dans ${num(kmLeft, 0)} km` : due(v.nextServiceDate, 30).text, tone: (kmLeft <= 1000 ? 'warn' : due(v.nextServiceDate).tone) as Tone, sub: `à ${num(v.nextServiceKm, 0)} km ou le ${dateFull(v.nextServiceDate)}` },
    { label: 'Contrôle technique', ...(() => { const x = due(v.ctDate); return { value: x.text, tone: x.tone }; })(), sub: dateFull(v.ctDate) },
    { label: 'Assurance', ...(() => { const x = due(v.insuranceDate, 60); return { value: x.text, tone: x.tone }; })(), sub: `${v.insurer} · échéance ${dateFull(v.insuranceDate)}` },
  ];
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sub text-ink-2"><Car className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold">{v.name}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-ink-2">
            <span className="rounded border border-line2 bg-white px-1.5 font-mono text-[11.5px] font-medium tracking-wide text-ink">{v.plate}</span>
            <span>{v.energy} · Crit’Air {v.critair}</span>
          </div>
        </div>
        {driver && <Avatar initials={driver.initials} color={driver.color} size={30} />}
      </div>
      <div className="divide-y divide-line border-t border-line">
        {items.map((i) => (
          <div key={i.label} className="flex items-center gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium">{i.label}</div>
              <div className="truncate text-[11.5px] text-ink-3">{i.sub}</div>
            </div>
            <Badge tone={i.tone} dot={i.tone !== 'neutral'}>{i.value}</Badge>
          </div>
        ))}
      </div>
      <button onClick={onKm} className="flex min-h-[48px] w-full items-center gap-2 border-t border-line px-4 text-left text-[13px] transition hover:bg-sub">
        <Gauge className="h-4 w-4 text-ink-3" />
        <span className="num font-medium">{num(v.km, 0)} km</span>
        <span className="text-ink-3">relevé {relative(v.kmAt)}</span>
        <span className="ml-auto font-medium text-ink-2">Mettre à jour</span>
      </button>
    </Card>
  );
}

export default function Vehicules() {
  const employees = useBrix((s) => s.employees);
  const { vehicles, tools, upsertVehicle, upsertTool } = useAchats();
  const [tab, setTab] = useState<Tab>('vehicules');
  const [kmFor, setKmFor] = useState<Vehicle | null>(null);
  const [km, setKm] = useState('');
  const [lend, setLend] = useState<Tool | null>(null);
  const [to, setTo] = useState('');

  const alertsV = vehicles.flatMap((v) => [
    daysBetween(todayISO(), v.ctDate) <= 30 && `${v.name.split(' ').slice(0, 2).join(' ')} : contrôle technique ${relative(v.ctDate)}`,
    v.nextServiceKm - v.km <= 1000 && `${v.name.split(' ').slice(0, 2).join(' ')} : entretien dans ${num(v.nextServiceKm - v.km, 0)} km`,
  ]).filter(Boolean) as string[];
  const toolsDue = tools.filter((t) => { const n = nextCheck(t); return n && daysBetween(todayISO(), n) <= 30; });

  return (
    <div className="space-y-5">
      <PageHeader title="Véhicules et outillage" subtitle="Échéances, kilométrage, qui a quel outil. Brix prévient avant que ça coince." />

      {(alertsV.length > 0 || toolsDue.length > 0) && (
        <Card className="border-[#fde3b5] bg-warn-bg/60 p-4">
          <div className="text-[13.5px] font-semibold">À prévoir ce mois-ci</div>
          <ul className="mt-1.5 grid gap-1 text-[13px] text-ink-2 sm:grid-cols-2">
            {alertsV.map((a) => <li key={a} className="flex gap-2"><Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" />{a}</li>)}
            {toolsDue.map((t) => <li key={t.id} className="flex gap-2"><HardHat className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" />{t.name} : {t.checkLabel?.toLowerCase()} {daysBetween(todayISO(), nextCheck(t)!) < 0 ? `en retard de ${-daysBetween(todayISO(), nextCheck(t)!)} j` : relative(nextCheck(t)!)}</li>)}
          </ul>
        </Card>
      )}

      <UnderlineTabs<Tab> value={tab} onChange={setTab} options={[{ value: 'vehicules', label: 'Véhicules', count: vehicles.length }, { value: 'outillage', label: 'Outillage et EPI', count: tools.length }]} />

      {tab === 'vehicules' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {vehicles.map((v) => <VehicleCard key={v.id} v={v} onKm={() => { setKmFor(v); setKm(String(v.km)); }} />)}
        </div>
      )}

      {tab === 'outillage' && (
        <Card className="overflow-hidden">
          <CardHeader title="Qui a quoi" meta={`${tools.filter((t) => t.holderId).length} sortis · ${tools.filter((t) => !t.holderId).length} au dépôt`} />
          <div className="hidden grid-cols-[minmax(0,1.8fr)_1fr_1.1fr_100px] gap-3 border-b border-line bg-[#fafafc] px-4 py-2 text-[11.5px] font-medium text-ink-2 lg:grid">
            <span>Outil</span><span>Chez</span><span>Prochaine vérification</span><span />
          </div>
          {tools.map((t) => {
            const h = employees.find((e) => e.id === t.holderId);
            const n = nextCheck(t);
            const st = n ? due(n) : null;
            return (
              <div key={t.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-line px-4 py-3 last:border-0 lg:grid-cols-[minmax(0,1.8fr)_1fr_1.1fr_100px]">
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-medium">{t.name}</div>
                  <div className="truncate text-[11.5px] text-ink-3">{t.brand} · {t.category} · n° {t.serial}</div>
                </div>
                <div className="col-start-1 row-start-2 flex items-center gap-2 text-[13px] lg:col-start-auto lg:row-start-auto">
                  {h ? <><Avatar initials={h.initials} color={h.color} size={22} /><span>{h.firstName}</span><span className="text-[11.5px] text-ink-3">{relative(t.since!)}</span></> : <span className="text-ink-3">Au dépôt</span>}
                </div>
                <div className="col-span-2 row-start-3 flex items-center gap-2 text-[12.5px] lg:col-span-1 lg:row-start-auto">
                  {st ? <><Badge tone={st.tone} dot={st.tone !== 'neutral'}>{st.text}</Badge><span className="truncate text-ink-3">{t.checkLabel}</span></> : <span className="text-ink-3">—</span>}
                </div>
                <div className="col-start-2 row-span-2 row-start-1 flex flex-col items-end gap-1 lg:col-start-auto lg:row-span-1 lg:row-start-auto">
                  <Button size="sm" variant="secondary" icon={<ArrowLeftRight className="h-3.5 w-3.5" />} onClick={() => { setLend(t); setTo(t.holderId ?? ''); }}>{t.holderId ? 'Rendre' : 'Prêter'}</Button>
                  {st && st.tone !== 'neutral' && <Button size="sm" variant="ghost" icon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => { upsertTool({ ...t, lastCheck: todayISO() }); toast(`${t.checkLabel} enregistré${t.checkLabel?.endsWith('e') ? 'e' : ''} pour ${t.name.toLowerCase()}.`); }}>Vérifié</Button>}
                </div>
              </div>
            );
          })}
        </Card>
      )}

      <Sheet open={!!kmFor} onClose={() => setKmFor(null)} title="Kilométrage" subtitle={kmFor?.name} width={420}
        footer={<><Button variant="ghost" onClick={() => setKmFor(null)}>Annuler</Button><Button variant="primary" onClick={() => { const n = Number(km.replace(/\s/g, '')); if (kmFor && n >= kmFor.km) { upsertVehicle({ ...kmFor, km: n, kmAt: todayISO() }); toast('Kilométrage mis à jour.'); setKmFor(null); } else toast('Le kilométrage ne peut pas baisser.', 'warn'); }}>Enregistrer</Button></>}
      >
        <Field label="Compteur actuel" hint={kmFor ? `Dernier relevé : ${num(kmFor.km, 0)} km. Le conducteur peut aussi le saisir depuis son téléphone.` : ''}>
          <Input inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value)} suffix="km" autoFocus />
        </Field>
      </Sheet>

      <Sheet open={!!lend} onClose={() => setLend(null)} title={lend?.holderId ? 'Rendre ou passer l’outil' : 'Prêter l’outil'} subtitle={lend?.name} width={420}
        footer={<><Button variant="ghost" onClick={() => setLend(null)}>Annuler</Button><Button variant="primary" onClick={() => { if (lend) { upsertTool({ ...lend, holderId: to || undefined, since: todayISO() }); toast(to ? `${lend.name} confié à ${employees.find((e) => e.id === to)?.firstName}.` : `${lend.name} rangé au dépôt.`); } setLend(null); }}>Enregistrer</Button></>}
      >
        <Field label="Qui l’a maintenant">
          <Select value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">Personne (rangé au dépôt)</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
          </Select>
        </Field>
        <p className={cn('mt-3 text-[12.5px] text-ink-3')}>La personne voit l’outil dans son app et confirme qu’elle l’a bien.</p>
      </Sheet>
    </div>
  );
}
