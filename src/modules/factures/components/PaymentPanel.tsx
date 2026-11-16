// Suivi des paiements d'une facture : reste à payer, encaissements, lien de paiement, relances.

import { BellRing, Link2, Plus, Trash2 } from 'lucide-react';
import { Button, Progress, cn } from '@/components/ui';
import { dateFull, dateShort, money } from '@/lib/format';
import type { Facture } from '@/lib/types';
import { saveFacture } from '../lib/actions';
import { amounts, liveStatus, METHOD_LABEL, round2 } from '../lib/model';
import { paymentsOf, useFactures } from '../store';

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
    return <p className="rounded-xl bg-sub p-4 text-[13px] text-ink-2">Un avoir n’attend pas de paiement : il annule tout ou partie d’une facture. Si le client avait déjà payé, remboursez-le par virement.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-[12px] text-ink-3">Reste à payer</div>
            <div className={cn('num text-[26px] font-semibold tracking-[-0.02em]', st === 'en_retard' && 'text-bad')}>{money(a.remaining)}</div>
          </div>
          <div className="text-right text-[12px] text-ink-2">
            <div>Payé {money(a.paid)}</div>
            <div>sur {money(a.net)}</div>
          </div>
        </div>
        <Progress value={pct} tone={pct >= 100 ? 'ok' : 'ink'} className="mt-3" />
        {a.retenue > 0 && (
          <div className="mt-3 flex justify-between rounded-lg bg-sub px-3 py-2 text-[12.5px]">
            <span className="text-ink-2">Retenue de garantie {f.retenueGarantie} %{extra.retenueReleaseDate ? `, libérable le ${dateFull(extra.retenueReleaseDate)}` : ''}</span>
            <span className="num font-medium">{money(a.retenue)}</span>
          </div>
        )}
        {issued && a.remaining > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={onPay} className="justify-center">Paiement reçu</Button>
            <Button variant="secondary" icon={<Link2 className="h-4 w-4" />} onClick={onLink} className="justify-center">{extra.paymentLink ? 'Lien envoyé' : 'Lien de paiement'}</Button>
          </div>
        )}
        {!issued && <p className="mt-3 text-[12.5px] text-ink-3">Émettez la facture pour suivre les paiements.</p>}
      </div>

      {extra.paymentLink && a.remaining > 0 && (
        <button onClick={onLink} className="flex w-full items-center gap-3 rounded-xl border border-line p-3 text-left transition hover:bg-[#fafafc]">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-vi-50 text-vi-700"><Link2 className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-mono text-[12.5px]">{extra.paymentLink.url.replace('https://', '')}</div>
            <div className="text-[12px] text-ink-3">{extra.paymentLink.methods.map((m) => METHOD_LABEL[m]).join(', ')} · ouvert {extra.paymentLink.opened ?? 0} fois</div>
          </div>
        </button>
      )}

      <section>
        <h4 className="mb-2 text-[12.5px] font-semibold text-ink-2">Encaissements</h4>
        {pays.length === 0 ? (
          <p className="text-[12.5px] text-ink-3">Aucun paiement pour l’instant. Brix rapproche automatiquement les virements de votre banque.</p>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {pays.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-medium">{METHOD_LABEL[p.method]}</div>
                  <div className="text-[12px] text-ink-3">{dateFull(p.date)}{p.fee ? ` · frais ${money(p.fee)}` : ''}</div>
                </div>
                <span className="num text-[14px] font-semibold text-ok">+{money(p.amount)}</span>
                {!p.id.startsWith('p_auto') && (
                  <button onClick={() => undo(p.id, p.amount)} aria-label="Annuler ce paiement" className="grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-bad-bg hover:text-bad">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {issued && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-[12.5px] font-semibold text-ink-2">Relances</h4>
            {a.remaining > 0 && (
              <Button size="sm" variant={st === 'en_retard' ? 'primary' : 'ghost'} icon={<BellRing className="h-3.5 w-3.5" />} onClick={onRemind}>
                Relancer
              </Button>
            )}
          </div>
          {rems.length === 0 ? (
            <p className="text-[12.5px] text-ink-3">{st === 'en_retard' ? 'Pas encore relancée.' : 'Bob relancera tout seul si l’échéance passe (réglable dans Relances).'}</p>
          ) : (
            <ul className="space-y-2">
              {rems.map((r) => (
                <li key={r.id} className="rounded-xl bg-sub px-3.5 py-2.5 text-[12.5px]">
                  <div className="flex justify-between text-ink-3">
                    <span>{r.channel === 'email' ? 'Mail' : r.channel === 'sms' ? 'SMS' : 'Mise en demeure'} · {r.by === 'bob' ? 'par Bob' : 'par vous'}</span>
                    <span>{dateShort(r.at.slice(0, 10))}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-ink-2">{r.text}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
