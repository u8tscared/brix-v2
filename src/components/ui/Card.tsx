import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export function Card({ className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-[14px] border border-line bg-white', className)} {...p} />;
}

export function CardHeader({ title, meta, action, icon, className }: { title: ReactNode; meta?: ReactNode; action?: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-h-[48px] items-center gap-2.5 border-b border-line px-4', className)}>
      {icon}
      <h4 className="text-[13.5px] font-semibold">{title}</h4>
      {meta && <span className="truncate text-xs text-ink-3">{meta}</span>}
      <div className="flex-1" />
      {action}
    </div>
  );
}
