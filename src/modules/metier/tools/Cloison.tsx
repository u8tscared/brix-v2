import { useState } from 'react';
import { Choice, NumField, ResultRow, n1 } from '../components/fields';
import { ToolLayout } from '../components/ToolLayout';

const PLATE_W = 1.2;
const LENGTHS = [2.5, 2.6, 2.7, 2.8, 3.0];

export default function Cloison() {
  const [len, setLen] = useState(6);
  const [h, setH] = useState(2.5);
  const [doors, setDoors] = useState(1);
  const [spacing, setSpacing] = useState(0.6);
  const [layers, setLayers] = useState(1);
  const [insul, setInsul] = useState(true);
  const [faces, setFaces] = useState(2);

  const plateL = LENGTHS.find((x) => x >= h) ?? 3;
  const tooHigh = h > 3;
  const doorArea = doors * 0.83 * 2.04;
  const area = Math.max(0, len * h - doorArea);
  const perFace = Math.ceil(len / PLATE_W) * (tooHigh ? Math.ceil(h / 2.5) : 1);
  const plates = Math.ceil(perFace * faces * layers - (doors * faces * layers) / 2);
  const rails = Math.ceil((2 * len) / 3); // rails de 3 m, haut et bas
  const studs = Math.ceil(len / spacing) + 1 + doors * 2;
  const screws = Math.ceil(plates * 30);
  const jointLen = ((Math.ceil(len / PLATE_W) - 1) * h + (tooHigh ? len : 0)) * faces + doors * 5 * faces;
  const tape = Math.ceil(jointLen * 1.1);
  const filler = Math.ceil(area * faces * 0.4);
  const label = layers === 1 ? '72/48' : '98/48';

  return (
    <ToolLayout
      tool="cloison"
      inputs={
        <>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Longueur de cloison" value={len} onChange={setLen} suffix="m" />
            <NumField label="Hauteur" value={h} onChange={setH} suffix="m" />
            <NumField label="Portes" value={doors} onChange={(v) => setDoors(Math.round(v))} />
          </div>
          <Choice label="Type" value={layers} onChange={setLayers} options={[{ value: 1, label: '72/48 (1 plaque par face)' }, { value: 2, label: '98/48 (2 plaques par face)' }]} />
          <Choice label="Entraxe des montants" value={spacing} onChange={setSpacing} options={[{ value: 0.6, label: '60 cm' }, { value: 0.4, label: '40 cm (carrelage, charges)' }]} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Choice label="Faces" value={faces} onChange={setFaces} options={[{ value: 2, label: 'Cloison (2 faces)' }, { value: 1, label: 'Doublage (1 face)' }]} />
            <Choice label="Isolant 45 mm" value={insul ? 1 : 0} onChange={(v) => setInsul(v === 1)} options={[{ value: 1, label: 'Oui' }, { value: 0, label: 'Non' }]} />
          </div>
        </>
      }
      hero={{ label: 'Plaques BA13', value: `${plates} plaques`, sub: `1,20 × ${String(plateL).replace('.', ',')} m · ${n1(area)} m² de cloison ${label}` }}
      formulas={[
        'Plaques : nombre de largeurs de 1,20 m × faces × couches, moins une demi-plaque par porte et par face.',
        'Rails : 2 × longueur, en barres de 3 m. Montants : longueur / entraxe + 1, plus 2 par porte.',
        'Vis TTPC : environ 30 par plaque (une tous les 30 cm sur chaque montant).',
        'Bandes : longueur des joints verticaux + tour des portes, + 10 %. Enduit : 0,4 kg/m² par face.',
      ]}
      refs={['DTU 25.41 (ouvrages en plaques de plâtre)', 'Documentation Placo / Knauf']}
      lines={[
        { designation: `Cloison ${label} sur ossature métallique${insul ? ', isolant 45 mm' : ''}`, quantity: Math.round(area * 10) / 10, unit: 'm²', unitPriceHt: (layers === 1 ? 48 : 64) + (insul ? 6 : 0), unitCostHt: (layers === 1 ? 16 : 24) + (insul ? 3 : 0) },
        { designation: 'Bandes et enduit, finition prête à peindre', quantity: Math.round(area * faces * 10) / 10, unit: 'm²', unitPriceHt: 9, unitCostHt: 1.5 },
        ...(doors ? [{ designation: 'Renfort et huisserie de porte', quantity: doors, unit: 'u', unitPriceHt: 65, unitCostHt: 22 }] : []),
      ]}
      quoteTitle={`Cloison ${label}`}
    >
      <ResultRow label="Rails R48 (3 m)" value={`${rails}`} />
      <ResultRow label={`Montants M48 (${String(plateL).replace('.', ',')} m)`} value={`${studs}`} />
      <ResultRow label="Vis TTPC 25" value={`${screws}`} sub={`${Math.ceil(screws / 1000)} boîte${screws > 1000 ? 's' : ''} de 1 000`} />
      <ResultRow label="Bande à joint" value={`${tape} m`} sub={`${Math.ceil(tape / 150)} rouleau${tape > 150 ? 'x' : ''} de 150 m`} />
      <ResultRow label="Enduit" value={`${filler} kg`} sub={`${Math.ceil(filler / 25)} sac${filler > 25 ? 's' : ''} de 25 kg`} />
      {insul && <ResultRow label="Isolant 45 mm" value={`${n1(area * 1.05)} m²`} />}
    </ToolLayout>
  );
}
