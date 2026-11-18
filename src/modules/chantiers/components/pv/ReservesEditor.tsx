import { useRef } from 'react';
import { Camera, Plus, Trash2, X } from 'lucide-react';
import { Button, Input, toast } from '@/components/ui';
import { uid } from '@/lib/format';
import type { Reserve } from '../../store';
import { compressImage } from '../common/PhotoArt';

const SUGGESTIONS = ['Cache de prise manquant', 'Retouche de peinture autour du tableau', 'Spot qui ne s’allume pas', 'Étiquetage du tableau à compléter', 'Joint silicone à reprendre'];

export function ReservesEditor({ reserves, onChange, disabled }: { reserves: Reserve[]; onChange: (r: Reserve[]) => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const target = useRef<string | null>(null);
  const set = (id: string, p: Partial<Reserve>) => onChange(reserves.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const add = (text = '') => onChange([...reserves, { id: uid('rs'), text, location: '', done: false }]);

  return (
    <div className="space-y-2.5">
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f || !target.current) return;
          try {
            set(target.current, { photo: await compressImage(f, 480) });
          } catch {
            toast("Cette image n'a pas pu être lue", 'warn');
          }
        }}
      />
      {reserves.map((r, i) => (
        <div key={r.id} className="flex gap-2.5 rounded-card-sm border border-halo-line bg-white p-2.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              target.current = r.id;
              input.current?.click();
            }}
            className="relative grid h-[88px] w-[88px] shrink-0 place-items-center overflow-hidden rounded-lg border border-dashed border-line2 bg-halo-track text-ink-3"
            aria-label="Ajouter une photo de la réserve"
          >
            {r.photo ? <img src={r.photo} alt="" className="h-full w-full object-cover" /> : <span className="flex flex-col items-center gap-1 text-[11px]"><Camera className="h-5 w-5" />Photo</span>}
          </button>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="num w-5 text-[13px] font-semibold text-ink-3">{i + 1}</span>
              <Input value={r.text} disabled={disabled} onChange={(e) => set(r.id, { text: e.target.value })} placeholder="Ce qui reste à reprendre" className="h-10" />
            </div>
            <div className="flex items-center gap-2 pl-7">
              <Input value={r.location} disabled={disabled} onChange={(e) => set(r.id, { location: e.target.value })} placeholder="Où ? (ex. : cuisine)" className="h-10" />
              {!disabled && (
                <button onClick={() => onChange(reserves.filter((x) => x.id !== r.id))} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-bad-bg hover:text-bad" aria-label="Supprimer la réserve">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          {r.photo && !disabled && (
            <button onClick={() => set(r.id, { photo: undefined })} className="self-start text-ink-3 hover:text-ink" aria-label="Retirer la photo"><X className="h-4 w-4" /></button>
          )}
        </div>
      ))}
      {!disabled && (
        <>
          <Button className="w-full justify-center" icon={<Plus className="h-4 w-4" />} onClick={() => add()}>Ajouter une réserve</Button>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.filter((s) => !reserves.some((r) => r.text === s)).slice(0, 4).map((s) => (
              <button key={s} onClick={() => add(s)} className="h-9 rounded-full border border-halo-line bg-white px-3 text-[12.5px] text-ink-2 hover:text-ink">+ {s}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
