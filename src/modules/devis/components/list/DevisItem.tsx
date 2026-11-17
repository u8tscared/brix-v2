import { BellRing, ChevronRight, Eye } from 'lucide-react';
import { Badge, Button, cn } from '@/components/ui';
import { money } from '@/lib/format';
import { DEVIS_STATUS } from '@/lib/status';
import type { Client, Devis } from '@/lib/types';
import { ago, type Score } from '../../logic';
import type { DevisMeta } from '../../store';
import { ScoreRing } from '../bits';

export const ROW_GRID = 'grid-cols-[38px_minmax(0,1.3fr)_minmax(0,1.3fr)_112px_112px]';

export function activityText(d: Devis, meta: DevisMeta): { text: string; hot?: boolean } {
  const relance = meta.lastReminderAt ? ` · relancé ${ago(meta.lastReminderAt)}` : '';
  switch (d.status) {
    case 'brouillon':
      return { text: `Créé ${ago(d.createdAt)}` };
    case 'envoye':
      return { text: `Envoyé ${ago(d.sentAt)} · pas encore ouvert${relance}` };
    case 'vu': {
      const v = d.views ?? 1;
      const recent = !!d.viewedAt && ago(d.viewedAt).match(/instant|min|h$|aujourd/);
      return { text: `Vu ${v} fois · ${ago(d.viewedAt)}${relance}`, hot: !!recent };
    }
    case 'signe':
      return { text: `Signé ${ago(d.signedAt)}` };
    case 'refuse':
      return { text: `Refusé · envoyé ${ago(d.sentAt ?? d.createdAt)}` };
    default:
      return { text: 'Validité dépassée' };
  }
}

interface Props {
  d: Devis;
  client?: Client;
  ttc: number;
  score: Score;
  meta: DevisMeta;
  onOpen: () => void;
  onRemind?: () => void;
  reminding?: boolean;
}

/** Ligne de la liste des devis (ordinateur et tablette). */
export function DevisRow({ d, client, ttc, score, meta, onOpen, onRemind, reminding }: Props) {
  const act = activityText(d, meta);
  const st = DEVIS_STATUS[d.status];
  return (
    <div onClick={onOpen} className={cn('group grid cursor-pointer items-center gap-4 border-b border-line px-4 py-3 transition last:border-b-0 hover:bg-[#fafafc]', ROW_GRID)}>
      <ScoreRing value={score.value} title={`${score.label}${score.reasons.length ? ' : ' + score.reasons.join(', ') : ''}`} />
      <div className="min-w-0">
        <div className="truncate text-[14px] font-medium">{client?.name ?? 'Client à choisir'}</div>
        <div className="truncate text-[12.5px] text-ink-3">
          <span className="num">{d.number}</span> · {d.title}
        </div>
      </div>
      <div className="min-w-0">
        <Badge tone={st.tone} dot>
          {d.status === 'vu' ? 'Vu' : st.label}
        </Badge>
        <div className={cn('mt-0.5 flex min-w-0 items-center gap-1 text-[12.5px]', act.hot ? 'font-medium text-vi-700' : 'text-ink-2')}>
          {act.hot && <Eye className="h-3.5 w-3.5 shrink-0" />}
          <span className="truncate">{act.text}</span>
        </div>
      </div>
      <div className="num text-right text-[14px] font-semibold">{money(ttc)}</div>
      <div className="flex justify-end">
        {onRemind ? (
          <Button
            size="sm"
            variant="secondary"
            loading={reminding}
            icon={<BellRing className="h-3.5 w-3.5" />}
            onClick={(e) => {
              e.stopPropagation();
              onRemind();
            }}
          >
            Relancer
          </Button>
        ) : (
          <ChevronRight className="h-4 w-4 text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-ink" />
        )}
      </div>
    </div>
  );
}

/** Carte de devis (téléphone). */
export function DevisCard({ d, client, ttc, score, meta, onOpen, onRemind, reminding }: Props) {
  const act = activityText(d, meta);
  const st = DEVIS_STATUS[d.status];
  return (
    <div onClick={onOpen} className="cursor-pointer rounded-2xl border border-line bg-white p-4 transition active:scale-[.99]">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold">{client?.name ?? 'Client à choisir'}</div>
          <div className="truncate text-[12.5px] text-ink-3">
            <span className="num">{d.number}</span> · {d.title}
          </div>
        </div>
        <div className="text-right">
          <div className="num text-[15px] font-semibold">{money(ttc)}</div>
          <Badge tone={st.tone} dot className="mt-1">
            {d.status === 'vu' ? 'Vu' : st.label}
          </Badge>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 border-t border-line pt-3">
        <ScoreRing value={score.value} size={32} />
        <div className="min-w-0 flex-1">
          <div className={cn('truncate text-[12.5px]', act.hot ? 'font-medium text-vi-700' : 'text-ink-2')}>{act.text}</div>
          <div className="text-[11.5px] text-ink-3">{d.status === 'signe' || d.status === 'refuse' ? 'Probabilité de signature' : `Signature ${score.label.toLowerCase()}`}</div>
        </div>
        {onRemind && (
          <Button
            size="sm"
            variant="secondary"
            className="h-11 px-3.5"
            loading={reminding}
            icon={<BellRing className="h-4 w-4" />}
            onClick={(e) => {
              e.stopPropagation();
              onRemind();
            }}
          >
            Relancer
          </Button>
        )}
      </div>
    </div>
  );
}
