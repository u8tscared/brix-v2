import { useState } from 'react';
import { Choice, Note, NumField, ResultRow, n2 } from '../components/fields';
import { ToolLayout } from '../components/ToolLayout';

type Pose = 'tunnel' | 'applique' | 'renovation';

export default function Menuiserie() {
  const [w, setW] = useState(1200);
  const [h, setH] = useState(1350);
  const [pose, setPose] = useState<Pose>('tunnel');
  const [gap, setGap] = useState(5);
  const [cover, setCover] = useState(20);
  const [frame, setFrame] = useState(40);
  const [uw, setUw] = useState(1.3);
  const [sw, setSw] = useState(0.4);
  const [qty, setQty] = useState(1);
  const [mat, setMat] = useState<'pvc' | 'alu' | 'bois'>('pvc');

  // Cotes de fabrication (mm)
  let fw = w;
  let fh = h;
  if (pose === 'tunnel') { fw = w - 2 * gap; fh = h - 2 * gap; }
  if (pose === 'applique') { fw = w + 2 * cover; fh = h + 2 * cover; }
  if (pose === 'renovation') { fw = w + 2 * (frame - gap); fh = h + 2 * (frame - gap); }
  const area = (fw / 1000) * (fh / 1000);
  // Critères des aides (CEE BAR-EN-104) : Uw ≤ 1,3 et Sw ≥ 0,3, ou Uw ≤ 1,7 et Sw ≥ 0,36
  const eligible = (uw <= 1.3 && sw >= 0.3) || (uw <= 1.7 && sw >= 0.36);
  const unit = { pvc: 420, alu: 690, bois: 760 }[mat] + Math.max(0, area - 1.2) * 260;

  return (
    <ToolLayout
      tool="menuiserie"
      inputs={
        <>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Largeur du tableau" value={w} onChange={setW} suffix="mm" hint="Mesurée en 3 points, gardez la plus petite" />
            <NumField label="Hauteur du tableau" value={h} onChange={setH} suffix="mm" hint="Appui à linteau" />
          </div>
          <Choice label="Type de pose" value={pose} onChange={setPose} options={[{ value: 'tunnel', label: 'Tunnel' }, { value: 'applique', label: 'Applique intérieure' }, { value: 'renovation', label: 'Rénovation sur dormant' }]} />
          <div className="grid grid-cols-2 gap-3">
            {pose !== 'applique' && <NumField label="Jeu de pose par côté" value={gap} onChange={setGap} suffix="mm" />}
            {pose === 'applique' && <NumField label="Recouvrement par côté" value={cover} onChange={setCover} suffix="mm" hint="Sur le doublage" />}
            {pose === 'renovation' && <NumField label="Largeur du dormant existant" value={frame} onChange={setFrame} suffix="mm" hint="Cote vue côté intérieur" />}
          </div>
          <Choice label="Matériau" value={mat} onChange={setMat} options={[{ value: 'pvc', label: 'PVC' }, { value: 'alu', label: 'Aluminium' }, { value: 'bois', label: 'Bois' }]} />
          <div className="grid grid-cols-3 gap-3">
            <NumField label="Uw" value={uw} onChange={setUw} suffix="W/m².K" />
            <NumField label="Sw" value={sw} onChange={setSw} />
            <NumField label="Quantité" value={qty} onChange={(v) => setQty(Math.max(1, Math.round(v)))} min={1} />
          </div>
        </>
      }
      hero={{ label: 'Cotes de fabrication', value: `${Math.round(fw)} × ${Math.round(fh)}`, sub: `en mm, largeur × hauteur · ${n2(area)} m² par menuiserie` }}
      formulas={[
        'Tunnel : cote tableau moins le jeu de pose de chaque côté (5 mm en général, pour le calfeutrement).',
        'Applique intérieure : cote tableau plus le recouvrement sur le doublage de chaque côté.',
        'Rénovation : on recouvre le dormant existant ; cote = clair du dormant + 2 × (largeur du dormant − jeu).',
        'Aides et TVA 5,5 % : Uw ≤ 1,3 et Sw ≥ 0,3, ou Uw ≤ 1,7 et Sw ≥ 0,36.',
        'Chaque fabricant a ses règles de prise de cotes : vérifiez sa fiche avant de commander.',
      ]}
      refs={['DTU 36.5 (mise en œuvre des fenêtres)', 'Fiche CEE BAR-EN-104']}
      lines={[
        { designation: `Fenêtre ${mat.toUpperCase()} ${Math.round(fw)} × ${Math.round(fh)} mm, Uw ${String(uw).replace('.', ',')}, pose ${pose}`, quantity: qty, unit: 'u', unitPriceHt: Math.round(unit), unitCostHt: Math.round(unit * 0.6), vatRate: eligible ? 5.5 : 10 },
        ...(pose === 'renovation' ? [{ designation: 'Habillage intérieur et extérieur', quantity: qty, unit: 'u', unitPriceHt: 85, vatRate: eligible ? 5.5 : 10 }] : []),
        { designation: 'Dépose, pose et calfeutrement', quantity: qty * (pose === 'renovation' ? 2 : 3), unit: 'h', unitPriceHt: 0, vatRate: eligible ? 5.5 : 10 },
      ]}
      quoteTitle="Menuiseries"
    >
      <ResultRow label="Largeur de fabrication" value={`${Math.round(fw)} mm`} />
      <ResultRow label="Hauteur de fabrication" value={`${Math.round(fh)} mm`} />
      <ResultRow label="Surface totale des menuiseries" value={`${n2(area * qty)} m²`} />
      <ResultRow label="Éligible aux aides" value={eligible ? 'Oui' : 'Non'} tone={eligible ? 'ok' : 'warn'} sub={eligible ? 'TVA 5,5 % et CEE (pose RGE)' : 'TVA 10 %'} />
      {!eligible && <div className="mt-2"><Note tone="warn">Pour la TVA 5,5 % et les aides : Uw ≤ 1,3 avec Sw ≥ 0,3, ou Uw ≤ 1,7 avec Sw ≥ 0,36.</Note></div>}
    </ToolLayout>
  );
}
