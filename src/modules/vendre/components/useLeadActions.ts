import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui';
import { dateLong, uid } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Devis, Lead } from '@/lib/types';
import { readLead } from '../lib';
import { clientFromLead, linesFromLead, sendSms } from '../service';
import { useVendre } from '../store';

/** Actions communes sur une demande : préparer le devis, proposer un créneau, classer. */
export function useLeadActions() {
  const navigate = useNavigate();
  const s = useBrix();
  const addExchange = useVendre((v) => v.addExchange);

  const prepareDevis = (l: Lead) => {
    const existing = s.clients.find((c) => c.phone.replace(/\s/g, '') === l.phone.replace(/\s/g, '') || c.name.toLowerCase() === l.name.toLowerCase());
    const client = existing ?? clientFromLead(l);
    if (!existing) s.upsertClient(client);
    const d: Devis = {
      id: uid('q'),
      number: s.nextNumber('devis'),
      clientId: client.id,
      title: readLead(l).kind,
      status: 'brouillon',
      createdAt: new Date().toISOString().slice(0, 10),
      validityDays: 30,
      depositPercent: 30,
      lines: linesFromLead(l, s.company.hourlyRate || 55),
      notes: `Demande reçue : « ${l.request} »`,
    };
    s.upsertDevis(d);
    s.upsertLead({ ...l, status: 'devis' });
    addExchange({ clientId: client.id, at: new Date().toISOString().slice(0, 16), kind: 'note', text: `Devis ${d.number} préparé par Bob depuis la demande.` });
    toast(`Devis ${d.number} prêt à relire`);
    navigate(`/app/devis/${d.id}`);
  };

  const proposeSlot = async (l: Lead, slot: { date: string; start: string; end: string }) => {
    const me = s.employees.find((e) => e.role === 'patron') ?? s.employees[0];
    s.upsertEvent({ id: uid('pe'), employeeId: me?.id ?? 'e_me', title: `Visite ${l.name}`, date: slot.date, start: slot.start, end: slot.end, kind: 'rdv' });
    await sendSms(l.phone, `Bonjour, ${s.company.name} vous propose une visite le ${dateLong(slot.date)} à ${slot.start}.`);
    s.upsertLead({ ...l, status: 'rdv' });
    toast(`Visite proposée par SMS pour le ${dateLong(slot.date)} à ${Number(slot.start.slice(0, 2))} h${slot.start.slice(3) !== '00' ? ' ' + slot.start.slice(3) : ''} (démo)`);
  };

  const markLost = (l: Lead) => {
    const prev = l.status;
    s.upsertLead({ ...l, status: 'perdu' });
    toast('Demande classée perdue', 'info', { label: 'Annuler', run: () => useBrix.getState().upsertLead({ ...l, status: prev }) });
  };

  const setStatus = (l: Lead, status: Lead['status']) => s.upsertLead({ ...l, status });

  return { prepareDevis, proposeSlot, markLost, setStatus };
}
