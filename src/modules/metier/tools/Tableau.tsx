import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button, Input, Select, cn } from '@/components/ui';
import { uid } from '@/lib/format';
import { Note, ResultRow } from '../components/fields';
import { ToolLayout } from '../components/ToolLayout';

interface Ckt { id: string; label: string; amps: number; typeA: boolean }

const PRESET: Ckt[] = [
  ['Éclairage séjour, entrée', 16], ['Éclairage chambres', 16], ['Prises séjour', 20], ['Prises chambres', 20], ['Prises cuisine', 20],
  ['Plaque de cuisson', 32, true], ['Four', 20], ['Lave-vaisselle', 20], ['Lave-linge', 20, true], ['Chauffe-eau', 20], ['VMC', 2], ['Volets roulants', 16],
].map(([label, amps, typeA]) => ({ id: uid('c'), label: label as string, amps: amps as number, typeA: !!typeA }));

const SECTION: Record<number, string> = { 2: '1,5', 10: '1,5', 16: '1,5', 20: '2,5', 25: '4', 32: '6', 40: '10' };
const COLORS = ['#6d28d9', '#1f389d', '#0f766e', '#b45309', '#be185d'];

function group(circuits: Ckt[]) {
  const a = circuits.filter((c) => c.typeA);
  const others = circuits.filter((c) => !c.typeA);
  const n = Math.max(1, Math.ceil(others.length / 8));
  const groups: { label: string; type: 'A' | 'AC'; items: Ckt[] }[] = Array.from({ length: n }, (_, i) => ({ label: `Différentiel ${i + 1}`, type: 'A' as const, items: [] as Ckt[] }));
  // Répartition équilibrée : on alterne pour que deux circuits de prises ne tombent pas ensemble.
  others.forEach((c, i) => groups[i % n].items.push(c));
  if (a.length) groups.push({ label: `Différentiel ${n + 1}`, type: 'A', items: a });
  return groups;
}

