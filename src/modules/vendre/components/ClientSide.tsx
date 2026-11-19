import { useState } from 'react';
import { BellRing, Building2, MapPin, StickyNote } from 'lucide-react';
import { Badge, Card, CardHeader, IconTile, Input, Switch, Textarea, toast } from '@/components/ui';
import { dateLong, dayOffset } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Client } from '@/lib/types';
import { CLIENT_SOURCE } from '../lib';
import { useVendre } from '../store';

/** Rappel d'entretien : Brix AI prévient le client et vous à la date choisie. */
export function MaintenanceCard({ client }: { client: Client }) {
  const r = useVendre((v) => v.reminders[client.id]);
  const setReminder = useVendre((v) => v.setReminder);
  const cur = r ?? { on: false, date: dayOffset(365), label: client.kind === 'pro' ? 'Contrôle annuel de l\'installation' : 'Vérification de l\'installation' };
  return (
    <Card>
      <CardHeader title="Rappel d'entretien" icon={<IconTile icon={<BellRing />} tone="amber" size="sm" />} action={<Switch checked={cur.on} onChange={(on) => { setReminder(client.id, { ...cur, on }); toast(on ? `Brix AI rappellera ${client.name.split(' ')[0]} le ${dateLong(cur.date)}` : 'Rappel désactivé', on ? 'ok' : 'info'); }} label="Rappel d'entretien" />} />
      <div className="space-y-2.5 p-4">
        {cur.on ? (
          <>
            <Input value={cur.label} onChange={(e) => setReminder(client.id, { ...cur, label: e.target.value })} />
            <Input type="date" value={cur.date} onChange={(e) => setReminder(client.id, { ...cur, date: e.target.value })} />
            <p className="text-xs text-ink-3">Le client reçoit un SMS 15 jours avant avec un lien pour réserver. Un contrat d'entretien, c'est du chiffre d'affaires qui revient tout seul.</p>
          </>
        ) : (
          <p className="text-[13px] text-ink-2">Activez-le pour que Brix AI propose une visite chaque année : c'est le client qui revient sans effort.</p>
        )}
      </div>
    </Card>
  );
}

export function InfoCard({ client }: { client: Client }) {
  const upsertClient = useBrix((s) => s.upsertClient);
  const [notes, setNotes] = useState(client.notes ?? '');
  return (
    <Card>
      <CardHeader title="Fiche" icon={<IconTile icon={<StickyNote />} tone="violet" size="sm" />} />
      <dl className="space-y-3 p-4 text-[13px]">
        <div className="flex gap-2.5"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" strokeWidth={1.75} /><span>{[client.address, client.city].filter(Boolean).join(', ') || <span className="text-ink-3">Adresse à compléter</span>}</span></div>
        {client.siret && <div className="flex gap-2.5"><Building2 className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" strokeWidth={1.75} /><span className="num">SIRET {client.siret}</span></div>}
        <div className="flex gap-2.5"><StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" strokeWidth={1.75} /><span className="text-ink-2">Connu par {client.source ? CLIENT_SOURCE[client.source].toLowerCase() : '—'}</span></div>
        {client.tags.length > 0 && <div className="flex flex-wrap gap-1">{client.tags.map((t) => <Badge key={t} tone="violet">{t}</Badge>)}</div>}
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== (client.notes ?? '') && (upsertClient({ ...client, notes }), toast('Note enregistrée'))} placeholder="Digicode, accès, préférences…" className="min-h-[72px] text-[13px]" />
      </dl>
    </Card>
  );
}
