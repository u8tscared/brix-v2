// Démo « Tap to Pay » : encaisser une carte bancaire sans contact directement sur le téléphone.

import { useEffect, useState } from 'react';
import { Check, Delete, Nfc } from 'lucide-react';
import { Button, Select, Sheet, cn } from '@/components/ui';
import { money } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { recordPayment } from '@/modules/factures/lib/actions';
import { amounts } from '@/modules/factures/lib/model';
import { feeFor } from '@/modules/factures/service';
import { useFactures } from '@/modules/factures/store';

type Step = 'amount' | 'present' | 'processing' | 'done';

export function TapToPay({ open, onClose, factureId }: { open: boolean; onClose: () => void; factureId?: string }) {
  const s = useBrix();
  const unpaid = s.factures.filter((f) => f.status !== 'brouillon' && f.status !== 'annulee' && f.kind !== 'avoir' && amounts(f).remaining > 0);
  const [fid, setFid] = useState<string>(factureId ?? '');
  const [cents, setCents] = useState('');
  const [step, setStep] = useState<Step>('amount');
  const amount = Number(cents || '0') / 100;
  const fee = feeFor('tap', amount);

  useEffect(() => {
    if (!open) return;
    setStep('amount');
    const f = s.factures.find((x) => x.id === (factureId ?? ''));
    setFid(factureId ?? '');
    setCents(f ? String(Math.round(amounts(f).remaining * 100)) : '');
  }, [open]);

  useEffect(() => {
    if (step === 'present') {
      const t = setTimeout(() => setStep('processing'), 2600);
      return () => clearTimeout(t);
    }
    if (step === 'processing') {
      const t = setTimeout(() => {
        if (fid) recordPayment(fid, amount, 'tap', undefined, fee);
        else useFactures.getState().addPayment({ factureId: 'libre', amount, method: 'tap', date: new Date().toISOString().slice(0, 10), fee, note: 'Encaissement sans facture' });
        setStep('done');
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [step]);

  const pickFacture = (id: string) => {
    setFid(id);
    const f = s.factures.find((x) => x.id === id);
    if (f) setCents(String(Math.round(amounts(f).remaining * 100)));
  };
  const key = (k: string) => {
    if (k === 'del') return setCents(cents.slice(0, -1));
    if (cents.length >= 7) return;
    setCents((cents + k).replace(/^0+/, ''));
  };

  return (
    <Sheet open={open} onClose={onClose} width={440} title="Encaisser par carte" subtitle="Le client pose sa carte ou son téléphone contre le vôtre. Aucun terminal à acheter.">
      <div className="mx-auto w-full max-w-[300px] rounded-[38px] border-[6px] border-ink bg-white p-4 pt-3 shadow-pop">
        <div className="mx-auto mb-3 h-5 w-24 rounded-full bg-ink" />
        {step === 'amount' && (
          <div>
            <div className="text-center text-[12px] text-ink-3">Montant à encaisser</div>
            <div className="num mt-1 text-center font-display text-[38px] font-semibold tracking-[-0.03em]">{money(amount)}</div>
            <div className="mt-1 text-center text-[11.5px] text-ink-3">Frais {money(fee)} · vous recevez {money(Math.max(0, amount - fee))}</div>
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del'].map((k) => (
                <button key={k} onClick={() => key(k)} aria-label={k === 'del' ? 'Effacer' : k} className="grid h-11 place-items-center rounded-xl bg-sub text-[18px] font-medium transition active:scale-95 active:bg-line">
                  {k === 'del' ? <Delete className="h-5 w-5" /> : k}
                </button>
              ))}
            </div>
            <Button variant="primary" size="lg" className="mt-3 w-full justify-center" disabled={amount < 1} onClick={() => setStep('present')}>
              Encaisser {money(amount)}
            </Button>
          </div>
        )}
        {(step === 'present' || step === 'processing') && (
          <div className="flex h-[360px] flex-col items-center justify-center text-center">
            <div className="relative grid h-36 w-36 place-items-center">
              {step === 'present' && [0, 1, 2].map((i) => <span key={i} className="absolute inset-0 rounded-full border-2 border-vi-300" style={{ animation: `tap-ring 1.8s ${i * 0.6}s ease-out infinite` }} />)}
              <span className={cn('grid h-20 w-20 place-items-center rounded-full text-white transition', step === 'processing' ? 'bg-ink' : 'bg-vi-700')}>
                {step === 'processing' ? <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Nfc className="h-9 w-9" />}
              </span>
            </div>
            <div className="num mt-6 text-[26px] font-semibold">{money(amount)}</div>
            <div className="mt-1 text-[13.5px] text-ink-2">{step === 'present' ? 'Approchez la carte du haut du téléphone' : 'Paiement en cours…'}</div>
            <style>{'@keyframes tap-ring{0%{transform:scale(.55);opacity:.9}100%{transform:scale(1.25);opacity:0}}'}</style>
          </div>
        )}
        {step === 'done' && (
          <div className="flex h-[360px] animate-scale-in flex-col items-center justify-center text-center">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-ok text-white">
              <Check className="h-10 w-10" strokeWidth={2.5} />
            </span>
            <div className="mt-5 text-[15px] font-semibold">Paiement accepté</div>
            <div className="num mt-1 text-[28px] font-semibold">{money(amount)}</div>
            <div className="mt-1 text-[12.5px] text-ink-2">Visa ···· 4421 · reçu envoyé par SMS</div>
            <Button variant="secondary" className="mt-5" onClick={onClose}>Terminer</Button>
          </div>
        )}
      </div>
      {step === 'amount' && (
        <div className="mx-auto mt-4 max-w-[300px]">
          <Select value={fid} onChange={(e) => pickFacture(e.target.value)} aria-label="Facture à régler">
            <option value="">Sans facture (acompte, petit dépannage)</option>
            {unpaid.map((f) => (
              <option key={f.id} value={f.id}>
                {f.number} · {s.clients.find((c) => c.id === f.clientId)?.name} · {money(amounts(f).remaining)}
              </option>
            ))}
          </Select>
          <p className="mt-2 text-center text-[11.5px] text-ink-3">Démo : aucun vrai paiement. En production, Stripe Tap to Pay sur iPhone et Android.</p>
        </div>
      )}
    </Sheet>
  );
}
