// Blocs de l'écran Paiements : liens actifs, encaissements, paiement en plusieurs fois, frais.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Link2, Split } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, Switch, toast } from '@/components/ui';
import { dateShort, money } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { amounts, METHOD_LABEL, type Payment } from '@/modules/factures/lib/model';
import { METHOD_FEES } from '@/modules/factures/service';
import { useFactures } from '@/modules/factures/store';

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
        <ul className="divide-y divide-line">
          {links.map(({ f, link, a, client }) => (
            <li key={f.id} className="flex min-h-[60px] items-center gap-3 px-4 py-2.5">
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
              <button onClick={() => copy(link.url)} aria-label="Copier le lien" className="grid h-10 w-10 place-items-center rounded-lg text-ink-3 hover:bg-sub hover:text-ink">
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
        <ul className="divide-y divide-line">
          {payments.slice(0, 10).map((p) => {
            const f = s.factures.find((x) => x.id === p.factureId);
            const client = s.clients.find((c) => c.id === f?.clientId);
            return (
              <li key={p.id} className="flex min-h-[58px] items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium">{client?.name ?? p.note ?? 'Encaissement'}</div>
                  <div className="truncate text-[12px] text-ink-3">
                    {METHOD_LABEL[p.method]} · {dateShort(p.date)}
                    {f ? ` · ${f.number}` : ''}
                    {p.fee ? ` · frais ${money(p.fee)}` : ''}
                  </div>
                </div>
                <span className="num text-[14px] font-semibold text-ok">+{money(p.amount)}</span>
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
      <CardHeader title="Paiement en 3 ou 4 fois" icon={<Split className="h-4 w-4 text-ink-2" />} action={<Switch checked={fx.installments} onChange={(v) => fx.set({ installments: v })} label="Proposer le paiement en plusieurs fois" />} />
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
          <div className="rounded-xl bg-sub p-3">
            <div className="text-[12px] text-ink-3">Votre client paie</div>
            <div className="num text-[17px] font-semibold">{n} × {money(amount / n)}</div>
            <div className="text-[11.5px] text-ink-3">sans frais pour lui</div>
          </div>
          <div className="rounded-xl bg-ok-bg p-3">
            <div className="text-[12px] text-ok">Vous recevez aujourd’hui</div>
            <div className="num text-[17px] font-semibold">{money(amount - fee)}</div>
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
      <CardHeader title="Frais, sans surprise" meta="pas d’abonnement, pas de terminal" />
      <ul className="divide-y divide-line">
        {keys.map((k) => (
          <li key={k} className="flex min-h-[46px] items-center justify-between gap-3 px-4 py-2 text-[13px]">
            <span>{METHOD_FEES[k].label}</span>
            <span className="num font-medium">{METHOD_FEES[k].text}</span>
          </li>
        ))}
      </ul>
      <p className="border-t border-line px-4 py-3 text-[12px] text-ink-3">Exemple : 1 000 € par carte = 15,25 € de frais. Argent sur votre compte sous 2 jours ouvrés (virement instantané : 10 secondes).</p>
    </Card>
  );
}
