// Enregistrer un paiement et créer un lien de paiement (Stripe simulé).

import { useEffect, useState } from 'react';
import { Apple, Banknote, Check, Copy, CreditCard, Landmark, ReceiptText, Repeat, Link2, MessageSquareText, Mail, Split, Zap } from 'lucide-react';
import { Button, Field, IconTile, Input, Sheet, Switch, cn, toast, type HaloTone } from '@/components/ui';
import { money, todayISO } from '@/lib/format';
import type { Facture } from '@/lib/types';
import { recordPayment } from '../lib/actions';
import { amounts, METHOD_LABEL, type PaymentMethod } from '../lib/model';
import { createPaymentLink, feeFor, METHOD_FEES } from '../service';
import { useFactures } from '../store';
import { PaidSuccess } from './PaidSuccess';

const QUICK: PaymentMethod[] = ['virement', 'carte', 'cheque', 'especes', 'instantane', 'prelevement'];
const QUICK_ICON: Partial<Record<PaymentMethod, React.ReactNode>> = { virement: <Landmark />, carte: <CreditCard />, cheque: <ReceiptText />, especes: <Banknote />, instantane: <Zap />, prelevement: <Repeat /> };
const QUICK_TONE: Partial<Record<PaymentMethod, HaloTone>> = { virement: 'green', carte: 'violet', cheque: 'peach', especes: 'amber', instantane: 'cyan', prelevement: 'blue' };

export function RecordPaymentSheet({ f, open, onClose }: { f: Facture; open: boolean; onClose: () => void }) {
  const a = amounts(f);
  const [amount, setAmount] = useState(a.remaining);
  const [method, setMethod] = useState<PaymentMethod>('virement');
  const [date, setDate] = useState(todayISO());
  const [done, setDone] = useState<null | { amount: number; left: number }>(null);

  useEffect(() => {
    if (open) {
      setAmount(a.remaining);
      setDate(todayISO());
      setDone(null);
    }
  }, [open]);

  const partial = amount > 0 && amount < a.remaining - 0.009;
  const save = () => {
    if (!(amount > 0)) return toast('Indiquez un montant', 'warn');
    const paid = Math.min(amount, a.remaining);
    recordPayment(f.id, paid, method, date);
    setDone({ amount: paid, left: Math.max(0, a.remaining - paid) });
    toast(partial ? `Paiement partiel de ${money(paid)} enregistré` : `${f.number} réglée`);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={done ? undefined : 'Enregistrer un paiement'}
      subtitle={done ? undefined : `${f.number} · reste ${money(a.remaining)}`}
      footer={
        done ? undefined : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button variant="dawn" icon={<Check className="h-4 w-4" />} onClick={save}>
              {partial ? 'Enregistrer le paiement partiel' : 'Marquer comme payée'}
            </Button>
          </>
        )
      }
    >
      {done ? (
        <PaidSuccess
          title={done.left > 0 ? 'Paiement enregistré' : 'Facture réglée'}
          amount={done.amount}
          text={
            done.left > 0 ? (
              <>
                {money(done.amount)} reçus. Il reste <b className="font-medium text-ink">{money(done.left)}</b> à encaisser, Brix AI continue de suivre l’échéance.
              </>
            ) : (
              <>
                {money(done.amount)} reçus sur la {f.number}. Plus aucune relance ne partira pour cette facture.
              </>
            )
          }
          onClose={onClose}
        />
      ) : (
      <div className="space-y-4">
        <Field label="Montant reçu">
          <Input type="number" inputMode="decimal" step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} suffix="€" className="[&_input]:num [&_input]:h-14 [&_input]:text-[22px] [&_input]:font-semibold" />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Chip on={!partial} onClick={() => setAmount(a.remaining)}>Tout ({money(a.remaining)})</Chip>
          <Chip on={Math.abs(amount - a.remaining / 2) < 0.01} onClick={() => setAmount(Math.round(a.remaining * 50) / 100)}>La moitié</Chip>
        </div>
        <div>
          <div className="mb-2 text-[13px] font-medium text-ink-2">Moyen de paiement</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {QUICK.map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                aria-pressed={method === m}
                className={cn(
                  'flex h-12 items-center gap-2.5 rounded-card-sm bg-white pl-2 pr-3 text-left text-[13.5px] font-medium transition duration-300 ease-spring',
                  method === m ? 'shadow-[0_0_0_1.5px_#c9b2fb,0_8px_22px_-10px_rgba(109,40,217,.35)]' : 'shadow-halo-sm hover:-translate-y-px',
                )}
              >
                <IconTile icon={QUICK_ICON[m]} tone={method === m ? QUICK_TONE[m] : 'neutral'} size="sm" />
                <span className="min-w-0 truncate">{METHOD_LABEL[m]}</span>
              </button>
            ))}
          </div>
        </div>
        <Field label="Date de réception">
          <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        {partial && <p className="rounded-field bg-pale-a px-3.5 py-2.5 text-[12.5px] text-deep-a">Il restera {money(a.remaining - amount)} à encaisser. Brix AI continuera de suivre l’échéance.</p>}
      </div>
      )}
    </Sheet>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={on} className={cn('h-9 rounded-full px-3.5 text-[13px] font-medium transition duration-300 ease-spring active:scale-95', on ? 'bg-pale-v text-deep-v' : 'bg-white text-ink-2 shadow-[0_0_0_1px_#ece8f6] hover:-translate-y-px')}>
      {children}
    </button>
  );
}

