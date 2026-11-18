import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button, Input, Select } from '@/components/ui';
import { uid } from '@/lib/format';
import { Note, NumField, ResultRow, n1 } from '../components/fields';
import { ToolLayout } from '../components/ToolLayout';

interface Room { id: string; name: string; surface: number; height: number; insul: number; sun: number; people: number }
const UNITS = [2.0, 2.5, 3.5, 4.2, 5.0, 7.0];

/** Puissance froid (W) : volume × coefficient d'isolation × exposition + apports des occupants au-delà de 2. */
const need = (r: Room) => r.surface * r.height * r.insul * r.sun + Math.max(0, r.people - 2) * 100;

export default function Clim() {
  const [rooms, setRooms] = useState<Room[]>([
    { id: 'c1', name: 'Séjour', surface: 32, height: 2.5, insul: 35, sun: 1.15, people: 4 },
    { id: 'c2', name: 'Chambre', surface: 12, height: 2.5, insul: 35, sun: 1, people: 2 },
  ]);
  const upd = (id: string, p: Partial<Room>) => setRooms((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const res = rooms.map((r) => {
    const w = need(r);
    return { r, w, unit: UNITS.find((u) => u * 1000 >= w) ?? 7 };
  });
  const total = res.reduce((x, y) => x + y.w, 0);
  const multi = rooms.length > 1;
  const outdoor = Math.ceil((res.reduce((x, y) => x + y.unit, 0) * 0.8) * 2) / 2; // foisonnement 80 %

  return (
    <ToolLayout
      tool="clim"
      inputs={
        <>
          {rooms.map((r) => (
            <div key={r.id} className="rounded-card-sm bg-white p-3.5 shadow-halo-sm">
              <div className="mb-2 flex items-center gap-2">
                <Input value={r.name} onChange={(e) => upd(r.id, { name: e.target.value })} className="h-9 flex-1 font-medium" aria-label="Pièce" />
                <button onClick={() => setRooms((rs) => rs.filter((x) => x.id !== r.id))} className="grid h-9 w-9 place-items-center rounded-full text-ink-3 transition-colors hover:bg-pale-r hover:text-deep-r" aria-label="Retirer"><X className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <NumField label="Surface" value={r.surface} onChange={(v) => upd(r.id, { surface: v })} suffix="m²" />
                <NumField label="Hauteur" value={r.height} onChange={(v) => upd(r.id, { height: v })} suffix="m" />
                <NumField label="Personnes" value={r.people} onChange={(v) => upd(r.id, { people: Math.round(v) })} />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Select value={r.insul} onChange={(e) => upd(r.id, { insul: Number(e.target.value) })} aria-label="Isolation">
                  <option value={30}>Bien isolé</option>
                  <option value={35}>Isolation moyenne</option>
                  <option value={42}>Peu isolé, combles</option>
                </Select>
                <Select value={r.sun} onChange={(e) => upd(r.id, { sun: Number(e.target.value) })} aria-label="Exposition">
                  <option value={1}>Peu de soleil</option>
                  <option value={1.15}>Plein sud, baies vitrées</option>
                </Select>
              </div>
            </div>
          ))}
          <Button size="sm" variant="ghost" icon={<Plus className="h-4 w-4" />} onClick={() => setRooms((rs) => [...rs, { id: uid('c'), name: `Pièce ${rs.length + 1}`, surface: 12, height: 2.5, insul: 35, sun: 1, people: 2 }])}>Ajouter une pièce</Button>
        </>
      }
      hero={{ label: 'Puissance froid totale', value: total / 1000, decimals: 1, unit: 'kW', sub: multi ? `Multisplit : unité extérieure d’environ ${n1(outdoor)} kW` : `Monosplit ${res[0] ? String(res[0].unit).replace('.', ',') : '–'} kW` }}
      formulas={[
        'Puissance froid = volume × coefficient (30 W/m³ bien isolé, 35 moyen, 42 peu isolé) × exposition (+15 % plein sud) + 100 W par personne au-delà de 2.',
        'On prend l’unité intérieure standard juste au-dessus. En multisplit, l’unité extérieure couvre environ 80 % de la somme (toutes les pièces ne tournent pas à fond en même temps).',
        'Manipulation des fluides frigorigènes : attestation de capacité obligatoire.',
      ]}
      refs={['Règlement F-Gas (UE) 2024/573', 'Code de l’environnement R543-99']}
      lines={[
        ...res.map(({ r, unit }) => ({ designation: `Unité intérieure murale ${String(unit).replace('.', ',')} kW · ${r.name}`, quantity: 1, unit: 'u', unitPriceHt: 420 + unit * 90, unitCostHt: 260 + unit * 55 })),
        { designation: multi ? `Unité extérieure multisplit ${n1(outdoor)} kW R32` : 'Unité extérieure monosplit R32', quantity: 1, unit: 'u', unitPriceHt: multi ? 1300 + outdoor * 180 : 900, unitCostHt: multi ? 850 + outdoor * 120 : 580 },
        { designation: 'Liaisons frigorifiques, goulottes et évacuation des condensats', quantity: rooms.length, unit: 'forfait', unitPriceHt: 260, unitCostHt: 90 },
        { designation: 'Pose, tirage au vide et mise en service', quantity: 4 + rooms.length * 3, unit: 'h', unitPriceHt: 0 },
      ]}
      quoteTitle="Climatisation"
    >
      {res.map(({ r, w, unit }) => <ResultRow key={r.id} label={r.name} value={`${String(unit).replace('.', ',')} kW`} sub={`besoin ${n1(w / 1000)} kW · ${r.surface} m²`} />)}
      {total > 12000 && <div className="mt-2"><Note>Au-delà de 12 kW, envisagez un système gainable ou plusieurs unités extérieures.</Note></div>}
    </ToolLayout>
  );
}
