import type { ReactNode } from 'react';
import { cn } from './cn';

export function Segmented<T extends string>({ value, onChange, options, className, size = 'md' }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; count?: number }[]; className?: string; size?: 'sm' | 'md' }) {
  return (
    <div className={cn('inline-flex max-w-full overflow-x-auto rounded-[10px] border border-line bg-sub p-0.5 scrollbar-none', className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 font-medium transition',
            size === 'sm' ? 'h-7 text-xs' : 'h-8 text-[13px]',
            value === o.value ? 'bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,.08)]' : 'text-ink-2 hover:text-ink',
          )}
        >
          {o.label}
          {o.count !== undefined && <span className={cn('text-[11px] font-semibold', value === o.value ? 'text-vi-700' : 'text-ink-3')}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function UnderlineTabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; count?: number }[] }) {
  return (
    <div className="flex gap-5 overflow-x-auto border-b border-line scrollbar-none">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} className={cn('relative flex h-10 shrink-0 items-center gap-1.5 text-[13.5px] font-medium transition', value === o.value ? 'text-ink' : 'text-ink-2 hover:text-ink')}>
          {o.label}
          {o.count !== undefined && <span className="rounded-full bg-sub px-1.5 text-[11px] text-ink-2">{o.count}</span>}
          {value === o.value && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded bg-ink" />}
        </button>
      ))}
    </div>
  );
}