const LINK_METHODS: { key: PaymentMethod; icon: React.ReactNode; hint: string; tone: HaloTone }[] = [
  { key: 'carte', icon: <CreditCard />, hint: 'Visa, Mastercard, CB', tone: 'violet' },
  { key: 'apple_pay', icon: <Apple />, hint: 'Et Google Pay, en un geste', tone: 'neutral' },
  { key: 'instantane', icon: <Zap />, hint: 'Argent reçu en 10 secondes', tone: 'cyan' },
  { key: 'x3', icon: <Split />, hint: 'Vous êtes payé en une fois', tone: 'peach' },
  { key: 'x4', icon: <Split />, hint: 'Vous êtes payé en une fois', tone: 'mag' },
];

export function PaymentLinkSheet({ f, open, onClose, clientEmail, clientPhone }: { f: Facture; open: boolean; onClose: () => void; clientEmail?: string; clientPhone?: string }) {
  const extra = useFactures((s) => s.extras[f.id]);
  const setExtra = useFactures((s) => s.setExtra);
  const a = amounts(f);
  const [methods, setMethods] = useState<PaymentMethod[]>(extra?.paymentLink?.methods ?? ['carte', 'apple_pay', 'instantane', 'x3']);
  const [busy, setBusy] = useState(false);
  const link = extra?.paymentLink;
  const toggle = (m: PaymentMethod, on: boolean) => setMethods(on ? [...methods, m] : methods.filter((x) => x !== m));

  const create = async () => {
    setBusy(true);
    const l = await createPaymentLink(f, methods);
    setExtra(f.id, { paymentLink: { url: l.url, createdAt: l.createdAt, methods, opened: 0 } });
    setBusy(false);
    toast('Lien de paiement prêt');
  };
  const copy = () => {
    navigator.clipboard?.writeText(link!.url).catch(() => undefined);
    toast('Lien copié');
  };

  return (
    <Sheet open={open} onClose={onClose} title="Lien de paiement" subtitle={`Votre client paie ${money(a.remaining)} en ligne, l’argent arrive sur votre compte.`} width={520}>
      <div className="space-y-4">
        <div className="space-y-2">
          {LINK_METHODS.map((m) => {
            const fee = feeFor(m.key, a.remaining);
            return (
              <label key={m.key} className="row-card min-h-[60px] cursor-pointer gap-3 py-2.5">
                <IconTile icon={m.icon} tone={m.tone} size="row" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-medium">{METHOD_LABEL[m.key]}</div>
                  <div className="text-[12px] text-ink-3">{m.hint}</div>
                </div>
                <div className="text-right text-[12px] text-ink-2">
                  <div>{METHOD_FEES[m.key].text}</div>
                  <div className="num text-ink-3">soit {money(fee)}</div>
                </div>
                <Switch checked={methods.includes(m.key)} onChange={(v) => toggle(m.key, v)} label={METHOD_LABEL[m.key]} />
              </label>
            );
          })}
        </div>
        <p className="text-[12px] text-ink-3">Frais prélevés sur le paiement, rien d’autre : pas d’abonnement, pas de frais cachés. En démo, aucun paiement réel n’est créé.</p>

        {link ? (
          <div className="space-y-3 rounded-card bg-dawn-pale p-4 shadow-halo-sm">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 shrink-0 text-ink-2" />
              <span className="min-w-0 flex-1 truncate font-mono text-[13px]">{link.url}</span>
              <Button size="sm" variant="secondary" icon={<Copy className="h-3.5 w-3.5" />} onClick={copy}>Copier</Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <a href={`mailto:${clientEmail ?? ''}?subject=${encodeURIComponent(`Facture ${f.number}`)}&body=${encodeURIComponent(`Bonjour, vous pouvez régler la facture ${f.number} ici : ${link.url}`)}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white text-[13.5px] font-medium shadow-[0_0_0_1px_#ece8f6] transition hover:-translate-y-px">
                <Mail className="h-4 w-4" /> Par mail
              </a>
              <a href={`sms:${(clientPhone ?? '').replace(/\s/g, '')}?&body=${encodeURIComponent(`Facture ${f.number} : ${link.url}`)}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white text-[13.5px] font-medium shadow-[0_0_0_1px_#ece8f6] transition hover:-translate-y-px">
                <MessageSquareText className="h-4 w-4" /> Par SMS
              </a>
            </div>
            <div className="text-[12px] text-ink-3">Créé le {new Date(link.createdAt + 'T12:00').toLocaleDateString('fr-FR')} · ouvert {link.opened ?? 0} fois par le client</div>
            <Button variant="ghost" size="sm" onClick={create} loading={busy}>Mettre à jour les moyens de paiement</Button>
          </div>
        ) : (
          <Button variant="dawn" size="lg" className="w-full justify-center" loading={busy} disabled={!methods.length} icon={<Landmark className="h-4 w-4" />} onClick={create}>
            Créer le lien de paiement
          </Button>
        )}
      </div>
    </Sheet>
  );
}
