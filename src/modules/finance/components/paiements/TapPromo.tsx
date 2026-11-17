import { Nfc } from 'lucide-react';
import { Button } from '@/components/ui';

/** Carte « votre téléphone devient un terminal » : petite scène téléphone + carte, sans boucle permanente. */
export function TapPromo({ onTry }: { onTry: () => void }) {
  return (
    <div className="group relative overflow-hidden rounded-[18px] bg-night p-5 text-white shadow-pop">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(217,70,239,.35),transparent_65%)]" />
      <div className="relative flex gap-5">
        <div className="min-w-0 flex-1">
          <div className="text-[11.5px] font-semibold uppercase tracking-[.08em] text-white/50">Sans boîtier</div>
          <div className="mt-1.5 text-[17px] font-semibold leading-snug tracking-[-0.02em]">Votre téléphone devient un terminal de paiement</div>
          <p className="mt-2 text-[13px] leading-relaxed text-white/65">Fin du chantier, le client pose sa carte contre votre téléphone. C'est payé, la facture est soldée, le reçu part par SMS.</p>
          <Button size="sm" className="mt-4 bg-white text-ink shadow-none hover:bg-white/90" icon={<Nfc />} onClick={onTry}>Essayer maintenant</Button>
        </div>
        <div aria-hidden className="relative hidden w-[92px] shrink-0 sm:block">
          <div className="absolute right-1 top-1 h-[150px] w-[76px] rounded-[16px] border border-white/15 bg-gradient-to-b from-white/10 to-white/[.03] p-1.5">
            <div className="h-full rounded-[11px] bg-white/[.06] p-2">
              <div className="mx-auto mt-1 h-1 w-6 rounded-full bg-white/20" />
              <div className="mt-6 text-center text-[9px] text-white/50">Montant</div>
              <div className="num text-center text-[13px] font-semibold">704 €</div>
              <div className="mx-auto mt-4 grid h-7 w-7 place-items-center rounded-full bg-white/10">
                <Nfc className="h-3.5 w-3.5 text-white/80 transition duration-500 group-hover:scale-110" />
              </div>
            </div>
          </div>
          <div className="absolute -left-3 top-[104px] h-[46px] w-[70px] -rotate-12 rounded-[8px] bg-[linear-gradient(135deg,#8b5cf6,#4c1d95)] shadow-[0_12px_24px_-8px_rgba(0,0,0,.5)] transition-transform duration-700 ease-out-quint group-hover:-translate-y-2 group-hover:translate-x-2 group-hover:rotate-0">
            <div className="ml-2 mt-2.5 h-2.5 w-3.5 rounded-[3px] bg-white/60" />
            <div className="ml-2 mt-3 h-1 w-9 rounded-full bg-white/40" />
          </div>
        </div>
      </div>
    </div>
  );
}
