import { useState } from 'react';
import { Choice, NumField, ResultRow, n1 } from '../components/fields';
import { ToolLayout } from '../components/ToolLayout';

export default function Gazon() {
  const [surface, setSurface] = useState(250);
  const [depth, setDepth] = useState(10);
  const [kind, setKind] = useState<'semis' | 'placage'>('semis');
  const [dose, setDose] = useState(35);
  const soil = (surface * depth) / 100; // m³
  const tons = soil * 1.4; // terre végétale foisonnée ≈ 1,4 t/m³
  const bigBags = Math.ceil(soil); // big bag ≈ 1 m³
  const seeds = (surface * dose) / 1000; // kg
  const rolls = Math.ceil(surface * 1.05); // rouleaux de 1 m²
  const fert = Math.ceil((surface * 40) / 1000); // engrais de fond 40 g/m²

  return (
    <ToolLayout
      tool="gazon"
      inputs={
        <>
          <NumField label="Surface à engazonner" value={surface} onChange={setSurface} suffix="m²" />
          <NumField label="Épaisseur de terre végétale" value={depth} onChange={setDepth} suffix="cm" hint="10 à 15 cm pour un beau gazon, 0 si la terre est bonne" />
          <Choice label="Méthode" value={kind} onChange={setKind} options={[{ value: 'semis', label: 'Semis' }, { value: 'placage', label: 'Gazon en rouleaux' }]} />
          {kind === 'semis' && <Choice label="Dose de semences" value={dose} onChange={setDose} options={[{ value: 25, label: 'Regarnissage 25 g/m²' }, { value: 35, label: 'Création 35 g/m²' }, { value: 45, label: 'Sport, terrain en pente 45 g/m²' }]} />}
        </>
      }
      hero={{ label: kind === 'semis' ? 'Semences' : 'Rouleaux de gazon', value: kind === 'semis' ? `${n1(seeds)} kg` : `${rolls} m²`, sub: `${n1(soil)} m³ de terre végétale (${n1(tons)} t)` }}
      formulas={[
        'Terre : surface × épaisseur. Une terre végétale pèse environ 1,4 tonne par m³.',
        'Semis : 25 à 45 g/m² selon l’usage. Placage : surface + 5 % de coupes.',
        'Engrais de fond : environ 40 g/m² avant semis ou placage.',
      ]}
      refs={['Fascicule 35 du CCTG (aménagements paysagers)', 'Règles professionnelles UNEP']}
      lines={[
        ...(soil > 0 ? [{ designation: 'Terre végétale criblée, livrée et régalée', quantity: Math.ceil(soil * 10) / 10, unit: 'm³', unitPriceHt: 68, unitCostHt: 32 }] : []),
        { designation: 'Préparation du sol (décompactage, nivellement, engrais de fond)', quantity: surface, unit: 'm²', unitPriceHt: 3.2, unitCostHt: 0.6 },
        kind === 'semis'
          ? { designation: `Semis de gazon ${dose} g/m², roulage et premier arrosage`, quantity: surface, unit: 'm²', unitPriceHt: 2.4, unitCostHt: 0.5 }
          : { designation: 'Gazon en rouleaux, fourniture et pose', quantity: rolls, unit: 'm²', unitPriceHt: 11.5, unitCostHt: 5.2 },
      ]}
      quoteTitle="Engazonnement"
    >
      <ResultRow label="Terre végétale" value={`${n1(soil)} m³`} sub={`${bigBags} big bag${bigBags > 1 ? 's' : ''} d’1 m³ ou ${n1(tons)} t en benne`} />
      {kind === 'semis' ? <ResultRow label="Semences" value={`${n1(seeds)} kg`} sub={`${Math.ceil(seeds / 5)} sac${seeds > 5 ? 's' : ''} de 5 kg`} /> : <ResultRow label="Rouleaux de 1 m²" value={`${rolls}`} />}
      <ResultRow label="Engrais de fond" value={`${fert} kg`} />
    </ToolLayout>
  );
}
