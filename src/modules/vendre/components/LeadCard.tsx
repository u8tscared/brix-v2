import { ArrowRight, FileText, Phone } from 'lucide-react';
import { Badge, Tip, cn } from '@/components/ui';
import { money, relative } from '@/lib/format';
import type { Lead } from '@/lib/types';
import { LEAD_SOURCE, readLead, telHref, URGENCY } from '../lib';

export function ScoreDot({ score }: { score?: number }) {
  if (score === undefined) return null;
  const tone = score >= 80 ? 'text-ok bg-ok-bg' : score >= 60 ? 'text-warn bg-warn-bg' : 'text-ink-3 bg-sub';
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
      className={cn('group lift relative w-full cursor-pointer rounded-[14px] bg-white p-3.5 text-left shadow-card', lead.status === 'perdu' && 'opacity-60', highlight && 'animate-[pop_.5s_var(--ease)_both] shadow-[0_0_0_2px_#b9a2f5,0_12px_28px_-14px_rgba(109,40,217,.5)]')}
    >
      <div className="flex items-start gap-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[14px] font-semibold">{lead.name}</span>
            {lead.status === 'nouveau' && <i className="h-1.5 w-1.5 shrink-0 rounded-full bg-mag" aria-label="Non lue" />}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-3">
            <SrcIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
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
          <span className="flex items-center gap-1 rounded-full bg-white p-0.5 transition duration-200 ease-out-quint lg:absolute lg:bottom-2.5 lg:right-2.5 lg:translate-y-1 lg:opacity-0 lg:shadow-raise lg:group-hover:translate-y-0 lg:group-hover:opacity-100">
            {onDevis && lead.status !== 'devis' && (
              <Tip label="Préparer le devis">
                <button onClick={(e) => { e.stopPropagation(); onDevis(); }} aria-label="Préparer le devis" className="grid h-7 w-7 place-items-center rounded-full bg-sub text-ink-2 transition hover:bg-ink hover:text-white">
                  <FileText className="h-3.5 w-3.5" />
                </button>
              </Tip>
            )}
            {onAdvance && nextLabel && (
              <Tip label={`Passer en « ${nextLabel} »`}>
                <button onClick={(e) => { e.stopPropagation(); onAdvance(); }} aria-label={`Passer en ${nextLabel}`} className="grid h-7 w-7 place-items-center rounded-full bg-vi-50 text-vi-700 transition hover:bg-vi-700 hover:text-white">
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
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-vi-50 text-vi-700 transition hover:bg-vi-100"
          >
            <Phone className="h-4 w-4" strokeWidth={1.75} />
          </a>
        )}
      </div>
    </div>
  );
}
