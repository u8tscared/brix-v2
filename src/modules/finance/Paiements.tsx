import { useState } from 'react';
import { Link2, Nfc, Smartphone } from 'lucide-react';
import { Button, Card, PageHeader, Sheet } from '@/components/ui';
import { daysBetween, money, todayISO } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { PaymentLinkSheet } from '@/modules/factures/components/PaymentSheets';
import { amounts } from '@/modules/factures/lib/model';
import { allPayments, useFactures } from '@/modules/factures/store';
import { FeesCard, InstallmentsCard, LinksCard, PaymentsCard } from './components/paiements/Cards';
import { TapToPay } from './components/paiements/TapToPay';

export default function Paiements() {
  const s = useBrix();
  const fx = useFactures();
  const [tap, setTap] = useState(false);
  const [pick, setPick] = useState(false);
  const [linkFor, setLinkFor] = useState<string | null>(null);
  const month = todayISO().slice(0, 7);

  const payments = [...allPayments(s.factures, fx.payments), ...fx.payments.filter((p) => p.factureId === 'libre')].sort((a, b) => b.date.localeCompare(a.date));
  const monthPays = payments.filter((p) => p.date.startsWith(month));
  const cashed = monthPays.reduce((t, p) => t + p.amount, 0);
  const fees = monthPays.reduce((t, p) => t + (p.fee ?? 0), 0);
  const unpaid = s.factures.filter((f) => f.status !== 'brouillon' && f.status !== 'annulee' && f.kind !== 'avoir' && amounts(f).remaining > 0);
  const viaLinks = unpaid.filter((f) => fx.extras[f.id]?.paymentLink).reduce((t, f) => t + amounts(f).remaining, 0);
  const delays = s.factures
    .filter((f) => amounts(f).remaining === 0 && f.paidAmount > 0 && f.kind !== 'acompte')
    .map((f) => {
      const last = payments.find((p) => p.factureId === f.id);
      return last ? Math.max(0, daysBetween(f.issueDate, last.date)) : null;
    })
    .filter((x): x is number => x !== null);
  const avgDelay = delays.length ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) : 0;
  const linkFacture = s.factures.find((f) => f.id === linkFor);
  const linkClient = s.clients.find((c) => c.id === linkFacture?.clientId);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Paiements"
        subtitle="Faites-vous payer plus vite : lien, carte sur votre téléphone, paiement en plusieurs fois."
        actions={
          <>
            <Button variant="secondary" icon={<Link2 className="h-4 w-4" />} onClick={() => setPick(true)} className="flex-1 sm:flex-none">Lien de paiement</Button>
            <Button variant="dawn" icon={<Nfc className="h-4 w-4" />} onClick={() => setTap(true)} className="flex-1 sm:flex-none">Encaisser par carte</Button>
          </>
        }
      />

      <Card className="grid grid-cols-2 lg:grid-cols-4 [&>*]:border-line max-lg:[&>*:nth-child(-n+2)]:border-b [&>*:nth-child(odd)]:border-r lg:[&>*:not(:last-child)]:border-r">
        <Kpi label="Encaissé ce mois" value={money(cashed, true)} sub={`${monthPays.length} paiements`} />
        <Kpi label="En attente sur les liens" value={money(viaLinks, true)} sub={`${unpaid.filter((f) => fx.extras[f.id]?.paymentLink).length} liens envoyés`} />
        <Kpi label="Frais ce mois" value={money(fees)} sub={cashed ? `${((fees / cashed) * 100).toFixed(2).replace('.', ',')} % des encaissements` : 'aucun'} />
        <Kpi label="Délai moyen de paiement" value={`${avgDelay} jours`} sub="moyenne du secteur : 49 jours" />
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <LinksCard onCreate={() => setPick(true)} />
          <PaymentsCard payments={payments} />
        </div>
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="flex gap-4 p-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-ink text-white">
                <Smartphone className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <div className="text-[14px] font-semibold">Votre téléphone devient un terminal de paiement</div>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-2">Fin du chantier, le client pose sa carte contre votre téléphone : c’est payé, la facture est soldée, le reçu part par SMS. Sans boîtier à louer.</p>
                <Button size="sm" variant="secondary" className="mt-3" icon={<Nfc className="h-3.5 w-3.5" />} onClick={() => setTap(true)}>Essayer</Button>
              </div>
            </div>
          </Card>
          <InstallmentsCard />
          <FeesCard />
        </div>
      </div>

      <TapToPay open={tap} onClose={() => setTap(false)} />
      <Sheet open={pick} onClose={() => setPick(false)} title="Lien de paiement" subtitle="Pour quelle facture ?">
        <div className="space-y-2">
          {unpaid.map((f) => (
            <button key={f.id} onClick={() => { setPick(false); setLinkFor(f.id); }} className="flex min-h-[56px] w-full items-center gap-3 rounded-xl border border-line px-3.5 py-2.5 text-left transition hover:bg-sub">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium">{s.clients.find((c) => c.id === f.clientId)?.name}</div>
                <div className="truncate text-[12px] text-ink-3">{f.number} · {f.title}</div>
              </div>
              <span className="num text-[14px] font-semibold">{money(amounts(f).remaining)}</span>
            </button>
          ))}
          {unpaid.length === 0 && <p className="text-[13px] text-ink-2">Toutes vos factures sont payées.</p>}
        </div>
      </Sheet>
      {linkFacture && <PaymentLinkSheet f={linkFacture} open={!!linkFor} onClose={() => setLinkFor(null)} clientEmail={linkClient?.email} clientPhone={linkClient?.phone} />}
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="min-w-0 p-4">
      <div className="text-xs font-medium text-ink-2">{label}</div>
      <div className="num mt-1.5 truncate text-[22px] font-semibold leading-tight tracking-[-0.02em]">{value}</div>
      <div className="mt-1 truncate text-xs text-ink-2">{sub}</div>
    </div>
  );
}
