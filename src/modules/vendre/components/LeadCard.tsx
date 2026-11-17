import { Phone } from 'lucide-react';
import { Badge, cn } from '@/components/ui';
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
export function LeadCard({ lead, onOpen, compact }: { lead: Lead; onOpen: () => void; compact?: boolean }) {
  const r = readLead(lead);
  const src = LEAD_SOURCE[lead.source];
  const SrcIcon = src.icon;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      className={cn('group w-full cursor-pointer rounded-xl border border-line bg-white p-3.5 text-left transition hover:border-line2 hover:shadow-[0_4px_14px_-8px_rgba(30,20,70,.25)]', lead.status === 'perdu' && 'opacity-60')}
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
        {!compact && lead.status !== 'perdu' && lead.status !== 'gagne' && (
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
