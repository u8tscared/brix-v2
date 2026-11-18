import { useState } from 'react';
import { Check } from 'lucide-react';
import { Badge, Button, Card, IconTile, Segmented, Switch, cn, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { OFFERS, PLAN_ORDER, type Plan } from '@/lib/catalog';
import { money } from '@/lib/format';
import { AnimatedNumber } from '@/components/motion';
import { useBobLocal } from '@/modules/bob/store';

export default function OffreTab() {
  const plan = useBrix((s) => s.plan);
  const setPlan = useBrix((s) => s.setPlan);
  const { mcp, setMcp } = useBobLocal();
  const [period, setPeriod] = useState<'mois' | 'an'>('an');

  const choose = (p: Plan) => {
    if (p === 'entreprise') return toast('Notre équipe vous rappelle sous 24 h (simulé en démo).', 'info');
    const up = PLAN_ORDER.indexOf(p) > PLAN_ORDER.indexOf(plan);
    setPlan(p);
    toast(up ? `Bienvenue dans l’offre ${OFFERS.find((o) => o.key === p)!.name}. Les nouveaux modules sont débloqués.` : `Offre ${OFFERS.find((o) => o.key === p)!.name} à la prochaine échéance.`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13.5px] text-ink-2">Sans engagement. Changez d’offre quand vous voulez, vos données restent.</p>
        <Segmented value={period} onChange={setPeriod} options={[{ value: 'mois', label: 'Mensuel' }, { value: 'an', label: 'Annuel · 2 mois offerts' }]} />
      </div>

      <div className="stagger grid gap-4 [&>*]:min-w-0 sm:grid-cols-2 2xl:grid-cols-4">
        {OFFERS.map((o) => {
          const current = o.key === plan;
          const price = o.price === null ? null : period === 'an' ? o.price * 10 : o.price;
          return (
            <Card key={o.key} className={cn('relative flex flex-col p-5 transition-shadow duration-300', current ? 'bg-dawn-mist shadow-[0_0_0_1.5px_#d9c6fb,0_16px_40px_-16px_rgba(109,40,217,.35)]' : 'lift')}>
              <div className="flex items-center gap-2">
                <h3 className="text-[18px] font-semibold tracking-[-0.03em]">{o.name}</h3>
                {current && <Badge tone="violet" dot>Votre offre</Badge>}
                {o.highlight && !current && <Badge tone="mag">La plus choisie</Badge>}
              </div>
              <p className="text-[12.5px] text-ink-2">{o.pitch}</p>
              <div className="mt-4 min-h-[60px]">
                {price === null ? (
                  <div className="num-halo text-[30px]">Sur devis</div>
                ) : price === 0 ? (
                  <div className="num-halo text-[30px]">Gratuit</div>
                ) : (
                  <>
                    <div className="num-halo text-[30px]"><AnimatedNumber value={price} duration={600} format={(n) => money(n, price % 1 === 0)} /><span className="ml-1 text-[13px] font-normal text-ink-2">HT / {period === 'an' ? 'an' : 'mois'}</span></div>
                    <div className="text-[12px] text-ink-3">{period === 'an' ? `soit ${money(price / 12)} par mois` : o.unit}</div>
                  </>
                )}
              </div>
              <ul className="mt-3 flex-1 space-y-2">
                {o.includes.map((i) => (
                  <li key={i} className="flex gap-2.5 text-[13px]"><span className="mt-px grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-pale-g text-deep-g"><Check className="h-3 w-3" strokeWidth={2.4} /></span>{i}</li>
                ))}
              </ul>
              <Button className="mt-5 w-full justify-center" variant={current ? 'secondary' : o.key === 'entreprise' ? 'secondary' : PLAN_ORDER.indexOf(o.key) > PLAN_ORDER.indexOf(plan) ? (o.highlight || PLAN_ORDER.indexOf(o.key) === PLAN_ORDER.indexOf(plan) + 1 ? 'dawn' : 'primary') : 'ghost'} disabled={current} onClick={() => choose(o.key)}>
                {current ? 'Offre actuelle' : o.key === 'entreprise' ? 'Nous contacter' : PLAN_ORDER.indexOf(o.key) > PLAN_ORDER.indexOf(plan) ? `Passer à ${o.name}` : `Revenir à ${o.name}`}
              </Button>
            </Card>
          );
        })}
      </div>

      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center md:p-5">
        <IconTile name="Plug" dept="bob" size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[14px] font-semibold">Option Brix AI MCP <Badge tone="violet">Nouveau</Badge></div>
          <p className="text-[12.5px] text-ink-2">
            Interrogez Brix depuis Claude ou ChatGPT, et préparez des brouillons. {plan === 'equipe' || plan === 'entreprise' ? 'Inclus dans votre offre.' : plan === 'pro' ? '9 € HT par mois en plus de l’offre Pro.' : 'Disponible à partir de l’offre Pro.'}
          </p>
        </div>
        {plan === 'pro' ? (
          <Switch checked={mcp.mcpAddon} onChange={(v) => { setMcp({ mcpAddon: v }); toast(v ? 'Option Brix AI MCP ajoutée : 9 € HT par mois.' : 'Option retirée.'); }} label="Option Brix AI MCP" />
        ) : (
          <Badge tone={plan === 'start' ? 'neutral' : 'ok'}>{plan === 'start' ? 'Offre Pro requise' : 'Inclus'}</Badge>
        )}
      </Card>
      <p className="text-[12px] text-ink-3">Prix hors taxes. Paiement par carte ou prélèvement, facture électronique chaque mois. En démo, aucun paiement n’est demandé.</p>
    </div>
  );
}
