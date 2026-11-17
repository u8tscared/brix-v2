import { LayoutDashboard } from 'lucide-react';
import { Wordmark } from '@/components/brand/Logo';
import { Icon, cn } from '@/components/ui';
import { DEPARTMENTS, MODULES, SIZES, TRADE_BY_KEY, type ModuleKey } from '@/lib/catalog';
import type { CompanySize, TradeKey } from '@/lib/types';

/** Aperçu en direct du menu de l'app qui se construit pendant l'onboarding. */
export function OnboardingPreview({ trade, size, enabled, companyName }: { trade?: TradeKey; size?: CompanySize; enabled: ModuleKey[]; companyName: string }) {
  const t = trade ? TRADE_BY_KEY[trade] : undefined;
  const sz = SIZES.find((s) => s.key === size);
  const on = new Set(enabled);
  return (
    <div className="relative w-[300px] rounded-[18px] border border-white/80 bg-white/70 p-3 shadow-pop backdrop-blur-xl">
      <div className="flex items-center justify-between px-2 pb-3 pt-1">
        <Wordmark className="h-5" />
        {sz && <span className="rounded-full bg-vi-50 px-2 py-0.5 text-[10.5px] font-semibold text-vi-700">Mode {sz.mode}</span>}
      </div>
      <div className="mb-2 flex h-9 items-center gap-2 rounded-lg px-2">
        <span className="grid h-[22px] w-[22px] place-items-center rounded-md bg-vi-100 text-[10px] font-bold text-vi-700">{(companyName || 'B').slice(0, 2).toUpperCase()}</span>
        <b className="truncate text-[12.5px] font-semibold">{companyName || 'Votre entreprise'}</b>
      </div>
      <div className="flex h-8 items-center gap-2 rounded-[7px] bg-white px-2 text-[12.5px] font-medium shadow-[0_0_0_1px_var(--line2)]">
        <LayoutDashboard className="h-4 w-4 text-vi-700" /> Cockpit
      </div>
      <div className="mt-1 max-h-[440px] space-y-0.5 overflow-hidden">
        {t && (
          <div className="animate-fade-up">
            <h6 className="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[.05em] text-ink-3">{t.name}</h6>
            {t.tools.slice(0, 3).map((x) => (
              <div key={x.key} className="flex h-7 items-center gap-2 px-2 text-[12px] font-medium text-ink-2">
                <Icon name={x.icon} className="h-3.5 w-3.5 text-ink-3" /> {x.name}
              </div>
            ))}
          </div>
        )}
        {DEPARTMENTS.map((d) => {
          const mods = MODULES.filter((m) => m.dept === d.key && on.has(m.key) && m.key !== 'outils_metier');
          if (!mods.length) return null;
          return (
            <div key={d.key}>
              <h6 className="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[.05em] text-ink-3">{d.name}</h6>
              {mods.map((m) => (
                <div key={m.key} className={cn('flex h-7 animate-fade-up items-center gap-2 px-2 text-[12px] font-medium text-ink-2')}>
                  <Icon name={m.icon} className="h-3.5 w-3.5 text-ink-3" /> {m.name}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <div className="pointer-events-none absolute inset-x-3 bottom-3 h-16 rounded-b-[14px] bg-gradient-to-t from-white/95 to-transparent" />
    </div>
  );
}
