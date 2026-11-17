import { useState } from 'react';
import { Delete, Loader2, Mic, Square } from 'lucide-react';
import { Button, cn } from '@/components/ui';
import { parseMeters, useDictation } from '../common/useDictation';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'del'];

/**
 * Saisie d'une mesure : gros pavé numérique sur téléphone, champ clavier sur ordinateur,
 * et dictée (« trois mètres quarante-deux »).
 */
export function MeasureInput({ initial, onSubmit, simulate, isMobile }: { initial?: number; onSubmit: (v: number) => void; simulate: () => string; isMobile: boolean }) {
  const [val, setVal] = useState(initial ? String(initial).replace('.', ',') : '');
  const d = useDictation({ simulate });

  const n = Number(val.replace(',', '.'));
  const valid = Number.isFinite(n) && n > 0 && n < 50;

  const press = (k: string) => {
    if (k === 'del') return setVal((v) => v.slice(0, -1));
    if (k === ',' && val.includes(',')) return;
    if (val.split(',')[1]?.length >= 2) return;
    setVal((v) => (v === '' && k === ',' ? '0,' : v + k));
  };

  const dictate = () => {
    if (d.listening) return d.stop();
    d.start((t) => {
      const m = parseMeters(t);
      if (m) setVal(String(Math.round(m * 100) / 100).replace('.', ','));
    });
  };

  const submit = () => valid && onSubmit(Math.round(n * 100) / 100);

  return (
    <div className="space-y-3">
      <div className="flex items-stretch gap-2">
        {isMobile ? (
          <div className={cn('flex h-[72px] flex-1 items-baseline justify-center gap-1.5 rounded-2xl border bg-white pt-3', valid ? 'border-ink' : 'border-line2')}>
            <span className="num font-display text-[40px] font-semibold leading-none tracking-[-0.02em]">{val || <span className="text-ink-3">0,00</span>}</span>
            <span className="text-[18px] text-ink-2">m</span>
          </div>
        ) : (
          <div className="relative flex-1">
            <input
              autoFocus
              inputMode="decimal"
              value={val}
              onChange={(e) => setVal(e.target.value.replace('.', ',').replace(/[^0-9,]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="0,00"
              className="num h-[72px] w-full rounded-2xl border border-line2 bg-white px-5 pr-12 font-display text-[36px] font-semibold tracking-[-0.02em] focus:border-vi-300 focus:outline-none focus:ring-4 focus:ring-vi-100"
              aria-label="Mesure en mètres"
            />
            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[18px] text-ink-2">m</span>
          </div>
        )}
        <button
          onClick={dictate}
          disabled={d.busy}
          className={cn('grid w-[72px] shrink-0 place-items-center rounded-2xl text-white transition active:scale-95', d.listening ? 'bg-bad' : 'bg-ink')}
          aria-label={d.listening ? 'Arrêter la dictée' : 'Dicter la mesure'}
        >
          {d.busy ? <Loader2 className="h-6 w-6 animate-spin" /> : d.listening ? <Square className="h-5 w-5 fill-white" /> : <Mic className="h-6 w-6" />}
        </button>
      </div>
      <p className="min-h-[18px] text-center text-xs text-ink-3">
        {d.listening ? 'Dites la mesure, par exemple « trois mètres quarante-deux », puis touchez le carré.' : d.busy ? 'Je note…' : d.text ? `Entendu : « ${d.text} »` : 'Tapez la mesure ou dictez-la.'}
      </p>
      {isMobile && (
        <div className="grid grid-cols-3 gap-2">
          {KEYS.map((k) => (
            <button key={k} onClick={() => press(k)} className="grid h-14 place-items-center rounded-xl border border-line bg-white text-[22px] font-medium active:scale-95 active:bg-sub">
              {k === 'del' ? <Delete className="h-6 w-6" /> : k}
            </button>
          ))}
        </div>
      )}
      <Button variant="primary" size="lg" className="w-full justify-center" disabled={!valid} onClick={submit}>
        Valider la mesure
      </Button>
    </div>
  );
}
