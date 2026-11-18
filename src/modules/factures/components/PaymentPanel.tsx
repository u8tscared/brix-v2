// Suivi des paiements d'une facture : reste à payer, encaissements, lien de paiement, relances.

import { BellRing, CreditCard, Landmark, Link2, Mail, MessageSquareText, Plus, Stamp, Trash2, Zap } from 'lucide-react';
import { Button, IconTile, cn, type HaloTone } from '@/components/ui';
import { AnimatedNumber, Ring, SuccessDot } from '@/components/motion';
import { dateFull, dateShort, money } from '@/lib/format';
import type { Facture } from '@/lib/types';
import { saveFacture } from '../lib/actions';
import { amounts, liveStatus, METHOD_LABEL, round2 } from '../lib/model';
import { paymentsOf, useFactures } from '../store';

const METHOD_ICON: Record<string, React.ReactNode> = { virement: <Landmark />, virement_instantane: <Zap />, carte: <CreditCard />, tap: <CreditCard /> };
const METHOD_TONE: Record<string, HaloTone> = { virement: 'green', virement_instantane: 'cyan', carte: 'violet', tap: 'mag' };

export function PaymentPanel({ f, onPay, onLink, onRemind }: { f: Facture; onPay: () => void; onLink: () => void; onRemind: () => void }) {
  const fx = useFactures();
  const extra = fx.extras[f.id] ?? {};
  const a = amounts(f);
  const pays = paymentsOf(f, fx.payments);
  const rems = fx.reminders.filter((r) => r.factureId === f.id);
  const st = liveStatus(f);
  const pct = a.net ? (a.paid / a.net) * 100 : 0;
  const issued = f.status !== 'brouillon';

  const undo = (id: string, amount: number) => {
    fx.removePayment(id);
    const next = { ...f, paidAmount: round2(Math.max(0, f.paidAmount - amount)) };
    saveFacture({ ...next, status: liveStatus({ ...next, status: 'envoyee' }) });
  };

  if (f.kind === 'avoir') {
    return <p className="rounded-card bg-white p-5 text-[13px] leading-relaxed text-ink-2 shadow-halo">Un avoir n’attend pas de paiement : il annule tout ou partie d’une facture. Si le client avait déjà payé, remboursez-le par virement.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-card bg-white p-5 shadow-halo">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="label-halo flex items-center gap-1.5">{a.remaining <= 0 && <SuccessDot size={16} />}{a.remaining > 0 ? 'Reste à payer' : 'Facture réglée'}</div>
            <div className={cn('num-halo mt-1 text-[34px]', st === 'en_retard' && 'text-deep-r')}>
              <AnimatedNumber value={a.remaining > 0 ? a.remaining : a.paid} format={(n) => money(n)} duration={600} />
            </div>
            <div className="mt-1 text-[12.5px] text-ink-2">
              Payé {money(a.paid)} sur {money(a.net)}
            </div>
          </div>
          <Ring value={pct} size={68} stroke={6} tone={pct >= 100 ? 'ok' : st === 'en_retard' ? 'warn' : 'dawn'}>
            <span className="num-halo text-[14px]">{Math.round(pct)} %</span>
          </Ring>
        </div>
        {a.retenue > 0 && (
          <div className="mt-4 flex justify-between gap-3 rounded-field bg-pale-n px-3.5 py-2.5 text-[12.5px]">
            <span className="text-ink-2">Retenue de garantie {f.retenueGarantie} %{extra.retenueReleaseDate ? `, libérable le ${dateFull(extra.retenueReleaseDate)}` : ''}</span>
            <span className="num font-medium">{money(a.retenue)}</span>
          </div>
        )}
        {issued && a.remaining > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={onPay} className="justify-center">Paiement reçu</Button>
            <Button variant="secondary" icon={<Link2 className="h-4 w-4" />} onClick={onLink} className="justify-center">{extra.paymentLink ? 'Lien envoyé' : 'Lien de paiement'}</Button>
          </div>
        )}
        {!issued && <p className="mt-3 text-[12.5px] text-ink-3">Émettez la facture pour suivre les paiements.</p>}
      </div>

      {extra.paymentLink && a.remaining > 0 && (
        <button onClick={onLink} className="row-card w-full text-left">
          <IconTile icon={<Link2 />} tone="violet" size="row" />
          <div className="min-w-0 flex-1">
            <div className="truncate font-mono text-[12.5px]">{extra.paymentLink.url.replace('https://', '')}</div>
            <div className="text-[12px] text-ink-3">{extra.paymentLink.methods.map((m) => METHOD_LABEL[m]).join(', ')} · ouvert {extra.paymentLink.opened ?? 0} fois</div>
          </div>
        </button>
      )}

      <section>
        <h4 className="mb-2.5 px-1 text-[15px] font-semibold tracking-[-0.02em]">Encaissements</h4>
        {pays.length === 0 ? (
          <p className="px-1 text-[12.5px] text-ink-3">Aucun paiement pour l’instant. Brix rapproche automatiquement les virements de votre banque.</p>
        ) : (
          <ul className="stagger-fast space-y-2">
            {pays.map((p) => (
              <li key={p.id} className="row-card py-3">
                <IconTile icon={METHOD_ICON[p.method] ?? <Landmark />} tone={METHOD_TONE[p.method] ?? 'green'} size="row" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-medium">{METHOD_LABEL[p.method]}</div>
                  <div className="text-[12px] text-ink-3">{dateFull(p.date)}{p.fee ? ` · frais ${money(p.fee)}` : ''}</div>
                </div>
                <span className="num text-[14px] font-semibold text-deep-g">+{money(p.amount)}</span>
                {!p.id.startsWith('p_auto') && (
                  <button onClick={() => undo(p.id, p.amount)} aria-label="Annuler ce paiement" className="grid h-9 w-9 place-items-center rounded-full text-ink-3 transition hover:bg-pale-r hover:text-deep-r">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {issued && (a.remaining > 0 || rems.length > 0) && (
        <section>
          <div className="mb-2.5 flex items-center justify-between px-1">
            <h4 className="text-[15px] font-semibold tracking-[-0.02em]">Relances</h4>
            {a.remaining > 0 && (
              <Button size="sm" variant={st === 'en_retard' ? 'primary' : 'ghost'} icon={<BellRing className="h-3.5 w-3.5" />} onClick={onRemind}>
                Relancer
              </Button>
            )}
          </div>
          {rems.length === 0 ? (
            <p className="px-1 text-[12.5px] text-ink-3">{st === 'en_retard' ? 'Pas encore relancée.' : 'Bob relancera tout seul si l’échéance passe (réglable dans Relances).'}</p>
          ) : (
            <ul className="space-y-2">
              {rems.map((r) => (
                <li key={r.id} className="row-card !items-start py-3 text-[12.5px]">
                  <IconTile icon={r.channel === 'email' ? <Mail /> : r.channel === 'sms' ? <MessageSquareText /> : <Stamp />} tone={r.channel === 'email' ? 'blue' : r.channel === 'sms' ? 'violet' : 'rose'} size="row" />
                  <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2 text-ink-3">
                    <span>{r.channel === 'email' ? 'Mail' : r.channel === 'sms' ? 'SMS' : 'Mise en demeure'} · {r.by === 'bob' ? 'par Bob' : 'par vous'}</span>
                    <span>{dateShort(r.at.slice(0, 10))}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-ink-2">{r.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
