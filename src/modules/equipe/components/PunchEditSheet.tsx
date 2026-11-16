import { useEffect, useState } from 'react';
import { Button, Field, Input, Select, Sheet, Switch, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { capitalize, dateLong } from '@/lib/format';
import type { Employee } from '@/lib/types';
import { CHANTIER_GEO, hhmm, workedHours, type DayPunch } from '../data';
import type { Zone } from '../lib/payroll';
import type { ResolvedPunch } from '../lib/timesheet';
import { useEquipe } from '../store';

export function PunchEditSheet({ emp, date, punch, onClose }: { emp: Employee | null; date: string | null; punch: ResolvedPunch | null; onClose: () => void }) {
  const chantiers = useBrix((s) => s.chantiers);
  const editPunch = useEquipe((s) => s.editPunch);
  const [f, setF] = useState<Partial<DayPunch>>({});
  useEffect(() => {
    setF(punch ? { start: punch.start, end: punch.end, pauseMin: punch.pauseMin, chantierId: punch.chantierId, kind: punch.kind, panier: punch.panier, zone: punch.zone } : { start: '07:30', end: '16:30', pauseMin: 60, kind: 'chantier', panier: true, zone: 1, chantierId: chantiers[0]?.id });
  }, [punch, date, emp?.id]);
  if (!emp || !date) return null;
  const set = (p: Partial<DayPunch>) => setF((x) => ({ ...x, ...p }));
  const hours = workedHours({ start: f.start ?? '00:00', end: f.end ?? '00:00', pauseMin: f.pauseMin ?? 0, kind: f.kind ?? 'chantier' });

  return (
    <Sheet open onClose={onClose} title={`${emp.firstName} · ${capitalize(dateLong(date))}`} subtitle="Corriger une journée. La correction reste visible dans la feuille d’heures." width={460}
      footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button variant="primary" onClick={() => { editPunch(`${emp.id}|${date}`, f); toast('Journée corrigée.'); onClose(); }}>Enregistrer · {hhmm(hours)}</Button></>}
    >
      <div className="space-y-4">
        <Field label="Type de journée">
          <Select value={f.kind} onChange={(e) => set({ kind: e.target.value as DayPunch['kind'] })}>
            <option value="chantier">Chantier</option>
            <option value="cfa">École ou CFA</option>
            <option value="conge">Congé (payé par la caisse)</option>
            <option value="absent">Absence</option>
            <option value="ferie">Jour férié</option>
          </Select>
        </Field>
        {(f.kind === 'chantier' || f.kind === 'cfa') && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Arrivée"><Input type="time" value={f.start} onChange={(e) => set({ start: e.target.value })} /></Field>
              <Field label="Départ"><Input type="time" value={f.end} onChange={(e) => set({ end: e.target.value })} /></Field>
              <Field label="Pause"><Input inputMode="numeric" value={String(f.pauseMin ?? 0)} onChange={(e) => set({ pauseMin: Number(e.target.value) || 0 })} suffix="min" /></Field>
            </div>
            {f.kind === 'chantier' && (
              <>
                <Field label="Chantier">
                  <Select value={f.chantierId} onChange={(e) => set({ chantierId: e.target.value, zone: CHANTIER_GEO[e.target.value]?.zone ?? f.zone })}>
                    {chantiers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Zone de trajet" hint={CHANTIER_GEO[f.chantierId ?? ''] ? `${String(CHANTIER_GEO[f.chantierId!].km).replace('.', ',')} km du dépôt` : undefined}>
                    <Select value={f.zone} onChange={(e) => set({ zone: Number(e.target.value) as Zone })}>
                      {[1, 2, 3, 4, 5].map((z) => <option key={z} value={z}>Zone {z}</option>)}
                    </Select>
                  </Field>
                  <div className="flex items-center justify-between rounded-[10px] border border-line2 px-3 sm:mt-[22px] sm:h-11">
                    <span className="py-3 text-[13.5px]">Panier repas</span>
                    <Switch checked={!!f.panier} onChange={(v) => set({ panier: v })} label="Panier repas" />
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}
