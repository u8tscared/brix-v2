import { useState } from 'react';
import { pct } from '@/lib/format';
import { Choice, Note, NumField, ResultRow, n1 } from '../components/fields';
import { ToolLayout } from '../components/ToolLayout';
import { cablePrice, fmtS, sizeCable, type Phase } from '../calc/electric';

const POWERS: { kw: number; phase: Phase; amps: number; label: string }[] = [
  { kw: 3.7, phase: 'mono', amps: 16, label: '3,7 kW mono' },
  { kw: 7.4, phase: 'mono', amps: 32, label: '7,4 kW mono' },
  { kw: 11, phase: 'tri', amps: 16, label: '11 kW tri' },
  { kw: 22, phase: 'tri', amps: 32, label: '22 kW tri' },
];
const PRICE: Record<number, number> = { 3.7: 790, 7.4: 1180, 11: 1490, 22: 1890 };

export default function Irve() {
  const [idx, setIdx] = useState(1);
  const [length, setLength] = useState(18);
  const [kva, setKva] = useState(9);
  const [dc, setDc] = useState<'oui' | 'non'>('oui');
  const [pilot, setPilot] = useState<'oui' | 'non'>('oui');
  const p = POWERS[idx];
  // La borne tire son courant nominal en continu : on dimensionne sur le calibre de la borne.
  const watts = p.phase === 'mono' ? p.amps * 230 : p.amps * 400 * Math.sqrt(3);
  const r = sizeCable({ powerW: watts * 0.999, length, metal: 'cuivre', phase: p.phase, pose: 'B', cosPhi: 1, limitPct: 5, minSection: p.amps >= 32 ? 6 : 2.5 });
  const subscribedOk = p.phase === 'tri' ? kva >= 12 : kva >= p.kw + 3;
  const conductors = p.phase === 'mono' ? '3G' : '5G';
  const hours = 5 + Math.ceil(length / 10);

  return (
    <ToolLayout
      tool="irve"
      inputs={
        <>
          <Choice label="Puissance de la borne" value={idx} onChange={setIdx} options={POWERS.map((x, i) => ({ value: i, label: x.label }))} />
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Distance tableau-borne" value={length} onChange={setLength} suffix="m" />
            <NumField label="Abonnement actuel" value={kva} onChange={setKva} suffix="kVA" />
          </div>
          <Choice label="La borne détecte les fuites continues (6 mA DC) ?" value={dc} onChange={setDc} options={[{ value: 'oui', label: 'Oui (la plupart)' }, { value: 'non', label: 'Non' }]} />
          <Choice label="Pilotage de la charge (heures creuses, délestage)" value={pilot} onChange={setPilot} options={[{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }]} />
        </>
      }
      hero={{ label: 'Câble à poser', value: `${conductors}${fmtS(r.section)} mm²`, sub: `Disjoncteur ${p.amps} A courbe C · chute de tension ${pct(r.drop, 2)}` }}
      formulas={[
        `Courant nominal : ${p.amps} A ${p.phase === 'mono' ? 'en monophasé' : 'par phase en triphasé'}, en continu pendant des heures : le circuit est dédié.`,
        'Section : la plus grosse entre l’échauffement (Iz ≥ In) et la chute de tension (5 % max), 6 mm² minimum pour 32 A.',
        'Différentiel 30 mA : type A si la borne détecte les fuites continues, sinon type B.',
        'Au-delà de 3,7 kW, l’installateur doit être qualifié IRVE.',
      ]}
      refs={['NF C 15-100 section 722', 'Guide UTE C 15-722', 'Décret 2017-26 (qualification IRVE)', 'Article 200 quater C du CGI (crédit d’impôt)']}
      lines={[
        { designation: `Borne de recharge ${p.label}${pilot === 'oui' ? ' pilotable' : ''}`, quantity: 1, unit: 'u', unitPriceHt: PRICE[p.kw] + (pilot === 'oui' ? 90 : 0), unitCostHt: Math.round(PRICE[p.kw] * 0.67) },
        { designation: `Câble R2V ${conductors}${fmtS(r.section)} mm²`, quantity: Math.ceil(length * 1.1), unit: 'm', unitPriceHt: cablePrice(r.section, p.phase, 'cuivre') },
        { designation: `Disjoncteur ${p.amps} A courbe C${p.phase === 'tri' ? ' tétrapolaire' : ''}`, quantity: 1, unit: 'u', unitPriceHt: p.phase === 'tri' ? 68 : 19.9 },
        { designation: `Interrupteur différentiel 40 A 30 mA type ${dc === 'oui' ? 'A' : 'B'}`, quantity: 1, unit: 'u', unitPriceHt: dc === 'oui' ? 96 : 420 },
        { designation: 'Pose, mise en service et déclaration IRVE', quantity: hours, unit: 'h', unitPriceHt: 60 },
      ]}
      quoteTitle={`Borne de recharge ${p.label}`}
    >
      <ResultRow label="Courant d’emploi" value={`${n1(r.I)} A`} />
      <ResultRow label="Protection" value={`${p.amps} A courbe C`} />
      <ResultRow label="Différentiel 30 mA" value={dc === 'oui' ? 'Type A' : 'Type B'} tone={dc === 'oui' ? undefined : 'warn'} />
      <ResultRow label="Câble" value={`R2V ${conductors}${fmtS(r.section)} mm²`} strong />
      <ResultRow label="Temps de charge 50 kWh" value={`environ ${n1(50 / p.kw)} h`} sub="batterie moyenne, de 20 à 80 % ≈ la moitié" />
      <div className="mt-3 space-y-2">
        {!subscribedOk && <Note tone="warn">Abonnement de {kva} kVA un peu juste pour une borne de {String(p.kw).replace('.', ',')} kW : prévoir le pilotage{pilot === 'oui' ? ' (prévu)' : ''} ou passer à {p.phase === 'tri' ? '12' : Math.ceil(p.kw + 3)} kVA.</Note>}
        {p.kw > 3.7 && <Note>Pose réservée à un installateur qualifié IRVE. Particulier : crédit d’impôt de 75 %, 500 € au plus par borne.</Note>}
        {p.phase === 'tri' && <Note>Borne triphasée : vérifiez que le logement est raccordé en triphasé.</Note>}
      </div>
    </ToolLayout>
  );
}
