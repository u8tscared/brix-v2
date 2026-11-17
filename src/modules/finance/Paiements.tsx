import { useState } from 'react';
import { Link2, Nfc } from 'lucide-react';
import { Button, Card, IconTile, PageHeader, Sheet } from '@/components/ui';
import { AnimatedNumber, GrowBar } from '@/components/motion';
import { daysBetween, money, todayISO } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { PaymentLinkSheet } from '@/modules/factures/components/PaymentSheets';
import { amounts } from '@/modules/factures/lib/model';
import { allPayments, useFactures } from '@/modules/factures/store';
import { BigMoney, Label } from './components/kit';
import { FeesCard, InstallmentsCard, LinksCard, PaymentsCard } from './components/paiements/Cards';
import { OwedCard } from './components/paiements/Owed';
import { TapPromo } from './components/paiements/TapPromo';
import { TapToPay } from './components/paiements/TapToPay';

const SECTOR_DELAY = 49;

export default function Paiements() {
  const s = useBrix();
  const fx = useFactures();
  const [tap, setTap] = useState<{ open: boolean; id?: string }>({ open: false });
  const [pick, setPick] = useState(false);
  const [linkFor, setLinkFor] = useState<string | null>(null);
  const month = todayISO().slice(0, 7);

  const payments = [...allPayments(s.factures, fx.payments), ...fx.payments.filter((p) => p.factureId === 'libre')].sort((a, b) => b.date.localeCompare(a.date));
  const monthPays = payments.filter((p) => p.date.startsWith(month));
  const cashed = monthPays.reduce((t, p) => t + p.amount, 0);
  const fees = monthPays.reduce((t, p) => t + (p.fee ?? 0), 0);
  const unpaid = s.factures.filter((f) => f.status !== 'brouillon' && f.status !== 'annulee' && f.kind !== 'avoir' && amounts(f).remaining > 0);
  const owed = unpaid.reduce((t, f) => t + amounts(f).remaining, 0);
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
    <div className="space-y-6">
      <PageHeader
        icon={<IconTile name="CreditCard" dept="facturer" size="lg" />}
        title="Paiements"
        subtitle="Faites-vous payer plus vite : lien, carte sur votre téléphone, paiement en plusieurs fois."
        actions={
          <>
            <Button variant="secondary" icon={<Link2 />} onClick={() => setPick(true)} className="flex-1 sm:flex-none">Lien de paiement</Button>
            <Button variant="dawn" icon={<Nfc />} onClick={() => setTap({ open: true })} className="flex-1 sm:flex-none">Encaisser par carte</Button>
          </>
        }
      />

      <Card className="grid grid-cols-2 overflow-hidden md:grid-cols-[1.1fr_1fr_1fr]">
        <div className="col-span-2 p-5 md:col-span-1 md:p-6">
          <Label>Encaissé ce mois</Label>
          <BigMoney value={cashed} className="mt-3 block text-[40px] md:text-[44px]" />
          <div className="mt-2 text-[12.5px] text-ink-2">{monthPays.length} paiement{monthPays.length > 1 ? 's' : ''} · frais <span className="num">{money(fees)}</span></div>
        </div>
        <div className="border-line p-4 max-md:border-r max-md:border-t md:border-l md:p-6">
          <Label>On vous doit</Label>
          <BigMoney value={owed} className="mt-3 block text-[24px] md:text-[28px]" />
          <div className="mt-2 text-[12.5px] text-ink-2">{unpaid.length} facture{unpaid.length > 1 ? 's' : ''} ouverte{unpaid.length > 1 ? 's' : ''}</div>
        </div>
        <div className="border-line p-4 max-md:border-t md:border-l md:p-6">
          <Label>Vos clients paient en</Label>
          <div className="mt-3 flex items-baseline gap-1.5">
            <AnimatedNumber value={avgDelay} className="text-[24px] md:text-[28px] font-semibold leading-none tracking-[-0.045em]" />
            <span className="text-[14px] font-medium text-ink-2">{avgDelay > 1 ? 'jours' : 'jour'}</span>
          </div>
          <div className="mt-3 space-y-1.5 text-[11.5px] text-ink-3">
            <div className="flex items-center gap-2"><span className="w-12 shrink-0">Vous</span><GrowBar value={(avgDelay / SECTOR_DELAY) * 100} className="flex-1" barClassName="bg-ok" /></div>
            <div className="flex items-center gap-2"><span className="w-12 shrink-0">Secteur</span><GrowBar value={100} className="flex-1" barClassName="bg-[#d6d3e2]" /><span className="num">{SECTOR_DELAY} j</span></div>
          </div>
        </div>
      </Card>

      <OwedCard unpaid={unpaid} onLink={setLinkFor} onTap={(id) => setTap({ open: true, id })} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <LinksCard onCreate={() => setPick(true)} />
          <PaymentsCard payments={payments} />
        </div>
        <div className="min-w-0 space-y-5">
          <TapPromo onTry={() => setTap({ open: true })} />
          <InstallmentsCard />
          <FeesCard />
        </div>
      </div>

      <TapToPay open={tap.open} factureId={tap.id} onClose={() => setTap({ open: false })} />
      <Sheet open={pick} onClose={() => setPick(false)} title="Lien de paiement" subtitle="Pour quelle facture ?">
        <div className="stagger-fast space-y-2">
          {unpaid.map((f) => (
            <button key={f.id} onClick={() => { setPick(false); setLinkFor(f.id); }} className="press flex min-h-[56px] w-full items-center gap-3 rounded-xl border border-line px-3.5 py-2.5 text-left transition hover:border-vi-200 hover:bg-vi-25">
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
