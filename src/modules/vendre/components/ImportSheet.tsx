import { useRef, useState } from 'react';
import { Check, FileUp, Smartphone } from 'lucide-react';
import { Button, cn, Sheet, toast } from '@/components/ui';
import { todayISO, uid } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Client } from '@/lib/types';
import { isProName } from '../lib';
import { importFromProvider, parseContacts } from '../service';

const GoogleMark = () => (
  <span className="grid h-5 w-5 place-items-center rounded-full border border-line2 text-[11px] font-bold text-brand">G</span>
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
          <button onClick={() => provider('iphone')} className="flex min-h-[60px] w-full items-center gap-3 rounded-xl border border-line px-4 text-left hover:bg-sub">
            <Smartphone className="h-5 w-5 text-ink-2" strokeWidth={1.75} />
            <span className="flex-1"><span className="block text-[14px] font-medium">Contacts de l'iPhone</span><span className="text-xs text-ink-3">Choisissez qui importer, rien d'autre n'est lu</span></span>
            {busy === 'iphone' && <span className="text-xs text-ink-3">Lecture…</span>}
          </button>
          <button onClick={() => provider('google')} className="flex min-h-[60px] w-full items-center gap-3 rounded-xl border border-line px-4 text-left hover:bg-sub">
            <GoogleMark />
            <span className="flex-1"><span className="block text-[14px] font-medium">Contacts Google</span><span className="text-xs text-ink-3">Gmail et téléphones Android</span></span>
            {busy === 'google' && <span className="text-xs text-ink-3">Connexion…</span>}
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex min-h-[96px] w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line2 bg-sub/60 px-4 text-center hover:bg-sub">
            <FileUp className="h-5 w-5 text-ink-2" strokeWidth={1.75} />
            <span className="text-[14px] font-medium">Fichier CSV, Excel enregistré en CSV ou vCard</span>
            <span className="text-xs text-ink-3">Export d'Obat, Tolteck, Batappli, EBP… Les colonnes sont reconnues toutes seules.</span>
          </button>
          <input ref={fileRef} type="file" accept=".csv,.vcf,.txt,text/csv,text/vcard" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
      ) : (
        <div>
          <div className="mb-2 text-xs text-ink-3">{rows.length} contacts trouvés dans {from}</div>
          <div className="overflow-hidden rounded-xl border border-line">
            {rows.map((r, i) => (
              <button key={i} onClick={() => setRows((x) => x.map((y, j) => (j === i ? { ...y, pick: !y.pick } : y)))} className="flex min-h-[56px] w-full items-center gap-3 border-b border-line px-3 text-left last:border-b-0 hover:bg-sub">
                <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-md border', r.pick ? 'border-ink bg-ink text-white' : 'border-line2')}>{r.pick && <Check className="h-3.5 w-3.5" />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium">{r.name}</span>
                  <span className="block truncate text-xs text-ink-3">{[r.phone, r.email, r.city].filter(Boolean).join(' · ') || 'Pas de coordonnées'}</span>
                </span>
                {r.dup && <span className="text-[11.5px] text-warn">Déjà client</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </Sheet>
  );
}
