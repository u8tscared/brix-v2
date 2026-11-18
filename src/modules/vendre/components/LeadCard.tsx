import { ArrowRight, FileText, Phone } from 'lucide-react';
import { Badge, HALO_TONE, IconTile, Tip, cn } from '@/components/ui';
import { money, relative } from '@/lib/format';
import type { Lead } from '@/lib/types';
import { LEAD_SOURCE, LEAD_SOURCE_TONE, readLead, telHref, URGENCY } from '../lib';

export function ScoreDot({ score }: { score?: number }) {
  if (score === undefined) return null;
  const tone = score >= 80 ? 'text-deep-g bg-pale-g' : score >= 60 ? 'text-deep-a bg-pale-a' : 'text-ink-3 bg-pale-n';
  return (
    <span title="Chances de signer selon Bob" className={cn('num inline-grid h-7 min-w-7 place-items-center rounded-full px-1.5 text-[11.5px] font-semibold', tone)}>
      {score}
    </span>
  );
}

/** Carte compacte d'une demande (colonne kanban ou liste sur téléphone). */
export function LeadCard({ lead, onOpen, compact, onDevis, onAdvance, nextLabel, highlight }: { lead: Lead; onOpen: () => void; compact?: boolean; onDevis?: () => void; onAdvance?: () => void; nextLabel?: string; highlight?: boolean }) {
  const live = lead.status !== 'perdu' && lead.status !== 'gagne';
  const r = readLead(lead);
  const src = LEAD_SOURCE[lead.source];
  const SrcIcon = src.icon;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      className={cn('group lift relative w-full cursor-pointer rounded-card-sm bg-white p-3.5 text-left shadow-halo', lead.status === 'perdu' && 'opacity-60', highlight && 'animate-[pop_.5s_var(--ease)_both] shadow-[0_0_0_1.5px_#e9b8f5,0_10px_30px_-12px_rgba(217,70,239,.35)]')}
    >
      <div className="flex items-start gap-2.5">
        {!compact && <IconTile icon={<SrcIcon />} tone={LEAD_SOURCE_TONE[lead.source]} size="row" className="rounded-full" />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[14px] font-semibold">{lead.name}</span>
            {lead.status === 'nouveau' && <i className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#d946ef] shadow-[0_0_0_3px_#fce8fd]" aria-label="Non lue" />}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-3">
            {compact && <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full" style={{ background: HALO_TONE[LEAD_SOURCE_TONE[lead.source]].bg, color: HALO_TONE[LEAD_SOURCE_TONE[lead.source]].fg }}><SrcIcon className="h-2.5 w-2.5" strokeWidth={2.2} /></span>}
            <span className="truncate">{src.label} · {relative(lead.receivedAt)}</span>
          </div>
        </div>
        <ScoreDot score={lead.score} />
      </div>
      <p className="mt-2.5 text-[13px] font-medium leading-snug text-ink">{r.summary}</p>
      {!compact && <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-ink-2">« {lead.request} »</p>}
      <div className={cn('mt-3 flex items-center', compact ? 'gap-1.5' : 'gap-2')}>
        <Badge tone={URGENCY[r.urgency].tone}>{URGENCY[r.urgency].label}</Badge>
        {lead.estimate !== undefined && <span className="num whitespace-nowrap text-[12.5px] font-semibold text-ink-2">≈ {money(lead.estimate, true)}</span>}
        <div className="flex-1" />
        {compact && live && (onDevis || onAdvance) && (
          <span className="flex items-center gap-1 rounded-full bg-white p-0.5 transition duration-200 ease-out-quint lg:absolute lg:bottom-2.5 lg:right-2.5 lg:translate-y-1 lg:opacity-0 lg:shadow-pill lg:group-hover:translate-y-0 lg:group-hover:opacity-100 touch:!static touch:!translate-y-0 touch:!opacity-100 touch:!shadow-none">
            {onDevis && lead.status !== 'devis' && (
              <Tip label="Préparer le devis">
                <button onClick={(e) => { e.stopPropagation(); onDevis(); }} aria-label="Préparer le devis" className="grid h-7 w-7 place-items-center rounded-full bg-pale-n text-ink-2 transition hover:bg-ink hover:text-white">
                  <FileText className="h-3.5 w-3.5" />
                </button>
              </Tip>
            )}
            {onAdvance && nextLabel && (
              <Tip label={`Passer en « ${nextLabel} »`}>
                <button onClick={(e) => { e.stopPropagation(); onAdvance(); }} aria-label={`Passer en ${nextLabel}`} className="grid h-7 w-7 place-items-center rounded-full bg-pale-v text-deep-v transition hover:bg-deep-v hover:text-white">
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </Tip>
            )}
          </span>
        )}
        {!compact && live && (
          <a
            href={telHref(lead.phone)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Appeler ${lead.name}`}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-pale-v text-deep-v transition-transform duration-300 ease-spring hover:scale-105 active:scale-95"
          >
            <Phone className="h-4 w-4" strokeWidth={1.75} />
          </a>
        )}
      </div>
    </div>
  );
}
