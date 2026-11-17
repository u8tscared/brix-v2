import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button, Input, Switch } from '@/components/ui';
import { uid } from '@/lib/format';
import { Choice, NumField, ResultRow, n1 } from '../components/fields';
import { ToolLayout } from '../components/ToolLayout';

interface Piece { id: string; name: string; l: number; w: number; h: number; doors: number; windows: number; ceiling: boolean }
const DOOR = 1.7; // 0,83 × 2,04 m
const WINDOW = 1.5; // 1,20 × 1,25 m

/** Combinaison de pots la moins chère en litres (10 L et 2,5 L). */
function pots(liters: number) {
  const big = Math.floor(liters / 10);
  const rest = liters - big * 10;
  const small = Math.ceil(rest / 2.5);
  return small >= 3 ? { big: big + 1, small: 0 } : { big, small };
}

export default function Peinture() {
  const [rooms, setRooms] = useState<Piece[]>([
    { id: 'p1', name: 'Séjour', l: 5.2, w: 4.1, h: 2.5, doors: 2, windows: 2, ceiling: true },
    { id: 'p2', name: 'Chambre', l: 3.6, w: 3.2, h: 2.5, doors: 1, windows: 1, ceiling: true },
  ]);
  const [coats, setCoats] = useState(2);
  const [primer, setPrimer] = useState(true);
  const [yieldWall, setYield] = useState(11);
  const upd = (id: string, p: Partial<Piece>) => setRooms((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));

  const walls = rooms.reduce((x, r) => x + Math.max(0, 2 * (r.l + r.w) * r.h - r.doors * DOOR - r.windows * WINDOW), 0);
  const ceilings = rooms.reduce((x, r) => x + (r.ceiling ? r.l * r.w : 0), 0);
  const wallL = (walls * coats) / yieldWall;
  const ceilL = (ceilings * coats) / (yieldWall - 1);
  const primerL = primer ? (walls + ceilings) / 9 : 0;
  const total = wallL + ceilL;
  const pw = pots(Math.ceil(wallL * 1.05 * 10) / 10);
  const pc = pots(Math.ceil(ceilL * 1.05 * 10) / 10);

  return (
    <ToolLayout
      tool="peinture"
      inputs={
        <>
          {rooms.map((r) => (
            <div key={r.id} className="rounded-[12px] border border-line p-3">
              <div className="mb-2 flex items-center gap-2">
                <Input value={r.name} onChange={(e) => upd(r.id, { name: e.target.value })} className="h-9 flex-1 font-medium" aria-label="Nom de la pièce" />
                <button onClick={() => setRooms((rs) => rs.filter((x) => x.id !== r.id))} className="grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:text-bad" aria-label="Retirer"><X className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <NumField label="Longueur" value={r.l} onChange={(v) => upd(r.id, { l: v })} suffix="m" />
                <NumField label="Largeur" value={r.w} onChange={(v) => upd(r.id, { w: v })} suffix="m" />
                <NumField label="Hauteur" value={r.h} onChange={(v) => upd(r.id, { h: v })} suffix="m" />
                <NumField label="Portes" value={r.doors} onChange={(v) => upd(r.id, { doors: Math.round(v) })} />
                <NumField label="Fenêtres" value={r.windows} onChange={(v) => upd(r.id, { windows: Math.round(v) })} />
                <label className="flex flex-col"><span className="mb-1.5 text-[12.5px] font-medium text-ink-2">Plafond</span><span className="flex h-11 items-center"><Switch checked={r.ceiling} onChange={(v) => upd(r.id, { ceiling: v })} label="Plafond" /></span></label>
              </div>
            </div>
          ))}
          <Button size="sm" variant="ghost" icon={<Plus className="h-4 w-4" />} onClick={() => setRooms((rs) => [...rs, { id: uid('p'), name: `Pièce ${rs.length + 1}`, l: 3.5, w: 3, h: 2.5, doors: 1, windows: 1, ceiling: true }])}>Ajouter une pièce</Button>
          <Choice label="Couches de finition" value={coats} onChange={setCoats} options={[1, 2, 3].map((c) => ({ value: c, label: `${c} couche${c > 1 ? 's' : ''}` }))} />
          <div className="grid grid-cols-2 items-end gap-3">
            <NumField label="Rendement de la peinture" value={yieldWall} onChange={setYield} suffix="m²/L" hint="Voir le pot : 10 à 12 en général" min={4} />
            <label className="flex min-h-[44px] items-center justify-between gap-2 rounded-[10px] border border-line px-3"><span className="text-[13px]">Sous-couche</span><Switch checked={primer} onChange={setPrimer} label="Sous-couche" /></label>
          </div>
        </>
      }
      hero={{ label: 'Peinture de finition', value: `${n1(total)} L`, sub: `Murs ${n1(walls)} m² · plafonds ${n1(ceilings)} m² · ${coats} couche${coats > 1 ? 's' : ''}` }}
      formulas={[
        'Murs : périmètre × hauteur − portes (1,7 m²) − fenêtres (1,5 m²).',
        'Litres = surface × couches / rendement. Plafond : rendement réduit de 1 m²/L (on charge plus le rouleau).',
        'Pots : combinaison de 10 L et 2,5 L avec 5 % de marge.',
      ]}
      refs={['DTU 59.1 (travaux de peinture)']}
      lines={[
        { designation: 'Préparation des supports (rebouchage, ponçage)', quantity: Math.round(walls + ceilings), unit: 'm²', unitPriceHt: 6, unitCostHt: 0.8 },
        ...(primer ? [{ designation: 'Sous-couche d’impression', quantity: Math.round(walls + ceilings), unit: 'm²', unitPriceHt: 5.5, unitCostHt: 1.2 }] : []),
        { designation: `Peinture murs acrylique velours, ${coats} couches`, quantity: Math.round(walls), unit: 'm²', unitPriceHt: 12 + coats * 6, unitCostHt: 3 + coats * 1.5 },
        { designation: `Peinture plafonds mate, ${coats} couches`, quantity: Math.round(ceilings), unit: 'm²', unitPriceHt: 15 + coats * 6.5, unitCostHt: 3.5 + coats * 1.5 },
      ]}
      quoteTitle="Peinture"
    >
      <ResultRow label="Murs" value={`${n1(wallL)} L`} sub={`${pw.big} pot${pw.big > 1 ? 's' : ''} de 10 L${pw.small ? ` + ${pw.small} de 2,5 L` : ''}`} />
      <ResultRow label="Plafonds" value={`${n1(ceilL)} L`} sub={`${pc.big} pot${pc.big > 1 ? 's' : ''} de 10 L${pc.small ? ` + ${pc.small} de 2,5 L` : ''}`} />
      {primer && <ResultRow label="Sous-couche" value={`${n1(primerL)} L`} sub="1 couche, environ 9 m²/L" />}
      <ResultRow label="Surface totale" value={`${n1(walls + ceilings)} m²`} strong />
    </ToolLayout>
  );
}
