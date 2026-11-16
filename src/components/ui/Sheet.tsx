import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from './cn';

/**
 * Panneau modal : glisse depuis le bas sur téléphone, depuis la droite sur
 * tablette et ordinateur (side="right"), ou s'affiche au centre (side="center").
 */
export function Sheet({ open, onClose, title, subtitle, children, footer, side = 'right', width = 480 }: { open: boolean; onClose: () => void; title?: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; side?: 'right' | 'center'; width?: number }) {
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
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 animate-[fade-up_.2s_ease_both] bg-[#17171f]/30 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        style={{ ['--w' as string]: `${width}px` }}
        className={cn(
          'absolute flex flex-col bg-white shadow-pop',
          'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[22px] animate-[fade-up_.28s_cubic-bezier(.2,.8,.2,1)_both]',
          side === 'right' && 'md:inset-y-2 md:left-auto md:right-2 md:max-h-none md:w-[var(--w)] md:rounded-[18px]',
          side === 'center' && 'md:inset-auto md:left-1/2 md:top-1/2 md:max-h-[86dvh] md:w-[var(--w)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[18px]',
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line2 md:hidden" />
        {(title || subtitle) && (
          <div className="flex items-start gap-3 px-5 pb-3 pt-3 md:pt-5">
            <div className="min-w-0 flex-1">
              {title && <h3 className="text-[18px] font-semibold leading-tight">{title}</h3>}
              {subtitle && <p className="mt-1 text-[13px] text-ink-2">{subtitle}</p>}
            </div>
            <button onClick={onClose} aria-label="Fermer" className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-sub hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3 pb-[calc(12px+var(--safe-b))]">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
