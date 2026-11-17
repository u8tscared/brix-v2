// Colonne de décision : formule, montant, acompte, aides, action « Signer ».
import { useState } from 'react';
import { ChevronDown, Clock3, MessageCircle, PenLine, ThumbsDown } from 'lucide-react';
import { cn } from '@/components/ui';
import { dateFull, money, pct, totals } from '@/lib/format';
import type { DevisPublicData, Formule } from '@/parcours/documents';
import { BoutonAube, MontantAnime } from '../../ui/primitives';

interface Props {
  data: DevisPublicData;
  formule: Formule;
  onFormule: (f: Formule) => void;
  onSigner: () => void;
  onQuestion: () => void;
  onRefuser: () => void;
}

export function Recap({ data, formule, onFormule, onSigner, onQuestion, onRefuser }: Props) {
  const { devis } = data;
  const [detail, setDetail] = useState(false);
  const k = formule.facteur;
  const t = totals(devis.lines);
  const ttc = t.ttc * k;
  const acompte = (ttc * devis.depositPercent) / 100;
  const aides = (devis.aides ?? []).reduce((s, a) => s + a.amount, 0);
  const expire = data.expireDans <= 0;

  return (
    <div className="rounded-[26px] bg-white p-5 shadow-[0_0_0_1px_#ebe9f2,0_24px_60px_-34px_rgba(45,20,90,.35)] sm:p-6">
      {data.formules.length > 1 && (
        <div className="mb-5">
          <div className="mb-2 text-[12.5px] font-medium text-ink-2">Choisissez votre formule</div>
          <div className="grid gap-2" role="radiogroup">
            {data.formules.map((f) => {
              const on = f.key === formule.key;
              return (
                <button key={f.key} role="radio" aria-checked={on} onClick={() => onFormule(f)} className={cn('relative flex min-h-[60px] items-center gap-3 rounded-2xl border px-4 text-left transition-all duration-200', on ? 'border-transparent bg-page shadow-[0_0_0_2px_#15122a]' : 'border-line2 hover:border-[#cfcbe0]')}>
                  <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition', on ? 'border-ink' : 'border-line2')}>
                    <span className={cn('h-2.5 w-2.5 rounded-full bg-ink transition-transform duration-200', on ? 'scale-100' : 'scale-0')} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-[14.5px] font-semibold">
                      {f.label}
                      {f.key === 'confort' && <span className="rounded-full bg-[#f5f0ff] px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-[#6d28d9]">Conseillée</span>}
                    </span>
                    <span className="block text-[12.5px] text-ink-3">{f.texte}</span>
                  </span>
                  <span className="num text-[14.5px] font-semibold">{money(t.ttc * f.facteur, true)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="text-[12.5px] font-medium text-ink-3">Montant total TTC</div>
      <div className="num mt-1 text-[44px] font-semibold leading-none tracking-[-0.04em]">
        <MontantAnime valeur={ttc} format={(n) => money(n)} />
      </div>
      <button onClick={() => setDetail((d) => !d)} className="mt-2 inline-flex h-8 items-center gap-1 rounded-full text-[12.5px] font-medium text-ink-2 hover:text-ink" aria-expanded={detail}>
        {money(t.ht * k)} HT + TVA {money(t.tva * k)}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', detail && 'rotate-180')} />
      </button>
      <div className={cn('grid transition-[grid-template-rows] duration-300', detail ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <div className="mt-2 space-y-1.5 rounded-2xl bg-page px-4 py-3 text-[13px]">
            {t.byVat.map((v) => (
              <div key={v.rate} className="flex justify-between text-ink-2">
                <span>TVA {pct(v.rate, v.rate % 1 ? 1 : 0)} sur {money(v.base * k)}</span>
                <span className="num">{money(v.tva * k)}</span>
              </div>
            ))}
            {t.byVat.some((v) => v.rate < 20) && <div className="pt-1 text-[11.5px] text-ink-3">TVA réduite : une attestation simple vous sera demandée.</div>}
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-2.5 border-t border-line pt-5 text-[13.5px]">
        {devis.depositPercent > 0 && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-ink-2">Acompte à la signature ({devis.depositPercent} %)</span>
            <span className="num font-semibold">{money(acompte)}</span>
          </div>
        )}
        {devis.depositPercent > 0 && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-ink-2">Solde à la fin des travaux</span>
            <span className="num font-medium text-ink-2">{money(ttc - acompte)}</span>
          </div>
        )}
        {aides > 0 && (
          <div className="mt-1 rounded-2xl bg-[#ecfdf3] px-4 py-3">
            {devis.aides!.map((a) => (
              <div key={a.label} className="flex justify-between gap-3 text-[12.5px] text-[#166534]">
                <span>{a.label}</span>
                <span className="num">− {money(a.amount)}</span>
              </div>
            ))}
            <div className="mt-1.5 flex justify-between gap-3 border-t border-[#bbf7d0] pt-1.5 text-[13.5px] font-semibold text-[#14532d]">
              <span>Reste à votre charge</span>
              <span className="num">{money(ttc - aides)}</span>
            </div>
          </div>
        )}
      </div>

      <BoutonAube className="mt-6 w-full" onClick={onSigner} disabled={expire} icone={<PenLine className="h-5 w-5" strokeWidth={1.75} />}>
        {expire ? 'Devis expiré' : 'Signer le devis'}
      </BoutonAube>
      <div className="mt-2 flex items-center justify-center gap-1.5 text-[12.5px] text-ink-3">
        <Clock3 className="h-3.5 w-3.5" />
        {expire ? `Expiré le ${dateFull(data.expire)} : demandez une mise à jour` : `Valable jusqu’au ${dateFull(data.expire)} · environ 1 minute`}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4">
        <button onClick={onQuestion} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl text-[13.5px] font-medium text-ink transition hover:bg-page">
          <MessageCircle className="h-4 w-4" strokeWidth={1.75} /> Poser une question
        </button>
        <button onClick={onRefuser} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl text-[13.5px] font-medium text-ink-2 transition hover:bg-page">
          <ThumbsDown className="h-4 w-4" strokeWidth={1.75} /> Décliner
        </button>
      </div>
    </div>
  );
}
