import { Nfc } from 'lucide-react';
import { Button } from '@/components/ui';

/** Carte « votre téléphone devient un terminal » : carte Halo qui rosit, petite scène téléphone + carte, sans boucle permanente. */
export function TapPromo({ onTry }: { onTry: () => void }) {
  return (
    <div className="lift group relative isolate overflow-hidden rounded-card bg-[linear-gradient(160deg,#fff_35%,#fdf0fb_75%,#fff3ea)] p-5 shadow-halo md:p-6">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 -z-10 h-64 w-64 rounded-full bg-[radial-gradient(closest-side,#efc9f7,transparent)] opacity-80 blur-xl" />
      <div className="relative flex gap-5">
        <div className="min-w-0 flex-1">
          <span className="chip tone-mag">Sans boîtier</span>
          <div className="mt-3 text-[20px] font-semibold leading-[1.15] tracking-[-0.035em]">Votre téléphone devient un terminal de paiement</div>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-2">Fin du chantier, le client pose sa carte contre votre téléphone. C'est payé, la facture est soldée, le reçu part par SMS.</p>
          <Button size="sm" variant="secondary" className="mt-4" icon={<Nfc />} onClick={onTry}>
            Essayer maintenant
          </Button>
        </div>
        <div aria-hidden className="relative hidden w-[92px] shrink-0 sm:block">
          <div className="absolute right-1 top-1 h-[150px] w-[76px] rounded-[18px] border-[3px] border-ink bg-white p-1.5 shadow-halo-lg">
            <div className="h-full rounded-[12px] bg-[radial-gradient(120%_70%_at_80%_0%,#f6d2f8,#fff_75%)] p-2">
              <div className="mx-auto mt-0.5 h-1 w-6 rounded-full bg-ink/80" />
              <div className="mt-5 text-center text-[9px] text-ink-3">Montant</div>
              <div className="num-halo text-center text-[14px]">704 €</div>
              <div className="mx-auto mt-3.5 grid h-7 w-7 place-items-center rounded-full text-white shadow-dawn" style={{ background: 'var(--dawn-d)' }}>
                <Nfc className="h-3.5 w-3.5 transition duration-500 ease-spring group-hover:scale-110" />
              </div>
            </div>
          </div>
          <div className="absolute -left-3 top-[104px] h-[46px] w-[70px] -rotate-12 rounded-[9px] bg-[linear-gradient(135deg,#8b5cf6,#4c1d95)] shadow-[0_12px_24px_-8px_rgba(76,29,149,.5)] transition-transform duration-700 ease-out-quint group-hover:-translate-y-2 group-hover:translate-x-2 group-hover:rotate-0">
            <div className="ml-2 mt-2.5 h-2.5 w-3.5 rounded-[3px] bg-white/60" />
            <div className="ml-2 mt-3 h-1 w-9 rounded-full bg-white/40" />
          </div>
        </div>
      </div>
    </div>
  );
}
