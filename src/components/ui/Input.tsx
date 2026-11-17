import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from './cn';

const base = 'w-full rounded-[10px] border border-line2 bg-white px-3 text-[14px] text-ink placeholder:text-ink-3 transition focus:border-vi-300 focus:outline-none focus:ring-4 focus:ring-vi-100 disabled:bg-sub';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode; suffix?: ReactNode }>(function Input({ className, icon, suffix, ...p }, ref) {
  if (!icon && !suffix) return <input ref={ref} className={cn(base, 'h-11', className)} {...p} />;
  return (
    <div className={cn('relative flex items-center', className)}>
      {icon && <span className="pointer-events-none absolute left-3 text-ink-3 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>}
      <input ref={ref} className={cn(base, 'h-11', icon && 'pl-9', suffix && 'pr-12')} {...p} />
      {suffix && <span className="absolute right-3 text-[13px] text-ink-3">{suffix}</span>}
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} className={cn(base, !/(^|\s)min-h-/.test(className ?? '') && 'min-h-[96px]', 'py-2.5 leading-relaxed', className)} {...p} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...p }, ref) {
  return (
    <select ref={ref} className={cn(base, 'h-11 appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 fill=%27none%27 stroke=%27%239898a8%27 stroke-width=%272%27 viewBox=%270 0 24 24%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E")] bg-[right_10px_center] bg-no-repeat pr-9', className)} {...p}>
      {children}
    </select>
  );
});

export function Field({ label, hint, children, className }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-ink-3">{hint}</span>}
    </label>
  );
}
