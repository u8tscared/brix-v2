import { useRef, useState } from 'react';
import { Check, FileUp, Smartphone } from 'lucide-react';
import { Badge, Button, cn, IconTile, Sheet, toast } from '@/components/ui';
import { todayISO, uid } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Client } from '@/lib/types';
import { isProName } from '../lib';
import { importFromProvider, parseContacts } from '../service';

const GoogleMark = () => (
  <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[11px] bg-pale-b text-[13px] font-bold text-deep-b">G</span>
);

export function ImportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const clients = useBrix((s) => s.clients);
  const upsertClient = useBrix((s) => s.upsertClient);
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<(Partial<Client> & { pick: boolean; dup: boolean })[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [from, setFrom] = useState('');

  const load = (list: Partial<Client>[], label: string) => {
    const known = new Set(clients.map((c) => c.name.toLowerCase()));
    setRows(list.map((r) => ({ ...r, dup: known.has((r.name ?? '').toLowerCase()), pick: !known.has((r.name ?? '').toLowerCase()) })));
    setFrom(label);
  };
  const onFile = async (f?: File) => {
    if (!f) return;
    const text = await f.text();
    const list = parseContacts(text, f.name);
    if (!list.length) return toast('Aucun contact trouvé dans ce fichier', 'warn');
    load(list, f.name);
  };
  const provider = async (p: 'google' | 'iphone') => {
    setBusy(p);
    load(await importFromProvider(p), p === 'google' ? 'Contacts Google (démo)' : 'Contacts iPhone (démo)');
    setBusy(null);
  };
  const close = () => {
    setRows([]);
    onClose();
  };
  const commit = () => {
    const picked = rows.filter((r) => r.pick);
    picked.forEach((r) =>
      upsertClient({ id: uid('c'), kind: isProName(r.name ?? '') ? 'pro' : 'particulier', name: r.name ?? '', email: r.email ?? '', phone: r.phone ?? '', address: r.address ?? '', city: r.city ?? '', tags: ['Importé'], createdAt: todayISO() }),
    );
    toast(`${picked.length} contact${picked.length > 1 ? 's' : ''} importé${picked.length > 1 ? 's' : ''}`);
    close();
  };
  const n = rows.filter((r) => r.pick).length;

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Importer des contacts"
      subtitle="Depuis votre téléphone, Google ou un fichier de votre ancien logiciel."
      footer={rows.length ? <><Button variant="ghost" onClick={() => setRows([])}>Retour</Button><Button variant="primary" disabled={!n} onClick={commit}>Importer {n} contact{n > 1 ? 's' : ''}</Button></> : undefined}
    >
      {!rows.length ? (
        <div className="space-y-2.5">
          <button onClick={() => provider('iphone')} className="row-card min-h-[64px] w-full text-left">
            <IconTile icon={<Smartphone />} tone="neutral" size="row" />
            <span className="flex-1"><span className="block text-[14px] font-medium">Contacts de l'iPhone</span><span className="text-xs text-ink-3">Choisissez qui importer, rien d'autre n'est lu</span></span>
            {busy === 'iphone' && <span className="text-xs text-ink-3">Lecture…</span>}
          </button>
          <button onClick={() => provider('google')} className="row-card min-h-[64px] w-full text-left">
            <GoogleMark />
            <span className="flex-1"><span className="block text-[14px] font-medium">Contacts Google</span><span className="text-xs text-ink-3">Gmail et téléphones Android</span></span>
            {busy === 'google' && <span className="text-xs text-ink-3">Connexion…</span>}
          </button>
          <button onClick={() => fileRef.current?.click()} className="group flex min-h-[110px] w-full flex-col items-center justify-center gap-1.5 rounded-card border-[1.5px] border-dashed border-[#d9cff0] bg-white/60 px-4 text-center transition-colors hover:border-[#c4b5fd] hover:bg-white">
            <IconTile icon={<FileUp />} tone="violet" size="md" className="transition-transform duration-300 ease-spring group-hover:-translate-y-0.5" />
            <span className="text-[14px] font-medium">Fichier CSV, Excel enregistré en CSV ou vCard</span>
            <span className="text-xs text-ink-3">Export d'Obat, Tolteck, Batappli, EBP… Les colonnes sont reconnues toutes seules.</span>
          </button>
          <input ref={fileRef} type="file" accept=".csv,.vcf,.txt,text/csv,text/vcard" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
      ) : (
        <div>
          <div className="mb-2 text-xs text-ink-3">{rows.length} contacts trouvés dans {from}</div>
          <div className="overflow-hidden rounded-card-sm bg-white shadow-halo-sm">
            {rows.map((r, i) => (
              <button key={i} onClick={() => setRows((x) => x.map((y, j) => (j === i ? { ...y, pick: !y.pick } : y)))} className="flex min-h-[56px] w-full items-center gap-3 border-b border-halo-line px-3.5 text-left transition-colors last:border-b-0 hover:bg-halo-hover">
                <span className={cn('grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-[1.5px] transition-all duration-300 ease-spring', r.pick ? 'scale-100 border-transparent bg-deep-v text-white' : 'scale-90 border-[#dcd5ee]')}>{r.pick && <Check className="h-3.5 w-3.5" />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium">{r.name}</span>
                  <span className="block truncate text-xs text-ink-3">{[r.phone, r.email, r.city].filter(Boolean).join(' · ') || 'Pas de coordonnées'}</span>
                </span>
                {r.dup && <Badge tone="warn">Déjà client</Badge>}
              </button>
            ))}
          </div>
        </div>
      )}
    </Sheet>
  );
}
