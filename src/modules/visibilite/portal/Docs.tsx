import { useState } from 'react';
import { Apple, Check, CheckCircle2, CreditCard, FileSignature, FileText, Landmark, Lock, Receipt, ShieldCheck } from 'lucide-react';
import { Button, cn, Sheet, toast } from '@/components/ui';
import { dateShort, money, totals } from '@/lib/format';
import type { Devis, Facture } from '@/lib/types';
import { payInvoice, usePortalLocal } from './data';
import { lienPublic } from '@/parcours/liens';

interface Inv { id: string; number: string; title: string; amount: number; dueDate: string }

export function Docs({ devis, factures, situation, payment, companyName }: { devis?: Devis; factures: Facture[]; situation: Inv; payment: boolean; companyName: string }) {
  const { paid, pay } = usePortalLocal();
  const [paying, setPaying] = useState<Inv | null>(null);
  const [method, setMethod] = useState<'card' | 'apple' | 'virement'>('card');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const sitPaid = paid.includes(situation.id);

  const go = async () => {
    if (!paying) return;
    setBusy(true);
    await payInvoice(paying.id, method);
    pay(paying.id);
    setBusy(false);
    setOk(true);
  };
  const close = () => {
    setPaying(null);
    setOk(false);
  };
  const row = (icon: React.ReactNode, title: string, sub: string, right: React.ReactNode, key: string) => (
    <div key={key} className="flex min-h-[60px] items-center gap-3 border-b border-line py-2.5 last:border-b-0">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sub text-ink-2">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-medium">{title}</div>
        <div className="truncate text-[12.5px] text-ink-3">{sub}</div>
      </div>
      {right}
    </div>
  );
  const ouvrir = (href: string) => <a href={href} className="grid h-10 place-items-center rounded-full px-3 text-[13px] font-medium text-brand hover:bg-sub">Ouvrir</a>;
  const pdf = (name: string) => <button onClick={() => toast(`${name} téléchargé (démo)`)} className="h-10 rounded-full px-3 text-[13px] font-medium text-brand hover:bg-sub">PDF</button>;

  return (
    <>
      {!sitPaid && (
        <div className="mb-3 rounded-2xl bg-sub p-4">
          <div className="text-[12.5px] text-ink-2">{situation.title}</div>
          <div className="mt-0.5 flex items-end gap-2">
            <span className="num font-display text-[26px] font-semibold leading-none tracking-[-0.02em]">{money(situation.amount)}</span>
            <span className="pb-0.5 text-[12.5px] text-ink-3">à régler avant le {dateShort(situation.dueDate)}</span>
          </div>
          {payment && <Button variant="primary" size="lg" className="mt-3 w-full justify-center" onClick={() => setPaying(situation)}>Payer en ligne</Button>}
        </div>
      )}
      <div>
        {sitPaid && row(<Receipt className="h-[18px] w-[18px]" />, `Facture ${situation.number}`, `${situation.title} · payée`, <span className="flex items-center gap-1 text-[12.5px] font-medium text-ok"><Check className="h-4 w-4" />Payée</span>, 'sit')}
        {factures.map((f) => row(<Receipt className="h-[18px] w-[18px]" />, `Facture ${f.number}`, `${f.title} · ${money(totals(f.lines).ttc)}`, f.status === 'payee' ? <span className="flex items-center gap-1 text-[12.5px] font-medium text-ok"><Check className="h-4 w-4" />Payée</span> : ouvrir(lienPublic('facture', f.id)), f.id))}
        {devis && row(<FileSignature className="h-[18px] w-[18px]" />, `Devis signé ${devis.number}`, `Signé le ${dateShort(devis.signedAt ?? devis.createdAt)} · ${money(totals(devis.lines).ttc)}`, ouvrir(lienPublic('devis', devis.id)), 'devis')}
        {row(<ShieldCheck className="h-[18px] w-[18px]" />, 'Attestation décennale', 'AXA · valable jusqu\'au 31/12', pdf('Attestation'), 'dec')}
        {row(<FileText className="h-[18px] w-[18px]" />, 'Plan électrique du logement', 'Ajouté par Karim', pdf('Plan'), 'plan')}
      </div>

      <Sheet open={!!paying} onClose={close} title={ok ? undefined : 'Payer la facture'} subtitle={ok ? undefined : `${paying?.number} · ${companyName}`}>
        {ok ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-ok" strokeWidth={1.5} />
            <div className="mt-3 font-display text-[20px] font-semibold">Paiement reçu</div>
            <p className="mt-1 text-[14px] text-ink-2">Merci ! {companyName} est prévenu et votre reçu arrive par e-mail.</p>
            <Button variant="primary" size="lg" className="mt-6 w-full justify-center" onClick={close}>Retour au chantier</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="num text-center font-display text-[34px] font-semibold tracking-[-0.02em]">{money(paying?.amount ?? 0)}</div>
            <div className="space-y-2">
              {([['card', 'Carte bancaire', CreditCard, 'Visa, Mastercard, CB'], ['apple', 'Apple Pay', Apple, 'En un geste'], ['virement', 'Virement instantané', Landmark, 'Depuis votre banque, sans saisir d\'IBAN']] as const).map(([k, l, I, sub]) => (
                <button key={k} onClick={() => setMethod(k)} className={cn('flex min-h-[58px] w-full items-center gap-3 rounded-2xl border px-4 text-left transition', method === k ? 'border-ink bg-sub' : 'border-line')}>
                  <I className="h-5 w-5" strokeWidth={1.75} />
                  <span className="flex-1"><span className="block text-[14px] font-medium">{l}</span><span className="text-[12px] text-ink-3">{sub}</span></span>
                  <span className={cn('grid h-5 w-5 place-items-center rounded-full border', method === k ? 'border-ink' : 'border-line2')}>{method === k && <i className="h-2.5 w-2.5 rounded-full bg-ink" />}</span>
                </button>
              ))}
            </div>
            {method === 'card' && (
              <div className="space-y-2">
                <div className="flex h-12 items-center rounded-xl border border-line2 px-3 text-[14px] text-ink-3">Numéro de carte</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex h-12 items-center rounded-xl border border-line2 px-3 text-[14px] text-ink-3">MM / AA</div>
                  <div className="flex h-12 items-center rounded-xl border border-line2 px-3 text-[14px] text-ink-3">CVC</div>
                </div>
              </div>
            )}
            <Button variant={method === 'apple' ? 'primary' : 'primary'} size="lg" className="w-full justify-center" loading={busy} onClick={go}>
              {method === 'apple' ? 'Payer avec Apple Pay' : method === 'virement' ? 'Choisir ma banque' : `Payer ${money(paying?.amount ?? 0)}`}
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-[12px] text-ink-3"><Lock className="h-3.5 w-3.5" />Paiement sécurisé · démonstration, aucun débit</p>
          </div>
        )}
      </Sheet>
    </>
  );
}
