import { useLocation } from 'react-router-dom';
import { Construction } from 'lucide-react';
import { EmptyState, PageHeader } from '@/components/ui';
import { MODULES } from '@/lib/catalog';

/** Écran temporaire d'un module en cours de construction. */
export default function Placeholder({ title }: { title?: string }) {
  const { pathname } = useLocation();
  const m = MODULES.find((x) => pathname.includes('/app/' + x.path));
  return (
    <div className="space-y-6">
      <PageHeader title={title ?? m?.name ?? 'Bientôt'} subtitle={m?.short} />
      <EmptyState icon={<Construction />} title="Cet écran arrive" text="Il est en cours de construction dans Brix V2." />
    </div>
  );
}
