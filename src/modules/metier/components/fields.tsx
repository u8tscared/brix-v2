import { useEffect, useState, type ReactNode } from 'react';
import { Field, Input, cn } from '@/components/ui';
import { num } from '@/lib/format';

/** Champ numérique tolérant (virgule ou point), pensé pour le téléphone. */
export function NumField({ label, value, onChange, suffix, hint, min = 0, max, className }: { label: ReactNode; value: number; onChange: (v: number) => void; suffix?: string; hint?: ReactNode; min?: number; max?: number; className?: string }) {
  const [raw, setRaw] = useState(String(value).replace('.', ','));
  useEffect(() => {
    const parsed = Number(raw.replace(',', '.'));
    if (parsed !== value) setRaw(String(value).replace('.', ','));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <Field label={label} hint={hint} className={className}>
      <Input
        inputMode="decimal"
        value={raw}
        suffix={suffix}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const v = e.target.value.replace(/[^\d.,-]/g, '');
          setRaw(v);
          const n = Number(v.replace(',', '.'));
          if (v !== '' && Number.isFinite(n)) onChange(Math.min(max ?? Infinity, Math.max(min, n)));
        }}
        onBlur={() => setRaw(String(value).replace('.', ','))}
      />
    </Field>
  );
}

/** Choix en boutons (gros, lisibles), qui passent à la ligne sur téléphone. */
export function Choice<T extends string | number>({ label, value, onChange, options, hint }: { label: ReactNode; value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; hint?: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[12.5px] font-medium text-ink-2">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn('min-h-[40px] rounded-[10px] border px-3 text-[13px] font-medium transition', value === o.value ? 'border-ink bg-ink text-white' : 'border-line2 bg-white text-ink-2 hover:text-ink')}
          >
            {o.label}
          </button>
        ))}
      </div>
      {hint && <div className="mt-1.5 text-xs text-ink-3">{hint}</div>}
    </div>
  );
}

export function ResultRow({ label, value, sub, tone, strong }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: 'ok' | 'warn' | 'bad'; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-2.5 last:border-b-0">
      <div className="min-w-0">
        <div className="text-[13px] text-ink-2">{label}</div>
        {sub && <div className="text-[11.5px] text-ink-3">{sub}</div>}
      </div>
      <div className={cn('num shrink-0 text-right text-[14px]', strong ? 'font-semibold' : 'font-medium', tone === 'ok' && 'text-ok', tone === 'warn' && 'text-warn', tone === 'bad' && 'text-bad')}>{value}</div>
    </div>
  );
}

export function Note({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'ok'; children: ReactNode }) {
  return <div className={cn('rounded-[10px] px-3 py-2.5 text-[12.5px] leading-snug', tone === 'warn' ? 'bg-warn-bg text-[#8a4b05]' : tone === 'ok' ? 'bg-ok-bg text-[#0f6b33]' : 'bg-[#eef2ff] text-brand')}>{children}</div>;
}

export const n1 = (v: number) => num(v, 1);
export const n2 = (v: number) => num(v, 2);
export const n0 = (v: number) => num(v, 0);
