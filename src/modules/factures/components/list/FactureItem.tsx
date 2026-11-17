import { BellRing, Expand, Send, Wallet } from 'lucide-react';
import { Button, Tip, cn } from '@/components/ui';
import { money } from '@/lib/format';
import type { Client, Facture, FactureStatus } from '@/lib/types';
import type { Amounts } from '../../lib/model';
import { DueText, EDot, KindBadge, StatusBadge } from '../bits';

export const ROW_GRID = 'grid-cols-[150px_minmax(0,1fr)_140px_116px_116px_132px_150px]';

export type RowAction = 'send' | 'pay' | 'remind';

export interface FactureItemProps {
  f: Facture;
  client?: Client;
  a: Amounts;
  st: FactureStatus;
  due: { text: string; tone: 'ok' | 'warn' | 'bad' | 'muted' };
  onOpen: () => void;
  onPreview: () => void;
  onAction: (a: RowAction) => void;
}

/** L'action utile d'une facture, selon où elle en est. */
export function rowAction(f: Facture, st: FactureStatus, remaining: number): { key: RowAction; label: string; icon: React.ReactNode } | null {
  if (st === 'brouillon') return { key: 'send', label: 'Émettre', icon: <Send className="h-3.5 w-3.5" /> };
  if (f.kind === 'avoir' || remaining <= 0) return null;
  if (st === 'en_retard') return { key: 'remind', label: 'Relancer', icon: <BellRing className="h-3.5 w-3.5" /> };
  return { key: 'pay', label: 'Encaisser', icon: <Wallet className="h-3.5 w-3.5" /> };
}

function Progress({ a }: { a: Amounts }) {
  const pct = a.net > 0 ? Math.round(((a.net - a.remaining) / a.net) * 100) : 0;
  if (pct <= 0 || pct >= 100) return null;
  return (
    <div className="mt-1 ml-auto h-1 w-16 overflow-hidden rounded-full bg-sub">
      <div className="h-full rounded-full bg-ok transition-[width] duration-700 ease-out-quint" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function FactureRow({ f, client, a, st, due, onOpen, onPreview, onAction }: FactureItemProps) {
  const act = rowAction(f, st, a.remaining);
  return (
    <div onClick={onOpen} className={cn('group grid min-h-[62px] cursor-pointer items-center gap-4 border-b border-line px-5 py-2.5 transition-colors duration-150 last:border-b-0 hover:bg-[#faf9fd]', ROW_GRID)}>
      <div className="min-w-0">
        <KindBadge kind={f.kind} />
        <div className="mt-1 font-mono text-[11.5px] text-ink-3">{f.number}</div>
      </div>
      <div className="min-w-0">
        <div className="truncate text-[14px] font-semibold tracking-[-0.01em]">{client?.name ?? <span className="text-ink-3">Client à choisir</span>}</div>
        <div className="truncate text-[12.5px] text-ink-3">{f.title || 'Sans titre'}</div>
      </div>
      <DueText {...due} />
      <div className="num text-right text-[13.5px] text-ink-2">{money(a.ttc * a.sign)}</div>
      <div className="text-right">
        <div className={cn('num text-[14px]', a.remaining > 0 ? cn('font-semibold', st === 'en_retard' && 'text-bad') : 'text-ink-3')}>{a.remaining > 0 ? money(a.remaining) : '·'}</div>
        <Progress a={a} />
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <StatusBadge status={st} />
        <EDot status={f.einvoice.status} b2c={client?.kind !== 'pro'} />
      </div>
      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        <Tip label="Aperçu plein écran">
          <button onClick={onPreview} aria-label="Aperçu plein écran" className="grid h-8 w-8 place-items-center rounded-[9px] text-ink-3 opacity-60 transition hover:bg-sub hover:text-ink group-hover:opacity-100">
            <Expand className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </Tip>
        {act && (
          <Button size="sm" variant={act.key === 'remind' ? 'secondary' : 'ghost'} icon={act.icon} onClick={() => onAction(act.key)} className={cn(act.key !== 'remind' && 'opacity-70 group-hover:opacity-100')}>
            {act.label}
          </Button>
        )}
      </div>
    </div>
  );
}

export function FactureCard({ f, client, a, st, due, onOpen, onPreview, onAction }: FactureItemProps) {
  const act = rowAction(f, st, a.remaining);
  return (
    <div onClick={onOpen} className="cursor-pointer rounded-[16px] bg-white p-4 shadow-card transition active:scale-[.99]">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold tracking-[-0.01em]">{client?.name ?? 'Client à choisir'}</div>
          <div className="mt-0.5 truncate text-[13px] text-ink-2">{f.title || 'Sans titre'}</div>
        </div>
        <div className="text-right">
          <div className={cn('num text-[17px] font-semibold tracking-[-0.02em]', st === 'en_retard' && 'text-bad')}>{money(a.remaining > 0 ? a.remaining : a.ttc * a.sign)}</div>
          <div className="text-[11.5px] text-ink-3">{a.remaining > 0 && a.remaining < a.net ? `reste sur ${money(a.net)}` : a.remaining > 0 ? 'à payer' : f.kind === 'avoir' ? 'avoir' : 'réglée'}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <KindBadge kind={f.kind} />
        <span className="font-mono text-[11.5px] text-ink-3">{f.number}</span>
        <span className="ml-auto">
          <StatusBadge status={st} />
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-line pt-3" onClick={(e) => e.stopPropagation()}>
        <DueText {...due} />
        <EDot status={f.einvoice.status} b2c={client?.kind !== 'pro'} />
        <button onClick={onPreview} aria-label="Aperçu plein écran" className="ml-auto grid h-10 w-10 place-items-center rounded-[10px] text-ink-2 transition active:bg-sub">
          <Expand className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>
        {act && (
          <Button size="md" variant="secondary" icon={act.icon} onClick={() => onAction(act.key)} className="h-10">
            {act.label}
          </Button>
        )}
      </div>
    </div>
  );
}
