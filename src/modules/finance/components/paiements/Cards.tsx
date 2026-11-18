// Blocs de l'écran Paiements : liens actifs, encaissements, paiement en plusieurs fois, frais.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, CreditCard, Landmark, Link2, Nfc, Split, Zap } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, IconTile, Switch, toast, type HaloTone } from '@/components/ui';
import { dateShort, money } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { amounts, METHOD_LABEL, type Payment } from '@/modules/factures/lib/model';
import { METHOD_FEES } from '@/modules/factures/service';
import { useFactures } from '@/modules/factures/store';

const PAY_ICON: Record<string, React.ReactNode> = { virement: <Landmark />, instantane: <Zap />, carte: <CreditCard />, tap: <Nfc />, lien: <Link2 />, x3: <Split />, x4: <Split /> };
const PAY_TONE: Record<string, HaloTone> = { virement: 'green', instantane: 'cyan', carte: 'violet', tap: 'mag', lien: 'violet', x3: 'peach', x4: 'peach' };

export function LinksCard({ onCreate }: { onCreate: () => void }) {
  const s = useBrix();
  const extras = useFactures((x) => x.extras);
  const links = s.factures.filter((f) => extras[f.id]?.paymentLink && f.status !== 'annulee').map((f) => ({ f, link: extras[f.id]!.paymentLink!, a: amounts(f), client: s.clients.find((c) => c.id === f.clientId) }));
  const copy = (url: string) => {
    navigator.clipboard?.writeText(url).catch(() => undefined);
    toast('Lien copié');
  };
  return (
    <Card>
      <CardHeader title="Liens de paiement" meta={`${links.filter((l) => l.a.remaining > 0).length} en attente`} action={<Button size="sm" variant="secondary" icon={<Link2 className="h-3.5 w-3.5" />} onClick={onCreate}>Créer</Button>} />
      {links.length === 0 ? (
        <EmptyState className="m-4" icon={<Link2 />} title="Aucun lien pour l’instant" text="Un lien envoyé avec la facture, et le client paie en un clic. En moyenne 9 jours plus tôt." />
      ) : (
        <ul className="divide-y divide-halo-line">
          {links.map(({ f, link, a, client }) => (
            <li key={f.id} className="flex min-h-[60px] items-center gap-3 px-4 py-2.5">
              <IconTile icon={<Link2 />} tone="violet" size="row" />
              <Link to={`/app/factures/${f.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13.5px] font-medium">{client?.name}</span>
                  {a.remaining > 0 ? <Badge tone="info">Ouvert {link.opened ?? 0} fois</Badge> : <Badge tone="ok">Payé</Badge>}
                </div>
                <div className="truncate text-[12px] text-ink-3">
                  {f.number} · {link.methods.map((m) => METHOD_LABEL[m]).join(', ')}
                </div>
              </Link>
              <span className="num text-[14px] font-semibold">{money(a.remaining > 0 ? a.remaining : a.paid)}</span>
              <button onClick={() => copy(link.url)} aria-label="Copier le lien" className="grid h-10 w-10 place-items-center rounded-full text-ink-3 transition hover:bg-halo-hover hover:text-ink">
                <Copy className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function PaymentsCard({ payments }: { payments: Payment[] }) {
  const s = useBrix();
  return (
    <Card>
      <CardHeader title="Encaissements" meta="les plus récents" />
      {payments.length === 0 ? (
        <EmptyState className="m-4" title="Aucun encaissement" text="Les virements reçus sur votre compte apparaissent ici tout seuls." />
      ) : (
        <ul className="divide-y divide-halo-line">
          {payments.slice(0, 10).map((p) => {
            const f = s.factures.find((x) => x.id === p.factureId);
            const client = s.clients.find((c) => c.id === f?.clientId);
            return (
              <li key={p.id} className="flex min-h-[58px] items-center gap-3 px-4 py-2.5">
                <IconTile icon={PAY_ICON[p.method] ?? <Landmark />} tone={PAY_TONE[p.method] ?? 'green'} size="row" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium">{client?.name ?? p.note ?? 'Encaissement'}</div>
                  <div className="truncate text-[12px] text-ink-3">
                    {METHOD_LABEL[p.method]} · {dateShort(p.date)}
                    {f ? ` · ${f.number}` : ''}
                    {p.fee ? ` · frais ${money(p.fee)}` : ''}
                  </div>
                </div>
                <span className="num text-[14px] font-semibold text-deep-g">+{money(p.amount)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export function InstallmentsCard() {
  const fx = useFactures();
  const [amount, setAmount] = useState(3600);
  const n = 3;
  const fee = Math.round(amount * 0.029 * 100) / 100;
  return (
    <Card>
      <CardHeader title="Paiement en 3 ou 4 fois" icon={<IconTile icon={<Split />} tone="peach" size="sm" />} action={<Switch checked={fx.installments} onChange={(v) => fx.set({ installments: v })} label="Proposer le paiement en plusieurs fois" />} />
      <div className="space-y-4 p-4">
        <p className="text-[13px] leading-relaxed text-ink-2">Le client étale ses travaux, vous êtes payé en une seule fois, tout de suite. Le risque d’impayé est pour l’organisme de financement, pas pour vous.</p>
        <div>
          <div className="flex items-baseline justify-between text-[12.5px] text-ink-2">
            <span>Pour une facture de</span>
            <span className="num text-[15px] font-semibold text-ink">{money(amount, true)}</span>
          </div>
          <input type="range" min={300} max={10000} step={100} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="mt-2 h-8 w-full accent-[#6d28d9]" aria-label="Montant de la facture" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-card-sm bg-pale-n p-3.5">
            <div className="text-[12px] text-ink-2">Votre client paie</div>
            <div className="num-halo mt-0.5 text-[20px]">{n} × {money(amount / n)}</div>
            <div className="text-[11.5px] text-ink-3">sans frais pour lui</div>
          </div>
          <div className="rounded-card-sm bg-pale-g p-3.5">
            <div className="text-[12px] text-deep-g">Vous recevez aujourd’hui</div>
            <div className="num-halo mt-0.5 text-[20px]">{money(amount - fee)}</div>
            <div className="text-[11.5px] text-ink-3">frais {money(fee)} (2,9 %)</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function FeesCard() {
  const keys = ['virement', 'instantane', 'carte', 'apple_pay', 'tap', 'x3', 'x4'];
  return (
    <Card>
      <CardHeader title="Frais, sans surprise" meta="pas d’abonnement" />
      <dl className="px-4 py-1 md:px-5">
        {keys.map((k) => (
          <div key={k} className="flex min-h-[40px] items-center justify-between gap-3 border-b border-dashed border-halo-line text-[13px] last:border-b-0">
            <dt className="text-ink-2">{METHOD_FEES[k].label}</dt>
            <dd className={'num font-medium ' + (METHOD_FEES[k].text === 'Gratuit' ? 'text-deep-g' : '')}>{METHOD_FEES[k].text}</dd>
          </div>
        ))}
      </dl>
      <p className="px-4 pb-4 pt-2 text-[12px] leading-relaxed text-ink-3 md:px-5">Exemple : 1 000 € par carte = 15,25 € de frais. Argent sur votre compte sous 2 jours ouvrés, ou 10 secondes en virement instantané.</p>
    </Card>
  );
}
