import { useLayoutEffect, useRef, useState } from 'react';
import { BadgeCheck, CreditCard, Expand, FileCheck2, PenLine } from 'lucide-react';
import { Segmented, cn } from '@/components/ui';
import { money, totals } from '@/lib/format';
import type { Client, Company, Devis } from '@/lib/types';
import { groupLots, lotName } from '../logic';
import type { DevisMeta } from '../store';
import { HistoryList } from './HistoryList';
import { PdfDoc } from './PdfDoc';

type Tab = 'pdf' | 'client' | 'mobile';

/** Pages A4 réduites pour tenir dans leur colonne. Un clic ouvre l'aperçu plein écran. */
export function ScaledDoc({ onExpand, ...props }: Parameters<typeof PdfDoc>[0] & { onExpand?: () => void }) {
  const box = useRef<HTMLButtonElement>(null);
  const [w, setW] = useState(240);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return (
    <button ref={box} type="button" onClick={onExpand} className="group/doc relative block w-full cursor-zoom-in text-left" aria-label="Ouvrir l’aperçu plein écran">
      <PdfDoc {...props} scale={w / 794} gap={10} />
      <span className="pointer-events-none absolute inset-x-0 top-10 flex justify-center opacity-0 transition duration-300 ease-out-quint group-hover/doc:translate-y-0 group-hover/doc:opacity-100 translate-y-1">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/90 px-3 py-1.5 text-[12px] font-medium text-white shadow-pop backdrop-blur">
          <Expand className="h-3.5 w-3.5" /> Agrandir et vérifier
        </span>
      </span>
    </button>
  );
}

/** Ce que voit le client quand il ouvre le lien de signature. */
export function ClientView({ d, client, company, meta, compact }: { d: Devis; client?: Client; company: Company; meta: DevisMeta; compact?: boolean }) {
  const t = totals(d.lines);
  const variants = (['essentiel', 'confort', 'premium'] as const).filter((v) => meta.variants[v]);
  const factor = { essentiel: 0.88, confort: 1, premium: 1.18 };
  const signed = d.status === 'signe';
  return (
    <div className={cn('bg-[#f7f7fb] text-ink', compact ? 'p-3' : 'rounded-xl border border-line p-4')}>
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-ink text-[10px] font-bold text-white">{company.logoInitials}</span>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[12px] font-semibold">{company.name}</div>
          <div className="text-[10.5px] text-ink-3">Devis {d.number}</div>
        </div>
      </div>
      <div className="mt-3 rounded-lg bg-white p-3 shadow-card">
        <div className="text-[11px] text-ink-3">Bonjour {client?.name.split(' ')[0] ?? ''},</div>
        <div className="mt-0.5 text-[13px] font-semibold leading-snug">{d.title}</div>
        <div className="num mt-2 text-[20px] font-semibold tracking-[-0.02em]">{money(t.ttc)}</div>
        <div className="text-[10.5px] text-ink-3">TTC · acompte {d.depositPercent} % : {money((t.ttc * d.depositPercent) / 100)}</div>
        {(d.aides ?? []).length > 0 && <div className="mt-1.5 rounded-md bg-ok-bg px-2 py-1 text-[10.5px] font-medium text-ok">Aides estimées : − {money((d.aides ?? []).reduce((s, a) => s + a.amount, 0))}</div>}
      </div>
      {variants.length > 1 && (
        <div className="mt-2 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${variants.length}, minmax(0, 1fr))` }}>
          {variants.map((v) => (
            <div key={v} className={cn('rounded-md border bg-white px-1.5 py-1.5 text-center', v === (meta.chosenVariant ?? 'confort') ? 'border-vi-300 ring-2 ring-vi-100' : 'border-line')}>
              <div className="text-[10px] capitalize text-ink-2">{v}</div>
              <div className="num text-[11px] font-semibold">{money(t.ttc * factor[v], true)}</div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 space-y-1">
        {groupLots(d.lines)
          .filter((l) => l.section)
          .slice(0, compact ? 4 : 6)
          .map((l) => (
            <div key={l.section!.id} className="flex justify-between gap-2 rounded-md bg-white px-2.5 py-1.5 text-[11px]">
              <span className="truncate">{lotName(l.section!.designation)}</span>
              <span className="num shrink-0 text-ink-2">{money(totals(l.items).ttc, true)}</span>
            </div>
          ))}
      </div>
      <div className={cn('mt-3 flex h-10 items-center justify-center gap-1.5 rounded-lg text-[12.5px] font-semibold text-white', signed ? 'bg-ok' : 'bg-ink')}>
        {signed ? <BadgeCheck className="h-4 w-4" /> : <PenLine className="h-4 w-4" />}
        {signed ? 'Devis signé, merci !' : 'Signer et payer l’acompte'}
      </div>
      <div className="mt-1.5 flex items-center justify-center gap-1 text-[10px] text-ink-3">
        <CreditCard className="h-3 w-3" />
        {[meta.payment.card && 'Carte', meta.payment.transfer && 'virement', meta.payment.split3 && '3 fois sans frais'].filter(Boolean).join(', ')}
      </div>
    </div>
  );
}

export function PreviewPane({ d, client, company, meta, signer, className, onExpand }: { d: Devis; client?: Client; company: Company; meta: DevisMeta; signer?: string; className?: string; onExpand?: () => void }) {
  const [tab, setTab] = useState<Tab>('pdf');
  const reduced = totals(d.lines).byVat.some((v) => v.rate < 20) && client?.kind !== 'pro';
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex justify-center">
        <Segmented<Tab> size="sm" value={tab} onChange={setTab} options={[{ value: 'pdf', label: 'PDF' }, { value: 'client', label: 'Vue client' }, { value: 'mobile', label: 'Mobile' }]} />
      </div>
      {tab === 'pdf' && <ScaledDoc d={d} client={client} company={company} signer={signer} onExpand={onExpand} />}
      {tab === 'client' && <ClientView d={d} client={client} company={company} meta={meta} />}
      {tab === 'mobile' && (
        <div className="mx-auto w-[236px] rounded-[30px] border-[7px] border-ink bg-ink shadow-pop">
          <div className="overflow-hidden rounded-[23px] bg-[#f7f7fb]">
            <div className="flex h-6 items-center justify-center">
              <span className="h-3.5 w-16 rounded-full bg-ink" />
            </div>
            <ClientView d={d} client={client} company={company} meta={meta} compact />
            <div className="flex justify-center pb-1.5 pt-1">
              <span className="h-1 w-16 rounded-full bg-ink/80" />
            </div>
          </div>
        </div>
      )}
      <div className="space-y-1.5 text-[12.5px] text-ink-2">
        <div className="flex items-center gap-2">
          <PenLine className="h-3.5 w-3.5 text-ink-3" /> Signature électronique, acompte en ligne
        </div>
        {reduced && (
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-3.5 w-3.5 text-ink-3" /> Attestation de TVA réduite incluse d’office
          </div>
        )}
      </div>
      <div className="border-t border-line pt-4">
        <h6 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[.06em] text-ink-3">Historique</h6>
        <HistoryList d={d} client={client} meta={meta} />
      </div>
    </div>
  );
}
