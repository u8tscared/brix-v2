import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from './cn';

type Variant = 'primary' | 'dawn' | 'secondary' | 'ghost' | 'danger' | 'soft' | 'glass' | 'link';
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  kbd?: string;
}

// Halo : toutes les actions sont des pilules. primary = encre, dawn = dégradé Aube avec lueur
// (l'action principale de l'écran, une seule fois), secondary = blanc, ghost = discret, glass = sur un halo.
const variants: Record<Variant, string> = {
  primary: 'bg-ink text-white shadow-ink hover:-translate-y-px hover:bg-[#241f3f]',
  dawn: 'bg-dawn text-white font-semibold shadow-dawn hover:-translate-y-px hover:scale-[1.02] hover:shadow-dawn-lg',
  secondary: 'bg-white text-ink shadow-[0_1px_2px_rgba(60,30,120,.08),0_0_0_1px_#ece8f6] hover:-translate-y-px hover:shadow-[0_0_0_1px_#e0d8f2,0_8px_20px_-10px_rgba(60,30,120,.25)]',
  ghost: 'text-ink-2 hover:bg-white/70 hover:text-ink hover:shadow-[0_0_0_1px_#ece8f6]',
  danger: 'bg-white text-bad shadow-[0_1px_2px_rgba(60,30,120,.06),0_0_0_1px_#f6dbe0] hover:bg-bad-bg hover:shadow-[0_0_0_1px_#fbd0d0]',
  soft: 'bg-pale-v text-deep-v hover:bg-vi-100',
  glass: 'glass text-ink hover:-translate-y-px hover:bg-white/90',
  link: 'text-vi-700 hover:text-vi-900 underline-offset-4 hover:underline !px-0 !h-auto !rounded-none',
};

const sizes: Record<Size, string> = {
  xs: 'h-7 px-3 text-[12.5px] gap-1 [&_svg]:h-3.5 [&_svg]:w-3.5',
  sm: 'h-9 max-md:h-10 touch:h-11 px-3.5 text-[13px] gap-1.5 [&_svg]:h-4 [&_svg]:w-4',
  md: 'h-[42px] px-[18px] text-[14px] gap-2 [&_svg]:h-4 [&_svg]:w-4',
  lg: 'h-[52px] px-6 text-[15px] gap-2 [&_svg]:h-[18px] [&_svg]:w-[18px]',
  icon: 'h-10 w-10 touch:h-11 touch:w-11 justify-center [&_svg]:h-[18px] [&_svg]:w-[18px]',
  'icon-sm': 'h-9 w-9 max-md:h-10 max-md:w-10 touch:h-11 touch:w-11 justify-center [&_svg]:h-4 [&_svg]:w-4',
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
        'group/btn relative inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-full font-medium tracking-[-0.01em] transition-[background,box-shadow,transform,filter,color] duration-300 ease-spring active:scale-[.97] disabled:pointer-events-none disabled:opacity-45',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="animate-spin" /> : icon}
      {children}
      {iconRight && <span className="-mr-0.5 transition-transform duration-200 ease-out-quint group-hover/btn:translate-x-0.5">{iconRight}</span>}
      {kbd && (
        <kbd className={cn('kbd-hint ml-0.5 hidden h-5 min-w-5 place-items-center rounded-full px-1.5 font-sans text-[11px] font-medium lg:inline-grid', variant === 'dawn' || variant === 'primary' ? 'bg-white/20 text-white/90' : 'bg-sub text-ink-3 shadow-[0_0_0_1px_var(--line)]')}>
          {kbd}
        </kbd>
      )}
    </button>
  );
});
