import { useMemo, useState } from 'react';
import { Check, ChevronDown, Plus, Search, UserPlus } from 'lucide-react';
import { Avatar, Button, Field, Input, Segmented, Sheet, cn, toast } from '@/components/ui';
import { initials, todayISO, uid } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Client, Devis } from '@/lib/types';
import { isPriced, mainVat } from '../logic';

const VAT_OPTIONS = [
  { rate: 10, label: '10 % · rénovation' },
  { rate: 5.5, label: '5,5 % · rénovation énergétique' },
  { rate: 20, label: '20 % · neuf ou local pro' },
];

/** Titre du devis et bandeau Client / Chantier / Validité / TVA. */
export function HeaderFields({ d, client, update, phone }: { d: Devis; client?: Client; update: (p: Partial<Devis>) => void; phone: boolean }) {
  const chantiers = useBrix((s) => s.chantiers);
  const [picker, setPicker] = useState(false);
  const vat = mainVat(d.lines, 10);
  const mine = chantiers.filter((c) => c.clientId === d.clientId);
  const chantier = chantiers.find((c) => c.id === d.chantierId);
  const cell = 'flex min-w-0 flex-col justify-center px-3 py-2 text-left';
  const label = 'text-[11.5px] text-ink-3';
  const value = 'truncate text-[13.5px] font-medium text-ink';
  return (
    <div className="space-y-3">
      <input
        value={d.title}
        onChange={(e) => update({ title: e.target.value })}
        placeholder="Titre du devis"
        className="w-full rounded-lg border border-transparent bg-transparent px-1 py-1 font-display text-[21px] font-semibold tracking-[-0.02em] text-ink placeholder:text-ink-3 hover:border-line2 focus:border-vi-300 focus:bg-white focus:outline-none md:text-[24px]"
        aria-label="Titre du devis"
      />
      <div className={cn('grid overflow-hidden rounded-xl border border-line bg-white', phone ? 'grid-cols-2' : 'grid-cols-[1.2fr_1.4fr_.8fr_1fr]')}>
        <button onClick={() => setPicker(true)} className={cn(cell, 'min-h-[52px] border-r border-line hover:bg-[#fafafc]', phone && 'border-b')}>
          <span className={label}>Client</span>
          <span className={cn(value, !client && 'text-vi-700')}>{client ? client.name : 'Choisir ou créer'}</span>
        </button>
        <label className={cn(cell, 'relative min-h-[52px] border-line', phone ? 'border-b' : 'border-r')}>
          <span className={label}>Chantier</span>
          <select
            value={d.chantierId ?? ''}
            onChange={(e) => update({ chantierId: e.target.value || undefined })}
            className={cn(value, 'w-full cursor-pointer appearance-none bg-transparent pr-4 focus:outline-none')}
            aria-label="Chantier"
          >
            <option value="">{client ? `${client.address}, ${client.city.replace(/^\d+\s*/, '')}` : 'Adresse du client'}</option>
            {mine.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute bottom-3 right-2 h-3.5 w-3.5 text-ink-3" />
          {chantier && <span className="sr-only">{chantier.name}</span>}
        </label>
        <label className={cn(cell, 'relative min-h-[52px] border-r border-line')}>
          <span className={label}>Validité</span>
          <select value={d.validityDays} onChange={(e) => update({ validityDays: Number(e.target.value) })} className={cn(value, 'w-full cursor-pointer appearance-none bg-transparent focus:outline-none')} aria-label="Validité">
            {[15, 30, 45, 60, 90].map((n) => (
              <option key={n} value={n}>
                {n} jours
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute bottom-3 right-2 h-3.5 w-3.5 text-ink-3" />
        </label>
        <label className={cn(cell, 'relative min-h-[52px]')}>
          <span className={label}>TVA</span>
          <select
            value={VAT_OPTIONS.some((o) => o.rate === vat) ? vat : 10}
            onChange={(e) => {
              const rate = Number(e.target.value);
              update({ lines: d.lines.map((l) => (isPriced(l) ? { ...l, vatRate: rate } : l)) });
              toast(`TVA appliquée à toutes les lignes : ${VAT_OPTIONS.find((o) => o.rate === rate)?.label}`, 'info');
            }}
            className={cn(value, 'w-full cursor-pointer appearance-none bg-transparent pr-4 focus:outline-none')}
            aria-label="TVA"
          >
            {VAT_OPTIONS.map((o) => (
              <option key={o.rate} value={o.rate}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute bottom-3 right-2 h-3.5 w-3.5 text-ink-3" />
        </label>
      </div>
      <ClientPicker open={picker} onClose={() => setPicker(false)} current={d.clientId} onPick={(id) => update({ clientId: id, chantierId: undefined })} />
    </div>
  );
}

function ClientPicker({ open, onClose, current, onPick }: { open: boolean; onClose: () => void; current: string; onPick: (id: string) => void }) {
  const clients = useBrix((s) => s.clients);
  const upsertClient = useBrix((s) => s.upsertClient);
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ kind: 'particulier' as Client['kind'], name: '', phone: '', email: '', address: '', city: '' });
  const list = useMemo(() => clients.filter((c) => `${c.name} ${c.city} ${c.contact ?? ''}`.toLowerCase().includes(q.toLowerCase())), [clients, q]);

  const create = () => {
    if (!form.name.trim()) return;
    const c: Client = { id: uid('c'), kind: form.kind, name: form.name.trim(), email: form.email, phone: form.phone, address: form.address, city: form.city, tags: [], createdAt: todayISO() };
    upsertClient(c);
    onPick(c.id);
    toast(`${c.name} ajouté à vos clients`);
    setCreating(false);
    setForm({ kind: 'particulier', name: '', phone: '', email: '', address: '', city: '' });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={creating ? 'Nouveau client' : 'Choisir le client'}
      subtitle={creating ? 'Seul le nom est obligatoire, le reste peut attendre.' : `${clients.length} clients`}
      footer={
        creating ? (
          <>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Retour
            </Button>
            <Button variant="primary" onClick={create} disabled={!form.name.trim()}>
              Créer et choisir
            </Button>
          </>
        ) : undefined
      }
    >
      {creating ? (
        <div className="space-y-3">
          <Segmented value={form.kind} onChange={(kind) => setForm({ ...form, kind })} options={[{ value: 'particulier', label: 'Particulier' }, { value: 'pro', label: 'Professionnel' }]} />
          <Field label={form.kind === 'pro' ? 'Raison sociale' : 'Nom et prénom'}>
            <Input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={form.kind === 'pro' ? 'SCI Les Tilleuls' : 'Claire Lefèvre'} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Téléphone">
              <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="06 …" />
            </Field>
            <Field label="E-mail">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nom@exemple.fr" />
            </Field>
          </div>
          <Field label="Adresse du chantier">
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="18 rue Paul Bert" />
          </Field>
          <Field label="Code postal et ville">
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="69003 Lyon" />
          </Field>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input icon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher" className="flex-1" autoFocus />
            <Button icon={<UserPlus className="h-4 w-4" />} onClick={() => { setForm((f) => ({ ...f, name: q })); setCreating(true); }}>
              Nouveau
            </Button>
          </div>
          <div className="overflow-hidden rounded-xl border border-line">
            {list.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  onPick(c.id);
                  onClose();
                }}
                className="flex min-h-[56px] w-full items-center gap-3 border-b border-line px-3 py-2 text-left last:border-b-0 hover:bg-[#fafafc]"
              >
                <Avatar initials={initials(c.name)} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium">{c.name}</div>
                  <div className="truncate text-[12px] text-ink-3">
                    {c.kind === 'pro' ? 'Professionnel' : 'Particulier'} · {c.city}
                  </div>
                </div>
                {c.id === current && <Check className="h-4 w-4 text-vi-700" />}
              </button>
            ))}
            {!list.length && (
              <button onClick={() => { setForm((f) => ({ ...f, name: q })); setCreating(true); }} className="flex w-full items-center gap-2 px-3 py-4 text-[13.5px] text-vi-700">
                <Plus className="h-4 w-4" /> Créer « {q} »
              </button>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}
