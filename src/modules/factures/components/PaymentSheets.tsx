// Enregistrer un paiement et créer un lien de paiement (Stripe simulé).

import { useEffect, useState } from 'react';
import { Apple, Check, Copy, CreditCard, Landmark, Link2, MessageSquareText, Mail, Split, Zap } from 'lucide-react';
import { Button, Field, Input, Sheet, Switch, cn, toast } from '@/components/ui';
import { money, todayISO } from '@/lib/format';
import type { Facture } from '@/lib/types';
import { recordPayment } from '../lib/actions';
import { amounts, METHOD_LABEL, type PaymentMethod } from '../lib/model';
import { createPaymentLink, feeFor, METHOD_FEES } from '../service';
import { useFactures } from '../store';

const QUICK: PaymentMethod[] = ['virement', 'carte', 'cheque', 'especes', 'instantane', 'prelevement'];

export function RecordPaymentSheet({ f, open, onClose }: { f: Facture; open: boolean; onClose: () => void }) {
  const a = amounts(f);
  const [amount, setAmount] = useState(a.remaining);
  const [method, setMethod] = useState<PaymentMethod>('virement');
  const [date, setDate] = useState(todayISO());

  useEffect(() => {
    if (open) {
      setAmount(a.remaining);
      setDate(todayISO());
    }
  }, [open]);

  const partial = amount > 0 && amount < a.remaining - 0.009;
  const save = () => {
    if (!(amount > 0)) return toast('Indiquez un montant', 'warn');
    recordPayment(f.id, Math.min(amount, a.remaining), method, date);
    toast(partial ? `Paiement partiel de ${money(amount)} enregistré` : 'Facture réglée, bravo');
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Enregistrer un paiement"
      subtitle={`${f.number} · reste ${money(a.remaining)}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="primary" icon={<Check className="h-4 w-4" />} onClick={save}>
            {partial ? 'Enregistrer le paiement partiel' : 'Marquer comme payée'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Montant reçu">
          <Input type="number" inputMode="decimal" step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} suffix="€" className="[&_input]:num [&_input]:h-14 [&_input]:text-[22px] [&_input]:font-semibold" />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Chip on={!partial} onClick={() => setAmount(a.remaining)}>Tout ({money(a.remaining)})</Chip>
          <Chip on={Math.abs(amount - a.remaining / 2) < 0.01} onClick={() => setAmount(Math.round(a.remaining * 50) / 100)}>La moitié</Chip>
        </div>
        <div>
          <div className="mb-1.5 text-[12.5px] font-medium text-ink-2">Moyen de paiement</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {QUICK.map((m) => (
              <button key={m} onClick={() => setMethod(m)} className={cn('h-11 rounded-[10px] border px-3 text-[13.5px] font-medium transition', method === m ? 'border-ink bg-ink text-white' : 'border-line2 bg-white hover:bg-sub')}>
                {METHOD_LABEL[m]}
              </button>
            ))}
          </div>
        </div>
        <Field label="Date de réception">
          <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        {partial && <p className="rounded-lg bg-sub px-3 py-2 text-[12.5px] text-ink-2">Il restera {money(a.remaining - amount)} à encaisser. Bob continuera de suivre l’échéance.</p>}
      </div>
    </Sheet>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn('h-9 rounded-full border px-3 text-[13px] font-medium transition', on ? 'border-vi-200 bg-vi-50 text-vi-700' : 'border-line2 bg-white text-ink-2 hover:bg-sub')}>
      {children}
    </button>
  );
}

const LINK_METHODS: { key: PaymentMethod; icon: React.ReactNode; hint: string }[] = [
  { key: 'carte', icon: <CreditCard className="h-4 w-4" />, hint: 'Visa, Mastercard, CB' },
  { key: 'apple_pay', icon: <Apple className="h-4 w-4" />, hint: 'Et Google Pay, en un geste' },
  { key: 'instantane', icon: <Zap className="h-4 w-4" />, hint: 'Argent reçu en 10 secondes' },
  { key: 'x3', icon: <Split className="h-4 w-4" />, hint: 'Vous êtes payé en une fois' },
  { key: 'x4', icon: <Split className="h-4 w-4" />, hint: 'Vous êtes payé en une fois' },
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
        <div className="divide-y divide-line rounded-xl border border-line">
          {LINK_METHODS.map((m) => {
            const fee = feeFor(m.key, a.remaining);
            return (
              <label key={m.key} className="flex min-h-[56px] items-center gap-3 px-3.5 py-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-sub text-ink-2">{m.icon}</span>
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
          <div className="space-y-3 rounded-xl bg-sub p-3.5">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 shrink-0 text-ink-2" />
              <span className="min-w-0 flex-1 truncate font-mono text-[13px]">{link.url}</span>
              <Button size="sm" variant="secondary" icon={<Copy className="h-3.5 w-3.5" />} onClick={copy}>Copier</Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <a href={`mailto:${clientEmail ?? ''}?subject=${encodeURIComponent(`Facture ${f.number}`)}&body=${encodeURIComponent(`Bonjour, vous pouvez régler la facture ${f.number} ici : ${link.url}`)}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-line2 bg-white text-[13.5px] font-medium">
                <Mail className="h-4 w-4" /> Par mail
              </a>
              <a href={`sms:${(clientPhone ?? '').replace(/\s/g, '')}?&body=${encodeURIComponent(`Facture ${f.number} : ${link.url}`)}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-line2 bg-white text-[13.5px] font-medium">
                <MessageSquareText className="h-4 w-4" /> Par SMS
              </a>
            </div>
            <div className="text-[12px] text-ink-3">Créé le {new Date(link.createdAt + 'T12:00').toLocaleDateString('fr-FR')} · ouvert {link.opened ?? 0} fois par le client</div>
            <Button variant="ghost" size="sm" onClick={create} loading={busy}>Mettre à jour les moyens de paiement</Button>
          </div>
        ) : (
          <Button variant="primary" size="lg" className="w-full justify-center" loading={busy} disabled={!methods.length} icon={<Landmark className="h-4 w-4" />} onClick={create}>
            Créer le lien de paiement
          </Button>
        )}
      </div>
    </Sheet>
  );
}
