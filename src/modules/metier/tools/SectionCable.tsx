import { useState } from 'react';
import { cn } from '@/components/ui';
import { pct } from '@/lib/format';
import { Choice, Gauge, Group, Note, NumField, ResultRow, n1 } from '../components/fields';
import { CableSection } from '../components/diagrams';
import { ToolLayout } from '../components/ToolLayout';
import { cablePrice, fmtS, sizeCable, type Metal, type Phase, type Pose } from '../calc/electric';

export default function SectionCable() {
  const [metal, setMetal] = useState<Metal>('cuivre');
  const [phase, setPhase] = useState<Phase>('mono');
  const [pose, setPose] = useState<Pose>('B');
  const [usage, setUsage] = useState<'eclairage' | 'autre'>('autre');
  const [power, setPower] = useState(5000);
  const [length, setLength] = useState(30);
  const [cos, setCos] = useState(1);
  const limit = usage === 'eclairage' ? 3 : 5;
  const r = sizeCable({ powerW: power, length, metal, phase, pose, cosPhi: cos || 1, limitPct: limit, minSection: usage === 'eclairage' ? 1.5 : 2.5 });
  const conductors = phase === 'mono' ? '3G' : '5G';

  return (
    <ToolLayout
      tool="section-cable"
      inputs={
        <>
          <Group title="Le circuit">
          <div className="grid gap-4 2xl:grid-cols-2">
            <Choice label="Réseau" value={phase} onChange={setPhase} options={[{ value: 'mono', label: 'Monophasé 230 V' }, { value: 'tri', label: 'Triphasé 400 V' }]} />
            <Choice label="Conducteur" value={metal} onChange={setMetal} options={[{ value: 'cuivre', label: 'Cuivre' }, { value: 'alu', label: 'Aluminium' }]} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Puissance" value={power} onChange={setPower} suffix="W" />
            <NumField label="Longueur" value={length} onChange={setLength} suffix="m" step={5} hint="Du tableau à l’appareil" />
          </div>
          </Group>
          <Group title="La pose">
          <Choice label="Usage" value={usage} onChange={setUsage} options={[{ value: 'autre', label: 'Prises, appareils (5 %)' }, { value: 'eclairage', label: 'Éclairage (3 %)' }]} />
          <div className="grid gap-4 2xl:grid-cols-2">
            <Choice label="Pose" value={pose} onChange={setPose} options={[{ value: 'B', label: 'Sous conduit' }, { value: 'C', label: 'Sur paroi' }]} />
            <Choice label="Type de charge (cos φ)" value={cos} onChange={setCos} options={[{ value: 1, label: 'Chauffage, borne (1)' }, { value: 0.8, label: 'Moteur (0,8)' }]} />
          </div>
          </Group>
        </>
      }
      hero={{ label: 'Section minimale', value: r.section, decimals: 1, unit: 'mm²', sub: `${metal === 'cuivre' ? 'Cuivre' : 'Aluminium'} · disjoncteur ${r.In} A courbe C · courant ${n1(r.I)} A` }}
      visual={
        <div className="space-y-4">
          <CableSection section={r.section} conductors={phase === 'mono' ? 3 : 5} />
          <Gauge label="Chute de tension" value={r.drop} max={limit * 2} limit={limit} unit=" %" format={(v) => pct(v, 2).replace(' %', '')} />
        </div>
      }
      formulas={[
        'Courant : I = P / (230 × cos φ) en mono, I = P / (√3 × 400 × cos φ) en tri.',
        'Chute de tension : ΔU = b × (ρ × L / S × cos φ + λ × L × sin φ) × I, avec b = 2 en mono et 1 en tri, ρ = 0,0225 (cuivre) ou 0,036 (alu) Ω·mm²/m, λ = 0,08 mΩ/m. ΔU % = ΔU / 230.',
        'En logement, la section est plafonnée au calibre de la partie 10 (1,5 mm² : 16 A, 2,5 mm² : 20 A, 4 mm² : 25 A, 6 mm² : 32 A).',
        'On garde la plus grosse des deux sections : celle qui supporte le calibre du disjoncteur (Iz ≥ In) et celle qui respecte la chute de tension.',
        'Calcul simplifié à 30 °C, sans facteur de groupement : à vérifier pour les grosses installations.',
      ]}
      refs={['NF C 15-100 § 523 et 525', 'Tableau 52H (méthodes B et C)', 'Guide UTE C 15-105']}
      lines={[
        { designation: `Câble R2V ${conductors}${fmtS(r.section)} mm² ${metal === 'alu' ? 'alu' : 'cuivre'}`, quantity: Math.ceil(length * 1.1), unit: 'm', unitPriceHt: cablePrice(r.section, phase, metal), detail: '+10 % pour les chutes et raccordements' },
        { designation: `Disjoncteur ${r.In} A courbe C${phase === 'tri' ? ' tétrapolaire' : ''}`, quantity: 1, unit: 'u', unitPriceHt: phase === 'tri' ? 68 : r.In > 32 ? 42 : 14 },
        { designation: 'Tirage et raccordement de la ligne', quantity: Math.max(1, Math.round((length / 12) * 2) / 2), unit: 'h', unitPriceHt: 0 },
      ]}
      quoteTitle={`Ligne ${fmtS(r.section)} mm² · ${length} m`}
    >
      <ResultRow label="Section pour l’échauffement" value={`${fmtS(r.sThermal)} mm²`} />
      <ResultRow label="Section pour la chute de tension" value={`${fmtS(r.sDrop)} mm²`} />
      <ResultRow label="Câble conseillé" value={`R2V ${conductors}${fmtS(r.section)}`} strong />
      {r.section > r.sThermal && <div className="mt-2"><Note tone="warn">C’est la longueur qui impose la section : sans elle, {fmtS(r.sThermal)} mm² suffirait.</Note></div>}
      <div className="my-3 overflow-hidden rounded-card-sm bg-white shadow-halo-sm">
        <div className="grid grid-cols-3 bg-halo-track/70 px-3 py-2 text-[11.5px] font-medium text-ink-3"><span>Section</span><span className="text-right">Iz</span><span className="text-right">Chute</span></div>
        {r.table.map((t) => (
          <div key={t.S} className={cn('num grid grid-cols-3 border-t border-halo-line px-3 py-2 text-[12.5px]', t.S === r.section && 'bg-pale-a font-semibold text-deep-a')}>
            <span>{fmtS(t.S)} mm²</span>
            <span className={cn('text-right', t.iz < r.In && 'text-bad')}>{n1(t.iz)} A</span>
            <span className={cn('text-right', t.drop > limit ? 'text-bad' : 'text-ok')}>{pct(t.drop, 2)}</span>
          </div>
        ))}
      </div>
    </ToolLayout>
  );
}
