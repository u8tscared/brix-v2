import { useState } from 'react';
import { Choice, Note, NumField, ResultRow, n1 } from '../components/fields';
import { RoofProfile } from '../components/diagrams';
import { ToolLayout } from '../components/ToolLayout';

// Valeurs moyennes du marché ; pente mini indicative en zone 1, rampant < 6,5 m (DTU série 40).
const COVERS = [
  { key: 'gm', label: 'Tuile grand moule', perM2: 10, pureau: 0.37, minSlope: 30, price: 62 },
  { key: 'meca', label: 'Tuile mécanique', perM2: 13, pureau: 0.33, minSlope: 35, price: 58 },
  { key: 'canal', label: 'Tuile canal', perM2: 24, pureau: 0.35, minSlope: 24, price: 68 },
  { key: 'plate', label: 'Petite tuile plate', perM2: 60, pureau: 0.1, minSlope: 70, price: 110 },
  { key: 'ardoise', label: 'Ardoise 32 × 22', perM2: 33, pureau: 0.13, minSlope: 45, price: 98 },
] as const;
type CoverKey = (typeof COVERS)[number]['key'];

export default function Toiture() {
  const [L, setL] = useState(10);
  const [W, setW] = useState(8);
  const [slopePct, setSlope] = useState(45);
  const [shape, setShape] = useState<1 | 2 | 4>(2);
  const [over, setOver] = useState(0.3);
  const [cover, setCover] = useState<CoverKey>('meca');
  const c = COVERS.find((x) => x.key === cover)!;
  const angle = Math.atan(slopePct / 100);
  const factor = 1 / Math.cos(angle);
  const projected = (L + 2 * over) * (W + 2 * over);
  const area = projected * factor;
  const tiles = Math.ceil(area * c.perM2 * 1.05);
  const battens = Math.ceil((area / c.pureau) * 1.05);
  const ridge = shape === 1 ? 0 : shape === 2 ? L + 2 * over : L - W + 2 * Math.SQRT2 * (W / 2) * 2;
  const rampant = ((W / (shape === 1 ? 1 : 2)) + over) * factor;
  const tooFlat = slopePct < c.minSlope;

  return (
    <ToolLayout
      tool="toiture"
      inputs={
        <>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Longueur au sol" value={L} onChange={setL} suffix="m" />
            <NumField label="Largeur au sol" value={W} onChange={setW} suffix="m" />
            <NumField label="Pente" value={slopePct} onChange={setSlope} suffix="%" hint={`soit ${n1((angle * 180) / Math.PI)}°`} />
            <NumField label="Débord de toit" value={over} onChange={setOver} suffix="m" />
          </div>
          <Choice label="Forme" value={shape} onChange={setShape} options={[{ value: 1, label: '1 pan' }, { value: 2, label: '2 pans' }, { value: 4, label: '4 pans' }]} />
          <Choice label="Couverture" value={cover} onChange={setCover} options={COVERS.map((x) => ({ value: x.key, label: x.label }))} />
        </>
      }
      hero={{ label: 'Surface de couverture', value: area, decimals: 1, unit: 'm²', sub: `${tiles} ${cover === 'ardoise' ? 'ardoises' : 'tuiles'} avec 5 % de casse · rampant ${n1(rampant)} m` }}
      visual={<RoofProfile slopePct={slopePct} width={W} pans={shape} rampant={rampant} />}
      formulas={[
        'Surface rampante = surface au sol (débords compris) / cos(pente). La forme change le faîtage, pas la surface.',
        `Coefficient ici : 1 / cos(${n1((angle * 180) / Math.PI)}°) = ${factor.toFixed(3).replace('.', ',')}.`,
        `${c.label} : environ ${c.perM2} par m², pureau ${Math.round(c.pureau * 100)} cm, soit ${n1(1 / c.pureau)} m de liteaux par m².`,
        'Pente minimale indicative pour la zone 1 et un rampant court : à vérifier selon la zone et l’exposition.',
      ]}
      refs={['DTU 40.21 (tuiles terre cuite à emboîtement)', 'DTU 40.23 (tuiles plates)', 'DTU 40.11 (ardoises)']}
      lines={[
        { designation: `Couverture ${c.label.toLowerCase()}, fourniture et pose`, quantity: Math.round(area * 10) / 10, unit: 'm²', unitPriceHt: c.price, unitCostHt: Math.round(c.price * 0.45) },
        { designation: 'Écran sous-toiture HPV et contre-liteaux', quantity: Math.round(area * 10) / 10, unit: 'm²', unitPriceHt: 14, unitCostHt: 5 },
        ...(ridge > 0 ? [{ designation: 'Faîtage scellé ou à sec ventilé', quantity: Math.ceil(ridge), unit: 'm', unitPriceHt: 48, unitCostHt: 16 }] : []),
      ]}
      quoteTitle="Couverture"
    >
      <ResultRow label="Surface au sol (avec débords)" value={`${n1(projected)} m²`} />
      <ResultRow label="Liteaux" value={`${battens} m`} />
      {ridge > 0 && <ResultRow label={shape === 4 ? 'Faîtage et arêtiers' : 'Faîtage'} value={`${n1(ridge)} m`} />}
      <ResultRow label="Pente minimale conseillée" value={`${c.minSlope} %`} tone={tooFlat ? 'bad' : 'ok'} />
      {tooFlat && <div className="mt-2"><Note tone="warn">Pente trop faible pour cette couverture : risque d’infiltration. Choisissez un autre modèle ou vérifiez l’avis technique du fabricant.</Note></div>}
    </ToolLayout>
  );
}
