import { Icon, cn, DEPT_TONE } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { DEPARTMENTS, MODULES } from '@/lib/catalog';

/** Aperçu du menu (grand écran) : un module activé y glisse et s'éclaire un instant. */
export function MenuPreview({ fresh }: { fresh: string | null }) {
  const enabled = useBrix((s) => s.enabled);
  const on = MODULES.filter((m) => m.core || enabled.includes(m.key));
  return (
    <aside className="sticky top-4 hidden 2xl:block">
      <div className="eyebrow mb-2 px-1">Votre menu</div>
      <div className="max-h-[calc(100dvh-120px)] overflow-y-auto rounded-[16px] bg-[#f1eff7] p-2 shadow-[inset_0_0_0_1px_var(--line)] scrollbar-thin">
        {DEPARTMENTS.map((d) => {
          const items = on.filter((m) => m.dept === d.key);
          if (!items.length) return null;
          return (
            <div key={d.key} className="mb-2 last:mb-0">
              <div className="flex items-center gap-1.5 px-2 pb-1 pt-1.5 text-[10.5px] font-medium uppercase tracking-[.08em] text-ink-3">
                <i className="h-1.5 w-1.5 rounded-full" style={{ background: DEPT_TONE[d.key].solid }} />
                {d.name}
              </div>
              {items.map((m) => {
                const isFresh = fresh === m.key;
                return (
                  <div
                    key={m.key}
                    className={cn('flex h-8 items-center gap-2 rounded-[8px] px-2 text-[12.5px] text-ink-2 transition-colors duration-700', isFresh && 'animate-[slide-left_.45s_var(--ease)_both] bg-white font-medium text-ink shadow-xs')}
                  >
                    <Icon name={m.icon} className="h-3.5 w-3.5 shrink-0" style={isFresh ? { color: DEPT_TONE[m.dept].fg } : undefined} />
                    <span className="truncate">{m.name}</span>
                    {isFresh && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: DEPT_TONE[m.dept].solid }} />}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
