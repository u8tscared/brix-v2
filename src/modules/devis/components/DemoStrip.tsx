import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, Eye, FileText, PenLine } from 'lucide-react';
import { Button, cn } from '@/components/ui';
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
      <div className={cn('flex flex-col gap-2 rounded-xl border border-[#c9f0d6] bg-ok-bg px-4 py-3 sm:flex-row sm:items-center', className)}>
        <BadgeCheck className="hidden h-5 w-5 shrink-0 text-ok sm:block" />
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
    <div className={cn('flex flex-col gap-2.5 rounded-xl border border-dashed border-vi-200 bg-vi-50/50 px-4 py-3 md:flex-row md:items-center', className)}>
      <div className="min-w-0 flex-1 text-[13px] text-ink-2">
        <span className="mr-1.5 rounded bg-white px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[.05em] text-vi-700">Démo</span>
        {d.status === 'vu' ? `Ouvert ${d.views ?? 1} fois, dernière fois ${ago(d.viewedAt)}. En attente de signature.` : `Envoyé ${ago(d.sentAt)}. Le client ne l’a pas encore ouvert.`}
      </div>
      <div className="grid grid-cols-2 gap-2 md:flex">
        <Button size="sm" className="max-md:h-10" loading={busy === 'open'} icon={<Eye className="h-3.5 w-3.5" />} onClick={() => run('open', onOpen)}>
          Simuler l’ouverture
        </Button>
        <Button size="sm" variant="primary" className="max-md:h-10" loading={busy === 'sign'} icon={<PenLine className="h-3.5 w-3.5" />} onClick={() => run('sign', onSign)}>
          Simuler la signature
        </Button>
      </div>
    </div>
  );
}
