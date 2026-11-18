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
        <div role="menu" className="glass-strong absolute right-0 top-[calc(100%+8px)] z-50 w-64 origin-top-right animate-scale-in rounded-card-sm p-1.5 shadow-halo-lg">
          {items
            .filter((i) => !i.hidden)
            .map((i) => (
              <button
                key={i.label}
                onClick={() => {
                  setOpen(false);
                  i.onClick();
                }}
                role="menuitem"
                className={cn('flex h-11 w-full items-center gap-2.5 rounded-[12px] px-3 text-left text-[13.5px] transition hover:bg-white/90 hover:shadow-halo-sm [&_svg]:h-4 [&_svg]:w-4', i.danger ? 'text-deep-r' : 'text-ink')}
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
