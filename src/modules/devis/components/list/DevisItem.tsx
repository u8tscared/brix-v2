import { BellRing, ChevronRight, Expand, Eye } from 'lucide-react';
import { Avatar, Badge, Button, Tip, cn } from '@/components/ui';
import { Ring } from '@/components/motion';
import { initials, money } from '@/lib/format';
import { DEVIS_STATUS } from '@/lib/status';
import type { Client, Devis } from '@/lib/types';
import { ago, type Score } from '../../logic';
import type { DevisMeta } from '../../store';

export const ROW_GRID = 'grid-cols-[44px_minmax(0,1.35fr)_minmax(0,1.2fr)_120px_150px]';

export function activityText(d: Devis, meta: DevisMeta): { text: string; hot?: boolean } {
  const relance = meta.lastReminderAt ? ` · relancé ${ago(meta.lastReminderAt)}` : '';
  switch (d.status) {
    case 'brouillon':
      return { text: `Créé ${ago(d.createdAt)}` };
    case 'envoye':
      return { text: `Envoyé ${ago(d.sentAt)}, pas encore ouvert${relance}` };
    case 'vu': {
      const v = d.views ?? 1;
      const recent = !!d.viewedAt && ago(d.viewedAt).match(/instant|min|h$|aujourd/);
      return { text: `Vu ${v} fois ${ago(d.viewedAt)}${relance}`, hot: !!recent };
    }
    case 'signe':
      return { text: `Signé ${ago(d.signedAt)}` };
    case 'refuse':
      return { text: `Refusé · envoyé ${ago(d.sentAt ?? d.createdAt)}` };
    default:
      return { text: 'Validité dépassée' };
  }
}

const ringTone = (v: number) => (v >= 70 ? 'ok' : v >= 45 ? 'warn' : 'vi');

interface Props {
  d: Devis;
  client?: Client;
  ttc: number;
  score: Score;
  meta: DevisMeta;
  onOpen: () => void;
  onPreview: () => void;
  onRemind?: () => void;
  reminding?: boolean;
}

function Proba({ d, score, size = 40 }: { d: Devis; score: Score; size?: number }) {
  const final = d.status === 'signe' || d.status === 'refuse' || d.status === 'expire';
  return (
    <Tip label={final ? DEVIS_STATUS[d.status].label : `${score.label}${score.reasons.length ? ' : ' + score.reasons.slice(0, 2).join(', ') : ''}`}>
      <Ring value={score.value} size={size} stroke={3.5} tone={final ? (d.status === 'signe' ? 'ok' : 'ink') : ringTone(score.value)}>
        <span className={cn(final && d.status !== 'signe' && 'text-ink-3')}>{score.value}</span>
      </Ring>
    </Tip>
  );
}

/** Ligne de la liste des devis (ordinateur et tablette). */
export function DevisRow({ d, client, ttc, score, meta, onOpen, onPreview, onRemind, reminding }: Props) {
  const act = activityText(d, meta);
  const st = DEVIS_STATUS[d.status];
  return (
    <div onClick={onOpen} className={cn('group grid cursor-pointer items-center gap-4 rounded-card-sm bg-white px-5 py-3 shadow-halo-sm transition-[box-shadow,transform] duration-300 ease-out-quint hover:-translate-y-px hover:shadow-[0_0_0_1px_#e3dcf3,0_10px_24px_-12px_rgba(60,30,120,.18)]', ROW_GRID)}>
      <Proba d={d} score={score} />
      <div className="min-w-0">
        <div className="truncate text-[14px] font-semibold tracking-[-0.01em]">{client?.name ?? <span className="text-ink-3">Client à choisir</span>}</div>
        <div className="truncate text-[12.5px] text-ink-3">
          <span className="font-mono text-[11.5px]">{d.number}</span> · {d.title}
        </div>
      </div>
      <div className="min-w-0">
        <Badge tone={st.tone} dot pulse={act.hot}>
          {d.status === 'vu' ? 'Vu' : st.label}
        </Badge>
        <div className={cn('mt-1 flex min-w-0 items-center gap-1 text-[12.5px]', act.hot ? 'font-medium text-deep-m' : 'text-ink-2')}>
          {act.hot && <Eye className="h-3.5 w-3.5 shrink-0" />}
          <span className="truncate">{act.text}</span>
        </div>
      </div>
      <div className="num text-right text-[14.5px] font-semibold tracking-[-0.01em]">{money(ttc)}</div>
      <div className="flex items-center justify-end gap-1.5">
        <Tip label="Aperçu plein écran">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
            aria-label={`Aperçu du devis ${d.number}`}
            className="grid h-9 w-9 place-items-center rounded-full text-ink-3 opacity-0 transition hover:bg-halo-hover hover:text-ink focus:opacity-100 group-hover:opacity-100 touch:h-11 touch:w-11 touch:opacity-100"
          >
            <Expand className="h-4 w-4" />
          </button>
        </Tip>
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
          <span className="grid h-8 w-[88px] place-items-center">
            <ChevronRight className="ml-auto h-4 w-4 text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-ink" />
          </span>
        )}
      </div>
    </div>
  );
}

/** Carte de devis (téléphone). */
export function DevisCard({ d, client, ttc, score, meta, onOpen, onPreview, onRemind, reminding }: Props) {
  const act = activityText(d, meta);
  const st = DEVIS_STATUS[d.status];
  return (
    <div onClick={onOpen} className="cursor-pointer rounded-card bg-white p-4 shadow-halo transition active:scale-[.985]">
      <div className="flex items-start gap-3">
        <Avatar initials={initials(client?.name ?? '?')} size={42} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold tracking-[-0.01em]">{client?.name ?? 'Client à choisir'}</div>
          <div className="truncate text-[12.5px] text-ink-3">{d.title}</div>
        </div>
        <div className="text-right">
          <div className="num text-[16px] font-semibold tracking-[-0.02em]">{money(ttc)}</div>
          <div className="font-mono text-[11px] text-ink-3">{d.number}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 border-t border-[#f2eff8] pt-3">
        <Proba d={d} score={score} size={36} />
        <div className="min-w-0 flex-1">
          <Badge tone={st.tone} dot pulse={act.hot}>
            {d.status === 'vu' ? 'Vu' : st.label}
          </Badge>
          <div className={cn('mt-0.5 truncate text-[12.5px]', act.hot ? 'font-medium text-deep-m' : 'text-ink-2')}>{act.text}</div>
        </div>
        <Button
          size="icon"
          variant="secondary"
          className="h-11 w-11"
          aria-label="Aperçu"
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
        >
          <Expand />
        </Button>
        {onRemind && (
          <Button
            size="icon"
            variant="secondary"
            className="h-11 w-11"
            loading={reminding}
            aria-label="Relancer"
            onClick={(e) => {
              e.stopPropagation();
              onRemind();
            }}
          >
            <BellRing />
          </Button>
        )}
      </div>
    </div>
  );
}
