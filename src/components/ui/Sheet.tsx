import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { usePresence } from '@/components/motion';
import { cn } from './cn';

/**
 * Panneau modal : glisse depuis le bas sur téléphone, depuis la droite sur
 * tablette et ordinateur (side="right"), au centre (side="center") ou plein écran (side="full").
 * Animations d'entrée ET de sortie. Halo : verre très clair, très arrondi (28 px), flotte à 12 px des bords.
 */
export function Sheet({ open, onClose, title, subtitle, children, footer, side = 'right', width = 480, icon, bare }: { open: boolean; onClose: () => void; title?: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; side?: 'right' | 'center' | 'full'; width?: number; icon?: ReactNode; bare?: boolean }) {
  const { mounted, closing } = usePresence(open, 240);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', k);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!mounted) return null;
  const anim = closing
    ? side === 'right'
      ? 'max-md:animate-[slide-down_.24s_var(--ease)_both] md:animate-[slide-right-out_.22s_var(--ease)_both]'
      : 'max-md:animate-[slide-down_.24s_var(--ease)_both] md:animate-[scale-out_.18s_var(--ease)_both]'
    : side === 'right'
      ? 'max-md:animate-[slide-up_.42s_var(--ease)_both] md:animate-[slide-left_.38s_var(--ease)_both]'
      : 'max-md:animate-[slide-up_.42s_var(--ease)_both] md:animate-[scale-in_.28s_var(--ease)_both]';
  return createPortal(
    <div className="fixed inset-0 z-[80]">
      <div className={cn('absolute inset-0 bg-[#1b1236]/20 backdrop-blur-[6px]', closing ? 'animate-[fade-out_.22s_ease_both]' : 'animate-[fade-in_.3s_ease_both]')} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        style={{ ['--w' as string]: `${width}px` }}
        className={cn(
          'absolute flex flex-col overflow-hidden bg-white/[.88] shadow-pop backdrop-blur-2xl backdrop-saturate-150',
          side === 'full' ? 'inset-0 md:inset-3 md:rounded-sheet' : 'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-sheet',
          side === 'right' && 'md:inset-y-3 md:left-auto md:right-3 md:max-h-none md:w-[var(--w)] md:max-w-[calc(100vw-24px)] md:rounded-sheet',
          side === 'center' && 'md:inset-0 md:m-auto md:h-fit md:max-h-[86dvh] md:w-[var(--w)] md:max-w-[calc(100vw-32px)] md:rounded-sheet',
          anim,
        )}
      >
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white" />
        {side !== 'full' && <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[#dcd6ea] md:hidden" />}
        {(title || subtitle) && (
          <div className="flex items-start gap-3 px-5 pb-3 pt-3 md:px-7 md:pt-6">
            {icon}
            <div className="min-w-0 flex-1">
              {title && <h3 className="text-[20px] font-semibold leading-tight tracking-[-0.035em]">{title}</h3>}
              {subtitle && <p className="mt-1 text-[13px] leading-snug text-ink-2">{subtitle}</p>}
            </div>
            <button onClick={onClose} aria-label="Fermer" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/70 text-ink-3 shadow-[0_0_0_1px_#ece8f6] transition duration-300 ease-spring hover:rotate-90 hover:bg-white hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain', !bare && 'px-5 md:px-7', footer ? 'pb-5' : 'pb-[calc(20px+var(--safe-b))]')}>{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-[#efebf7] bg-white/70 px-5 py-3 pb-[calc(12px+var(--safe-b))] backdrop-blur-xl md:px-7">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
