import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from './cn';

/** Position de l'onglet actif, pour faire glisser l'indicateur. */
function useIndicator(active: string) {
  const wrap = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ left: number; width: number } | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const el = wrap.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(active)}"]`);
      if (el) setBox({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, [active]);
  return { wrap, box };
}

/** Halo : pilule blanche qui glisse d'un onglet à l'autre avec un léger ressort. */
const PILL = 'absolute rounded-full bg-white shadow-pill transition-[left,width] duration-500 ease-spring';

export function Segmented<T extends string>({ value, onChange, options, className, size = 'md' }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; count?: number }[]; className?: string; size?: 'sm' | 'md' }) {
  const { wrap, box } = useIndicator(value);
  return (
    <div ref={wrap} className={cn('relative inline-flex max-w-full overflow-x-auto rounded-full bg-[#efebf7]/80 p-1 shadow-[inset_0_0_0_1px_rgba(60,30,120,.03)] scrollbar-none', className)} role="tablist">
      {box && <span aria-hidden className={cn(PILL, 'bottom-1 top-1')} style={{ left: box.left, width: box.width }} />}
      {options.map((o) => (
        <button
          key={o.value}
          data-key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'relative z-[1] flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-medium transition-colors duration-200 [&_svg]:h-4 [&_svg]:w-4',
            size === 'sm' ? 'h-7 px-3 text-[12.5px]' : 'h-8 px-3.5 text-[13px]',
            value === o.value ? 'text-ink' : 'text-ink-2 hover:text-ink',
          )}
        >
          {o.label}
          {o.count !== undefined && <span className={cn('num text-[11px] font-semibold', value === o.value ? 'text-deep-v' : 'text-ink-3')}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/**
 * Onglets de page (Halo) : pilules sans rail, l'onglet actif est une pilule blanche avec ombre qui glisse (ressort).
 * Le nom est historique (avant : soulignement) ; l'API ne change pas.
 */
export function UnderlineTabs<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; count?: number }[]; className?: string }) {
  const { wrap, box } = useIndicator(value);
  return (
    <div ref={wrap} role="tablist" className={cn('relative -mx-1 flex gap-1 overflow-x-auto px-1 py-1 scrollbar-none', className)}>
      {box && <span aria-hidden className={cn(PILL, 'bottom-1 top-1')} style={{ left: box.left, width: box.width }} />}
      {options.map((o) => (
        <button
          key={o.value}
          data-key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn('relative z-[1] flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-medium transition-colors duration-200 [&_svg]:h-4 [&_svg]:w-4', value === o.value ? 'text-ink' : 'text-ink-2 hover:bg-white/50 hover:text-ink')}
        >
          {o.label}
          {o.count !== undefined && <span className={cn('num rounded-full px-1.5 text-[11px] font-semibold leading-[18px] transition-colors', value === o.value ? 'bg-pale-v text-deep-v' : 'bg-[#ece8f6] text-ink-2')}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
