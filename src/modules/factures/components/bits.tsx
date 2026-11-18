// Petits éléments visuels réutilisés par les écrans de facturation.

import { BadgeCheck, ChartGantt, Coins, ReceiptText, Undo2, type LucideIcon } from 'lucide-react';
import { Badge, IconTile, cn, type HaloTone } from '@/components/ui';
import { EINVOICE_STATUS, FACTURE_STATUS } from '@/lib/status';
import type { EInvoiceStatus, Facture, FactureStatus } from '@/lib/types';
import { KIND_LABEL, KIND_TONE } from '../lib/model';

export function KindBadge({ kind, className }: { kind: Facture['kind']; className?: string }) {
  return (
    <Badge tone={KIND_TONE[kind]} className={className}>
      {KIND_LABEL[kind]}
    </Badge>
  );
}

/** Pastille Halo d'une facture selon son type (facture, acompte, situation, solde, avoir). */
const KIND_TILE: Record<Facture['kind'], { icon: LucideIcon; tone: HaloTone }> = {
  facture: { icon: ReceiptText, tone: 'mag' },
  acompte: { icon: Coins, tone: 'blue' },
  situation: { icon: ChartGantt, tone: 'violet' },
  solde: { icon: BadgeCheck, tone: 'green' },
  avoir: { icon: Undo2, tone: 'amber' },
};

export function KindTile({ kind, size = 'row', className }: { kind: Facture['kind']; size?: 'sm' | 'row' | 'md'; className?: string }) {
  const t = KIND_TILE[kind];
  const I = t.icon;
  return <IconTile icon={<I strokeWidth={1.9} />} tone={t.tone} size={size} className={className} />;
}

export function StatusBadge({ status, size = 'md' }: { status: FactureStatus; size?: 'sm' | 'md' }) {
  const s = FACTURE_STATUS[status];
  return (
    <Badge tone={s.tone} dot size={size}>
      {s.label}
    </Badge>
  );
}

const DOT: Record<string, string> = {
  neutral: 'bg-[#d9d4ea]',
  info: 'bg-[#3b82f6]',
  violet: 'bg-vi-500',
  ok: 'bg-ok',
  warn: 'bg-warn',
  bad: 'bg-bad',
  dark: 'bg-ink',
};

/** Pastille du statut de facture électronique, avec libellé au survol (ou visible). */
export function EDot({ status, b2c, showLabel, className }: { status: EInvoiceStatus; b2c?: boolean; showLabel?: boolean; className?: string }) {
  const s = EINVOICE_STATUS[status];
  const label = b2c ? 'Particulier : e-reporting' : s.label;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[12px] text-ink-2', className)} title={`Facture électronique : ${label}`}>
      <i className={cn('h-2 w-2 shrink-0 rounded-full', b2c ? 'bg-line2 ring-1 ring-inset ring-ink-3/30' : DOT[s.tone], !b2c && status === 'deposee' && 'animate-pulse')} />
      {showLabel && <span className="truncate">{label}</span>}
    </span>
  );
}

export function DueText({ text, tone }: { text: string; tone: 'ok' | 'warn' | 'bad' | 'muted' }) {
  return <span className={cn('whitespace-nowrap text-[12.5px]', tone === 'bad' ? 'font-medium text-bad' : tone === 'warn' ? 'text-warn' : tone === 'ok' ? 'text-ok' : 'text-ink-3')}>{text}</span>;
}

/** Bandeau « en démo » discret pour les fonctions simulées. */
export function DemoNote({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('rounded-field bg-pale-n px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-2', className)}>{children}</p>;
}
