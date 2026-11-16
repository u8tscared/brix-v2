import { useState } from 'react';
import { Choice, Note, NumField, ResultRow, n1, n2 } from '../components/fields';
import { ToolLayout } from '../components/ToolLayout';

export default function Calepinage() {
  const [L, setL] = useState(4.2);
  const [W, setW] = useState(3.1);
  const [tl, setTl] = useState(60);
  const [tw, setTw] = useState(60);
  const [thick, setThick] = useState(9);
  const [joint, setJoint] = useState(3);
  const [pose, setPose] = useState<'droite' | 'diagonale' | 'decalee'>('droite');
  const [box, setBox] = useState(1.44);
  const [plinthes, setPlinthes] = useState(true);

  const area = L * W;
  const waste = pose === 'droite' ? 0.07 : pose === 'decalee' ? 0.1 : 0.15;
  const tileArea = (tl / 100) * (tw / 100);
  const tiles = Math.ceil((area * (1 + waste)) / tileArea);
  const boxes = Math.ceil((area * (1 + waste)) / box);
  const big = tl * tw > 900; // > 30 × 30 cm : double encollage
  const glueKgM2 = big ? 7 : 4.5;
  const glue = area * glueKgM2;
  // Joint : kg/m² = (L + l) / (L × l) × épaisseur × largeur × 1,6 (dimensions en mm)
  const jointKgM2 = ((tl * 10 + tw * 10) / (tl * 10 * tw * 10)) * thick * joint * 1.6;
  const jointKg = jointKgM2 * area;
  // Calepinage centré sur la longueur : coupe en bordure
  const step = tl / 100 + joint / 1000;
  const full = Math.floor(L / step);
  const edge = ((L - full * step) / 2) * 100;
  const edgeCentered = edge < tl / 3 ? ((L - (full - 1) * step) / 2) * 100 : edge;
  const perim = 2 * (L + W);

  return (
    <ToolLayout
      tool="calepinage"
      inputs={
        <>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Longueur de la pièce" value={L} onChange={setL} suffix="m" />
            <NumField label="Largeur de la pièce" value={W} onChange={setW} suffix="m" />
            <NumField label="Carreau : longueur" value={tl} onChange={setTl} suffix="cm" min={1} />
            <NumField label="Carreau : largeur" value={tw} onChange={setTw} suffix="cm" min={1} />
            <NumField label="Épaisseur du carreau" value={thick} onChange={setThick} suffix="mm" min={1} />
            <NumField label="Largeur du joint" value={joint} onChange={setJoint} suffix="mm" min={1} />
          </div>
          <Choice label="Pose" value={pose} onChange={setPose} options={[{ value: 'droite', label: 'Droite (7 %)' }, { value: 'decalee', label: 'Décalée (10 %)' }, { value: 'diagonale', label: 'Diagonale (15 %)' }]} />
          <div className="grid grid-cols-2 items-end gap-3">
            <NumField label="Surface par carton" value={box} onChange={setBox} suffix="m²" min={0.1} />
            <Choice label="Plinthes" value={plinthes ? 1 : 0} onChange={(v) => setPlinthes(v === 1)} options={[{ value: 1, label: 'Oui' }, { value: 0, label: 'Non' }]} />
          </div>
        </>
      }
      hero={{ label: 'Carreaux à commander', value: `${tiles} carreaux`, sub: `${boxes} cartons · ${n1(area)} m² + ${Math.round(waste * 100)} % de chutes` }}
      formulas={[
        'Carreaux = surface × (1 + chutes) / surface d’un carreau. Chutes : 7 % en pose droite, 10 % décalée, 15 % en diagonale.',
        'Colle : 4 à 5 kg/m² en simple encollage ; double encollage au-delà de 30 × 30 cm (6 à 7 kg/m²).',
        'Joint (kg/m²) = (L + l) / (L × l) × épaisseur × largeur du joint × 1,6, dimensions en mm.',
        'Calepinage : on centre la pose pour avoir des coupes égales des deux côtés, jamais moins d’un tiers de carreau.',
      ]}
      refs={['DTU 52.2 (pose collée)', 'Fiches techniques des mortiers-colles C2']}
      lines={[
        { designation: `Pose de carrelage ${tl} × ${tw} cm, pose ${pose}`, quantity: Math.round(area * 10) / 10, unit: 'm²', unitPriceHt: pose === 'diagonale' ? 55 : big ? 48 : 42, unitCostHt: 6 },
        { designation: `Mortier-colle C2 ${big ? '(double encollage)' : ''}`.trim(), quantity: Math.ceil(glue / 25), unit: 'sac 25 kg', unitPriceHt: 24, unitCostHt: 14 },
        { designation: 'Joint ciment', quantity: Math.max(1, Math.ceil(jointKg / 5)), unit: 'sac 5 kg', unitPriceHt: 19, unitCostHt: 9 },
        ...(plinthes ? [{ designation: 'Plinthes assorties, pose collée', quantity: Math.ceil(perim - 0.9), unit: 'm', unitPriceHt: 14, unitCostHt: 4 }] : []),
      ]}
      quoteTitle="Carrelage"
    >
      <ResultRow label="Colle" value={`${Math.round(glue)} kg`} sub={`${Math.ceil(glue / 25)} sacs de 25 kg · ${big ? 'double encollage' : 'simple encollage'}`} />
      <ResultRow label="Joint" value={`${n1(jointKg)} kg`} sub={`${n2(jointKgM2)} kg/m²`} />
      {plinthes && <ResultRow label="Plinthes" value={`${n1(perim - 0.9)} m`} sub="périmètre moins une porte" />}
      <ResultRow label="Coupe en bordure (longueur)" value={`${n1(edgeCentered)} cm`} sub="de chaque côté, pose centrée" />
      <TilePreview L={L} W={W} tl={tl} tw={tw} />
      {edge < tl / 3 && <div className="mt-2"><Note>Pose décalée d’un demi-carreau pour éviter des coupes de {n1(edge)} cm.</Note></div>}
    </ToolLayout>
  );
}

function TilePreview({ L, W, tl, tw }: { L: number; W: number; tl: number; tw: number }) {
  const scale = 100;
  const cols = Math.ceil((L * 100) / tl) + 1;
  const rows = Math.ceil((W * 100) / tw) + 1;
  if (cols * rows > 900) return null;
  const offX = (((L * 100) % tl) / 2 - tl) / scale;
  const offY = (((W * 100) % tw) / 2 - tw) / scale;
  return (
    <svg viewBox={`0 0 ${L} ${W}`} className="mt-3 w-full rounded-[10px] border border-line bg-white" style={{ maxHeight: 180 }}>
      {Array.from({ length: rows + 1 }, (_, r) =>
        Array.from({ length: cols + 1 }, (_, c) => (
          <rect key={`${r}-${c}`} x={offX + (c * tl) / scale} y={offY + (r * tw) / scale} width={tl / scale} height={tw / scale} fill="#f5f0ff" stroke="#b9a2f5" strokeWidth={0.012} />
        )),
      )}
      <rect x={0} y={0} width={L} height={W} fill="none" stroke="#17171f" strokeWidth={0.03} />
    </svg>
  );
}
