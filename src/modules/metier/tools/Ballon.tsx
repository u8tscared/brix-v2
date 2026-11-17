import { useState } from 'react';
import { Choice, Note, NumField, ResultRow, n1, Gauge } from '../components/fields';
import { Tank } from '../components/diagrams';
import { ToolLayout } from '../components/ToolLayout';

const SIZES = [50, 75, 100, 150, 200, 250, 300];
const PRICE: Record<number, number> = { 50: 320, 75: 390, 100: 450, 150: 560, 200: 690, 250: 820, 300: 940 };

export default function Ballon() {
  const [people, setPeople] = useState(4);
  const [bath, setBath] = useState<'douche' | 'bain'>('douche');
  const [power, setPower] = useState(2200);
  const [kind, setKind] = useState<'electrique' | 'thermo'>('electrique');
  // Besoin à 60 °C : 50 L par personne avec douches, 70 L avec bains (minimum 50 L).
  const need = Math.max(50, people * (bath === 'bain' ? 70 : 50));
  const size = SIZES.find((s) => s >= need) ?? 300;
  const energy = size * 1.163 * (60 - 12); // Wh pour chauffer de 12 à 60 °C
  const hours = energy / power;
  const thermoPrice = 1600 + size * 6;

  return (
    <ToolLayout
      tool="ballon"
      inputs={
        <>
          <NumField label="Personnes dans le foyer" value={people} onChange={setPeople} min={1} max={12} />
          <Choice label="Habitudes" value={bath} onChange={setBath} options={[{ value: 'douche', label: 'Surtout des douches' }, { value: 'bain', label: 'Des bains réguliers' }]} />
          <Choice label="Type" value={kind} onChange={setKind} options={[{ value: 'electrique', label: 'Électrique classique' }, { value: 'thermo', label: 'Thermodynamique' }]} />
          {kind === 'electrique' && <Choice label="Puissance de la résistance" value={power} onChange={setPower} options={[1200, 1800, 2200, 3000].map((p) => ({ value: p, label: `${p} W` }))} />}
        </>
      }
      hero={{ label: 'Volume conseillé', value: size, unit: 'litres', sub: `Besoin estimé : ${need} L d’eau à 60 °C par jour` }}
      visual={
        <div className="flex items-center gap-5">
          <Tank liters={size} />
          <div className="min-w-0 flex-1 space-y-3">
            <Gauge label="Besoin du foyer" value={need} max={size} unit=" L" format={(x) => String(Math.round(x))} />
            {kind === 'electrique' && <Gauge label="Temps de chauffe" value={hours} max={12} limit={8} unit=" h" />}
          </div>
        </div>
      }
      formulas={[
        'Besoin : environ 50 L à 60 °C par personne et par jour avec des douches, 70 L avec des bains.',
        'Temps de chauffe : volume × 1,163 × (60 − 12) / puissance, en heures (eau froide à 12 °C).',
        'Un ballon trop grand chauffe pour rien ; trop petit, la dernière douche est froide.',
      ]}
      refs={['NF EN 50440', 'Guide ADEME eau chaude sanitaire']}
      lines={[
        kind === 'electrique'
          ? { designation: `Chauffe-eau électrique ${size} L vertical, résistance stéatite`, quantity: 1, unit: 'u', unitPriceHt: PRICE[size], unitCostHt: Math.round(PRICE[size] * 0.62) }
          : { designation: `Chauffe-eau thermodynamique ${Math.max(150, size)} L`, quantity: 1, unit: 'u', unitPriceHt: thermoPrice, unitCostHt: Math.round(thermoPrice * 0.65), vatRate: 5.5 },
        { designation: 'Groupe de sécurité, raccords diélectriques, siphon', quantity: 1, unit: 'forfait', unitPriceHt: 85 },
        { designation: 'Dépose de l’ancien, pose et mise en service', quantity: kind === 'electrique' ? 4 : 7, unit: 'h', unitPriceHt: 0 },
      ]}
      quoteTitle="Chauffe-eau"
    >
      <ResultRow label="Énergie pour une chauffe complète" value={`${n1(energy / 1000)} kWh`} />
      {kind === 'electrique' ? (
        <ResultRow label="Temps de chauffe" value={`${n1(hours)} h`} tone={hours > 8 ? 'warn' : 'ok'} sub="sur les heures creuses (8 h)" />
      ) : (
        <ResultRow label="Consommation" value="environ 3 fois moins" sub="qu’un ballon électrique classique" />
      )}
      {kind === 'electrique' && hours > 8 && <div className="mt-2"><Note tone="warn">Plus de 8 h de chauffe : passez à une résistance plus puissante ou un ballon plus petit.</Note></div>}
      {kind === 'thermo' && <div className="mt-2"><Note>Thermodynamique : TVA 5,5 % et aides possibles (pose RGE). 150 L minimum.</Note></div>}
    </ToolLayout>
  );
}
