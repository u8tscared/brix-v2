import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Button, Card, Field, Input, Select, Switch, cn, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { SIZES, TRADES } from '@/lib/catalog';
import type { Company, TradeKey } from '@/lib/types';

export default function EntrepriseTab() {
  const company = useBrix((s) => s.company);
  const updateCompany = useBrix((s) => s.updateCompany);
  const [d, setD] = useState<Company>(company);
  useEffect(() => setD(company), [company]);
  const dirty = JSON.stringify(d) !== JSON.stringify(company);
  const set = <K extends keyof Company>(k: K, v: Company[K]) => setD((x) => ({ ...x, [k]: v }));
  const save = () => {
    updateCompany({ ...d, logoInitials: d.logoInitials || d.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() });
    toast('Informations enregistrées. Elles apparaissent sur vos prochains devis et factures.');
  };
  const toggleSecondary = (k: TradeKey) => set('secondaryTrades', d.secondaryTrades.includes(k) ? d.secondaryTrades.filter((x) => x !== k) : [...d.secondaryTrades, k]);

  return (
    <div className="grid gap-5 [&>*]:min-w-0 xl:grid-cols-[1.4fr_1fr]">
      <div className="space-y-5">
        <Card className="p-4 md:p-5">
          <h3 className="text-[15px] font-semibold">Identité</h3>
          <p className="text-[12.5px] text-ink-2">Ces informations figurent sur vos devis et factures (mentions obligatoires).</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Nom commercial"><Input value={d.name} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label="Raison sociale"><Input value={d.legalName} onChange={(e) => set('legalName', e.target.value)} /></Field>
            <Field label="SIRET" hint={d.siret && d.siret.replace(/\s/g, '').length !== 14 ? '14 chiffres attendus' : undefined}><Input value={d.siret} inputMode="numeric" onChange={(e) => set('siret', e.target.value)} /></Field>
            <Field label="N° de TVA intracommunautaire"><Input value={d.vatNumber} onChange={(e) => set('vatNumber', e.target.value)} /></Field>
            <Field label="Adresse" className="sm:col-span-2"><Input value={d.address} onChange={(e) => set('address', e.target.value)} /></Field>
            <Field label="Code postal et ville"><Input value={d.city} onChange={(e) => set('city', e.target.value)} /></Field>
            <Field label="Téléphone"><Input value={d.phone} inputMode="tel" onChange={(e) => set('phone', e.target.value)} /></Field>
            <Field label="E-mail" className="sm:col-span-2"><Input value={d.email} type="email" onChange={(e) => set('email', e.target.value)} /></Field>
          </div>
        </Card>

        <Card className="p-4 md:p-5">
          <h3 className="text-[15px] font-semibold">Assurance et banque</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Assurance décennale" hint="Assureur, numéro de contrat, zone couverte" className="sm:col-span-2"><Input value={d.decennale} onChange={(e) => set('decennale', e.target.value)} /></Field>
            <Field label="IBAN (affiché sur les factures)" className="sm:col-span-2"><Input value={d.iban} onChange={(e) => set('iban', e.target.value)} className="font-mono" /></Field>
            <label className="flex min-h-[48px] items-center justify-between gap-3 rounded-[10px] border border-line px-3 sm:col-span-2">
              <span><span className="block text-[13.5px] font-medium">Qualification RGE</span><span className="block text-[12px] text-ink-3">Débloque les mentions et les aides sur les devis de rénovation énergétique.</span></span>
              <Switch checked={d.rge} onChange={(v) => set('rge', v)} label="RGE" />
            </label>
          </div>
        </Card>
      </div>

      <div className="space-y-5">
        <Card className="p-4 md:p-5">
          <h3 className="text-[15px] font-semibold">Métier et taille</h3>
          <div className="mt-4 space-y-3">
            <Field label="Métier principal">
              <Select value={d.trade} onChange={(e) => set('trade', e.target.value as TradeKey)}>
                {TRADES.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
              </Select>
            </Field>
            <div>
              <div className="mb-1.5 text-[12.5px] font-medium text-ink-2">Autres métiers</div>
              <div className="flex flex-wrap gap-1.5">
                {TRADES.filter((t) => t.key !== d.trade && t.key !== 'autre').map((t) => (
                  <button key={t.key} type="button" onClick={() => toggleSecondary(t.key)} className={cn('min-h-[36px] rounded-full border px-3 text-[12.5px] font-medium', d.secondaryTrades.includes(t.key) ? 'border-ink bg-ink text-white' : 'border-line2 bg-white text-ink-2')}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Taille de l’entreprise">
              <Select value={d.size} onChange={(e) => set('size', e.target.value as Company['size'])}>
                {SIZES.map((s) => <option key={s.key} value={s.key}>{s.name} · {s.range}</option>)}
              </Select>
            </Field>
          </div>
        </Card>
        <Card className="p-4 md:p-5">
          <h3 className="text-[15px] font-semibold">Vos prix par défaut</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label="Taux horaire HT"><Input value={d.hourlyRate} inputMode="decimal" suffix="€/h" onChange={(e) => set('hourlyRate', Number(e.target.value.replace(',', '.')) || 0)} /></Field>
            <Field label="TVA par défaut">
              <Select value={d.defaultVat} onChange={(e) => set('defaultVat', Number(e.target.value))}>
                {[20, 10, 5.5, 0].map((v) => <option key={v} value={v}>{String(v).replace('.', ',')} %</option>)}
              </Select>
            </Field>
          </div>
          <p className="mt-2 text-[12px] text-ink-3">{TRADES.find((t) => t.key === d.trade)?.vatHint}. Bob utilise ce taux pour chiffrer la main d’œuvre.</p>
        </Card>
      </div>

      {dirty && (
      <div className="sticky bottom-[calc(76px+var(--safe-b))] z-10 flex animate-fade-up items-center justify-end gap-2 rounded-[14px] border border-line bg-white/95 p-2.5 shadow-pop backdrop-blur md:bottom-4 xl:col-span-2">
        <span className="mr-auto pl-2 text-[13px] text-ink-2">Modifications non enregistrées</span>
        <Button variant="ghost" onClick={() => setD(company)}>Annuler</Button>
        <Button variant="primary" icon={<Check className="h-4 w-4" />} onClick={save}>Enregistrer</Button>
      </div>
      )}
    </div>
  );
}
