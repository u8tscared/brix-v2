import { Children, type ReactNode } from 'react';
import { Card, cn } from '@/components/ui';

/** Rangée de chiffres clés Halo : une carte blanche par chiffre (2 colonnes sur téléphone, n ensuite), entrée en cascade. */
export function StatStrip({ children, cols = 4, className }: { children: ReactNode; cols?: 3 | 4; className?: string }) {
  const items = Children.toArray(children);
  return (
    <div className={cn('stagger grid grid-cols-2 gap-3 md:gap-4', cols === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3', className)}>
      {items.map((c, i) => (
        <Card key={i} className={cn('min-w-0', cols === 3 && items.length === 3 && i === 2 && 'col-span-2 md:col-span-1')}>
          {c}
        </Card>
      ))}
    </div>
  );
}
