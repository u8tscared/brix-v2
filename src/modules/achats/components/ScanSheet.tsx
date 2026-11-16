import { useEffect, useState } from 'react';
import { Check, Loader2, ScanLine } from 'lucide-react';
import { Badge, Button, Field, Input, Segmented, Sheet, cn, toast } from '@/components/ui';
import { LOCATIONS, type LocationKey } from '../data';
import { scanBarcode } from '../service';
import { useAchats } from '../store';

interface Counted { id: string; expected: number; counted: number }

/** Inventaire rapide : on scanne, on compte, Brix calcule les écarts. */
export function ScanSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { articles, setCount } = useAchats();
  const [loc, setLoc] = useState<LocationKey>('van_mehdi');
  const [scanning, setScanning] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const [count, setCountInput] = useState('');
  const [done, setDone] = useState<Counted[]>([]);
  useEffect(() => {
    if (open) {
      setDone([]);
      setCurrent(null);
    }
  }, [open, loc]);

  const pool = articles.filter((a) => loc === 'depot' || a.vanMin > 0);
  const scan = async () => {
    setScanning(true);
    const code = await scanBarcode(pool.map((a) => a.barcode), done.length);
    const a = pool.find((x) => x.barcode === code);
    setScanning(false);
    if (a) {
      setCurrent(a.id);
      setCountInput(String(a.qty[loc]));
    }
  };
  const a = articles.find((x) => x.id === current);
  const keep = () => {
    if (!a) return;
    const n = Number(count.replace(',', '.')) || 0;
    setDone((d) => [...d.filter((x) => x.id !== a.id), { id: a.id, expected: a.qty[loc], counted: n }]);
    setCurrent(null);
  };
  const finish = () => {
    done.forEach((c) => setCount(c.id, loc, c.counted));
    const gaps = done.filter((c) => c.counted !== c.expected).length;
    toast(gaps ? `Inventaire enregistré : ${gaps} écart${gaps > 1 ? 's' : ''} corrigé${gaps > 1 ? 's' : ''}.` : 'Inventaire enregistré, aucun écart.');
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Inventaire rapide" subtitle="Scannez chaque article, corrigez le nombre si besoin." width={480}
      footer={<><span className="mr-auto text-[12.5px] text-ink-3">{done.length} article{done.length > 1 ? 's' : ''} compté{done.length > 1 ? 's' : ''}</span><Button variant="primary" disabled={!done.length} onClick={finish}>Valider l’inventaire</Button></>}
    >
      <div className="space-y-4">
        <Segmented<LocationKey> value={loc} onChange={setLoc} className="w-full" options={LOCATIONS.map((l) => ({ value: l.key, label: l.short }))} />

        {!a ? (
          <button onClick={scan} disabled={scanning} className="relative flex h-52 w-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-[#17171f] text-white">
            <span className="absolute inset-8 rounded-xl border-2 border-white/25" />
            {scanning && <span className="absolute inset-x-10 top-1/2 h-0.5 animate-pulse bg-peach shadow-[0_0_12px_#fb923c]" />}
            {scanning ? <Loader2 className="h-7 w-7 animate-spin" /> : <ScanLine className="h-8 w-8" />}
            <span className="relative mt-2 text-[14px] font-medium">{scanning ? 'Lecture du code-barres…' : 'Toucher pour scanner'}</span>
            <span className="relative mt-0.5 text-[11.5px] text-white/50">Caméra simulée en démo</span>
          </button>
        ) : (
          <div className="rounded-2xl border border-line p-4">
            <div className="text-[11.5px] text-ink-3">{a.ref} · {a.barcode}</div>
            <div className="mt-0.5 text-[15px] font-semibold">{a.name}</div>
            <div className="mt-1 text-[12.5px] text-ink-2">Brix attend <span className="num font-medium text-ink">{a.qty[loc]} {a.unit}</span> dans le {LOCATIONS.find((l) => l.key === loc)!.short.toLowerCase()}.</div>
            <div className="mt-3 flex items-end gap-2">
              <Field label="Compté" className="flex-1"><Input inputMode="decimal" value={count} onChange={(e) => setCountInput(e.target.value)} autoFocus suffix={a.unit} /></Field>
              <Button variant="primary" className="h-11" icon={<Check className="h-4 w-4" />} onClick={keep}>OK</Button>
            </div>
          </div>
        )}

        {done.length > 0 && (
          <div className="divide-y divide-line rounded-xl border border-line">
            {done.map((c) => {
              const art = articles.find((x) => x.id === c.id)!;
              const gap = c.counted - c.expected;
              return (
                <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 text-[13px]">
                  <span className="min-w-0 flex-1 truncate">{art.name}</span>
                  <span className="num text-ink-2">{c.counted} {art.unit}</span>
                  <Badge tone={gap === 0 ? 'ok' : 'warn'} className={cn(gap === 0 && 'px-1.5')}>{gap === 0 ? 'juste' : `${gap > 0 ? '+' : ''}${gap}`}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Sheet>
  );
}
