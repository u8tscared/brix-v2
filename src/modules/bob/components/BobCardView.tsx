import { Check, ChevronRight } from 'lucide-react';
import { Button, Icon, Progress, cn } from '@/components/ui';
import type { BobCard, BobCardAction } from '../engine';

const toneText: Record<string, string> = { ok: 'text-ok', warn: 'text-warn', bad: 'text-bad', violet: 'text-vi-700', neutral: 'text-ink-2' };

/** Carte riche affichée sous une réponse de Bob. */
export function BobCardView({ card, done, onAction, onOpen }: { card: BobCard; done?: string; onAction: (a: BobCardAction) => void; onOpen: (to: string) => void }) {
  const actions = (card.actions ?? []).filter((a) => !(done && a.run));
  return (
    <div className="animate-fade-up overflow-hidden rounded-[14px] border border-line bg-white shadow-[0_1px_2px_rgba(20,20,40,.04)]">
      <div className="flex items-start gap-3 px-4 pb-2 pt-3.5">
        {card.icon && (
          <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-[9px]', card.kind === 'done' ? 'bg-ok-bg text-ok' : card.kind === 'lesson' ? 'bg-[#eef2ff] text-brand' : 'bg-sub text-ink-2')}>
            <Icon name={card.icon} className="h-4 w-4" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold leading-snug">{card.title}</div>
          {card.subtitle && <div className="mt-0.5 text-[12.5px] text-ink-2">{card.subtitle}</div>}
        </div>
      </div>

      {card.figure && (
        <div className="px-4 pb-2">
          <div className="num font-display text-[26px] font-semibold leading-tight tracking-[-0.02em]">{card.figure}</div>
          {card.figureLabel && <div className="text-[12px] text-ink-2">{card.figureLabel}</div>}
          {card.progress !== undefined && <Progress value={card.progress} className="mt-2" />}
        </div>
      )}

      {card.rows && card.rows.length > 0 && (
        <div className="mt-1 border-t border-line">
          {card.rows.map((r, i) => (
            <button
              key={i}
              type="button"
              disabled={!r.to}
              onClick={() => r.to && onOpen(r.to)}
              className={cn('flex w-full items-center gap-3 border-b border-line px-4 py-2.5 text-left last:border-b-0', r.to ? 'transition hover:bg-[#fafafc]' : 'cursor-default')}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium">{r.label}</div>
                {r.sub && <div className={cn('truncate text-[12px]', r.tone === 'warn' && !r.value ? 'text-warn' : 'text-ink-3')}>{r.sub}</div>}
              </div>
              {r.value && <span className={cn('num shrink-0 text-right text-[13px] font-semibold', r.tone ? toneText[r.tone] : 'text-ink')}>{r.value}</span>}
              {r.to && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-3" />}
            </button>
          ))}
        </div>
      )}

      {card.bullets && (
        <ul className="space-y-2 px-4 pb-3 pt-1">
          {card.bullets.map((b, i) => (
            <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-ink">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-vi-300" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
      {card.paragraphs?.map((p, i) => <p key={i} className="px-4 pb-2 text-[13px] leading-relaxed">{p}</p>)}
      {card.source && <div className="px-4 pb-3 text-[11.5px] text-ink-3">Référence : {card.source}</div>}

      {(actions.length > 0 || done) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line bg-[#fbfbfd] px-3 py-2.5">
          {done && (
            <span className="mr-auto flex items-center gap-1.5 text-[12.5px] font-medium text-ok">
              <Check className="h-3.5 w-3.5" /> {done}
            </span>
          )}
          {actions.map((a) => (
            <Button key={a.label} size="sm" variant={a.variant ?? 'secondary'} icon={a.icon ? <Icon name={a.icon} className="h-3.5 w-3.5" /> : undefined} onClick={() => onAction(a)} className="min-h-[36px]">
              {a.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
