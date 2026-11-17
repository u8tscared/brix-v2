import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Avatar, Button, Field, Input, Select, Sheet, cn, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { dayOffset, money, totals, uid } from '@/lib/format';
import { DEVIS_STATUS } from '@/lib/status';
import type { Chantier } from '@/lib/types';
import { useChantiersLocal } from '../../store';

export function NewChantierSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { clients, devis, employees, chantiers, upsertChantier, upsertDevis, user } = useBrix();
  const addJournal = useChantiersLocal((s) => s.addJournal);
  const [clientId, setClientId] = useState('');
  const [devisId, setDevisId] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [start, setStart] = useState(dayOffset(3));
  const [end, setEnd] = useState(dayOffset(10));
  const [team, setTeam] = useState<string[]>([]);

  // Devis signés sans chantier en premier : c'est le cas le plus courant.
  const freeDevis = useMemo(() => {
    const used = new Set(chantiers.map((c) => c.devisId).filter(Boolean));
    return devis
      .filter((d) => !used.has(d.id) && d.status !== 'refuse' && (!clientId || d.clientId === clientId))
      .sort((a, b) => (a.status === 'signe' ? -1 : 0) - (b.status === 'signe' ? -1 : 0));
  }, [devis, chantiers, clientId]);

  useEffect(() => {
    if (!open) return;
    setClientId('');
    setDevisId('');
    setName('');
    setAddress('');
    setCity('');
    setStart(dayOffset(3));
    setEnd(dayOffset(10));
    setTeam(employees.slice(0, 1).map((e) => e.id));
  }, [open]);

  const pickClient = (id: string) => {
    setClientId(id);
    const c = clients.find((x) => x.id === id);
    if (c) {
      setAddress(c.address);
      setCity(c.city.replace(/^\d{5}\s*/, ''));
      if (!name) setName(c.name);
    }
  };

  const pickDevis = (id: string) => {
    setDevisId(id);
    const d = devis.find((x) => x.id === id);
    if (!d) return;
    if (!clientId) pickClient(d.clientId);
    const c = clients.find((x) => x.id === d.clientId);
    setName(`${d.title}${c ? ' · ' + c.name.split(' ').slice(-1)[0] : ''}`);
    const hours = d.lines.filter((l) => l.unit === 'h').reduce((s, l) => s + l.quantity, 0);
    const days = Math.max(1, Math.ceil(hours / 7 / Math.max(1, team.length)));
    setEnd(dayOffset(3 + days + Math.floor(days / 5) * 2));
  };

  const valid = clientId && name.trim() && start && end && end >= start;

  const save = () => {
    const d = devis.find((x) => x.id === devisId);
    const ch: Chantier = {
      id: uid('ch'),
      clientId,
      name: name.trim(),
      address,
      city,
      status: start <= dayOffset(0) ? 'en_cours' : 'a_planifier',
      startDate: start,
      endDate: end,
      progress: 0,
      budgetHt: d ? Math.round(totals(d.lines).ht * 100) / 100 : 0,
      costHt: 0,
      team,
      nextStep: 'Préparer la commande de matériel',
      devisId: d?.id,
      photos: 0,
    };
    upsertChantier(ch);
    if (d) upsertDevis({ ...d, chantierId: ch.id });
    addJournal({ id: uid('j'), chantierId: ch.id, at: new Date().toISOString(), kind: 'evenement', author: 'bob', text: `Chantier créé par ${user.firstName || 'vous'}${d ? ` depuis le devis ${d.number}` : ''}.` });
    toast('Chantier créé');
    onClose();
    navigate(`/app/chantiers/${ch.id}`);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nouveau chantier"
      subtitle="Partez d'un devis signé : le budget, le client et l'adresse se remplissent seuls."
      width={520}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="primary" disabled={!valid} onClick={save}>Créer le chantier</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Devis lié" hint={devisId ? undefined : 'Facultatif : un chantier peut exister sans devis.'}>
          <Select value={devisId} onChange={(e) => pickDevis(e.target.value)}>
            <option value="">Sans devis</option>
            {freeDevis.map((d) => (
              <option key={d.id} value={d.id}>
                {d.number} · {d.title} · {money(totals(d.lines).ht, true)} HT ({DEVIS_STATUS[d.status].label.toLowerCase()})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Client">
          <Select value={clientId} onChange={(e) => pickClient(e.target.value)}>
            <option value="">Choisir un client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Nom du chantier">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rénovation cuisine · M. Martin" />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr]">
          <Field label="Adresse">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="12 rue de la Paix" />
          </Field>
          <Field label="Ville">
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lyon 3e" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Début">
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Fin prévue">
            <Input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <div>
          <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">Équipe</span>
          <div className="flex flex-wrap gap-2">
            {employees.map((e) => {
              const on = team.includes(e.id);
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setTeam((t) => (on ? t.filter((x) => x !== e.id) : [...t, e.id]))}
                  className={cn('flex h-11 items-center gap-2 rounded-full border pl-1.5 pr-3 text-[13px] transition', on ? 'border-ink bg-ink text-white' : 'border-line2 bg-white hover:bg-sub')}
                >
                  <Avatar initials={e.initials} color={e.color} size={30} />
                  {e.firstName}
                  {on && <Check className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
