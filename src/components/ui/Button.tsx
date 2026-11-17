import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from './cn';

type Variant = 'primary' | 'dawn' | 'secondary' | 'ghost' | 'danger' | 'soft' | 'link';
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  kbd?: string;
}

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-white shadow-ink hover:bg-[#241f3f]',
  dawn: 'bg-dawn text-white font-semibold shadow-dawn hover:brightness-[1.06] hover:shadow-[0_10px_24px_-8px_rgba(190,60,200,.65),inset_0_1px_0_rgba(255,255,255,.3)] relative overflow-hidden',
  secondary: 'bg-white text-ink shadow-[0_0_0_1px_var(--line2),0_1px_2px_rgba(19,15,38,.05)] hover:shadow-[0_0_0_1px_#cfcbdd,0_2px_6px_-2px_rgba(19,15,38,.1)]',
  ghost: 'text-ink-2 hover:bg-[#efedf5] hover:text-ink',
  danger: 'bg-white text-bad shadow-[0_0_0_1px_var(--line2)] hover:bg-bad-bg hover:shadow-[0_0_0_1px_#fbd0d0]',
  soft: 'bg-vi-50 text-vi-700 hover:bg-vi-100',
  link: 'text-vi-700 hover:text-vi-900 underline-offset-4 hover:underline !px-0 !h-auto',
};

const sizes: Record<Size, string> = {
  xs: 'h-7 px-2.5 text-[12.5px] gap-1 rounded-[8px] [&_svg]:h-3.5 [&_svg]:w-3.5',
  sm: 'h-8 max-md:h-10 px-3 text-[13px] gap-1.5 rounded-[9px] [&_svg]:h-4 [&_svg]:w-4',
  md: 'h-10 px-4 text-[14px] gap-2 rounded-[11px] [&_svg]:h-4 [&_svg]:w-4',
  lg: 'h-12 px-5 text-[15px] gap-2 rounded-[13px] [&_svg]:h-[18px] [&_svg]:w-[18px]',
  icon: 'h-10 w-10 rounded-[11px] justify-center [&_svg]:h-[18px] [&_svg]:w-[18px]',
  'icon-sm': 'h-8 w-8 max-md:h-10 max-md:w-10 rounded-[9px] justify-center [&_svg]:h-4 [&_svg]:w-4',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, icon, iconRight, kbd, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'group/btn inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium tracking-[-0.01em] transition-[background,box-shadow,transform,filter,color] duration-200 ease-out-quint active:scale-[.97] disabled:pointer-events-none disabled:opacity-45',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {variant === 'dawn' && <span className="pointer-events-none absolute inset-y-0 w-12 -skew-x-12 animate-shine bg-gradient-to-r from-transparent via-white/35 to-transparent" />}
      {loading ? <Loader2 className="animate-spin" /> : icon}
      {children}
      {iconRight && <span className="-mr-0.5 transition-transform duration-200 ease-out-quint group-hover/btn:translate-x-0.5">{iconRight}</span>}
      {kbd && (
        <kbd className={cn('ml-0.5 hidden h-5 min-w-5 place-items-center rounded-[5px] px-1 font-sans text-[11px] font-medium lg:inline-grid', variant === 'dawn' || variant === 'primary' ? 'bg-white/20 text-white/90' : 'bg-sub text-ink-3 shadow-[0_0_0_1px_var(--line)]')}>
          {kbd}
        </kbd>
      )}
    </button>
  );
});
