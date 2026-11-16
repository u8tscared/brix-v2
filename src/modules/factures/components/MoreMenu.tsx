import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Ellipsis } from 'lucide-react';
import { Button, cn } from '@/components/ui';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  hidden?: boolean;
}

/** Menu « … » simple, fermé au clic extérieur et à Échap. */
export function MoreMenu({ items, className }: { items: MenuItem[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);
  return (
    <div ref={ref} className={cn('relative', className)}>
      <Button variant="secondary" size="icon" aria-label="Plus d’actions" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Ellipsis className="h-4 w-4" />
      </Button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-60 animate-scale-in rounded-xl border border-line bg-white p-1 shadow-pop">
          {items
            .filter((i) => !i.hidden)
            .map((i) => (
              <button
                key={i.label}
                onClick={() => {
                  setOpen(false);
                  i.onClick();
                }}
                className={cn('flex h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-[13.5px] transition hover:bg-sub [&_svg]:h-4 [&_svg]:w-4', i.danger ? 'text-bad' : 'text-ink')}
              >
                <span className={i.danger ? '' : 'text-ink-2'}>{i.icon}</span>
                {i.label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
