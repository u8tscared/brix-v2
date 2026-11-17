import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export function Card({ className, interactive, ...p }: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return <div className={cn('rounded-[16px] bg-white shadow-card', interactive && 'lift cursor-pointer', className)} {...p} />;
}

export function CardHeader({ title, meta, action, icon, className }: { title: ReactNode; meta?: ReactNode; action?: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-h-[52px] items-center gap-2.5 border-b border-line px-4 md:px-5', className)}>
      {icon}
      <h4 className="text-[14px] font-semibold tracking-[-0.015em]">{title}</h4>
      {meta && <span className="truncate text-[12.5px] text-ink-3">{meta}</span>}
      <div className="flex-1" />
      {action}
    </div>
  );
}
