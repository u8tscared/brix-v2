import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, MapPin, PenLine, Plus, Search, UserPlus, UserRound } from 'lucide-react';
import { Avatar, Button, Field, Input, Segmented, Sheet, cn, toast } from '@/components/ui';
import { initials, todayISO, uid } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Client, Devis } from '@/lib/types';
import { useEditorFocus } from '../focus';
import { isPriced, mainVat } from '../logic';

const VAT_OPTIONS = [
  { rate: 10, label: '10 % · rénovation' },
  { rate: 5.5, label: '5,5 % · rénovation énergétique' },
  { rate: 20, label: '20 % · neuf ou local pro' },
];

const incomplete = (c?: Client) => !!c && ((!c.email && !c.phone) || !c.address || !c.city);

/** Titre du devis, puis Client et Chantier en évidence, Validité et TVA à côté. */
export function HeaderFields({ d, client, update, phone }: { d: Devis; client?: Client; update: (p: Partial<Devis>) => void; phone: boolean }) {
  const chantiers = useBrix((s) => s.chantiers);
  const [picker, setPicker] = useState<false | 'list' | 'edit'>(false);
  const focus = useEditorFocus();
  const vat = mainVat(d.lines, 10);
  const mine = chantiers.filter((c) => c.clientId === d.clientId);

  // La vérification avant envoi peut demander d'ouvrir le choix (ou la fiche) du client.
  useEffect(() => {
    if (focus.target !== 'client') return;
    setPicker(incomplete(client) ? 'edit' : 'list');
    focus.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus.nonce]);

  const label = 'text-[11.5px] font-medium text-ink-3';
  const value = 'truncate text-[14px] font-medium text-ink';
  const addr = client ? [client.address, client.city].filter(Boolean).join(', ') : '';
  return (
    <div className="space-y-3">
      <input
        value={d.title}
        onChange={(e) => update({ title: e.target.value })}
        placeholder="Titre du devis"
        className="-ml-1.5 w-[calc(100%+12px)] rounded-[10px] border border-transparent bg-transparent px-1.5 py-1 text-[24px] font-semibold tracking-[-0.035em] text-ink transition placeholder:text-ink-3 hover:bg-white/60 focus:border-vi-300 focus:bg-white focus:outline-none md:text-[28px]"
        aria-label="Titre du devis"
      />
      <div className={cn('grid gap-2', phone ? 'grid-cols-1' : 'grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]')}>
        {/* Client */}
        <button data-field="client" onClick={() => setPicker('list')} className="group flex min-h-[64px] items-center gap-3 rounded-[14px] bg-white px-3.5 py-2.5 text-left shadow-card transition hover:shadow-raise">
          {client ? <Avatar initials={initials(client.name)} size={38} color="#f3edff" fg="#6d28d9" /> : <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full border border-dashed border-vi-300 text-vi-700"><UserPlus className="h-4 w-4" /></span>}
          <span className="min-w-0 flex-1">
            <span className={label}>Client</span>
            <span className={cn(value, 'block', !client && 'text-vi-700')}>{client ? client.name : 'Choisir ou créer un client'}</span>
            {client && <span className={cn('block truncate text-[12px]', incomplete(client) ? 'text-warn' : 'text-ink-3')}>{incomplete(client) ? 'Fiche à compléter' : [client.phone, client.email].filter(Boolean).join(' · ')}</span>}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-ink-3 transition group-hover:text-ink" />
        </button>
        {/* Chantier */}
        <label data-field="chantier" className="relative flex min-h-[64px] cursor-pointer items-center gap-3 rounded-[14px] bg-white px-3.5 py-2.5 shadow-card transition hover:shadow-raise">
          <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-[#fff1e7] text-[#c2410c]">
            <MapPin className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className={cn(label, 'block')}>Chantier</span>
            <select value={d.chantierId ?? ''} onChange={(e) => update({ chantierId: e.target.value || undefined })} className={cn(value, 'block w-full cursor-pointer appearance-none bg-transparent pr-5 focus:outline-none', !addr && !d.chantierId && 'text-ink-3')} aria-label="Chantier">
              <option value="">{addr || 'Adresse du client'}</option>
              {mine.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {client && !addr && (
              <button type="button" onClick={(e) => (e.preventDefault(), setPicker('edit'))} className="text-[12px] font-medium text-vi-700">
                Ajouter l’adresse
              </button>
            )}
          </span>
          <ChevronDown className="pointer-events-none h-4 w-4 shrink-0 text-ink-3" />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip field="validity" label="Validité">
          <select value={d.validityDays} onChange={(e) => update({ validityDays: Number(e.target.value) })} className="cursor-pointer appearance-none bg-transparent pr-4 font-medium text-ink focus:outline-none" aria-label="Validité">
            {[15, 30, 45, 60, 90].map((n) => (
              <option key={n} value={n}>
                {n} jours
              </option>
            ))}
          </select>
        </Chip>
        <Chip field="vat" label="TVA">
          <select
            value={VAT_OPTIONS.some((o) => o.rate === vat) ? vat : 10}
            onChange={(e) => {
              const rate = Number(e.target.value);
              update({ lines: d.lines.map((l) => (isPriced(l) ? { ...l, vatRate: rate } : l)) });
              toast(`TVA appliquée à toutes les lignes : ${VAT_OPTIONS.find((o) => o.rate === rate)?.label}`, 'info');
            }}
            className="cursor-pointer appearance-none bg-transparent pr-4 font-medium text-ink focus:outline-none"
            aria-label="TVA"
          >
            {VAT_OPTIONS.map((o) => (
              <option key={o.rate} value={o.rate}>
                {o.label}
              </option>
            ))}
          </select>
        </Chip>
      </div>
      <ClientPicker open={!!picker} mode={picker || 'list'} onClose={() => setPicker(false)} current={client} onPick={(id) => update({ clientId: id, chantierId: undefined })} />
    </div>
  );
}

function Chip({ field, label, children }: { field: string; label: string; children: React.ReactNode }) {
  return (
    <label data-field={field} className="relative inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-white pl-3 pr-2.5 text-[13px] shadow-card transition hover:shadow-raise max-md:h-11">
      <span className="text-ink-3">{label}</span>
      {children}
      <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-ink-3" />
    </label>
  );
}

const EMPTY = { kind: 'particulier' as Client['kind'], name: '', phone: '', email: '', address: '', city: '' };

function ClientPicker({ open, mode, onClose, current, onPick }: { open: boolean; mode: 'list' | 'edit'; onClose: () => void; current?: Client; onPick: (id: string) => void }) {
  const clients = useBrix((s) => s.clients);
  const upsertClient = useBrix((s) => s.upsertClient);
  const [q, setQ] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [view, setView] = useState<'list' | 'new' | 'edit'>('list');
  const list = useMemo(() => clients.filter((c) => `${c.name} ${c.city} ${c.contact ?? ''}`.toLowerCase().includes(q.toLowerCase())), [clients, q]);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && current) {
      setForm({ kind: current.kind, name: current.name, phone: current.phone, email: current.email, address: current.address, city: current.city });
      setView('edit');
    } else setView('list');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = () => {
    if (!form.name.trim()) return;
    if (view === 'edit' && current) {
      upsertClient({ ...current, ...form, name: form.name.trim() });
      toast(`Fiche de ${form.name.trim()} mise à jour`);
    } else {
      const c: Client = { id: uid('c'), kind: form.kind, name: form.name.trim(), email: form.email, phone: form.phone, address: form.address, city: form.city, tags: [], createdAt: todayISO() };
      upsertClient(c);
      onPick(c.id);
      toast(`${c.name} ajouté à vos clients`);
    }
    setForm(EMPTY);
    onClose();
  };
  const startNew = () => {
    setForm({ ...EMPTY, name: q });
    setView('new');
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      icon={<span className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#f3edff] text-[#6d28d9]">{view === 'list' ? <UserRound className="h-[18px] w-[18px]" /> : <PenLine className="h-[18px] w-[18px]" />}</span>}
      title={view === 'new' ? 'Nouveau client' : view === 'edit' ? 'Compléter la fiche client' : 'Choisir le client'}
      subtitle={view === 'new' ? 'Seul le nom est obligatoire, le reste peut attendre.' : view === 'edit' ? 'Ces informations apparaissent sur le devis.' : `${clients.length} clients`}
      footer={
        view !== 'list' ? (
          <>
            <Button variant="ghost" onClick={() => (view === 'edit' ? onClose() : setView('list'))}>
              {view === 'edit' ? 'Annuler' : 'Retour'}
            </Button>
            <Button variant="primary" onClick={save} disabled={!form.name.trim()} icon={<Check className="h-4 w-4" />}>
              {view === 'edit' ? 'Enregistrer' : 'Créer et choisir'}
            </Button>
          </>
        ) : undefined
      }
    >
      {view !== 'list' ? (
        <div className="space-y-3">
          <Segmented value={form.kind} onChange={(kind) => setForm({ ...form, kind })} options={[{ value: 'particulier', label: 'Particulier' }, { value: 'pro', label: 'Professionnel' }]} />
          <Field label={form.kind === 'pro' ? 'Raison sociale' : 'Nom et prénom'}>
            <Input autoFocus={view === 'new'} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={form.kind === 'pro' ? 'SCI Les Tilleuls' : 'Claire Lefèvre'} />
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
            <Input autoFocus={view === 'edit' && !form.address} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="18 rue Paul Bert" />
          </Field>
          <Field label="Code postal et ville">
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="69003 Lyon" />
          </Field>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input icon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher" className="flex-1" autoFocus />
            <Button icon={<UserPlus className="h-4 w-4" />} onClick={startNew}>
              Nouveau
            </Button>
          </div>
          <div className="stagger-fast overflow-hidden rounded-[14px] bg-white shadow-card">
            {list.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  onPick(c.id);
                  onClose();
                }}
                className="flex min-h-[56px] w-full items-center gap-3 border-b border-line px-3 py-2 text-left transition last:border-b-0 hover:bg-[#faf9fd]"
              >
                <Avatar initials={initials(c.name)} size={34} color="#f3edff" fg="#6d28d9" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium">{c.name}</div>
                  <div className="truncate text-[12px] text-ink-3">
                    {c.kind === 'pro' ? 'Professionnel' : 'Particulier'} · {c.city || 'ville à préciser'}
                  </div>
                </div>
                {c.id === current?.id && <Check className="h-4 w-4 text-vi-700" />}
              </button>
            ))}
            {!list.length && (
              <button onClick={startNew} className="flex min-h-[52px] w-full items-center gap-2 px-3 py-4 text-[13.5px] font-medium text-vi-700">
                <Plus className="h-4 w-4" /> {q.trim() ? <>Créer « {q.trim()} »</> : 'Nouveau client'}
              </button>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}
