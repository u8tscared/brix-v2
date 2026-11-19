import { BrandTile } from '@/components/brand/Logo';
import { SuggestionCard } from './BobColumn';

/** Suggestions de Brix AI dans l'éditeur sur téléphone : une à la fois, les autres en feuille. */
export function MobileBobCard({ count, first, onApplyFirst, onDismissFirst, onAll }: { count: number; first: Parameters<typeof SuggestionCard>[0]['s']; onApplyFirst: () => void; onDismissFirst: () => void; onAll: () => void }) {
  return (
    <div className="rounded-card bg-dawn-mist p-3 shadow-halo">
      <div className="mb-1.5 flex items-center justify-between px-1">
        <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-ink">
          <BrandTile size={24} />
          Brix AI a {count} conseil{count > 1 ? 's' : ''}
        </span>
        {count > 1 && (
          <button onClick={onAll} className="h-10 px-1 text-[12.5px] font-medium text-deep-v">
            Tout voir
          </button>
        )}
      </div>
      <SuggestionCard s={first} onApply={onApplyFirst} onDismiss={onDismissFirst} />
    </div>
  );
}
