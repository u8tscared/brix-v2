import { useState } from 'react';
import { Building2, Check, Loader2, Search } from 'lucide-react';
import { OFFERS, SIZES } from '@/lib/catalog';
import { recommendedPlan } from '@/pages/onboarding/draft';
import { SIZE_ICON } from '@/pages/onboarding/icons';
import { CheckDot, StepHeader } from '@/pages/onboarding/ui';
import type { StepProps } from './types';

const SHORT: Record<string, string> = { solo: 'Solo', petite: '2 à 9', pme: '10 à 49', grande: '50 et plus' };
const SUB: Record<string, string> = { solo: 'Je travaille seul', petite: 'Petite équipe', pme: 'PME', grande: 'Grande entreprise' };

// Recherche simulée (en réel : API Sirene de l'INSEE via le worker).
const lookup = (q: string) => {
  const digits = q.replace(/\s/g, '');
  const isSiret = /^\d{9,14}$/.test(digits);
  const name = isSiret ? 'Entreprise trouvée' : q.trim().replace(/\s+/g, ' ').replace(/(^|\s)\p{L}/gu, (m) => m.toUpperCase());
  return {
    companyName: name,
    siret: isSiret ? digits.padEnd(14, '0').slice(0, 14) : '9' + String(Math.floor(Math.random() * 1e13)).padStart(13, '0'),
    address: '8 rue de la République',
    city: '69001 Lyon',
  };
};

const price = (p: number | null) => (p === null ? 'Sur devis' : p === 0 ? 'Gratuit' : `${String(p).replace('.', ',')} € HT/mois`);

/** Étape 2 : l'entreprise (nom ou SIRET) et sa taille, avec l'offre qui lui correspond. */
export function EntrepriseStep({ d, set }: StepProps) {
  const [q, setQ] = useState(d.siret ? '' : d.companyName);
  const [loading, setLoading] = useState(false);
  const found = !!d.siret;
  const search = () => {
    if (q.trim().length < 2) return;
    setLoading(true);
    setTimeout(() => {
      set(lookup(q));
      setLoading(false);
    }, 650);
  };
  const reco = recommendedPlan(d);
  const chosen = d.plan ?? reco;
  const offer = OFFERS.find((o) => o.key === chosen)!;

  return (
    <>
      <StepHeader kicker="Étape 2 sur 5" title="Votre entreprise" lead="Son nom ou son SIRET suffit : adresse, TVA et mentions des devis se remplissent seules. Puis dites-nous combien vous êtes." />

      {!found ? (
        <div>
          <label htmlFor="ob-q" className="ob-label">Nom de l'entreprise ou SIRET</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-3" strokeWidth={1.75} aria-hidden />
            <input
              id="ob-q"
              data-enter="ignore"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                set({ companyName: e.target.value });
              }}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="Ex. Dubois Plomberie ou 852 123 456"
              className="ob-input pl-11 pr-[116px]"
              autoComplete="organization"
            />
            <button type="button" onClick={search} disabled={q.trim().length < 2} className="ob-btn ob-btn-ink absolute right-1.5 top-1.5 h-[38px] rounded-[10px] px-3.5 text-[13.5px]">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Recherche" /> : 'Rechercher'}
            </button>
          </div>
          <p className="mt-2 text-[12.5px] text-ink-3">Vous pouvez aussi garder le nom tel quel et compléter plus tard.</p>
        </div>
      ) : (
        <div className="ob-rise flex items-start gap-3 rounded-card-sm bg-white p-4 shadow-halo-sm">
          <span className="ob-tile" style={{ width: 40, height: 40, borderRadius: 12, background: '#e5f6ef', color: '#0f8a5f' }}>
            <Building2 className="h-[19px] w-[19px]" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <label className="sr-only" htmlFor="ob-name">Nom de l'entreprise</label>
            <input id="ob-name" value={d.companyName} onChange={(e) => set({ companyName: e.target.value })} className="w-full bg-transparent text-[15px] font-semibold tracking-[-0.01em] outline-none" />
            <div className="mt-0.5 text-[12.5px] leading-snug text-ink-2">
              <span className="bx-mono">{d.siret.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, '$1 $2 $3 $4')}</span> · {d.address}, {d.city}
            </div>
            <div className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-[#0f8a5f]"><Check className="h-3.5 w-3.5" strokeWidth={2.2} /> Trouvée dans le répertoire Sirene</div>
          </div>
          <button type="button" onClick={() => { set({ siret: '', address: '', city: '' }); setQ(d.companyName); }} className="-my-2 -mr-2 h-11 rounded-xl px-3 text-[12.5px] font-medium text-ink-2 hover:bg-[#f3f1f8]">Modifier</button>
        </div>
      )}

      <h2 className="mb-3 mt-9 text-[15px] font-semibold tracking-[-0.01em]" id="ob-size">Combien êtes-vous ?</h2>
      <div role="radiogroup" aria-labelledby="ob-size" className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {SIZES.map((s) => {
          const I = SIZE_ICON[s.key];
          const on = d.size === s.key;
          return (
            <button key={s.key} type="button" role="radio" aria-checked={on} onClick={() => set({ size: s.key, plan: undefined })} className="ob-card flex min-h-[104px] flex-col items-start p-3.5">
              <I className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              <span className="num mt-auto pt-3 text-[18px] font-semibold tracking-[-0.03em]">{SHORT[s.key]}</span>
              <span className="text-[12px] text-ink-3">{SUB[s.key]}</span>
              {on && <CheckDot />}
            </button>
          );
        })}
      </div>
      {d.size && <p key={d.size} className="ob-rise mt-3 text-[13px] leading-relaxed text-ink-2">{SIZES.find((s) => s.key === d.size)!.hint}</p>}

      {d.size && (
        <section key={`o${d.size}`} className="ob-rise mt-7 rounded-[20px] bg-white p-5 shadow-halo-sm" aria-label="Offre conseillée">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[12.5px] font-medium text-ink-3">{chosen === reco ? 'Offre conseillée pour vous' : 'Offre choisie'}</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-[22px] font-semibold tracking-[-0.03em]">{offer.name}</span>
                <span className="num text-[14px] text-ink-2">{price(offer.price)}</span>
              </div>
            </div>
            <span className="rounded-full bg-[#f3f1f8] px-2.5 py-1 text-[11.5px] font-medium text-ink-2">14 jours offerts</span>
          </div>
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {offer.includes.slice(0, 4).map((x) => (
              <li key={x} className="flex items-start gap-2 text-[13px] leading-snug text-ink-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink" strokeWidth={2.2} aria-hidden /> {x}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-[#f0edf7] pt-4" role="radiogroup" aria-label="Choisir une autre offre">
            <span className="mr-1 text-[12.5px] text-ink-3">Ou choisissez</span>
            {OFFERS.map((o) => (
              <button
                key={o.key}
                type="button"
                role="radio"
                aria-checked={chosen === o.key}
                onClick={() => set({ plan: o.key === reco ? undefined : o.key })}
                className={`h-9 rounded-full px-3.5 text-[13px] font-medium transition ${chosen === o.key ? 'bg-ink text-white shadow-ink' : 'bg-[#f3f1f8] text-ink-2 hover:text-ink'}`}
              >
                {o.name}
              </button>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[12px] text-ink-3">
            Sans carte bancaire, sans engagement. Vous changez d'offre quand vous voulez.
          </p>
        </section>
      )}
    </>
  );
}
