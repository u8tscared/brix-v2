import { AlertTriangle, ArrowRight, X } from 'lucide-react';
import { cn } from '@/components/ui';
import { DrawCheck, Ring } from '@/components/motion';
import { checkScore, type CheckItem, type FixTarget } from '../../checks';

export function CheckIcon({ state, delay = 0 }: { state: CheckItem['state']; delay?: number }) {
  if (state === 'ok')
    return (
      <span className="grid h-[22px] w-[22px] shrink-0 animate-pop place-items-center rounded-full bg-ok text-white" style={{ animationDelay: `${delay}ms` }}>
        <DrawCheck className="h-3.5 w-3.5" delay={delay + 120} strokeWidth={3} />
      </span>
    );
  return (
    <span className={cn('grid h-[22px] w-[22px] shrink-0 animate-pop place-items-center rounded-full', state === 'warn' ? 'bg-warn-bg text-warn shadow-[inset_0_0_0_1px_#fde3b0]' : 'bg-bad-bg text-bad shadow-[inset_0_0_0_1px_#fbd0d0]')} style={{ animationDelay: `${delay}ms` }}>
      {state === 'warn' ? <AlertTriangle className="h-3 w-3" strokeWidth={2.2} /> : <X className="h-3 w-3" strokeWidth={2.6} />}
    </span>
  );
}

/** Résumé chiffré : anneau + phrase. */
export function CheckSummary({ items, compact }: { items: CheckItem[]; compact?: boolean }) {
  const s = checkScore(items);
  const todo = s.bad + s.warn;
  return (
    <div className="flex items-center gap-3">
      <Ring value={(s.ok / Math.max(1, s.total)) * 100} size={compact ? 36 : 46} stroke={compact ? 3.5 : 4} tone={s.bad ? 'warn' : todo ? 'vi' : 'ok'}>
        <span className={compact ? 'text-[10px]' : 'text-[11.5px]'}>
          {s.ok}/{s.total}
        </span>
      </Ring>
      <div className="min-w-0">
        <div className="text-[14.5px] font-semibold tracking-[-0.015em]">{todo ? 'Avant d’envoyer' : 'Prêt à partir'}</div>
        <div className={cn('text-[12.5px]', s.bad ? 'text-bad' : todo ? 'text-warn' : 'text-ok')}>
          {s.bad ? `${s.bad} point${s.bad > 1 ? 's' : ''} à corriger` : todo ? `${todo} point${todo > 1 ? 's' : ''} à vérifier` : 'Tout est en ordre'}
          {s.bad > 0 && s.warn > 0 && <span className="text-warn">, {s.warn} à vérifier</span>}
        </div>
      </div>
    </div>
  );
}

/** Liste de vérification avant envoi, chaque point renvoie au champ concerné. */
export function CheckList({ items, onFix, className }: { items: CheckItem[]; onFix?: (t: FixTarget) => void; className?: string }) {
  const sorted = [...items].sort((a, b) => rank(a.state) - rank(b.state));
  return (
    <ul className={cn('space-y-1', className)}>
      {sorted.map((it, i) => (
        <li key={it.key} className="flex animate-[fade-up_.4s_var(--ease)_both] items-start gap-3 rounded-[12px] px-2.5 py-2.5 transition-colors hover:bg-[#f7f6fb]" style={{ animationDelay: `${120 + i * 45}ms` }}>
          <CheckIcon state={it.state} delay={160 + i * 45} />
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-medium leading-tight">{it.label}</div>
            <div className="mt-0.5 text-[12.5px] leading-snug text-ink-2">{it.detail}</div>
          </div>
          {it.state !== 'ok' && it.fix && onFix && (
            <button onClick={() => onFix(it.fix!)} className="group/fix -my-0.5 inline-flex h-8 shrink-0 items-center gap-1 rounded-[8px] px-2 text-[12.5px] font-medium text-vi-700 transition hover:bg-vi-50 max-md:h-10">
              {it.fixLabel ?? 'Corriger'}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/fix:translate-x-0.5" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

const rank = (s: CheckItem['state']) => (s === 'bad' ? 0 : s === 'warn' ? 1 : 2);
