import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Clock3, FileSpreadsheet, Phone } from 'lucide-react';
import { Avatar, Badge, Button, Field, Input, Select, Sheet, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { dateFull, money, num } from '@/lib/format';
import type { Employee } from '@/lib/types';
import { extraOf, roleFromStore, ROLES, roleToStore, type RoleKey } from '../data';
import { habState, habType } from '../lib/habs';
import { useEquipe } from '../store';

const EMP_ROLES = ROLES.filter((r) => roleToStore(r.key));

export function EmployeeSheet({ emp, onClose }: { emp: Employee | null; onClose: () => void }) {
  const upsert = useBrix((s) => s.upsertEmployee);
  const habs = useEquipe((s) => s.habs);
  const nav = useNavigate();
  const [role, setRole] = useState<RoleKey>('compagnon');
  const [cost, setCost] = useState('');
  const [phone, setPhone] = useState('');
  useEffect(() => {
    if (!emp) return;
    setRole(roleFromStore(emp.role));
    setCost(String(emp.hourlyCost).replace('.', ','));
    setPhone(emp.phone);
  }, [emp?.id]);
  if (!emp) return null;
  const x = extraOf(emp.id);
  const myHabs = habs.filter((h) => h.employeeId === emp.id);
  const isBoss = emp.role === 'patron';

  const save = () => {
    const r = roleToStore(role);
    upsert({ ...emp, role: r ?? emp.role, hourlyCost: Number(cost.replace(',', '.')) || 0, phone });
    toast(`Fiche de ${emp.firstName} enregistrée.`);
    onClose();
  };

  const info: [string, string][] = [
    ['Contrat', emp.contract + (emp.contract === 'CDI' || emp.contract === 'Apprenti' ? ` depuis le ${dateFull(emp.hireDate)}` : '')],
    ['Statut', `${x.statut} · ${x.qualification}`],
    ['Salaire brut', isBoss ? 'Rémunération du gérant (hors paie salariés)' : `${money(emp.grossMonthly)} / mois pour 151,67 h`],
    ['E-mail', emp.email],
    ['Zone de déplacement habituelle', `Zone ${x.zone}`],
  ];

  return (
    <Sheet open={!!emp} onClose={onClose} width={520}
      title={<span className="flex items-center gap-3"><Avatar initials={emp.initials} color={emp.color} size={40} />{emp.firstName} {emp.lastName}</span>}
      subtitle={ROLES.find((r) => r.key === roleFromStore(emp.role))?.name}
      footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button variant="primary" onClick={save}>Enregistrer</Button></>}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-2">
          <a href={`tel:${emp.phone.replace(/\s/g, '')}`} className="flex h-16 flex-col items-center justify-center gap-1 rounded-card-sm border border-halo-line text-[12.5px] font-medium hover:bg-halo-track"><Phone className="h-4 w-4" />Appeler</a>
          <button onClick={() => nav('/app/pointage')} className="flex h-16 flex-col items-center justify-center gap-1 rounded-card-sm border border-halo-line text-[12.5px] font-medium hover:bg-halo-track"><Clock3 className="h-4 w-4" />Ses heures</button>
          <button onClick={() => nav(isBoss ? '/app/conges' : '/app/paie')} className="flex h-16 flex-col items-center justify-center gap-1 rounded-card-sm border border-halo-line text-[12.5px] font-medium hover:bg-halo-track">{isBoss ? <CalendarDays className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />}{isBoss ? 'Congés' : 'Bulletin'}</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-card-sm bg-halo-track p-3">
            <div className="text-xs text-ink-2">Coût horaire chargé</div>
            <div className="num mt-0.5 text-[20px] font-semibold">{isBoss ? '—' : money(emp.hourlyCost)}</div>
            <div className="text-[11.5px] text-ink-3">utilisé pour la marge des devis</div>
          </div>
          <div className="rounded-card-sm bg-halo-track p-3">
            <div className="text-xs text-ink-2">Solde de congés</div>
            <div className="num mt-0.5 text-[20px] font-semibold">{isBoss ? '—' : `${num(emp.leaveBalance, 1)} j`}</div>
            <div className="text-[11.5px] text-ink-3">payés par la caisse CIBTP</div>
          </div>
        </div>

        <dl className="divide-y divide-halo-line rounded-card-sm border border-halo-line">
          {info.map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5 px-3 py-2.5 sm:flex-row sm:gap-3">
              <dt className="w-44 shrink-0 text-[12.5px] text-ink-3">{k}</dt>
              <dd className="min-w-0 text-[13px]">{v}</dd>
            </div>
          ))}
        </dl>

        <div>
          <div className="mb-2 text-[12.5px] font-medium text-ink-2">Habilitations</div>
          {myHabs.length === 0 ? <p className="text-[13px] text-ink-3">Aucune habilitation enregistrée.</p> : (
            <div className="flex flex-wrap gap-1.5">
              {myHabs.map((h) => {
                const st = habState(h.expires);
                return <Badge key={h.id} tone={st.level === 'ok' ? 'neutral' : st.tone} dot={st.level !== 'ok'}>{habType(h.type)?.short} · {st.level === 'ok' ? `jusqu’au ${dateFull(h.expires)}` : st.label.toLowerCase()}</Badge>;
              })}
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Rôle dans Brix">
            <Select value={role} onChange={(e) => setRole(e.target.value as RoleKey)} disabled={isBoss}>
              {EMP_ROLES.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
            </Select>
          </Field>
          <Field label="Téléphone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" /></Field>
          {!isBoss && <Field label="Coût horaire chargé" hint="Salaire + charges, divisé par les heures productives."><Input value={cost} onChange={(e) => setCost(e.target.value)} inputMode="decimal" suffix="€ / h" /></Field>}
        </div>
      </div>
    </Sheet>
  );
}
