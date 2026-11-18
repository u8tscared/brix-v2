import { Check } from 'lucide-react';
import { Button, IconTile, Sheet, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { OFFERS, PLAN_ORDER, type ModuleDef } from '@/lib/catalog';
import { money } from '@/lib/format';

/** Débloquer un module d'une offre supérieure : on montre clairement l'offre requise et ce qu'elle apporte. */
export function UnlockSheet({ module: m, onClose, onDone }: { module: ModuleDef | null; onClose: () => void; onDone?: (m: ModuleDef) => void }) {
  const plan = useBrix((s) => s.plan);
  const setPlan = useBrix((s) => s.setPlan);
  const toggle = useBrix((s) => s.toggleModule);
  const offer = m ? OFFERS.find((o) => o.key === m.plan) : undefined;
  const current = OFFERS.find((o) => o.key === plan);
  const confirm = () => {
    if (!m || !offer) return;
    if (PLAN_ORDER.indexOf(plan) < PLAN_ORDER.indexOf(m.plan)) setPlan(m.plan);
    toggle(m.key, true);
    onDone?.(m);
    onClose();
    toast(`Offre ${offer.name} activée, ${m.name} est dans votre menu. 14 jours offerts.`);
  };
  return (
    <Sheet
      open={!!m}
      onClose={onClose}
      side="center"
      width={440}
      title={m ? `Débloquer ${m.name}` : ''}
      subtitle={offer ? `Inclus dans l’offre ${offer.name}. Vous êtes en offre ${current?.name}.` : undefined}
      icon={m ? <IconTile name={m.icon} dept={m.dept} size="md" /> : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Plus tard</Button>
          <Button variant="dawn" onClick={confirm}>Essayer {offer?.name} 14 jours</Button>
        </>
      }
    >
      {offer && (
        <div className="space-y-4">
          <div className="rounded-card-sm bg-dawn-pale p-4 shadow-halo-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-[15px] font-semibold">Offre {offer.name}</span>
              <span className="num-halo text-[22px]">{offer.price ? `${money(offer.price, offer.price % 1 === 0)}` : 'Sur devis'}<span className="ml-1 text-[12px] font-normal text-ink-3">{offer.price ? 'HT / mois' : ''}</span></span>
            </div>
            <ul className="stagger-fast mt-3 space-y-2">
              {offer.includes.map((i) => (
                <li key={i} className="flex gap-2.5 text-[13px]"><span className="mt-px grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-pale-g text-deep-g"><Check className="h-3 w-3" strokeWidth={2.4} /></span>{i}</li>
              ))}
            </ul>
          </div>
          <p className="text-[12.5px] text-ink-3">Sans engagement : vous pouvez revenir à l’offre {current?.name} quand vous voulez, vos données restent. En démo, rien n’est facturé.</p>
        </div>
      )}
    </Sheet>
  );
}
