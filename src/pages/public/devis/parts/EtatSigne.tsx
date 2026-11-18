// Bandeau du devis signé : la signature, l'empreinte, et l'acompte à régler (ou réglé).
import { CheckCircle2, CreditCard, Download, Fingerprint } from 'lucide-react';
import { Card, IconTile } from '@/components/ui';
import { money } from '@/lib/format';
import type { Preuve } from '@/parcours/signature';
import { BoutonAube, BoutonDoux } from '../../ui/primitives';

interface Props {
  preuve?: Preuve;
  signataire: string;
  signeLe: string;
  acompte: number;
  acomptePaye: boolean;
  onPayer: () => void;
  onPdf: () => void;
}

export function EtatSigne({ preuve, signataire, signeLe, acompte, acomptePaye, onPayer, onPdf }: Props) {
  const d = new Date(signeLe);
  return (
    <Card className="bx-rise overflow-hidden">
      <div className="relative px-5 pb-5 pt-6 sm:px-6">
        <span className="chip tone-green">
          <CheckCircle2 strokeWidth={2} /> Devis signé
        </span>
        <div className="mt-3 text-[24px] font-semibold leading-tight tracking-[-0.04em]">
          Merci {signataire.split(' ')[0]}, c’est validé.
        </div>
        <div className="mt-1 text-[13.5px] text-ink-2">
          Le {d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} à {d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}, par {signataire}.
        </div>
        {preuve?.image && (
          <div className="mt-4 rounded-card-sm bg-dawn-mist px-4 py-2 shadow-[0_0_0_1px_#ece8f6]">
            <img src={preuve.image} alt={`Signature de ${signataire}`} className="h-[78px] w-auto max-w-full object-contain" />
          </div>
        )}
        {preuve?.empreinte && (
          <div className="mt-3 flex items-start gap-2 text-[11.5px] text-ink-3">
            <Fingerprint className="mt-px h-3.5 w-3.5 shrink-0" />
            <span className="bx-mono break-all">Empreinte {preuve.empreinte.slice(0, 16)}…{preuve.empreinte.slice(-8)}</span>
          </div>
        )}
      </div>
      {acompte > 0 && (
        <div className="bg-dawn-pale px-5 py-5 sm:px-6">
          {acomptePaye ? (
            <div className="flex items-center gap-3">
              <IconTile tone="green" solid icon={<CheckCircle2 strokeWidth={1.9} />} />
              <div className="min-w-0 flex-1">
                <div className="text-[14.5px] font-semibold">Acompte réglé</div>
                <div className="text-[12.5px] text-ink-3">{money(preuve?.acompte?.montant ?? acompte)} · {preuve?.acompte?.moyen?.toLowerCase() ?? 'en ligne'}</div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[14px] font-semibold">Acompte pour réserver la date</span>
                <span className="num-halo text-[24px]">{money(acompte)}</span>
              </div>
              <p className="mt-1 text-[12.5px] text-ink-3">La facture d’acompte est prête. Le chantier est planifié dès réception.</p>
              <BoutonAube className="mt-4 w-full" onClick={onPayer} icone={<CreditCard className="h-5 w-5" strokeWidth={1.75} />}>
                Régler l’acompte
              </BoutonAube>
            </>
          )}
        </div>
      )}
      <div className="px-5 py-3 sm:px-6">
        <BoutonDoux className="w-full" onClick={onPdf} icone={<Download className="h-4 w-4" strokeWidth={1.75} />}>
          Télécharger le devis signé
        </BoutonDoux>
      </div>
    </Card>
  );
}
