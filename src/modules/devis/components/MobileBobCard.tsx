import { AudioLines } from 'lucide-react';
import { SuggestionCard } from './BobColumn';

/** Suggestions de Bob dans l'éditeur sur téléphone : une à la fois, les autres en feuille. */
export function MobileBobCard({ count, first, onApplyFirst, onDismissFirst, onAll }: { count: number; first: Parameters<typeof SuggestionCard>[0]['s']; onApplyFirst: () => void; onDismissFirst: () => void; onAll: () => void }) {
  return (
    <div className="rounded-[18px] bg-white p-3 shadow-card">
      <div className="mb-1.5 flex items-center justify-between px-1">
        <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-ink">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-night text-white">
            <AudioLines className="h-3.5 w-3.5" />
          </span>
          Bob a {count} conseil{count > 1 ? 's' : ''}
        </span>
        {count > 1 && (
          <button onClick={onAll} className="h-10 px-1 text-[12.5px] font-medium text-vi-700">
            Tout voir
          </button>
        )}
      </div>
      <SuggestionCard s={first} onApply={onApplyFirst} onDismiss={onDismissFirst} />
    </div>
  );
}
