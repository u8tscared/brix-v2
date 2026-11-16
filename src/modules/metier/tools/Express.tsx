import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { money } from '@/lib/format';
import { Choice, Note, ResultRow } from '../components/fields';
import { ToolLayout } from '../components/ToolLayout';

const ITEMS = [
  { key: 'claquee', label: 'Ouverture de porte claquée', price: 95, cost: 0 },
  { key: 'fermee', label: 'Ouverture de porte fermée à clé', price: 160, cost: 0 },
  { key: 'cylindre', label: 'Remplacement de cylindre européen', price: 89, cost: 38 },
  { key: 'serrure3', label: 'Serrure 3 points A2P*', price: 420, cost: 210 },
  { key: 'verrou', label: 'Pose de verrou de sûreté', price: 140, cost: 55 },
  { key: 'cles', label: 'Reproduction de clé de sécurité', price: 35, cost: 14 },
  { key: 'mise', label: 'Mise en sécurité provisoire', price: 120, cost: 30 },
] as const;
type Key = (typeof ITEMS)[number]['key'];

export default function Express() {
  const [q, setQ] = useState<Record<Key, number>>({ claquee: 1, fermee: 0, cylindre: 1, serrure3: 0, verrou: 0, cles: 2, mise: 0 });
  const [slot, setSlot] = useState<0 | 25 | 50 | 100>(0);
  const [travel, setTravel] = useState(39);
  const sub = ITEMS.reduce((x, i) => x + q[i.key] * i.price, 0);
  const surcharge = Math.round(((sub * slot) / 100) * 100) / 100;
  const ht = sub + surcharge + travel;
  const ttc = ht * 1.1; // TVA 10 % (logement de plus de 2 ans)
  const devisRequired = ttc > 150;

  return (
    <ToolLayout
      tool="express"
      inputs={
        <>
          <div className="space-y-2">
            {ITEMS.map((i) => (
              <div key={i.key} className="flex items-center gap-2 rounded-[10px] border border-line px-3 py-1.5">
                <span className="min-w-0 flex-1 text-[13px]">{i.label}<span className="block text-[11.5px] text-ink-3">{money(i.price)} HT</span></span>
                <button className="grid h-10 w-10 place-items-center rounded-lg bg-sub" aria-label="Moins" onClick={() => setQ({ ...q, [i.key]: Math.max(0, q[i.key] - 1) })}><Minus className="h-4 w-4" /></button>
                <span className="num w-6 text-center font-semibold">{q[i.key]}</span>
                <button className="grid h-10 w-10 place-items-center rounded-lg bg-sub" aria-label="Plus" onClick={() => setQ({ ...q, [i.key]: q[i.key] + 1 })}><Plus className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <Choice label="Moment de l’intervention" value={slot} onChange={setSlot} options={[{ value: 0, label: 'Heures ouvrées' }, { value: 25, label: 'Soir (+25 %)' }, { value: 50, label: 'Samedi (+50 %)' }, { value: 100, label: 'Nuit, dimanche (+100 %)' }]} />
          <Choice label="Déplacement" value={travel} onChange={setTravel} options={[{ value: 0, label: 'Offert' }, { value: 39, label: '39 € (ville)' }, { value: 59, label: '59 € (agglomération)' }]} />
        </>
      }
      hero={{ label: 'Total à annoncer', value: money(ttc), sub: `${money(ht)} HT · TVA 10 %` }}
      formulas={[
        'Total = prestations + majoration horaire + déplacement, TVA 10 % en logement de plus de 2 ans.',
        'Au-delà de 150 € TTC, un devis écrit est obligatoire avant l’intervention à domicile.',
        'Les tarifs (taux horaire, majorations, déplacement) doivent être affichés et annoncés avant de commencer.',
      ]}
      refs={['Arrêté du 24 janvier 2017 (dépannage à domicile)', 'Code de la consommation L112-1']}
      lines={[
        ...ITEMS.map((i) => ({ designation: i.label, quantity: q[i.key], unit: 'u', unitPriceHt: i.price, unitCostHt: i.cost, kind: 'ouvrage' as const })),
        ...(surcharge ? [{ designation: `Majoration ${slot === 25 ? 'soir' : slot === 50 ? 'samedi' : 'nuit ou dimanche'} (${slot} %)`, quantity: 1, unit: 'forfait', unitPriceHt: surcharge, unitCostHt: 0, kind: 'ouvrage' as const }] : []),
        ...(travel ? [{ designation: 'Déplacement', quantity: 1, unit: 'forfait', unitPriceHt: travel, unitCostHt: 8, kind: 'ouvrage' as const }] : []),
      ]}
      quoteTitle="Dépannage serrurerie"
    >
      <ResultRow label="Prestations" value={money(sub)} />
      {surcharge > 0 && <ResultRow label={`Majoration ${slot} %`} value={money(surcharge)} />}
      <ResultRow label="Déplacement" value={travel ? money(travel) : 'offert'} />
      <ResultRow label="Total TTC" value={money(ttc)} strong />
      <div className="mt-2">{devisRequired ? <Note tone="warn">Plus de 150 € TTC : faites signer le devis sur le téléphone avant de commencer.</Note> : <Note tone="ok">Moins de 150 € TTC : devis écrit seulement si le client le demande.</Note>}</div>
    </ToolLayout>
  );
}
