import { useState } from 'react';
import { Choice, Note, NumField, ResultRow, n1, n2 } from '../components/fields';
import { SplitBar, Stack } from '../components/diagrams';
import { ToolLayout } from '../components/ToolLayout';

type Shape = 'dalle' | 'semelle' | 'poteau';
// Dosage 350 kg/m³ (béton armé courant) : par m³ de béton en place
const MIX = { ciment: 350, sable: 680, gravier: 1175, eau: 175 };

export default function Beton() {
  const [shape, setShape] = useState<Shape>('dalle');
  const [a, setA] = useState(5);
  const [b, setB] = useState(4);
  const [c, setC] = useState(12);
  const [count, setCount] = useState(1);
  const [mode, setMode] = useState<'toupie' | 'sacs'>('toupie');
  // Dalle : L × l × épaisseur (cm). Semelle : L × largeur (cm) × hauteur (cm). Poteau : côté (cm) × côté (cm) × hauteur (m).
  const volume = (shape === 'dalle' ? a * b * (c / 100) : shape === 'semelle' ? a * (b / 100) * (c / 100) : (a / 100) * (b / 100) * c) * count;
  const v = volume * 1.05;
  const bags = Math.ceil((MIX.ciment * v) / 35);
  const readyBags = Math.ceil((v * 1000) / 17); // sac de béton prêt 35 kg ≈ 17 L
  const mesh = shape === 'dalle' ? Math.ceil((a * b * 1.15) / (2.4 * 6)) : 0; // treillis ST25C 2,40 × 6 m, recouvrement 15 %
  const steel = shape === 'semelle' ? Math.ceil(a * count * 4 * 1.1) : shape === 'poteau' ? Math.ceil(c * count * 4 * 1.1) : 0;

  return (
    <ToolLayout
      tool="beton"
      inputs={
        <>
          <Choice label="Ouvrage" value={shape} onChange={(s) => { setShape(s); if (s === 'dalle') { setA(5); setB(4); setC(12); } else if (s === 'semelle') { setA(12); setB(50); setC(35); } else { setA(20); setB(20); setC(2.5); } }} options={[{ value: 'dalle', label: 'Dalle' }, { value: 'semelle', label: 'Semelle filante' }, { value: 'poteau', label: 'Poteau' }]} />
          <div className="grid grid-cols-2 gap-3">
            {shape === 'dalle' && <><NumField label="Longueur" value={a} onChange={setA} suffix="m" /><NumField label="Largeur" value={b} onChange={setB} suffix="m" /><NumField label="Épaisseur" value={c} onChange={setC} suffix="cm" /></>}
            {shape === 'semelle' && <><NumField label="Longueur totale" value={a} onChange={setA} suffix="m" /><NumField label="Largeur" value={b} onChange={setB} suffix="cm" /><NumField label="Hauteur" value={c} onChange={setC} suffix="cm" /></>}
            {shape === 'poteau' && <><NumField label="Côté 1" value={a} onChange={setA} suffix="cm" /><NumField label="Côté 2" value={b} onChange={setB} suffix="cm" /><NumField label="Hauteur" value={c} onChange={setC} suffix="m" /></>}
            <NumField label="Nombre" value={count} onChange={(v2) => setCount(Math.max(1, Math.round(v2)))} min={1} />
          </div>
          <Choice label="Approvisionnement" value={mode} onChange={setMode} options={[{ value: 'toupie', label: 'Toupie ou bétonnière' }, { value: 'sacs', label: 'Sacs de béton prêt' }]} />
        </>
      }
      hero={{ label: 'Béton à prévoir', value: v, decimals: 2, unit: 'm³', sub: `${n2(volume)} m³ en place + 5 % de pertes` }}
      visual={
        mode === 'toupie' ? (
          <SplitBar parts={[
            { label: 'Ciment', value: MIX.ciment, color: '#6b7280', display: `${bags} sacs` },
            { label: 'Sable 0/4', value: MIX.sable, color: '#e7b864', display: `${n1((MIX.sable * v) / 1000)} t` },
            { label: 'Gravier 4/20', value: MIX.gravier, color: '#a8a29e', display: `${n1((MIX.gravier * v) / 1000)} t` },
          ]} />
        ) : (
          <Stack count={readyBags} max={40} label={`${readyBags} sacs de 35 kg, soit ${Math.round(readyBags * 35 / 1000 * 10) / 10} t à porter`} tone="#78716c" />
        )
      }
      formulas={[
        'Volume = longueur × largeur × épaisseur, converti en mètres.',
        'Dosage 350 kg/m³ pour du béton armé : 350 kg de ciment, 680 kg de sable 0/4, 1 175 kg de gravier 4/20, 175 L d’eau par m³.',
        'Treillis soudé ST25C (2,40 × 6 m) avec 15 % de recouvrement pour une dalle. Semelles et poteaux : 4 filants HA minimum.',
        'Sac de béton prêt de 35 kg : environ 17 litres de béton.',
      ]}
      refs={['NF EN 206/CN', 'DTU 13.1 (fondations superficielles)', 'DTU 13.3 (dallages)']}
      lines={[
        mode === 'toupie'
          ? { designation: 'Béton C25/30 livré en toupie', quantity: Math.ceil(v * 4) / 4, unit: 'm³', unitPriceHt: 185, unitCostHt: 120 }
          : { designation: 'Béton prêt à l’emploi, sac de 35 kg', quantity: readyBags, unit: 'u', unitPriceHt: 8.9, unitCostHt: 5.2 },
        ...(mesh ? [{ designation: 'Treillis soudé ST25C 2,40 × 6 m', quantity: mesh, unit: 'u', unitPriceHt: 39, unitCostHt: 24 }] : []),
        ...(steel ? [{ designation: 'Acier HA 10 (barres de 6 m)', quantity: Math.ceil(steel / 6), unit: 'u', unitPriceHt: 8.5, unitCostHt: 5 }] : []),
        { designation: shape === 'dalle' ? 'Coffrage, ferraillage et coulage de la dalle' : 'Coffrage, ferraillage et coulage', quantity: Math.max(3, Math.round(v * (shape === 'dalle' ? 4 : 7))), unit: 'h', unitPriceHt: 0 },
      ]}
      quoteTitle={shape === 'dalle' ? 'Dalle béton' : shape === 'semelle' ? 'Fondations' : 'Poteaux béton'}
    >
      {mode === 'sacs' ? (
        <ResultRow label="Sacs de béton prêt (35 kg)" value={`${readyBags}`} strong />
      ) : (
        <>
          <ResultRow label="Ciment (sacs de 35 kg)" value={`${bags}`} sub={`${Math.round(MIX.ciment * v)} kg`} />
          <ResultRow label="Sable 0/4" value={`${n1((MIX.sable * v) / 1000)} t`} />
          <ResultRow label="Gravier 4/20" value={`${n1((MIX.gravier * v) / 1000)} t`} />
          <ResultRow label="Eau" value={`${Math.round(MIX.eau * v)} L`} />
        </>
      )}
      {mesh > 0 && <ResultRow label="Treillis ST25C" value={`${mesh} panneaux`} />}
      {steel > 0 && <ResultRow label="Acier HA 10" value={`${steel} m`} sub={`${Math.ceil(steel / 6)} barres de 6 m`} />}
      {mode === 'sacs' && readyBags > 60 && <div className="mt-2"><Note>Plus d’un mètre cube : une toupie revient moins cher et fatigue moins l’équipe.</Note></div>}
    </ToolLayout>
  );
}
