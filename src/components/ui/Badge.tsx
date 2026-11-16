import type { ReactNode } from 'react';
import { cn } from './cn';

export type Tone = 'neutral' | 'violet' | 'ok' | 'warn' | 'bad' | 'info' | 'dark';

const tones: Record<Tone, string> = {
  neutral: 'bg-sub text-ink-2 border-line',
  violet: 'bg-vi-50 text-vi-700 border-vi-100',
  ok: 'bg-ok-bg text-ok border-[#c9f0d6]',
  warn: 'bg-warn-bg text-warn border-[#fde3b5]',
  bad: 'bg-bad-bg text-bad border-[#fbd1d1]',
  info: 'bg-[#eef2ff] text-brand border-[#dbe2fb]',
  dark: 'bg-ink text-white border-ink',
};

export function Badge({ tone = 'neutral', children, icon, className, dot }: { tone?: Tone; children: ReactNode; icon?: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn('inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-full border px-2 text-[11.5px] font-medium [&_svg]:h-3 [&_svg]:w-3', tones[tone], className)}>
      {dot && <i className="h-1.5 w-1.5 rounded-full bg-current" />}
      {icon}
      {children}
    </span>
  );
}
