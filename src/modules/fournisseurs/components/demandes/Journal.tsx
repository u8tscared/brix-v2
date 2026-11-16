// Fil d'activité d'une demande ou d'une commande.
import { Card, CardHeader, cn } from '@/components/ui';
import type { Evenement } from '../../data/types';
import { quand } from './commun';

const PASTILLE: Record<Evenement['acteur'], string> = {
  artisan: 'bg-ink',
  fournisseur: 'bg-ok',
  systeme: 'bg-line2',
  api: 'bg-brand',
};

export default function Journal({ evenements, max = 8 }: { evenements: Evenement[]; max?: number }) {
  const liste = evenements.slice(0, max);
  return (
    <Card>
      <CardHeader title="Historique" meta={evenements.length > max ? `${max} derniers` : undefined} />
      <ol className="px-4 py-3">
        {liste.map((e, i) => (
          <li key={i} className="relative flex gap-3 pb-3.5 last:pb-0">
            {i < liste.length - 1 && <span className="absolute left-[3.5px] top-3 h-full w-px bg-line" aria-hidden />}
            <span className={cn('relative mt-[6px] h-2 w-2 shrink-0 rounded-full ring-4 ring-white', PASTILLE[e.acteur])} />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] leading-snug">{e.texte}</div>
              <div className="num text-[11.5px] text-ink-3 first-letter:uppercase">{quand(e.at)}</div>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
