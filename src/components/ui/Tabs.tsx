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

export function Segmented<T extends string>({ value, onChange, options, className, size = 'md' }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; count?: number }[]; className?: string; size?: 'sm' | 'md' }) {
  const { wrap, box } = useIndicator(value);
  return (
    <div ref={wrap} className={cn('relative inline-flex max-w-full overflow-x-auto rounded-[11px] bg-[#efedf5] p-[3px] scrollbar-none', className)} role="tablist">
      {box && <span aria-hidden className="absolute bottom-[3px] top-[3px] rounded-[8px] bg-white shadow-[0_1px_2px_rgba(19,15,38,.1),0_0_0_1px_rgba(19,15,38,.04)] transition-[left,width] duration-300 ease-out-quint" style={{ left: box.left, width: box.width }} />}
      {options.map((o) => (
        <button
          key={o.value}
          data-key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'relative z-[1] flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[8px] px-3 font-medium transition-colors duration-200',
            size === 'sm' ? 'h-7 text-[12.5px]' : 'h-8 text-[13px]',
            value === o.value ? 'text-ink' : 'text-ink-2 hover:text-ink',
          )}
        >
          {o.label}
          {o.count !== undefined && <span className={cn('num text-[11px] font-semibold', value === o.value ? 'text-vi-700' : 'text-ink-3')}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function UnderlineTabs<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; count?: number }[]; className?: string }) {
  const { wrap, box } = useIndicator(value);
  return (
    <div ref={wrap} className={cn('relative flex gap-6 overflow-x-auto border-b border-line scrollbar-none', className)}>
      {options.map((o) => (
        <button key={o.value} data-key={o.value} onClick={() => onChange(o.value)} className={cn('relative flex h-11 shrink-0 items-center gap-1.5 text-[13.5px] font-medium transition-colors', value === o.value ? 'text-ink' : 'text-ink-2 hover:text-ink')}>
          {o.label}
          {o.count !== undefined && <span className={cn('num rounded-full px-1.5 text-[11px] font-semibold', value === o.value ? 'bg-ink text-white' : 'bg-sub text-ink-2')}>{o.count}</span>}
        </button>
      ))}
      {box && <span aria-hidden className="absolute -bottom-px h-[2px] rounded-full bg-ink transition-[left,width] duration-300 ease-out-quint" style={{ left: box.left, width: box.width }} />}
    </div>
  );
}
