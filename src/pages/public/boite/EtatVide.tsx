// Boîte vide : petite scène d'enveloppes qui flottent, une explication et les deux façons de la remplir.

import { Link } from 'react-router-dom';
import { ArrowRight, FileText, LayoutGrid, Mail, Receipt } from 'lucide-react';

export function EtatVide({ onExemples, onModeles, compact = false }: { onExemples: () => void; onModeles: () => void; compact?: boolean }) {
  return (
    <div className={`grid place-items-center px-6 text-center ${compact ? 'py-12' : 'py-16 md:py-24'}`}>
      <div className="boite-vide-scene relative h-[132px] w-[220px]" aria-hidden>
        <div className="boite-vide-carte boite-vide-carte-1 absolute left-2 top-7 flex h-[74px] w-[120px] items-center gap-2 rounded-2xl bg-white px-3 shadow-card">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#f3efff] text-[#6d28d9]">
            <FileText size={16} strokeWidth={1.75} />
          </span>
          <span className="flex flex-1 flex-col gap-1.5">
            <span className="h-1.5 w-full rounded-full bg-[#ecebf3]" />
            <span className="h-1.5 w-2/3 rounded-full bg-[#ecebf3]" />
          </span>
        </div>
        <div className="boite-vide-carte boite-vide-carte-2 absolute right-2 top-1 flex h-[74px] w-[120px] items-center gap-2 rounded-2xl bg-white px-3 shadow-card">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#fff4ea] text-[#c2410c]">
            <Receipt size={16} strokeWidth={1.75} />
          </span>
          <span className="flex flex-1 flex-col gap-1.5">
            <span className="h-1.5 w-full rounded-full bg-[#ecebf3]" />
            <span className="h-1.5 w-1/2 rounded-full bg-[#ecebf3]" />
          </span>
        </div>
        <div className="boite-vide-enveloppe absolute bottom-0 left-1/2 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-2xl bg-[#130f26] text-white shadow-[0_14px_30px_-12px_rgba(19,15,38,.55)]">
          <Mail size={22} strokeWidth={1.75} />
        </div>
      </div>
      <h2 className="mt-7 text-[19px] font-semibold tracking-[-0.02em] text-[#130f26]">Aucun e-mail pour l'instant</h2>
      <p className="mt-2 max-w-[340px] text-[14px] leading-relaxed text-ink-2">
        Envoyez un devis depuis l'app pour le voir arriver ici, exactement comme votre client le recevra.
      </p>
      <div className="mt-6 flex w-full max-w-[340px] flex-col gap-2 sm:w-auto sm:max-w-none sm:flex-row sm:justify-center">
        <Link to="/app/devis" className="bx-btn-dawn inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-[14px] font-semibold text-white">
          Envoyer un devis <ArrowRight size={16} strokeWidth={2} />
        </Link>
        <button type="button" onClick={onExemples} className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-4 text-[14px] font-medium text-[#130f26] shadow-card transition hover:shadow-pop">
          Charger des exemples
        </button>
      </div>
      <button type="button" onClick={onModeles} className="mt-3 inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-[13px] font-medium text-ink-2 transition hover:text-[#130f26]">
        <LayoutGrid size={15} strokeWidth={1.75} /> Voir tous les modèles d'e-mails
      </button>
    </div>
  );
}
