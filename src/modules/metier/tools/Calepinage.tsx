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
      hero={{ label: 'Carreaux à commander', value: tiles, unit: 'carreaux', sub: `${boxes} cartons · ${n1(area)} m² + ${Math.round(waste * 100)} % de chutes` }}
      visual={<TilePreview L={L} W={W} tl={tl} tw={tw} edge={edgeCentered} />}
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
      {edge < tl / 3 && <div className="mt-2"><Note>Pose décalée d’un demi-carreau pour éviter des coupes de {n1(edge)} cm.</Note></div>}
    </ToolLayout>
  );
}

function TilePreview({ L, W, tl, tw, edge }: { L: number; W: number; tl: number; tw: number; edge: number }) {
  const Lc = L * 100;
  const Wc = W * 100;
  const cols = Math.ceil(Lc / tl) + 2;
  const rows = Math.ceil(Wc / tw) + 2;
  if (L <= 0 || W <= 0 || cols * rows > 1200) return null;
  // Pose centrée : la première coupe vaut `edge` cm sur la longueur ; idem sur la largeur.
  const fullY = Math.floor(Wc / tw);
  let edgeY = (Wc - fullY * tw) / 2;
  if (edgeY < tw / 3) edgeY = (Wc - (fullY - 1) * tw) / 2;
  const x0 = edge - tl;
  const y0 = edgeY - tw;
  const pad = Math.max(Lc, Wc) * 0.04;
  const tiles: { x: number; y: number; cut: boolean }[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = x0 + c * tl;
      const y = y0 + r * tw;
      if (x >= Lc || y >= Wc || x + tl <= 0 || y + tw <= 0) continue;
      tiles.push({ x, y, cut: x < 0 || y < 0 || x + tl > Lc + 0.01 || y + tw > Wc + 0.01 });
    }
  const cuts = tiles.filter((t) => t.cut).length;
  return (
    <div>
      <svg viewBox={`${-pad} ${-pad} ${Lc + pad * 2} ${Wc + pad * 2}`} className="w-full" style={{ maxHeight: 220 }} aria-label="Plan de calepinage">
        <defs>
          <clipPath id="room"><rect x={0} y={0} width={Lc} height={Wc} /></clipPath>
        </defs>
        <g clipPath="url(#room)">
          {tiles.map((t, i) => (
            <rect
              key={`${Math.round(t.x)}-${Math.round(t.y)}`}
              x={t.x}
              y={t.y}
              width={tl}
              height={tw}
              fill={t.cut ? '#fdecc8' : '#fff'}
              stroke="#c9b98f"
              strokeWidth={Math.max(Lc, Wc) / 500}
              className="animate-[fade-in_.4s_ease_both]"
              style={{ animationDelay: `${Math.min(i, 60) * 8}ms` }}
            />
          ))}
        </g>
        <rect x={0} y={0} width={Lc} height={Wc} fill="none" stroke="#15122a" strokeWidth={Math.max(Lc, Wc) / 160} />
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-ink-2">
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px] border border-[#c9b98f] bg-white" />Carreaux entiers</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px] border border-[#c9b98f] bg-[#fdecc8]" />{cuts} carreaux coupés</span>
        <span className="ml-auto text-ink-3">Pose centrée, coupes égales</span>
      </div>
    </div>
  );
}
