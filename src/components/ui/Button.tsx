import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from './cn';

type Variant = 'primary' | 'dawn' | 'secondary' | 'ghost' | 'danger' | 'soft';
type Size = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  kbd?: string;
}

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-black shadow-[0_1px_2px_rgba(0,0,0,.2),inset_0_1px_0_rgba(255,255,255,.12)]',
  dawn: 'bg-dawn text-white font-semibold shadow-dawn hover:brightness-105 relative overflow-hidden',
  secondary: 'bg-white text-ink border border-line2 hover:bg-sub shadow-[0_1px_0_var(--line2)]',
  ghost: 'text-ink-2 hover:bg-sub hover:text-ink',
  danger: 'bg-white text-bad border border-line2 hover:bg-bad-bg',
  soft: 'bg-vi-50 text-vi-700 hover:bg-vi-100',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-[10px]',
  lg: 'h-12 px-5 text-[15px] gap-2 rounded-xl',
  icon: 'h-10 w-10 rounded-[10px] justify-center',
  'icon-sm': 'h-8 w-8 rounded-lg justify-center',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, icon, kbd, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 items-center whitespace-nowrap font-medium transition-[background,box-shadow,transform,filter] duration-150 active:scale-[.98] disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {variant === 'dawn' && <span className="pointer-events-none absolute inset-y-0 w-10 -skew-x-12 animate-shine bg-gradient-to-r from-transparent via-white/40 to-transparent" />}
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
      {kbd && (
        <kbd className={cn('ml-1 hidden h-5 min-w-5 place-items-center rounded-[5px] px-1 text-[11px] font-medium lg:inline-grid', variant === 'dawn' || variant === 'primary' ? 'border border-white/30 bg-white/20 text-white' : 'border border-line2 bg-white text-ink-2')}>
          {kbd}
        </kbd>
      )}
    </button>
  );
});
