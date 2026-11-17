// Étape 1 : d'où vient le matériel ? Un devis (signés d'abord) ou une liste libre.
import { useMemo } from 'react';
import { ChevronRight, FileText, ListPlus } from 'lucide-react';
import { Badge, cn } from '@/components/ui';
import { relative } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Devis } from '@/lib/types';
import { besoinsDuDevis } from '../../data/helpers';
import { pluriel } from './commun';

const RANG: Record<string, number> = { signe: 0, vu: 1, envoye: 2 };

export default function EtapeSource({ onDevis, onLibre }: { onDevis: (d: Devis) => void; onLibre: () => void }) {
  const devis = useBrix((s) => s.devis);
  const clients = useBrix((s) => s.clients);

  const liste = useMemo(
    () =>
      devis
        .filter((d) => d.status in RANG)
        .map((d) => ({ d, n: besoinsDuDevis(d).length, client: clients.find((c) => c.id === d.clientId)?.name }))
        .sort((a, b) => RANG[a.d.status] - RANG[b.d.status] || (b.d.signedAt ?? b.d.createdAt).localeCompare(a.d.signedAt ?? a.d.createdAt)),
    [devis, clients],
  );

  return (
    <div className="space-y-4">
      <p className="text-[13.5px] text-ink-2">Choisissez le devis : Brix reprend la liste des fournitures, vous n'avez rien à recopier.</p>

      {liste.length > 0 ? (
        <div className="overflow-hidden rounded-[14px] border border-line">
          {liste.map(({ d, n, client }) => (
            <button
              key={d.id}
              type="button"
              disabled={n === 0}
              onClick={() => onDevis(d)}
              className="flex min-h-[64px] w-full items-center gap-3 border-b border-line px-3.5 py-3 text-left transition last:border-b-0 hover:bg-[#fafafc] disabled:cursor-not-allowed disabled:opacity-55"
            >
              <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-[10px]', d.status === 'signe' ? 'bg-ok-bg text-ok' : 'bg-sub text-ink-2')}>
                <FileText className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 block text-[14px] font-medium leading-snug">{d.title}</span>
                <span className="block truncate text-[12.5px] text-ink-3">
                  <span className="num">{d.number}</span> · {client ?? 'Client'}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                {d.status === 'signe' ? <Badge tone="ok">Signé {d.signedAt ? relative(d.signedAt) : ''}</Badge> : <Badge>{d.status === 'vu' ? 'Vu par le client' : 'Envoyé'}</Badge>}
                <span className="num text-[12px] text-ink-2">{n ? pluriel(n, 'fourniture') : 'Aucune fourniture'}</span>
              </span>
              <ChevronRight className="hidden h-4 w-4 shrink-0 text-ink-3 sm:block" />
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-[14px] border border-dashed border-line2 px-4 py-6 text-center text-[13px] text-ink-2">
          Aucun devis envoyé ou signé pour l'instant. Vous pouvez partir d'une liste libre.
        </div>
      )}

      <button
        type="button"
        onClick={onLibre}
        className="flex min-h-[60px] w-full items-center gap-3 rounded-[14px] border border-dashed border-line2 bg-white px-3.5 py-3 text-left transition hover:border-ink-3 hover:bg-[#fafafc]"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-sub text-ink-2">
          <ListPlus className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-medium">Liste libre</span>
          <span className="block text-[12.5px] text-ink-3">Du stock à refaire, un dépannage : vous tapez les articles vous-même.</span>
        </span>
        <ChevronRight className="hidden h-4 w-4 shrink-0 text-ink-3 sm:block" />
      </button>
    </div>
  );
}
