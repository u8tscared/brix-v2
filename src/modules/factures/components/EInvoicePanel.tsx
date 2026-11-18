// Cycle de vie de la facture électronique : frise des statuts et transmission via la plateforme agréée.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, FileCode2, Send, ShieldCheck, UserRound } from 'lucide-react';
import { Badge, Button, IconTile, cn, toast } from '@/components/ui';
import { DrawCheck } from '@/components/motion';
import { EINVOICE_STATUS } from '@/lib/status';
import type { Client, Facture } from '@/lib/types';
import { advanceDemo, pushEinvoice, transmit } from '../lib/actions';
import { LIFECYCLE, PLATFORMS } from '../service';
import { useFactures } from '../store';

const fmt = (at: string) => {
  const d = new Date(at.length === 10 ? at + 'T12:00' : at);
  return at.length === 10 ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : d.toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export function EInvoicePanel({ f, client, missing, onDownload }: { f: Facture; client?: Client; missing: string[]; onDownload: (fmt: 'cii' | 'ubl') => void }) {
  const platform = useFactures((s) => s.platform) ?? 'superpdp';
  const [busy, setBusy] = useState(false);
  const status = f.einvoice.status;
  const b2c = client?.kind !== 'pro';
  const off = status === 'refusee' || status === 'litige';
  const reached = new Map(f.einvoice.history.map((h) => [h.status, h]));
  const idx = LIFECYCLE.indexOf(status);

  const go = async () => {
    setBusy(true);
    await transmit(f.id);
    setBusy(false);
    toast('Facture remise au client par la plateforme agréée');
  };

  if (b2c) {
    return (
      <div className="space-y-4">
        <div className="flex gap-3 rounded-card bg-white p-5 shadow-halo">
          <IconTile icon={<UserRound />} tone="neutral" />
          <div className="text-[13px] leading-relaxed text-ink-2">
            <div className="font-semibold text-ink">Client particulier : pas de facture électronique</div>
            Vous lui envoyez la facture en PDF, comme d’habitude. Brix déclare simplement le montant au fisc chaque mois (e-reporting), sans rien vous demander.
          </div>
        </div>
        <Link to="/app/facture-electronique" className="block px-1 text-[13px] font-medium text-deep-v hover:underline">
          Voir l’e-reporting de vos ventes aux particuliers
        </Link>
        <Downloads onDownload={onDownload} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-card bg-white p-5 shadow-halo">
      <div className="mb-4 flex items-center gap-2.5">
        <IconTile icon={<ShieldCheck />} tone="green" size="sm" />
        <span className="min-w-0 text-[13.5px] font-medium">Via {PLATFORMS[platform].name}, plateforme agréée</span>
        <Badge tone={EINVOICE_STATUS[status].tone} size="md" dot className="ml-auto">{EINVOICE_STATUS[status].label}</Badge>
      </div>

      <ol className="relative">
        {LIFECYCLE.map((s, i) => {
          const h = reached.get(s);
          const done = !!h || (idx >= i && status !== 'non_transmise');
          const current = s === status;
          return (
            <li key={s} className="relative flex gap-3 pb-3.5 last:pb-0">
              {i < LIFECYCLE.length - 1 && <span className={cn('absolute left-[9px] top-5 h-[calc(100%-16px)] w-px', done && idx > i ? 'bg-[#10b981]/40' : 'bg-halo-line')} />}
              <span className={cn('relative z-[1] mt-0.5 grid h-[19px] w-[19px] shrink-0 place-items-center rounded-full text-white transition duration-500 ease-spring', done ? 'bg-[#10b981]' : 'bg-white shadow-[inset_0_0_0_1.5px_#e3dcf3]', current && 'ring-4 ring-[#10b981]/15')}>
                {done && <DrawCheck className="h-3 w-3" strokeWidth={3} delay={i * 60} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className={cn('flex items-baseline justify-between gap-2 text-[13px]', done ? 'font-medium text-ink' : 'text-ink-3')}>
                  <span>{EINVOICE_STATUS[s].label}</span>
                  {h && <span className="shrink-0 text-[11.5px] font-normal text-ink-3">{fmt(h.at)}</span>}
                </div>
                {(current || h?.note) && <div className="text-[12px] text-ink-2">{h?.note ?? EINVOICE_STATUS[s].help}</div>}
              </div>
            </li>
          );
        })}
      </ol>
      </div>

      {off && (
        <div className="flex gap-2.5 rounded-card-sm bg-pale-a p-3.5 text-[13px] text-ink">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-deep-a" />
          <div>
            <b className="font-semibold">{EINVOICE_STATUS[status].label}.</b> {f.einvoice.history[f.einvoice.history.length - 1]?.note ?? 'Le client conteste la facture.'} Appelez-le, puis faites un avoir si besoin.
          </div>
        </div>
      )}

      {status === 'non_transmise' ? (
        <div className="space-y-2">
          {missing.length > 0 && (
            <div className="rounded-card-sm bg-pale-r p-3.5 text-[12.5px] text-ink">
              <div className="mb-1 font-semibold text-deep-r">À compléter avant l’envoi</div>
              {missing.join(' · ')}
            </div>
          )}
          <Button variant="dawn" className="w-full" size="lg" loading={busy} disabled={missing.length > 0} icon={<Send className="h-4 w-4" />} onClick={go}>
            Transmettre via la plateforme agréée
          </Button>
          <p className="text-center text-[11.5px] text-ink-3">En démo : la transmission et les réponses du client sont simulées.</p>
        </div>
      ) : (
        !off &&
        status !== 'encaissee' && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => advanceDemo(f.id)}>Étape suivante (démo)</Button>
            <Button variant="ghost" size="sm" onClick={() => pushEinvoice(f.id, 'litige', 'Le client conteste la quantité de hublots')}>Simuler un litige</Button>
          </div>
        )
      )}
      <Downloads onDownload={onDownload} />
    </div>
  );
}

function Downloads({ onDownload }: { onDownload: (fmt: 'cii' | 'ubl') => void }) {
  return (
    <div className="rounded-card bg-white p-4 shadow-halo">
      <div className="mb-3 flex items-center gap-2.5 text-[13.5px] font-medium">
        <IconTile icon={<FileCode2 />} tone="indigo" size="sm" /> Fichiers de la facture électronique
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => onDownload('cii')}>Factur-X (XML CII)</Button>
        <Button size="sm" variant="secondary" onClick={() => onDownload('ubl')}>UBL 2.1</Button>
      </div>
      <p className="mt-2 text-[11.5px] text-ink-3">Profil EN 16931, contrôlé par Brix avant chaque envoi.</p>
    </div>
  );
}

