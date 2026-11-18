import { Check } from 'lucide-react';
import { TRADES, TRADE_BY_KEY } from '@/lib/catalog';
import type { TradeKey } from '@/lib/types';
import { HALO_TONE } from '@/components/ui';
import { TRADE_ICON, TRADE_TONE } from '@/pages/onboarding/icons';
import { PROFILS } from '@/pages/onboarding/metiers';
import { StepHeader } from '@/pages/onboarding/ui';
import type { StepProps } from './types';

const MAX_SEC = 2;

/** Étape 1 : le métier principal, puis jusqu'à deux métiers secondaires. */
export function MetierStep({ d, set, fromSite }: StepProps & { fromSite?: boolean }) {
  const pick = (k: TradeKey) => {
    if (d.trade === k) {
      // Retirer le principal : le premier secondaire prend sa place.
      const [next, ...rest] = d.secondary;
      set({ trade: next, secondary: rest });
    } else if (!d.trade) set({ trade: k, secondary: d.secondary.filter((x) => x !== k) });
    else if (d.secondary.includes(k)) set({ secondary: d.secondary.filter((x) => x !== k) });
    else set({ secondary: [...d.secondary, k].slice(-MAX_SEC) });
  };

  return (
    <>
      <StepHeader
        kicker="Étape 1 sur 5"
        title="Quel est votre métier ?"
        lead="Brix installe les calculs, les ouvrages, les prix et les modèles de devis de votre métier. Vous faites aussi autre chose ? Ajoutez jusqu'à deux métiers secondaires."
      />
      {fromSite && d.trade && (
        <div className="chip tone-green ob-rise mb-4 h-8 px-3 text-[13px]">
          <Check strokeWidth={2} aria-hidden /> Prérempli depuis le site&nbsp;: <b className="font-semibold">{TRADE_BY_KEY[d.trade].name}</b>
        </div>
      )}
      <div className="flex flex-wrap gap-2.5" role="group" aria-label="Métiers">
        {TRADES.map((t, i) => {
          const I = TRADE_ICON[t.key];
          const main = d.trade === t.key;
          const sec = d.secondary.includes(t.key);
          const tone = HALO_TONE[TRADE_TONE[t.key]];
          return (
            <button
              key={t.key}
              type="button"
              aria-pressed={main || sec}
              data-sec={sec}
              onClick={() => pick(t.key)}
              className="ob-chip ob-rise"
              style={{ animationDelay: `${i * 22}ms` }}
              title={PROFILS[t.key].vocab.slice(0, 3).join(', ')}
              aria-label={`${t.name}${main ? ', métier principal' : sec ? ', métier secondaire' : ''}`}
            >
              <span className="ob-tile" style={main ? { background: 'var(--ob-dawn)', color: '#fff', boxShadow: '0 6px 16px -6px rgba(217,70,239,.6), inset 0 1px 0 rgba(255,255,255,.25)' } : { background: tone.bg, color: tone.fg }}>
                <I className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-[14.5px] font-semibold tracking-[-0.015em]">{t.name}</span>
                {(main || sec) && <span className="text-[11.5px] font-medium text-ink-3">{main ? 'Principal' : 'En plus'}</span>}
              </span>
              {(main || sec) && (
                <span className={`ob-chip-mark ${sec ? 'sec' : ''}`} aria-hidden>
                  {sec ? '+' : <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2 5 8.6l4.6-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-5 min-h-[20px] text-[13px] text-ink-2" aria-live="polite">
        {d.trade && !d.secondary.length && 'Touchez un autre métier pour l\'ajouter en secondaire.'}
        {d.secondary.length > 0 && `Principal : ${TRADE_BY_KEY[d.trade!].name}. En plus : ${d.secondary.map((k) => TRADE_BY_KEY[k].name).join(', ')}.`}
      </p>
    </>
  );
}
