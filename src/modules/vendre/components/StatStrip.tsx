import { Children, type ReactNode } from 'react';
import { Card, cn } from '@/components/ui';

/** Bandeau de chiffres clés : 2 colonnes sur téléphone, n colonnes ensuite, filets fins entre les cases. */
export function StatStrip({ children, cols = 4, className }: { children: ReactNode; cols?: 3 | 4; className?: string }) {
  const items = Children.toArray(children);
  return (
    <Card className={cn('grid grid-cols-2 overflow-hidden', cols === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3', className)}>
      {items.map((c, i) => (
        <div
          key={i}
          className={cn(
            'min-w-0 border-line',
            i % 2 === 0 && !(items.length === 3 && i === 2) && 'border-r',
            items.length === 4 && i < 2 && 'border-b',
            'md:border-b-0 md:border-r',
            i === items.length - 1 && 'md:border-r-0',
            cols === 3 && items.length === 3 && i === 2 && 'col-span-2 border-t md:col-span-1 md:border-t-0',
          )}
        >
          {c}
        </div>
      ))}
    </Card>
  );
}
