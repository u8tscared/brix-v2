import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button, Select, Switch } from '@/components/ui';
import { uid } from '@/lib/format';
import { NumField, ResultRow } from '../components/fields';
import { ToolLayout } from '../components/ToolLayout';
import { ROOM_LABEL, buildCircuits, type Extras, type Room, type RoomType } from '../calc/nfc';

const START: Room[] = [
  { id: 'r1', type: 'sejour', surface: 26 },
  { id: 'r2', type: 'cuisine', surface: 9 },
  { id: 'r3', type: 'chambre', surface: 11 },
  { id: 'r4', type: 'chambre', surface: 10 },
  { id: 'r5', type: 'sdb', surface: 5 },
  { id: 'r6', type: 'wc', surface: 1.5 },
  { id: 'r7', type: 'entree', surface: 6 },
];

const EXTRAS: { key: keyof Omit<Extras, 'chauffage'>; label: string }[] = [
  { key: 'lavelinge', label: 'Lave-linge' },
  { key: 'secheLinge', label: 'Sèche-linge' },
  { key: 'chauffeEau', label: 'Chauffe-eau électrique' },
  { key: 'congelateur', label: 'Congélateur' },
  { key: 'vmc', label: 'VMC' },
  { key: 'volets', label: 'Volets roulants' },
];

