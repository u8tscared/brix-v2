// Colonne de décision (maquette Halo « signature client ») : montant énorme qui compte, formule,
// liste en carte (ouvrages, validité, garantie, question), « Glissez pour signer », décliner.
import { useState } from 'react';
import { CalendarDays, ChevronDown, ChevronRight, Clock3, List, MessageCircle, ShieldCheck, ThumbsDown } from 'lucide-react';
import { Card, cn, IconTile } from '@/components/ui';
import { dateFull, money, pct, totals } from '@/lib/format';
import type { DevisPublicData, Formule } from '@/parcours/documents';
import { isPriced } from '@/modules/devis/logic';
import { Glisser } from '../../ui/Glisser';
import { MontantAnime } from '../../ui/primitives';

interface Props {
  data: DevisPublicData;
  formule: Formule;
  onFormule: (f: Formule) => void;
  onSigner: () => void;
  onQuestion: () => void;
  onRefuser: () => void;
  onDetail: () => void;
}

export function Recap({ data, formule, onFormule, onSigner, onQuestion, onRefuser, onDetail }: Props) {
  const { devis, company, user } = data;
  const [detail, setDetail] = useState(false);
  const k = formule.facteur;
  const t = totals(devis.lines);
  const ttc = t.ttc * k;
  const acompte = (ttc * devis.depositPercent) / 100;
  const aides = (devis.aides ?? []).reduce((s, a) => s + a.amount, 0);
  const expire = data.expireDans <= 0;
  const postes = devis.lines.filter(isPriced).length;

  const liste = [
    { icon: List, tone: 'violet' as const, label: `${postes} poste${postes > 1 ? 's' : ''} détaillé${postes > 1 ? 's' : ''}`, onClick: onDetail },
    { icon: CalendarDays, tone: 'peach' as const, label: expire ? `Expiré le ${dateFull(data.expire)}` : `Valable jusqu’au ${dateFull(data.expire)}` },
    ...(company.decennale ? [{ icon: ShieldCheck, tone: 'green' as const, label: `Garantie décennale ${company.decennale.split(/n°|·|,/)[0].trim()}`.trim() }] : []),
    { icon: MessageCircle, tone: 'blue' as const, label: `Poser une question à ${user.firstName}`, onClick: onQuestion },
  ];

  return (
    <div className="space-y-3.5">
      <Card className="p-5 sm:p-6">
        <div className="label-halo truncate">{devis.title}</div>
        <div className="num-halo mt-1.5 text-[46px] leading-none sm:text-[52px]">
          <MontantAnime valeur={ttc} format={(n) => money(n)} />
        </div>
        <div className="mt-2 text-[13.5px] text-ink-2">
          TTC{devis.depositPercent > 0 && <>, dont acompte <b className="num font-semibold text-ink">{money(acompte)}</b></>}
        </div>
        <button onClick={() => setDetail((d) => !d)} className="-ml-1 mt-1 inline-flex h-8 items-center gap-1 rounded-full px-1 text-[12.5px] font-medium text-ink-3 transition hover:text-ink" aria-expanded={detail}>
          {money(t.ht * k)} HT + TVA {money(t.tva * k)}
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-300', detail && 'rotate-180')} />
        </button>
        <div className={cn('grid transition-[grid-template-rows] duration-300 ease-out-quint', detail ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
          <div className="overflow-hidden">
            <div className="mt-2 space-y-1.5 rounded-card-sm bg-halo-hover px-4 py-3 text-[13px]">
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

        {data.formules.length > 1 && (
          <div className="mt-5">
            <div className="label-halo mb-2">Choisissez votre formule</div>
            <div className="grid gap-2" role="radiogroup" aria-label="Formule">
              {data.formules.map((f) => {
                const on = f.key === formule.key;
                return (
                  <button
                    key={f.key}
                    role="radio"
                    aria-checked={on}
                    onClick={() => onFormule(f)}
                    className={cn(
                      'relative flex min-h-[60px] items-center gap-3 rounded-card-sm bg-white px-4 text-left transition-all duration-300 ease-spring',
                      on ? 'bg-dawn-pale shadow-[0_0_0_1.5px_#e9b8f5,0_10px_30px_-12px_rgba(217,70,239,.35)]' : 'shadow-halo-sm hover:-translate-y-px hover:shadow-[0_0_0_1px_#e3dcf3,0_10px_24px_-12px_rgba(60,30,120,.18)]',
                    )}
                  >
                    <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full transition', on ? 'bg-dawn-diag' : 'shadow-[inset_0_0_0_2px_#dcd6ea]')}>
                      <span className={cn('h-2 w-2 rounded-full bg-white transition-transform duration-300 ease-spring', on ? 'scale-100' : 'scale-0')} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-[14.5px] font-semibold">
                        {f.label}
                        {f.key === 'confort' && <span className="chip tone-violet h-5 px-2 text-[10.5px] font-semibold">Conseillée</span>}
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

        {(devis.depositPercent > 0 || aides > 0) && (
          <div className="mt-5 space-y-2 text-[13.5px]">
            {devis.depositPercent > 0 && (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ink-2">Acompte à la signature ({devis.depositPercent} %)</span>
                  <span className="num font-semibold">{money(acompte)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ink-2">Solde à la fin des travaux</span>
                  <span className="num font-medium text-ink-2">{money(ttc - acompte)}</span>
                </div>
              </>
            )}
            {aides > 0 && (
              <div className="mt-1 rounded-card-sm bg-pale-g px-4 py-3">
                {devis.aides!.map((a) => (
                  <div key={a.label} className="flex justify-between gap-3 text-[12.5px] text-deep-g">
                    <span>{a.label}</span>
                    <span className="num shrink-0">− {money(a.amount)}</span>
                  </div>
                ))}
                <div className="mt-1.5 flex justify-between gap-3 border-t border-[#c4ebd9] pt-1.5 text-[13.5px] font-semibold text-deep-g">
                  <span>Reste à votre charge</span>
                  <span className="num">{money(ttc - aides)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Liste en carte (maquette) */}
      <Card className="rounded-[20px] px-2 py-1.5">
        {liste.map((l, i) => {
          const C = l.onClick ? 'button' : 'div';
          return (
            <C key={l.label} onClick={l.onClick} className={cn('relative flex min-h-[54px] w-full items-center gap-3 rounded-[14px] px-2.5 text-left', l.onClick && 'transition hover:bg-halo-hover', i < liste.length - 1 && 'after:absolute after:bottom-0 after:left-[54px] after:right-2.5 after:h-px after:bg-[#f4f1fa]')}>
              <IconTile size="sm" tone={l.tone} icon={<l.icon strokeWidth={1.9} />} />
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{l.label}</span>
              {l.onClick && <ChevronRight className="h-4 w-4 shrink-0 text-[#b7b3c7]" />}
            </C>
          );
        })}
      </Card>

      <div className="pt-1">
        {expire ? (
          <div className="flex h-[60px] items-center justify-center gap-2 rounded-pill bg-halo-track text-[14.5px] font-semibold text-ink-3">
            <Clock3 className="h-4 w-4" /> Devis expiré : demandez une mise à jour
          </div>
        ) : (
          <Glisser onDone={onSigner} labelFait="Signature…" />
        )}
        <div className="mt-1 text-center text-[11.5px] text-ink-3">Signature électronique horodatée · aucun compte à créer</div>
      </div>

      <div className="flex justify-center">
        <button onClick={onRefuser} className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-[13px] font-medium text-ink-3 transition hover:bg-white/70 hover:text-ink-2">
          <ThumbsDown className="h-4 w-4" strokeWidth={1.75} /> Décliner ce devis
        </button>
      </div>
    </div>
  );
}
