import { MODULES, PRIORITIES, type PriorityKey } from '@/lib/catalog';
import { Ico } from '@/pages/onboarding/icons';
import { CheckDot, StepHeader } from '@/pages/onboarding/ui';
import type { StepProps } from './types';

const MAX = 3;

/** Ce que Brix active pour chaque priorité, lu dans le catalogue. */
const activates = (p: PriorityKey) =>
  MODULES.filter((m) => m.priorities?.includes(p) && !m.core)
    .slice(0, 3)
    .map((m) => m.name)
    .join(', ');

/** Étape 3 : jusqu'à trois priorités, classées dans l'ordre où on les touche. */
export function PrioritesStep({ d, set }: StepProps) {
  const list = PRIORITIES.filter((p) => p.key !== 'equipe' || (d.size && d.size !== 'solo'));
  const toggle = (k: PriorityKey) => {
    const on = d.priorities.includes(k);
    set({ priorities: on ? d.priorities.filter((x) => x !== k) : d.priorities.length >= MAX ? [...d.priorities.slice(1), k] : [...d.priorities, k] });
  };
  return (
    <>
      <StepHeader kicker="Étape 3 sur 5" title="Qu'est-ce qui compte le plus pour vous ?" lead="Choisissez jusqu'à trois priorités, dans l'ordre. Votre cockpit les met en avant et Brix AI s'en occupe en premier." />
      <div className="mb-3 flex items-center justify-between text-[12.5px] text-ink-3">
        <span>Touchez dans l'ordre d'importance</span>
        <span className="num" aria-live="polite">{d.priorities.length} sur {MAX}</span>
      </div>
      <div className="grid gap-2.5">
        {list.map((p, i) => {
          const rank = d.priorities.indexOf(p.key);
          const on = rank >= 0;
          const sub = activates(p.key);
          return (
            <button
              key={p.key}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(p.key)}
              className="ob-card ob-rise flex min-h-[68px] items-center gap-3.5 px-4 py-3 pr-12"
              style={{ animationDelay: `${i * 35}ms` }}
            >
              <span className="ob-tile" style={{ width: 40, height: 40, borderRadius: 12, background: on ? 'var(--ob-dawn)' : '#f1eafe', color: on ? '#fff' : '#6d28d9', boxShadow: on ? '0 6px 16px -6px rgba(217,70,239,.6)' : 'none' }}>
                <Ico name={p.icon} className="h-[19px] w-[19px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-[14.5px] font-semibold tracking-[-0.01em]">{p.label}</span>
                {sub && <span className="mt-0.5 block truncate text-[12.5px] text-ink-3">{sub}</span>}
              </span>
              {on && (
                <CheckDot mid>
                  <span className="num text-[11px] font-semibold">{rank + 1}</span>
                </CheckDot>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