export default function Nfc15100() {
  const [rooms, setRooms] = useState<Room[]>(START);
  const [ex, setEx] = useState<Extras>({ lavelinge: true, secheLinge: false, chauffeEau: true, congelateur: false, vmc: true, volets: false, chauffage: 0 });
  const r = buildCircuits(rooms, ex);
  const upd = (id: string, p: Partial<Room>) => setRooms((rs) => rs.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const breakers = r.circuits.reduce<Record<number, number>>((m, c) => ({ ...m, [c.amps]: (m[c.amps] ?? 0) + 1 }), {});

  return (
    <ToolLayout
      tool="nfc15100"
      inputs={
        <>
          <div>
            <div className="mb-2 text-[12.5px] font-medium text-ink-2">Pièces du logement</div>
            <div className="space-y-2">
              {rooms.map((room) => (
                <div key={room.id} className="grid grid-cols-[1fr_108px_40px] items-end gap-2">
                  <Select value={room.type} onChange={(e) => upd(room.id, { type: e.target.value as RoomType })} aria-label="Type de pièce">
                    {(Object.keys(ROOM_LABEL) as RoomType[]).map((k) => <option key={k} value={k}>{ROOM_LABEL[k]}</option>)}
                  </Select>
                  <NumField label="" value={room.surface} onChange={(v) => upd(room.id, { surface: v })} suffix="m²" />
                  <button onClick={() => setRooms((rs) => rs.filter((x) => x.id !== room.id))} className="grid h-11 w-10 place-items-center rounded-full text-ink-3 transition-colors hover:bg-pale-r hover:text-deep-r" aria-label="Retirer"><X className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
            <Button size="sm" variant="ghost" className="mt-2" icon={<Plus className="h-4 w-4" />} onClick={() => setRooms((rs) => [...rs, { id: uid('r'), type: 'chambre', surface: 10 }])}>Ajouter une pièce</Button>
          </div>
          <div>
            <div className="mb-2 text-[12.5px] font-medium text-ink-2">Équipements</div>
            <div className="grid gap-2 2xl:grid-cols-2">
              {EXTRAS.map((e) => (
                <label key={e.key} className="flex min-h-[44px] items-center justify-between gap-2 rounded-card-sm bg-white px-3.5 shadow-halo-sm">
                  <span className="text-[13px]">{e.label}</span>
                  <Switch checked={ex[e.key]} onChange={(v) => setEx({ ...ex, [e.key]: v })} label={e.label} />
                </label>
              ))}
            </div>
          </div>
          <NumField label="Chauffage électrique total" value={ex.chauffage} onChange={(v) => setEx({ ...ex, chauffage: v })} suffix="W" hint="0 si pas de chauffage électrique. 4 500 W maximum par circuit." />
        </>
      }
      hero={{ label: 'À prévoir au minimum', value: r.prises, unit: 'prises', sub: `${r.lumieres} points lumineux · ${r.rj45} prises RJ45 · ${r.circuits.length} circuits · ${r.rows} rangée${r.rows > 1 ? 's' : ''} de tableau` }}
      formulas={[
        'Séjour : 5 prises (7 au-delà de 28 m²). Chambre : 3. Cuisine : 6 dont 4 sur le plan de travail (3 si 4 m² ou moins). Entrée, garage : 1.',
        'Une prise RJ45 par pièce principale, un point lumineux par pièce.',
        'Circuits prises : 8 prises au plus en 2,5 mm² / 20 A (règle la plus prudente). Éclairage : 8 points au plus en 1,5 mm² / 16 A.',
        'Différentiels 30 mA : 1 jusqu’à 35 m², 2 jusqu’à 100 m², 3 au-delà, plus un type A pour la plaque et le lave-linge ; 8 circuits au plus par différentiel.',
        'Tableau : 13 modules par rangée, avec 20 % de réserve.',
      ]}
      refs={['NF C 15-100 partie 10-1', 'Amendement A5', 'Guide Promotelec']}
      lines={[
        { designation: 'Prise 2P+T 16 A', quantity: r.prises, unit: 'u', unitPriceHt: 24.5, unitCostHt: 12.8 },
        { designation: 'Point lumineux DCL', quantity: r.lumieres, unit: 'u', unitPriceHt: 34, unitCostHt: 14 },
        { designation: 'Prise RJ45 catégorie 6A', quantity: r.rj45, unit: 'u', unitPriceHt: 46, unitCostHt: 21 },
        ...Object.entries(breakers).map(([a, q]) => ({ designation: `Disjoncteur ${a} A courbe C`, quantity: q, unit: 'u', unitPriceHt: Number(a) >= 32 ? 19.9 : 11.2 })),
        { designation: `Interrupteur différentiel ${r.diffs.amps} A 30 mA type A`, quantity: r.diffs.general + r.diffs.typeA, unit: 'u', unitPriceHt: 64.9, unitCostHt: 44.2 },
        { designation: `Coffret ${r.rows} rangée${r.rows > 1 ? 's' : ''} 13 modules`, quantity: 1, unit: 'u', unitPriceHt: 38 + r.rows * 30 },
        { designation: 'Pose, raccordement et essais', quantity: Math.round(r.prises * 0.5 + r.lumieres * 0.6 + r.rj45 * 0.6 + r.circuits.length * 0.4 + 4), unit: 'h', unitPriceHt: 0 },
      ]}
      quoteTitle="Installation électrique NF C 15-100"
    >
      <ResultRow label="Surface totale" value={`${r.area.toLocaleString('fr-FR')} m²`} />
      <ResultRow label="Différentiels 30 mA" value={`${r.diffs.general + r.diffs.typeA} × ${r.diffs.amps} A`} sub={`dont ${r.diffs.typeA} type A dédié plaque et lave-linge`} />
      <ResultRow label="Modules occupés" value={`${r.modules}`} sub={`${r.rows} rangée${r.rows > 1 ? 's' : ''} avec réserve`} />
      <div className="mt-3 space-y-1.5">
        {r.needs.map(({ r: room, n }) => (
          <div key={room.id} className="rounded-card-sm bg-halo-track/70 px-3.5 py-2.5 text-[12.5px]">
            <div className="flex justify-between font-medium"><span>{ROOM_LABEL[room.type]} · {room.surface.toLocaleString('fr-FR')} m²</span><span className="num">{n.prises} PC · {n.lumieres} PL{n.rj45 ? ` · ${n.rj45} RJ45` : ''}</span></div>
            {(n.note || n.dedicated.length > 0) && <div className="mt-0.5 text-ink-2">{[n.dedicated.map((d) => `${d.label} ${d.amps} A`).join(', '), n.note].filter(Boolean).join(' · ')}</div>}
          </div>
        ))}
      </div>
      <div className="mt-3 text-[12.5px] font-medium text-ink-2">Circuits</div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {r.circuits.map((c, i) => <span key={i} className="rounded-pill bg-pale-a px-2.5 py-1 text-[12px] font-medium text-deep-a">{c.label} · {c.amps} A{c.count ? ` · ${c.count}` : ''}</span>)}
      </div>
    </ToolLayout>
  );
}
