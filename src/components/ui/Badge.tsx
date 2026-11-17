import type { ReactNode } from 'react';
import { cn } from './cn';

export type Tone = 'neutral' | 'violet' | 'ok' | 'warn' | 'bad' | 'info' | 'dark' | 'peach' | 'mag';

const tones: Record<Tone, string> = {
  neutral: 'bg-sub text-ink-2 shadow-[inset_0_0_0_1px_var(--line)]',
  violet: 'bg-vi-50 text-vi-700 shadow-[inset_0_0_0_1px_#e4d8fd]',
  ok: 'bg-ok-bg text-ok shadow-[inset_0_0_0_1px_#c6efd5]',
  warn: 'bg-warn-bg text-warn shadow-[inset_0_0_0_1px_#fde3b0]',
  bad: 'bg-bad-bg text-bad shadow-[inset_0_0_0_1px_#fbd0d0]',
  info: 'bg-[#eef2ff] text-[#3730a3] shadow-[inset_0_0_0_1px_#dbe0fb]',
  dark: 'bg-ink text-white',
  peach: 'bg-peach-50 text-peach-700 shadow-[inset_0_0_0_1px_#fdd9bf]',
  mag: 'bg-mag-50 text-mag-700 shadow-[inset_0_0_0_1px_#f6d3f1]',
};

export function Badge({ tone = 'neutral', children, icon, className, dot, pulse }: { tone?: Tone; children: ReactNode; icon?: ReactNode; className?: string; dot?: boolean; pulse?: boolean }) {
  return (
    <span className={cn('inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-full px-2 text-[11.5px] font-medium [&_svg]:h-3 [&_svg]:w-3', tones[tone], className)}>
      {dot && (
        <span className="relative inline-flex h-1.5 w-1.5">
          {pulse && <span className="absolute inset-0 animate-ping2 rounded-full bg-current" />}
          <i className="relative h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {icon}
      {children}
    </span>
  );
}
