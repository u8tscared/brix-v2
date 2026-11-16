import { useState } from 'react';
import { Button, Field, Input, Select, Sheet, toast } from '@/components/ui';
import { dayOffset, uid } from '@/lib/format';
import type { Employee } from '@/lib/types';
import { addDays } from '../data';
import { HAB_TYPES, habType } from '../lib/habs';
import { useEquipe } from '../store';

export function HabSheet({ open, onClose, employees }: { open: boolean; onClose: () => void; employees: Employee[] }) {
  const upsertHab = useEquipe((s) => s.upsertHab);
  const [emp, setEmp] = useState(employees[0]?.id ?? '');
  const [type, setType] = useState(HAB_TYPES[0].key);
  const [obtained, setObtained] = useState(dayOffset(0));
  const [organisme, setOrganisme] = useState('');
  const t = habType(type)!;
  const expires = addDays(obtained, Math.round(t.years * 365.25));
  return (
    <Sheet open={open} onClose={onClose} title="Ajouter une habilitation" subtitle="Brix calcule l’échéance et vous prévient 60 jours avant." width={460}
      footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button variant="primary" onClick={() => { upsertHab({ id: uid('h'), employeeId: emp, type, obtained, expires, organisme: organisme || 'Non renseigné' }); toast('Habilitation ajoutée.'); onClose(); }}>Ajouter</Button></>}
    >
      <div className="space-y-4">
        <Field label="Salarié"><Select value={emp} onChange={(e) => setEmp(e.target.value)}>{employees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}</Select></Field>
        <Field label="Habilitation ou formation" hint={t.rule}>
          <Select value={type} onChange={(e) => setType(e.target.value)}>{HAB_TYPES.map((h) => <option key={h.key} value={h.key}>{h.label}</option>)}</Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Obtenue le"><Input type="date" value={obtained} onChange={(e) => setObtained(e.target.value)} /></Field>
          <Field label="Échéance calculée"><Input type="date" value={expires} readOnly className="bg-sub" /></Field>
        </div>
        <Field label="Organisme"><Input value={organisme} onChange={(e) => setOrganisme(e.target.value)} placeholder="Ex. APAVE, Bureau Veritas…" /></Field>
        <p className="text-[12px] text-ink-3">Pour une habilitation électrique, l’employeur délivre aussi le titre signé : Brix le génère depuis la fiche du salarié.</p>
      </div>
    </Sheet>
  );
}
