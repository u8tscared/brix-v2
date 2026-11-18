import { useState } from 'react';
import { Lock, RotateCcw } from 'lucide-react';
import { DEPARTMENTS, MODULES, OFFERS, planIncludes, sizeAtLeast, type ModuleKey } from '@/lib/catalog';
import { recommendedPlan } from '@/pages/onboarding/draft';
import { DEPT_ICON, Tile, TONE } from '@/pages/onboarding/icons';
import { CountUp, StepHeader, Toggle } from '@/pages/onboarding/ui';
import type { StepProps } from './types';

/** Étape 4 : les outils cochés d'office d'après le métier, la taille et les priorités. */
export function ModulesStep({ d, set, touched, onReset }: StepProps & { touched: boolean; onReset: () => void }) {
  const size = d.size ?? 'solo';
  const [showTeam, setShowTeam] = useState(false);
  const hidden = MODULES.filter((m) => !sizeAtLeast(size, m.minSize) && !d.enabled.includes(m.key));
  const plan = d.plan ?? recommendedPlan(d);
  const offer = OFFERS.find((o) => o.key === plan)!;
  const flip = (k: ModuleKey, v: boolean) => set({ enabled: v ? [...d.enabled, k] : d.enabled.filter((x) => x !== k) });

  return (
    <>
      <StepHeader kicker="Étape 4 sur 5" title="Votre Brix, sur mesure" lead="On a coché ce qui vous sert dès demain. Retirez ou ajoutez librement : un outil s'active en un geste, à tout moment." />

      <div className="mb-6 flex items-center gap-4 rounded-[20px] bg-white p-4 shadow-halo-sm">
        <div className="text-[34px] font-semibold leading-none tracking-[-0.04em]"><CountUp value={d.enabled.length} /></div>
        <div className="min-w-0 flex-1 text-[13px] leading-snug text-ink-2">
          outils dans votre menu<br />
          Offre <b className="font-semibold text-ink">{offer.name}</b>, 14 jours d'essai complet
        </div>
        {touched && (
          <button type="button" onClick={onReset} className="ob-btn ob-btn-ghost h-11 gap-1.5 px-3 text-[13px]" title="Revenir à la sélection conseillée">
            <RotateCcw className="h-4 w-4" strokeWidth={1.75} aria-hidden /> <span className="hidden sm:inline">Conseillé</span>
          </button>
        )}
      </div>

      <div className="space-y-6">
        {DEPARTMENTS.map((dep) => {
          const mods = MODULES.filter((m) => m.dept === dep.key && (showTeam || !hidden.includes(m)));
          if (!mods.length) return null;
          const DI = DEPT_ICON[dep.key];
          const n = mods.filter((m) => d.enabled.includes(m.key)).length;
          return (
            <section key={dep.key} aria-labelledby={`ob-d-${dep.key}`}>
              <div className="mb-2.5 flex items-center gap-2 px-1">
                <DI className="h-4 w-4" style={{ color: TONE[dep.key].fg }} strokeWidth={1.75} aria-hidden />
                <h2 id={`ob-d-${dep.key}`} className="text-[14px] font-semibold tracking-[-0.01em]">{dep.name}</h2>
                <span className="text-[12.5px] text-ink-3">{dep.tagline}</span>
                <span className="num ml-auto text-[12px] text-ink-3">{n}/{mods.length}</span>
              </div>
              <div className="overflow-hidden rounded-card bg-white shadow-halo-sm">
                {mods.map((m) => {
                  const on = d.enabled.includes(m.key);
                  const fits = sizeAtLeast(size, m.minSize);
                  return (
                    <div
                      key={m.key}
                      onClick={() => !m.core && flip(m.key, !on)}
                      className={`flex min-h-[64px] items-center gap-3 border-b border-[#f0edf7] px-4 py-3 last:border-0 ${m.core ? '' : 'cursor-pointer hover:bg-[#fbfbfd]'}`}
                    >
                      <span style={{ opacity: on ? 1 : 0.55, filter: on ? 'none' : 'grayscale(1)', transition: 'opacity .3s, filter .3s' }}>
                        <Tile dept={dep.key} name={m.icon} size={34} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5 text-[14px] font-semibold tracking-[-0.01em]">
                          {m.name}
                          {m.isNew && <span className="rounded-md bg-[#f3f1f8] px-1.5 py-0.5 text-[10.5px] font-medium text-ink-2">Nouveau</span>}
                          {!planIncludes(plan, m.plan) && <span className="rounded-md bg-[#fff1e7] px-1.5 py-0.5 text-[10.5px] font-medium text-[#c2410c]">Offre {OFFERS.find((o) => o.key === m.plan)!.name}</span>}
                        </span>
                        <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-3">{fits ? m.short : 'Utile à partir de 2 personnes.'}</span>
                      </span>
                      {m.core ? (
                        <span className="inline-flex items-center gap-1 text-[12px] text-ink-3"><Lock className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Inclus</span>
                      ) : (
                        <Toggle on={on} onChange={(v) => flip(m.key, v)} label={m.name} />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
        {hidden.length > 0 && (
          <button type="button" onClick={() => setShowTeam(!showTeam)} className="ob-btn ob-btn-line h-12 w-full text-[13.5px]">
            {showTeam ? 'Masquer les outils pour les équipes' : `Voir aussi ${hidden.length} outils pour les équipes`}
          </button>
        )}
      </div>
    </>
  );
}
