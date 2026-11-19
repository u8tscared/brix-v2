import { Skeleton } from '@/components/ui';

/** Squelette d'écran pendant le chargement d'une page. */
export function PageLoader() {
  return (
    <div className="space-y-4 py-2">
      <Skeleton className="h-4 w-40 rounded-full" />
      <Skeleton className="h-11 w-72 rounded-full" />
      <div className="grid gap-4 pt-2 md:grid-cols-3">
        <Skeleton className="h-32 rounded-card" />
        <Skeleton className="h-32 rounded-card" />
        <Skeleton className="h-32 rounded-card" />
      </div>
      <Skeleton className="h-72 rounded-card" />
    </div>
  );
}
