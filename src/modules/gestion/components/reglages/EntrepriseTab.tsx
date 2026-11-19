import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Field, IconTile, Input, Select, Switch, cn, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { SIZES, TRADES } from '@/lib/catalog';
import type { Company, TradeKey } from '@/lib/types';
import { SaveBar, SettingsSection } from './parts';

const initials = (name: string) => name.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export default function EntrepriseTab() {
  const company = useBrix((s) => s.company);
  const updateCompany = useBrix((s) => s.updateCompany);
  const [d, setD] = useState<Company>(company);
  useEffect(() => setD(company), [company]);
  const dirty = JSON.stringify(d) !== JSON.stringify(company);
  const set = <K extends keyof Company>(k: K, v: Company[K]) => setD((x) => ({ ...x, [k]: v }));
  const save = () => {
    const prevTrade = company.trade;
    updateCompany({ ...d, logoInitials: d.logoInitials || initials(d.name) });
    if (prevTrade !== d.trade) toast(`Vos outils métier sont maintenant ceux d’un ${TRADES.find((t) => t.key === d.trade)?.name.toLowerCase()}.`, 'info');
  };
  const toggleSecondary = (k: TradeKey) => set('secondaryTrades', d.secondaryTrades.includes(k) ? d.secondaryTrades.filter((x) => x !== k) : [...d.secondaryTrades, k]);
  const siretBad = d.siret && d.siret.replace(/\s/g, '').length !== 14;

  return (
    <div className="space-y-4">
      <HeaderPreview c={d} />

      <SettingsSection title="Identité" text="Ces informations figurent sur vos devis et factures (mentions obligatoires).">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nom commercial"><Input value={d.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Raison sociale"><Input value={d.legalName} onChange={(e) => set('legalName', e.target.value)} /></Field>
          <Field label="SIRET" hint={siretBad ? <span className="text-warn">14 chiffres attendus</span> : undefined}><Input value={d.siret} inputMode="numeric" className="font-mono" onChange={(e) => set('siret', e.target.value)} /></Field>
          <Field label="N° de TVA intracommunautaire"><Input value={d.vatNumber} className="font-mono" onChange={(e) => set('vatNumber', e.target.value)} /></Field>
          <Field label="Adresse" className="sm:col-span-2"><Input value={d.address} onChange={(e) => set('address', e.target.value)} /></Field>
          <Field label="Code postal et ville"><Input value={d.city} onChange={(e) => set('city', e.target.value)} /></Field>
          <Field label="Téléphone"><Input value={d.phone} inputMode="tel" onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="E-mail" className="sm:col-span-2"><Input value={d.email} type="email" onChange={(e) => set('email', e.target.value)} /></Field>
        </div>
      </SettingsSection>

      <SettingsSection title="Métier et taille" text="Brix adapte vos outils de calcul, vos ouvrages et les modules conseillés.">
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 text-[12.5px] font-medium text-ink-2">Métier principal</div>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {TRADES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setD((x) => ({ ...x, trade: t.key, secondaryTrades: x.secondaryTrades.filter((k) => k !== t.key) }))}
                  aria-pressed={d.trade === t.key}
                  className={cn('press flex min-h-[48px] items-center gap-2.5 rounded-card-sm px-2 text-left text-[12.5px] font-medium transition-[box-shadow,background,color] duration-300 ease-spring', d.trade === t.key ? 'bg-white text-ink shadow-[0_0_0_1.5px_#c9b5f7,0_8px_20px_-10px_rgba(109,40,217,.45)]' : 'bg-halo-track text-ink-2 hover:bg-white hover:text-ink hover:shadow-halo-sm')}
                >
                  <IconTile name={t.icon} tone={d.trade === t.key ? 'violet' : 'neutral'} size="sm" className="transition-colors duration-300" />
                  <span className="line-clamp-2 leading-tight">{t.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-[12.5px] font-medium text-ink-2">Vous faites aussi</div>
            <div className="flex flex-wrap gap-1.5">
              {TRADES.filter((t) => t.key !== d.trade && t.key !== 'autre').map((t) => {
                const on = d.secondaryTrades.includes(t.key);
                return (
                  <button key={t.key} type="button" aria-pressed={on} onClick={() => toggleSecondary(t.key)} className={cn('press min-h-[36px] rounded-full px-3.5 text-[12.5px] font-medium transition-[background,color,box-shadow] duration-300 ease-spring', on ? 'bg-pale-v text-deep-v shadow-[0_0_0_1px_#e4d8fd]' : 'bg-white text-ink-2 shadow-[0_0_0_1px_#ece8f6] hover:text-ink')}>
                    {t.plural}
                  </button>
                );
              })}
            </div>
          </div>
          <Field label="Taille de l’entreprise" className="sm:max-w-xs">
            <Select value={d.size} onChange={(e) => set('size', e.target.value as Company['size'])}>
              {SIZES.map((s) => <option key={s.key} value={s.key}>{s.name} · {s.range}</option>)}
            </Select>
          </Field>
        </div>
      </SettingsSection>

      <SettingsSection title="Vos prix par défaut" text="Brix AI s’en sert pour chiffrer la main d’œuvre et préremplir vos devis.">
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <Field label="Taux horaire HT"><Input value={d.hourlyRate} inputMode="decimal" suffix="€/h" className="num" onChange={(e) => set('hourlyRate', Number(e.target.value.replace(',', '.')) || 0)} /></Field>
          <Field label="TVA par défaut">
            <Select value={d.defaultVat} onChange={(e) => set('defaultVat', Number(e.target.value))}>
              {[20, 10, 5.5, 0].map((v) => <option key={v} value={v}>{String(v).replace('.', ',')} %</option>)}
            </Select>
          </Field>
        </div>
        <p className="mt-2 text-[12px] text-ink-3">Pour un {TRADES.find((t) => t.key === d.trade)?.name.toLowerCase()} : {TRADES.find((t) => t.key === d.trade)?.vatHint}.</p>
      </SettingsSection>

      <SettingsSection title="Assurance et banque" text="L’IBAN s’affiche sur vos factures ; la décennale est obligatoire sur vos devis.">
        <div className="space-y-3">
          <Field label="Assurance décennale" hint="Assureur, numéro de contrat, zone couverte"><Input value={d.decennale} onChange={(e) => set('decennale', e.target.value)} /></Field>
          <Field label="IBAN"><Input value={d.iban} onChange={(e) => set('iban', e.target.value)} className="font-mono" /></Field>
          <div className="flex min-h-[60px] items-center justify-between gap-3 rounded-card-sm bg-white px-3.5 py-3 shadow-halo-sm">
            <span className="flex min-w-0 items-center gap-3">
              <IconTile icon={<ShieldCheck />} tone={d.rge ? 'green' : 'neutral'} size="row" className="transition-colors duration-300" />
              <span>
                <span className="block text-[13.5px] font-medium">Qualification RGE</span>
                <span className="block text-[12px] text-ink-3">Débloque les mentions et les aides sur les devis de rénovation énergétique.</span>
              </span>
            </span>
            <Switch checked={d.rge} onChange={(v) => set('rge', v)} label="RGE" />
          </div>
        </div>
      </SettingsSection>

      <SaveBar dirty={dirty} onSave={save} onReset={() => setD(company)} />
    </div>
  );
}

/** En-tête de devis tel que le client le verra : il se met à jour en direct. */
function HeaderPreview({ c }: { c: Company }) {
  return (
    <div className="relative overflow-hidden rounded-card bg-white shadow-halo">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-56 w-72 rounded-full bg-[radial-gradient(closest-side,#fbe3f6,transparent)] opacity-70 blur-xl" />
      <div className="relative flex items-center justify-between gap-3 border-b border-halo-line px-4 py-2.5 md:px-6">
        <span className="eyebrow">Aperçu de vos documents</span>
        <span className="font-mono text-[11.5px] text-ink-3">D-2026-118</span>
      </div>
      <div className="relative flex flex-wrap items-start gap-4 px-4 py-4 md:px-6 md:py-5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[15px] bg-night text-[15px] font-semibold tracking-[-0.02em] text-white">{c.logoInitials || initials(c.name) || '?'}</span>
        <div className="min-w-0 flex-1">
          <div key={c.name} className="animate-[fade-in_.25s_ease_both] truncate text-[17px] font-semibold tracking-[-0.025em]">{c.name || 'Nom de votre entreprise'}</div>
          <div className="mt-0.5 truncate text-[12.5px] text-ink-2">{[c.address, c.city].filter(Boolean).join(', ') || 'Adresse'}</div>
          <div className="truncate text-[12.5px] text-ink-2">{[c.phone, c.email].filter(Boolean).join(' · ')}</div>
        </div>
        <div className="text-right text-[11.5px] leading-relaxed text-ink-3 max-sm:w-full max-sm:text-left">
          <div>SIRET <span className="font-mono text-ink-2">{c.siret || '—'}</span></div>
          <div>TVA <span className="font-mono text-ink-2">{c.vatNumber || '—'}</span></div>
          {c.rge && <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-pale-g px-2 py-0.5 font-medium text-deep-g"><ShieldCheck className="h-3 w-3" />RGE</div>}
        </div>
      </div>
    </div>
  );
}
