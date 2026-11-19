import { useState } from 'react';
import { Button, Field, Input, Select, Sheet, Textarea, toast } from '@/components/ui';
import { todayISO, uid } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Lead } from '@/lib/types';
import { LEAD_SOURCE } from '../lib';

export function NewLeadSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (l: Lead) => void }) {
  const upsertLead = useBrix((s) => s.upsertLead);
  const [f, setF] = useState({ name: '', phone: '', city: '', request: '', source: 'telephone' as Lead['source'] });
  const ok = f.name.trim() && f.phone.trim() && f.request.trim();
  const save = () => {
    const l: Lead = { id: uid('ld'), name: f.name.trim(), phone: f.phone.trim(), city: f.city.trim() || '—', request: f.request.trim(), source: f.source, receivedAt: todayISO(), status: 'nouveau' };
    upsertLead(l);
    toast('Demande ajoutée, Brix AI la lit');
    setF({ name: '', phone: '', city: '', request: '', source: 'telephone' });
    onClose();
    onCreated(l);
  };
  return (
    <Sheet open={open} onClose={onClose} title="Nouvelle demande" subtitle="Un appel, un message : notez-le ici, Brix AI s'occupe du reste." footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button variant="primary" disabled={!ok} onClick={save}>Ajouter</Button></>}>
      <div className="space-y-3">
        <Field label="Nom"><Input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Mme Durand" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Téléphone"><Input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="06 …" /></Field>
          <Field label="Ville"><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} placeholder="Lyon 3e" /></Field>
        </div>
        <Field label="Ce que veut le client"><Textarea value={f.request} onChange={(e) => setF({ ...f, request: e.target.value })} placeholder="Changer le tableau électrique, maison de 1980…" /></Field>
        <Field label="D'où vient-elle ?">
          <Select value={f.source} onChange={(e) => setF({ ...f, source: e.target.value as Lead['source'] })}>
            {Object.entries(LEAD_SOURCE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
      </div>
    </Sheet>
  );
}
