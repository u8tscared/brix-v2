import { useEffect, useState } from 'react';
import { Building2, Search, User } from 'lucide-react';
import { Badge, Button, cn, Field, Input, Select, Sheet, Textarea, toast } from '@/components/ui';
import { todayISO, uid } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Client } from '@/lib/types';
import { CLIENT_SOURCE } from '../lib';
import { lookupCompany } from '../service';

const blank = (): Client => ({ id: uid('c'), kind: 'particulier', name: '', email: '', phone: '', address: '', city: '', tags: [], createdAt: todayISO(), source: 'telephone' });

export function ClientFormSheet({ open, onClose, initial, onSaved }: { open: boolean; onClose: () => void; initial?: Client; onSaved?: (c: Client) => void }) {
  const upsertClient = useBrix((s) => s.upsertClient);
  const [c, setC] = useState<Client>(initial ?? blank());
  const [q, setQ] = useState('');
  const [looking, setLooking] = useState(false);
  const [found, setFound] = useState(false);

  useEffect(() => {
    if (open) {
      setC(initial ?? blank());
      setQ('');
      setFound(false);
    }
  }, [open, initial?.id]);

  const set = (p: Partial<Client>) => setC((x) => ({ ...x, ...p }));
  const search = async () => {
    setLooking(true);
    const r = await lookupCompany(q);
    setLooking(false);
    if (r) {
      set({ ...r, kind: 'pro' });
      setFound(true);
    }
  };
  const ok = c.name.trim() && (c.phone.trim() || c.email.trim());
  const save = () => {
    upsertClient({ ...c, name: c.name.trim() });
    toast(initial ? 'Fiche client mise à jour' : `${c.name} ajouté à vos clients`);
    onClose();
    onSaved?.(c);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={initial ? 'Modifier le client' : 'Nouveau client'}
      footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button variant="primary" disabled={!ok} onClick={save}>{initial ? 'Enregistrer' : 'Ajouter le client'}</Button></>}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {([['particulier', 'Particulier', User], ['pro', 'Professionnel', Building2]] as const).map(([k, label, I]) => (
            <button key={k} onClick={() => set({ kind: k })} aria-pressed={c.kind === k} className={cn('flex h-12 items-center justify-center gap-2 rounded-full text-[13.5px] font-medium transition-[background,color,box-shadow] duration-300 ease-spring', c.kind === k ? 'bg-white text-ink shadow-[0_0_0_1.5px_#c9b5f7,0_8px_20px_-10px_rgba(109,40,217,.45)]' : 'bg-halo-track text-ink-2 hover:text-ink')}>
              <I className="h-4 w-4" strokeWidth={1.75} /> {label}
            </button>
          ))}
        </div>

        {c.kind === 'pro' && !initial && (
          <div className="rounded-card-sm bg-dawn-pale p-3.5">
            <div className="text-[12.5px] font-medium text-ink-2">Retrouver l'entreprise</div>
            <div className="mt-2 flex gap-2">
              <Input className="flex-1" icon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="SIRET ou nom (ex. Bellecour)" />
              <Button variant="primary" loading={looking} onClick={search} disabled={!q.trim()} className="h-11">Chercher</Button>
            </div>
            <p className="mt-1.5 text-xs text-ink-3">{found ? <Badge tone="ok">Fiche remplie depuis l'annuaire des entreprises (démo)</Badge> : 'Nom, adresse et SIRET se remplissent tout seuls.'}</p>
          </div>
        )}

        <Field label={c.kind === 'pro' ? "Nom de l'entreprise" : 'Nom et prénom'}>
          <Input autoFocus={c.kind === 'particulier'} value={c.name} onChange={(e) => set({ name: e.target.value })} placeholder={c.kind === 'pro' ? 'SCI Les Tilleuls' : 'Claire Lefèvre'} />
        </Field>
        {c.kind === 'pro' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Contact"><Input value={c.contact ?? ''} onChange={(e) => set({ contact: e.target.value })} placeholder="Marc Roche" /></Field>
            <Field label="SIRET"><Input value={c.siret ?? ''} onChange={(e) => set({ siret: e.target.value })} inputMode="numeric" /></Field>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Téléphone"><Input type="tel" value={c.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="06 12 34 56 78" /></Field>
          <Field label="E-mail"><Input type="email" value={c.email} onChange={(e) => set({ email: e.target.value })} placeholder="nom@exemple.fr" /></Field>
        </div>
        <Field label="Adresse du chantier ou de facturation"><Input value={c.address} onChange={(e) => set({ address: e.target.value })} placeholder="18 rue Paul Bert" /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Code postal et ville"><Input value={c.city} onChange={(e) => set({ city: e.target.value })} placeholder="69003 Lyon" /></Field>
          <Field label="Comment vous a-t-il connu ?">
            <Select value={c.source ?? 'telephone'} onChange={(e) => set({ source: e.target.value as Client['source'] })}>
              {Object.entries(CLIENT_SOURCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Note"><Textarea value={c.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} placeholder="Code de la porte, chien, préférences…" className="min-h-[72px]" /></Field>
      </div>
    </Sheet>
  );
}
