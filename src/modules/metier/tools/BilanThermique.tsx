import { useState } from 'react';
import { Choice, Note, NumField, ResultRow, n1 } from '../components/fields';
import { ToolLayout } from '../components/ToolLayout';

// Coefficient volumique G (W/m³·K), méthode simplifiée.
const INSUL = [
  { key: 'rt2012', label: 'Neuf (RT 2012 / RE 2020)', g: 0.65 },
  { key: 'bonne', label: 'Bien isolé, rénové', g: 0.9 },
  { key: 'moyenne', label: 'Isolation moyenne', g: 1.2 },
  { key: 'faible', label: 'Peu isolé', g: 1.6 },
  { key: 'aucune', label: 'Pas isolé (avant 1975)', g: 2.0 },
] as const;
// Température extérieure de base, moyenne par zone (NF EN 12831, annexe nationale).
const ZONES = [
  { key: 'H1', label: 'H1 · Nord, Est, montagne', t: -9 },
  { key: 'H2', label: 'H2 · Ouest, Centre', t: -5 },
  { key: 'H3', label: 'H3 · Méditerranée', t: -2 },
] as const;
const ALT = [{ v: 0, label: 'Moins de 200 m' }, { v: -2, label: '200 à 600 m' }, { v: -4, label: '600 à 1 000 m' }, { v: -7, label: 'Plus de 1 000 m' }];
const SIZES = [4, 5, 6, 8, 10, 11, 12, 14, 16];

export default function BilanThermique() {
  const [surface, setSurface] = useState(110);
  const [height, setHeight] = useState(2.5);
  const [insul, setInsul] = useState<(typeof INSUL)[number]['key']>('moyenne');
  const [zone, setZone] = useState<(typeof ZONES)[number]['key']>('H1');
  const [alt, setAlt] = useState(0);
  const [tin, setTin] = useState(19);
  const [gen, setGen] = useState<'pac' | 'chaudiere'>('pac');
  const G = INSUL.find((i) => i.key === insul)!.g;
  const tBase = ZONES.find((z) => z.key === zone)!.t + alt;
  const dT = tin - tBase;
  const volume = surface * height;
  const loss = (G * volume * dT) / 1000; // kW
  const pac = loss * 0.9; // PAC dimensionnée à ~90 % des déperditions, appoint au-delà
  const boiler = loss * 1.15; // marge de relance
  const target = gen === 'pac' ? pac : boiler;
  const model = SIZES.find((s) => s >= target) ?? Math.ceil(target);
  const perM2 = (loss * 1000) / surface;

  return (
    <ToolLayout
      tool="bilan-thermique"
      inputs={
        <>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Surface chauffée" value={surface} onChange={setSurface} suffix="m²" />
            <NumField label="Hauteur sous plafond" value={height} onChange={setHeight} suffix="m" />
          </div>
          <Choice label="Isolation" value={insul} onChange={setInsul} options={INSUL.map((i) => ({ value: i.key, label: i.label }))} />
          <Choice label="Zone climatique" value={zone} onChange={setZone} options={ZONES.map((z) => ({ value: z.key, label: z.label }))} />
          <Choice label="Altitude" value={alt} onChange={setAlt} options={ALT.map((a) => ({ value: a.v, label: a.label }))} />
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Température voulue" value={tin} onChange={setTin} suffix="°C" />
          </div>
          <Choice label="Générateur" value={gen} onChange={setGen} options={[{ value: 'pac', label: 'Pompe à chaleur' }, { value: 'chaudiere', label: 'Chaudière' }]} />
        </>
      }
      hero={{ label: gen === 'pac' ? 'Pompe à chaleur conseillée' : 'Chaudière conseillée', value: model, decimals: 1, unit: 'kW', sub: `Déperditions ${n1(loss)} kW à ${tBase} °C dehors (${Math.round(perM2)} W/m²)` }}
      formulas={[
        'Déperditions : P = G × V × (T intérieure − T de base). G selon l’isolation, V = surface × hauteur.',
        `Ici : ${G.toString().replace('.', ',')} × ${Math.round(volume)} m³ × ${dT} °C = ${n1(loss)} kW.`,
        'PAC : environ 90 % des déperditions, l’appoint couvre les jours les plus froids. Chaudière : + 15 % pour la relance.',
        'Méthode simplifiée pour un avant-projet : le dimensionnement final se fait pièce par pièce (NF EN 12831).',
      ]}
      refs={['NF EN 12831-1', 'Températures de base par département (annexe nationale)', 'Guide AFPAC']}
      lines={[
        gen === 'pac'
          ? { designation: `Pompe à chaleur air/eau ${model} kW`, quantity: 1, unit: 'u', unitPriceHt: 6200 + model * 420, unitCostHt: 4200 + model * 280, vatRate: 5.5 }
          : { designation: `Chaudière gaz à condensation ${model} kW`, quantity: 1, unit: 'u', unitPriceHt: 2900 + model * 60, unitCostHt: 1900 + model * 40, vatRate: 10 },
        { designation: 'Raccordements hydrauliques et électriques', quantity: 1, unit: 'forfait', unitPriceHt: gen === 'pac' ? 1200 : 650, vatRate: gen === 'pac' ? 5.5 : 10 },
        { designation: 'Pose et mise en service', quantity: gen === 'pac' ? 16 : 10, unit: 'h', unitPriceHt: 0, vatRate: gen === 'pac' ? 5.5 : 10 },
      ]}
      quoteTitle={gen === 'pac' ? 'Pompe à chaleur' : 'Chaudière'}
    >
      <ResultRow label="Volume chauffé" value={`${Math.round(volume)} m³`} />
      <ResultRow label="Écart de température" value={`${dT} °C`} sub={`${tin} °C dedans, ${tBase} °C dehors`} />
      <ResultRow label="Déperditions" value={`${n1(loss)} kW`} strong />
      <ResultRow label="Puissance PAC (90 %)" value={`${n1(pac)} kW`} />
      <ResultRow label="Puissance chaudière (+15 %)" value={`${n1(boiler)} kW`} />
      {perM2 > 120 && <div className="mt-2"><Note tone="warn">Plus de 120 W/m² : isoler d’abord (combles, menuiseries) peut réduire la machine d’une taille.</Note></div>}
      {gen === 'pac' && <div className="mt-2"><Note>TVA à 5,5 % pour une PAC air/eau en logement de plus de 2 ans. Pose par une entreprise RGE pour les aides.</Note></div>}
    </ToolLayout>
  );
}
