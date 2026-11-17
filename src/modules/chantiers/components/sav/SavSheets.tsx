import { useEffect, useState } from 'react';
import { Avatar, Button, Field, Input, Segmented, Select, Sheet, Switch, Textarea, cn, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { dayOffset, todayISO, uid } from '@/lib/format';
import { useChantiersLocal, type Contract, type Equipment, type Intervention } from '../../store';
import { EQUIPMENT } from './savUtils';
import { freeSlot } from '../planning/utils';

export type PlanTarget = { kind: 'contract'; item: Contract } | { kind: 'intervention'; item: Intervention };

/** Planifier un entretien ou une intervention : crée le créneau dans le planning. */
export function PlanSheet({ target, onClose }: { target: PlanTarget | null; onClose: () => void }) {
  const { employees, events, clients, upsertEvent } = useBrix();
  const { upsertContract, upsertIntervention } = useChantiersLocal();
  const [emp, setEmp] = useState('');
  const [date, setDate] = useState(dayOffset(1));
  const [start, setStart] = useState('08:30');
  const [end, setEnd] = useState('10:00');

  useEffect(() => {
    if (!target) return;
    const e = employees.find((x) => x.role !== 'apprenti' && x.role !== 'patron') ?? employees[0];
    const d = target.kind === 'intervention' && target.item.priority === 'urgente' ? dayOffset(0) : dayOffset(1);
    setEmp(target.kind === 'intervention' && target.item.employeeId ? target.item.employeeId : e?.id ?? '');
    setDate(d);
    const [s] = freeSlot(events, e?.id ?? '', d);
    setStart(s);
    setEnd(`${String(Number(s.slice(0, 2)) + (target.kind === 'contract' ? 1 : 2)).padStart(2, '0')}:${s.slice(3)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  if (!target) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;
  const client = clients.find((c) => c.id === target.item.clientId);
  const title = target.kind === 'contract' ? `Entretien ${EQUIPMENT[target.item.equipment].label.toLowerCase()} · ${client?.name}` : `SAV · ${target.item.title}`;

  const save = () => {
    const id = uid('pe');
    upsertEvent({ id, employeeId: emp, date, start, end, title, kind: 'sav' });
    if (target.kind === 'contract') upsertContract({ ...target.item, plannedAt: date, eventId: id });
    else upsertIntervention({ ...target.item, status: 'planifiee', plannedAt: date, employeeId: emp, eventId: id });
    toast(`Planifié et ajouté au planning de ${employees.find((e) => e.id === emp)?.firstName ?? 'l’équipe'}. ${client?.name ?? 'Le client'} reçoit un SMS de confirmation (démo).`);
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title="Planifier" subtitle={title} width={460} footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button variant="primary" onClick={save} disabled={!emp || end <= start}>Planifier</Button></>}>
      <div className="space-y-4">
        {employees.length > 1 && (
          <div>
            <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">Qui y va ?</span>
            <div className="flex flex-wrap gap-2">
              {employees.map((e) => (
                <button key={e.id} type="button" onClick={() => setEmp(e.id)} className={cn('flex h-11 items-center gap-2 rounded-full border pl-1.5 pr-3 text-[13px] transition', emp === e.id ? 'border-ink bg-ink text-white' : 'border-line2 bg-white hover:bg-sub')}>
                  <Avatar initials={e.initials} color={e.color} size={30} /> {e.firstName}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-[1.3fr_1fr_1fr] gap-2">
          <Field label="Jour"><Input type="date" min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Début"><Input type="time" step={900} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="Fin"><Input type="time" step={900} value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
        </div>
        {client && <p className="text-[13px] text-ink-2">{client.address}, {client.city} · {client.phone}</p>}
      </div>
    </Sheet>
  );
}

export function NewInterventionSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const clients = useBrix((s) => s.clients);
  const upsertIntervention = useChantiersLocal((s) => s.upsertIntervention);
  const [f, setF] = useState({ clientId: '', title: '', description: '', priority: 'normale' as Intervention['priority'], underWarranty: false });
  useEffect(() => { if (open) setF({ clientId: '', title: '', description: '', priority: 'normale', underWarranty: false }); }, [open]);
  const save = () => {
    upsertIntervention({ id: uid('it'), ...f, status: 'nouvelle', createdAt: todayISO() });
    toast('Demande de SAV enregistrée');
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Nouvelle demande de SAV" width={480} footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button variant="primary" disabled={!f.clientId || !f.title.trim()} onClick={save}>Enregistrer</Button></>}>
      <div className="space-y-4">
        <Field label="Client">
          <Select value={f.clientId} onChange={(e) => setF({ ...f, clientId: e.target.value })}>
            <option value="">Choisir un client</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Problème"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Ex. : disjoncteur qui saute" /></Field>
        <Field label="Détails"><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Ce que dit le client, depuis quand, accès…" /></Field>
        <div>
          <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">Urgence</span>
          <Segmented value={f.priority} onChange={(priority) => setF({ ...f, priority })} options={[{ value: 'urgente', label: 'Urgent' }, { value: 'normale', label: 'Normal' }, { value: 'faible', label: 'Peut attendre' }]} />
        </div>
        <label className="flex min-h-[44px] items-center justify-between gap-3 text-[13.5px]">
          Sous garantie (travaux faits par vous)
          <Switch checked={f.underWarranty} onChange={(underWarranty) => setF({ ...f, underWarranty })} label="Sous garantie" />
        </label>
      </div>
    </Sheet>
  );
}

export function NewContractSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const clients = useBrix((s) => s.clients);
  const upsertContract = useChantiersLocal((s) => s.upsertContract);
  const blank = { clientId: '', equipment: 'tableau' as Equipment, label: '', brand: '', lastVisit: todayISO(), frequencyMonths: 12, priceHt: 150, reminder: true };
  const [f, setF] = useState(blank);
  useEffect(() => { if (open) setF(blank); }, [open]);
  const save = () => {
    upsertContract({ id: uid('ct'), ...f, label: f.label.trim() || EQUIPMENT[f.equipment].label, installedAt: f.lastVisit });
    toast('Contrat d’entretien créé, le rappel annuel est programmé');
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Nouveau contrat d’entretien" width={480} footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button variant="primary" disabled={!f.clientId} onClick={save}>Créer le contrat</Button></>}>
      <div className="space-y-4">
        <Field label="Client">
          <Select value={f.clientId} onChange={(e) => setF({ ...f, clientId: e.target.value })}>
            <option value="">Choisir un client</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Équipement">
          <Select value={f.equipment} onChange={(e) => setF({ ...f, equipment: e.target.value as Equipment })}>
            {(Object.keys(EQUIPMENT) as Equipment[]).map((k) => <option key={k} value={k}>{EQUIPMENT[k].label}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Description"><Input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder={EQUIPMENT[f.equipment].label} /></Field>
          <Field label="Marque"><Input value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })} placeholder="Ex. : Daikin" /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Dernière visite"><Input type="date" value={f.lastVisit} onChange={(e) => setF({ ...f, lastVisit: e.target.value })} /></Field>
          <Field label="Tous les">
            <Select value={f.frequencyMonths} onChange={(e) => setF({ ...f, frequencyMonths: Number(e.target.value) })}>
              <option value={6}>6 mois</option>
              <option value={12}>12 mois</option>
              <option value={24}>24 mois</option>
            </Select>
          </Field>
          <Field label="Prix HT / an"><Input type="number" inputMode="decimal" value={f.priceHt} onChange={(e) => setF({ ...f, priceHt: Number(e.target.value) || 0 })} /></Field>
        </div>
        <label className="flex min-h-[44px] items-center justify-between gap-3 text-[13.5px]">
          Rappel automatique au client 30 jours avant
          <Switch checked={f.reminder} onChange={(reminder) => setF({ ...f, reminder })} label="Rappel automatique" />
        </label>
      </div>
    </Sheet>
  );
}
