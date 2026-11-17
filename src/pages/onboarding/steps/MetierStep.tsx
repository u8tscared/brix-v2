import { Check } from 'lucide-react';
import { TRADES, TRADE_BY_KEY } from '@/lib/catalog';
import type { TradeKey } from '@/lib/types';
import { TRADE_ICON } from '@/pages/onboarding/icons';
import { PROFILS } from '@/pages/onboarding/metiers';
import { CheckDot, StepHeader } from '@/pages/onboarding/ui';
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
        <div className="ob-rise mb-4 flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-[13px] text-[#5f5f70] shadow-[0_0_0_1px_#ececf1]">
          <Check className="h-4 w-4 text-[#16a34a]" strokeWidth={2} aria-hidden /> Prérempli depuis le site&nbsp;: <b className="font-medium text-[#130f26]">{TRADE_BY_KEY[d.trade].name}</b>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3" role="group" aria-label="Métiers">
        {TRADES.map((t, i) => {
          const I = TRADE_ICON[t.key];
          const main = d.trade === t.key;
          const sec = d.secondary.includes(t.key);
          return (
            <button
              key={t.key}
              type="button"
              aria-pressed={main || sec}
              data-sec={sec}
              onClick={() => pick(t.key)}
              className="ob-card ob-rise flex min-h-[112px] flex-col items-start p-3.5"
              style={{ animationDelay: `${i * 22}ms` }}
              aria-label={`${t.name}${main ? ', métier principal' : sec ? ', métier secondaire' : ''}`}
            >
              <span
                className="ob-tile"
                style={{ width: 40, height: 40, borderRadius: 12, background: main ? '#130f26' : sec ? '#f3edff' : '#f4f3fa', color: main ? '#fff' : sec ? '#6d28d9' : '#130f26' }}
              >
                <I className="h-[19px] w-[19px]" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="mt-auto pt-3 text-[14px] font-semibold leading-tight tracking-[-0.01em]">{t.name}</span>
              <span className="mt-1 line-clamp-1 text-[12px] text-[#9898a8]">
                {main ? 'Métier principal' : sec ? 'Métier secondaire' : PROFILS[t.key].vocab.slice(0, 2).join(', ')}
              </span>
              {(main || sec) && (
                <CheckDot>
                  {sec ? <span className="text-[10px] font-semibold">+</span> : undefined}
                </CheckDot>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-4 min-h-[20px] text-[13px] text-[#5f5f70]" aria-live="polite">
        {d.trade && !d.secondary.length && 'Touchez un autre métier pour l\'ajouter en secondaire.'}
        {d.secondary.length > 0 && `Principal : ${TRADE_BY_KEY[d.trade!].name}. En plus : ${d.secondary.map((k) => TRADE_BY_KEY[k].name).join(', ')}.`}
      </p>
    </>
  );
}
