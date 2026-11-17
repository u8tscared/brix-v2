import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Choice, Note, NumField, ResultRow } from '../components/fields';
import { PipeSlope } from '../components/diagrams';
import { ToolLayout } from '../components/ToolLayout';

const APPS = [
  { key: 'lavabo', label: 'Lavabo', d: 32 },
  { key: 'bidet', label: 'Bidet', d: 32 },
  { key: 'douche', label: 'Douche', d: 40 },
  { key: 'baignoire', label: 'Baignoire', d: 40 },
  { key: 'evier', label: 'Évier', d: 40 },
  { key: 'lavelinge', label: 'Lave-linge', d: 40 },
  { key: 'lavevaisselle', label: 'Lave-vaisselle', d: 40 },
  { key: 'wc', label: 'WC', d: 100 },
] as const;
type AppKey = (typeof APPS)[number]['key'];
const PVC: Record<number, number> = { 32: 3.2, 40: 3.9, 50: 4.8, 63: 6.2, 80: 8.9, 100: 11.4 };

export default function Evacuation() {
  const [counts, setCounts] = useState<Record<AppKey, number>>({ lavabo: 1, bidet: 0, douche: 1, baignoire: 0, evier: 1, lavelinge: 1, lavevaisselle: 1, wc: 1 });
  const [length, setLength] = useState(8);
  const [slope, setSlope] = useState(2);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const eu = total - counts.wc; // eaux usées
  // Collecteur eaux usées (hors WC) : 40 jusqu'à 2 appareils, 50 jusqu'à 4, 63 au-delà (règle pratique DTU 60.11).
  const collecteurEU = eu <= 2 ? 40 : eu <= 4 ? 50 : 63;
  const collecteur = counts.wc ? 100 : collecteurEU;
  const minSlope = counts.wc ? 2 : 1;
  const drop = (slope * length).toFixed(0);
  const tooFlat = slope < minSlope;
  const tooSteep = slope > 4;

  return (
    <ToolLayout
      tool="evacuation"
      inputs={
        <>
          <div className="text-[12.5px] font-medium text-ink-2">Appareils raccordés</div>
          <div className="grid gap-2 2xl:grid-cols-2">
            {APPS.map((a) => (
              <div key={a.key} className="flex items-center justify-between gap-2 rounded-[10px] border border-line px-3 py-1.5">
                <span className="text-[13px]">{a.label} <span className="text-ink-3">· Ø {a.d}</span></span>
                <span className="flex items-center gap-1">
                  <button className="grid h-10 w-10 place-items-center rounded-lg bg-sub" aria-label={`${a.label} : un de moins`} onClick={() => setCounts({ ...counts, [a.key]: Math.max(0, counts[a.key] - 1) })}><Minus className="h-4 w-4" /></button>
                  <span className="num w-6 text-center text-[14px] font-semibold">{counts[a.key]}</span>
                  <button className="grid h-10 w-10 place-items-center rounded-lg bg-sub" aria-label={`${a.label} : un de plus`} onClick={() => setCounts({ ...counts, [a.key]: counts[a.key] + 1 })}><Plus className="h-4 w-4" /></button>
                </span>
              </div>
            ))}
          </div>
          <NumField label="Longueur du collecteur" value={length} onChange={setLength} suffix="m" />
          <Choice label="Pente" value={slope} onChange={setSlope} options={[1, 2, 3, 4].map((v) => ({ value: v, label: `${v} cm/m` }))} />
        </>
      }
      hero={{ label: 'Collecteur principal', value: collecteur, unit: 'mm de Ø', sub: `Dénivelé à prévoir : ${drop} cm sur ${length} m` }}
      visual={<PipeSlope slopePct={slope} diameter={collecteur} />}
      formulas={[
        'Lavabo et bidet : Ø 32. Douche, baignoire, évier, lave-linge, lave-vaisselle : Ø 40. WC : Ø 100 (80 possible en sortie directe courte).',
        'Collecteur eaux usées : Ø 40 jusqu’à 2 appareils, Ø 50 jusqu’à 4, Ø 63 au-delà. Dès qu’un WC est raccordé : Ø 100.',
        'Pente : 1 à 3 cm par mètre pour les eaux usées, 2 à 4 cm par mètre avec un WC. Trop plat, ça bouche ; trop pentu, l’eau part sans les solides.',
        'Ventilation primaire obligatoire en Ø 100 au-dessus du toit (ou clapet si autorisé).',
      ]}
      refs={['DTU 60.11 (NF P 40-202)', 'DTU 60.33 (PVC)']}
      lines={[
        ...APPS.filter((a) => counts[a.key] > 0).map((a) => ({ designation: `Raccordement évacuation ${a.label.toLowerCase()} PVC Ø ${a.d}`, quantity: counts[a.key], unit: 'u', unitPriceHt: a.d === 100 ? 95 : 48 })),
        { designation: `Tube PVC Ø ${collecteur} évacuation`, quantity: Math.ceil(length * 1.1), unit: 'm', unitPriceHt: PVC[collecteur] * 2.2, unitCostHt: PVC[collecteur] },
        { designation: 'Raccords, colliers et colle', quantity: 1, unit: 'forfait', unitPriceHt: 35 + total * 8 },
        { designation: 'Pose des évacuations', quantity: Math.max(2, Math.round(total * 0.8 + length * 0.2)), unit: 'h', unitPriceHt: 0 },
      ]}
      quoteTitle="Évacuations"
    >
      {APPS.filter((a) => counts[a.key] > 0).map((a) => (
        <ResultRow key={a.key} label={`${a.label}${counts[a.key] > 1 ? ` × ${counts[a.key]}` : ''}`} value={`Ø ${a.d} mm`} />
      ))}
      <ResultRow label="Collecteur eaux usées seules" value={`Ø ${collecteurEU} mm`} />
      <ResultRow label="Pente choisie" value={`${slope} cm/m`} tone={tooFlat || tooSteep ? 'warn' : 'ok'} sub={`minimum ${minSlope} cm/m`} />
      {tooFlat && <div className="mt-2"><Note tone="warn">Pente trop faible{counts.wc ? ' avec un WC' : ''} : visez au moins {minSlope} cm par mètre.</Note></div>}
      {tooSteep && <div className="mt-2"><Note tone="warn">Au-delà de 4 cm/m, les matières se séparent de l’eau : préférez une chute verticale.</Note></div>}
    </ToolLayout>
  );
}
