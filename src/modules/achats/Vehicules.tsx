import { useState } from 'react';
import { CalendarCheck, CheckCircle2, HardHat, Wrench } from 'lucide-react';
import { Button, Field, IconTile, Input, PageHeader, Select, Sheet, UnderlineTabs, cn, toast } from '@/components/ui';
import { SuccessDot } from '@/components/motion';
import { useBrix } from '@/lib/store';
import { num, todayISO } from '@/lib/format';
import type { Tool, Vehicle } from './data';
import { useAchats } from './store';
import { VehicleCard } from './components/VehicleCard';
import { ToolsList } from './components/ToolsList';
import { dueSoon, type Due } from './components/fleet';
import { DaysRing, SectionHead } from '@/modules/finance/components/kit';

type Tab = 'vehicules' | 'outillage';

export default function Vehicules() {
  const employees = useBrix((s) => s.employees);
  const { vehicles, tools, upsertVehicle, upsertTool } = useAchats();
  const [tab, setTab] = useState<Tab>('vehicules');
  const [kmFor, setKmFor] = useState<Vehicle | null>(null);
  const [km, setKm] = useState('');
  const [lend, setLend] = useState<Tool | null>(null);
  const [to, setTo] = useState('');
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [savedKm, setSavedKm] = useState<string | null>(null);

  const [due] = useState(() => dueSoon(vehicles, tools)); // figé au chargement : une ligne traitée reste visible avec sa coche
  const open = due.filter((d) => !done[d.id]).length;

  const act = (d: Due) => {
    if (d.tool) {
      upsertTool({ ...d.tool, lastCheck: todayISO() });
      toast(`${d.tool.checkLabel} enregistré pour ${d.tool.name.toLowerCase()}.`);
    } else {
      toast(d.kind === 'ct' ? `Rendez-vous demandé au centre de contrôle pour le ${d.vehicle!.plate}. Vous recevrez la date par SMS.` : `Demande d’entretien envoyée au garage pour le ${d.vehicle!.plate}.`);
    }
    setDone((x) => ({ ...x, [d.id]: true }));
  };

  const saveKm = () => {
    const n = Number(km.replace(/\s/g, ''));
    if (!kmFor) return;
    if (!n || n < kmFor.km) return toast('Le kilométrage ne peut pas baisser.', 'warn');
    upsertVehicle({ ...kmFor, km: n, kmAt: todayISO() });
    setSavedKm(kmFor.id);
    setTimeout(() => setSavedKm(null), 2200);
    toast(`${num(n, 0)} km enregistrés.`);
    setKmFor(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={<IconTile name="Truck" dept="achats" size="lg" />} title="Véhicules et outillage" subtitle="Échéances, kilométrage, qui a quel outil. Brix prévient avant que ça coince." />

      {due.length > 0 && (
        <section>
          <SectionHead title="À prévoir" meta={open ? `${open} dans les 30 jours` : 'tout est lancé'} />
          <div className="stagger mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {due.map((d) => {
              const ok = done[d.id];
              return (
                <div key={d.id} className={cn('relative flex items-center gap-3.5 overflow-hidden rounded-[16px] bg-white p-4 shadow-card transition-opacity duration-500', ok && 'opacity-80')}>
                  {!ok && <span aria-hidden className={cn('absolute inset-y-0 left-0 w-[3px]', d.days < 0 ? 'bg-bad' : 'bg-[#f59e0b]')} />}
                  <DaysRing days={d.days} horizon={30} size={52} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-ink-3">{d.kind === 'tool' ? <HardHat className="h-3.5 w-3.5" /> : <Wrench className="h-3.5 w-3.5" />}{d.kind === 'ct' ? 'Contrôle technique' : d.kind === 'service' ? 'Entretien' : 'Vérification'}</div>
                    <div className="mt-0.5 line-clamp-2 text-[13.5px] font-semibold leading-snug">{d.title}</div>
                    <div className="truncate text-[12px] text-ink-3">{d.sub}</div>
                  </div>
                  {ok ? (
                    <span className="flex shrink-0 items-center gap-1.5 text-[12.5px] font-medium text-ok"><SuccessDot size={18} />{d.tool ? 'Fait' : 'Demandé'}</span>
                  ) : (
                    <Button size="sm" variant="secondary" icon={d.tool ? <CheckCircle2 /> : <CalendarCheck />} onClick={() => act(d)} className="shrink-0">{d.tool ? 'Vérifié' : 'Réserver'}</Button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="space-y-4">
        <UnderlineTabs<Tab> value={tab} onChange={setTab} options={[{ value: 'vehicules', label: 'Véhicules', count: vehicles.length }, { value: 'outillage', label: 'Outillage et EPI', count: tools.length }]} />

        {tab === 'vehicules' && (
          <div className="stagger grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {vehicles.map((v) => <VehicleCard key={v.id} v={v} saved={savedKm === v.id} onKm={() => { setKmFor(v); setKm(String(v.km)); }} />)}
          </div>
        )}

        {tab === 'outillage' && (
          <>
            <p className="text-[12.5px] text-ink-3">{tools.filter((t) => t.holderId).length} outils sortis · {tools.filter((t) => !t.holderId).length} au dépôt. La personne voit l’outil dans son app et confirme qu’elle l’a.</p>
            <ToolsList
              tools={tools}
              checked={Object.fromEntries(due.filter((d) => d.tool && done[d.id]).map((d) => [d.tool!.id, true]))}
              onLend={(t) => { setLend(t); setTo(t.holderId ?? ''); }}
              onCheck={(t) => { const d = due.find((x) => x.tool?.id === t.id); if (d) act(d); else { upsertTool({ ...t, lastCheck: todayISO() }); toast('Vérification enregistrée.'); } }}
            />
          </>
        )}
      </div>

      <Sheet open={!!kmFor} onClose={() => setKmFor(null)} title="Kilométrage" subtitle={kmFor?.name} width={420}
        footer={<><Button variant="ghost" onClick={() => setKmFor(null)}>Annuler</Button><Button variant="primary" onClick={saveKm}>Enregistrer</Button></>}
      >
        <Field label="Compteur actuel" hint={kmFor ? `Dernier relevé : ${num(kmFor.km, 0)} km. Le conducteur peut aussi le saisir depuis son téléphone.` : ''}>
          <Input inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value)} suffix="km" autoFocus onKeyDown={(e) => e.key === 'Enter' && saveKm()} />
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
        <p className="mt-3 text-[12.5px] text-ink-3">La personne voit l’outil dans son app et confirme qu’elle l’a bien.</p>
      </Sheet>
    </div>
  );
}
