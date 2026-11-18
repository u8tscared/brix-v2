import { ExternalLink } from 'lucide-react';
import { lienPublic } from '@/parcours/liens';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, Eye, FileText, PenLine } from 'lucide-react';
import { Button, IconTile, cn } from '@/components/ui';
import { dateShort, money, totals } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Devis } from '@/lib/types';
import { ago } from '../logic';

/** Bandeau de suivi : état côté client et boutons de simulation de la démo. */
export function DemoStrip({ d, onOpen, onSign, onConvert, className }: { d: Devis; onOpen: () => Promise<void>; onSign: () => Promise<void>; onConvert: () => void; className?: string }) {
  const navigate = useNavigate();
  const acompte = useBrix((s) => s.factures.find((f) => f.devisId === d.id && f.kind === 'acompte'));
  const [busy, setBusy] = useState<'open' | 'sign' | null>(null);
  if (d.status === 'brouillon') return null;
  const run = async (k: 'open' | 'sign', fn: () => Promise<void>) => {
    setBusy(k);
    await fn();
    setBusy(null);
  };

  if (d.status === 'signe')
    return (
      <div className={cn('flex flex-col gap-3 rounded-card-sm bg-pale-g/80 px-4 py-3 sm:flex-row sm:items-center', className)}>
        <IconTile icon={<BadgeCheck />} tone="green" size="sm" className="hidden bg-white sm:inline-grid" />
        <div className="min-w-0 flex-1 text-[13px] text-ink">
          <b className="font-semibold">Signé{d.signedAt ? ` le ${dateShort(d.signedAt.slice(0, 10))}` : ''}</b> ·{' '}
          {acompte ? `acompte ${acompte.number} de ${money(totals(acompte.lines).ttc)} ${acompte.status === 'payee' ? 'réglé' : 'demandé'}.` : 'vous pouvez facturer.'}
        </div>
        <div className="flex gap-2">
          {acompte && (
            <Button size="sm" className="max-md:h-10" icon={<FileText className="h-3.5 w-3.5" />} onClick={() => navigate(`/app/factures/${acompte.id}`)}>
              Voir l’acompte
            </Button>
          )}
          <Button size="sm" variant="primary" className="max-md:h-10" onClick={onConvert}>
            Convertir en facture
          </Button>
        </div>
      </div>
    );

  if (d.status === 'refuse' || d.status === 'expire') return null;

  return (
    <div className={cn('flex flex-col gap-3 rounded-card-sm bg-white/55 px-4 py-3 shadow-[inset_0_0_0_1.5px_#e6dcfb] md:flex-row md:items-center', className)}>
      <div className="min-w-0 flex-1 text-[13px] text-ink-2">
        <span className="mr-1.5 inline-flex h-[20px] items-center rounded-full bg-pale-v px-2 text-[11px] font-semibold text-deep-v">Démo</span>
        {d.status === 'vu' ? `Ouvert ${d.views ?? 1} fois, dernière fois ${ago(d.viewedAt)}. En attente de signature.` : `Envoyé ${ago(d.sentAt)}. Le client ne l’a pas encore ouvert.`}
      </div>
      <div className="grid grid-cols-2 gap-2 md:flex">
        <Button size="sm" className="max-md:h-10" loading={busy === 'open'} icon={<Eye className="h-3.5 w-3.5" />} onClick={() => run('open', onOpen)}>
          Simuler l’ouverture
        </Button>
        <Button size="sm" variant="primary" className="max-md:h-10" loading={busy === 'sign'} icon={<PenLine className="h-3.5 w-3.5" />} onClick={() => run('sign', onSign)}>
          Simuler la signature
        </Button>
        <Button size="sm" className="col-span-2 max-md:h-10" icon={<ExternalLink className="h-3.5 w-3.5" />} onClick={() => window.open(lienPublic('devis', d.id), '_blank')}>
          Signer comme le client
        </Button>
      </div>
    </div>
  );
}