export default function Tableau() {
  const [circuits, setCircuits] = useState<Ckt[]>(PRESET);
  const [label, setLabel] = useState('');
  const [amps, setAmps] = useState(20);
  const groups = group(circuits);
  const modules = circuits.length + groups.length * 2;
  const rows = Math.max(1, Math.ceil((modules * 1.2) / 13));
  const free = rows * 13 - modules;
  const add = () => {
    if (!label.trim()) return;
    setCircuits((c) => [...c, { id: uid('c'), label: label.trim(), amps, typeA: /plaque|lave-linge|borne|induction/i.test(label) }]);
    setLabel('');
  };

  // Vue de face : modules en rangées de 13.
  const slots: { color: string; kind: 'id' | 'cb' | 'free'; title: string }[] = [];
  groups.forEach((g, gi) => {
    slots.push({ color: COLORS[gi % COLORS.length], kind: 'id', title: g.label }, { color: COLORS[gi % COLORS.length], kind: 'id', title: g.label });
    g.items.forEach((c) => slots.push({ color: COLORS[gi % COLORS.length], kind: 'cb', title: `${c.label} ${c.amps} A` }));
  });
  while (slots.length < rows * 13) slots.push({ color: '', kind: 'free', title: 'Libre' });

  return (
    <ToolLayout
      tool="tableau"
      inputs={
        <>
          <div className="text-[12.5px] font-medium text-ink-2">Circuits du logement</div>
          <div className="space-y-1.5">
            {circuits.map((c) => (
              <div key={c.id} className="flex items-center gap-1.5 rounded-[10px] border border-line py-1 pl-3 pr-1.5">
                <span className="min-w-0 flex-1 truncate text-[13px]">{c.label}</span>
                <div className="w-[84px] shrink-0">
                <Select value={c.amps} onChange={(e) => setCircuits((cs) => cs.map((x) => (x.id === c.id ? { ...x, amps: Number(e.target.value) } : x)))} className="h-10 text-[13px]" aria-label={`Calibre ${c.label}`}>
                  {[2, 10, 16, 20, 25, 32, 40].map((a) => <option key={a} value={a}>{a} A</option>)}
                </Select>
                </div>
                <button onClick={() => setCircuits((cs) => cs.map((x) => (x.id === c.id ? { ...x, typeA: !x.typeA } : x)))} aria-pressed={c.typeA} className={cn('h-10 shrink-0 whitespace-nowrap rounded-lg border px-2 text-[11.5px] font-medium', c.typeA ? 'border-vi-200 bg-vi-50 text-vi-700' : 'border-line2 text-ink-3')} title="Sur le différentiel type A dédié">Type A</button>
                <button onClick={() => setCircuits((cs) => cs.filter((x) => x.id !== c.id))} className="-mr-1.5 grid h-10 w-10 shrink-0 place-items-center rounded-lg text-ink-3 hover:text-bad" aria-label={`Retirer ${c.label}`}><X className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); add(); }}>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nouveau circuit (ex. Borne garage)" className="min-w-0 flex-1" />
            <div className="w-[84px] shrink-0">
              <Select value={amps} onChange={(e) => setAmps(Number(e.target.value))} aria-label="Calibre du nouveau circuit">
                {[2, 10, 16, 20, 25, 32, 40].map((a) => <option key={a} value={a}>{a} A</option>)}
              </Select>
            </div>
            <Button type="submit" size="icon" className="h-11 w-11" icon={<Plus className="h-4 w-4" />} aria-label="Ajouter le circuit" />
          </form>
        </>
      }
      hero={{ label: 'Tableau conseillé', value: `${rows} rangée${rows > 1 ? 's' : ''}`, sub: `${modules} modules occupés · ${free} libres pour plus tard` }}
      formulas={[
        'Chaque disjoncteur occupe 1 module, chaque interrupteur différentiel 2 modules.',
        '8 circuits au plus par différentiel 30 mA ; plaque de cuisson et lave-linge sur un différentiel type A.',
        'On garde au moins 20 % de place libre pour les ajouts futurs.',
      ]}
      refs={['NF C 15-100 § 771.531', 'Partie 10-1']}
      lines={[
        { designation: `Coffret ${rows} rangée${rows > 1 ? 's' : ''} 13 modules`, quantity: 1, unit: 'u', unitPriceHt: 38 + rows * 30 },
        { designation: 'Interrupteur différentiel 40 A 30 mA type A', quantity: groups.length, unit: 'u', unitPriceHt: 64.9, unitCostHt: 44.2 },
        ...[2, 10, 16, 20, 25, 32, 40].map((a) => ({ designation: `Disjoncteur ${a} A courbe C`, quantity: circuits.filter((c) => c.amps === a).length, unit: 'u', unitPriceHt: a >= 32 ? 19.9 : 11.2 })),
        { designation: 'Peignes, borniers et repérage', quantity: 1, unit: 'forfait', unitPriceHt: 45 },
        { designation: 'Pose et raccordement du tableau', quantity: Math.max(3, Math.round(circuits.length * 0.5)), unit: 'h', unitPriceHt: 0 },
      ]}
      quoteTitle="Tableau électrique"
    >
      <div className="rounded-[12px] border border-line bg-sub p-2.5">
        {Array.from({ length: rows }, (_, ri) => (
          <div key={ri} className="mb-1.5 grid grid-cols-[repeat(13,minmax(0,1fr))] gap-[3px] last:mb-0">
            {slots.slice(ri * 13, ri * 13 + 13).map((s, i) => (
              <span key={i} title={s.title} className={cn('h-9 rounded-[3px] border', s.kind === 'free' ? 'border-dashed border-line2 bg-white/60' : 'border-transparent')} style={s.kind !== 'free' ? { background: s.kind === 'id' ? s.color : `${s.color}26`, borderColor: s.color } : undefined} />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2 rounded-[10px] bg-ink px-3 py-2 text-[12.5px] text-white">Disjoncteur de branchement (AGCP) · 500 mA</div>
        {groups.map((g, gi) => (
          <div key={g.label} className="ml-3 border-l-2 pl-3" style={{ borderColor: COLORS[gi % COLORS.length] }}>
            <div className="text-[12.5px] font-semibold">{g.label} · 40 A 30 mA type {g.type}</div>
            {g.items.map((c) => (
              <div key={c.id} className="flex justify-between py-0.5 text-[12.5px] text-ink-2"><span>{c.label}</span><span className="num">{c.amps} A · {SECTION[c.amps] ?? '–'} mm²</span></div>
            ))}
          </div>
        ))}
      </div>
      {groups.some((g) => g.items.length > 8) && <div className="mt-2"><Note tone="warn">Un différentiel porte plus de 8 circuits : ajoutez-en un.</Note></div>}
      <ResultRow label="Différentiels" value={String(groups.length)} />
    </ToolLayout>
  );
}
