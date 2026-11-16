import { ArrowDown, ArrowUp, ChevronRight, Copy, MoreHorizontal, Trash2, Type } from 'lucide-react';
import { Badge, cn } from '@/components/ui';
import { money, pct, uid } from '@/lib/format';
import type { DevisLigne } from '@/lib/types';
import type { Lot } from '../logic';
import { lotName } from '../logic';
import { Menu } from './bits';
import { LINE_GRID, LineCard, LineRow, type LineHandlers } from './LineRow';
import { LineSearch } from './LineSearch';

export interface LotHandlers {
  onRename: (sectionId: string, name: string) => void;
  onMoveLot: (sectionId: string, dir: -1 | 1) => void;
  onDuplicateLot: (sectionId: string) => void;
  onRemoveLot: (sectionId: string) => void;
  onAddLines: (sectionId: string | null, lines: DevisLigne[]) => void;
  onVoice: () => void;
}

interface Props {
  lot: Lot;
  index: number;
  collapsed: boolean;
  onToggle: () => void;
  vatRate: number;
  h: LineHandlers;
  lh: LotHandlers;
  phone: boolean;
  searchRef?: (el: HTMLInputElement | null) => void;
}

export function LotBlock({ lot, index, collapsed, onToggle, vatRate, h, lh, phone, searchRef }: Props) {
  const sec = lot.section;
  const lowMargin = lot.cost > 0 && lot.ht > 50 && lot.marginRate < 25;
  const name = sec ? lotName(sec.designation) : 'Lignes sans lot';
  const count = lot.items.filter((l) => l.kind !== 'texte').length;

  const header = (
    <div className={cn('group flex items-center gap-2', phone ? 'min-h-[52px] px-4' : 'h-11 border-b border-line')}>
      <button onClick={onToggle} className="grid h-8 w-6 place-items-center text-ink-3 hover:text-ink" aria-label={collapsed ? 'Déplier le lot' : 'Replier le lot'} aria-expanded={!collapsed}>
        <ChevronRight className={cn('h-4 w-4 transition-transform', !collapsed && 'rotate-90')} />
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {sec ? (
          <>
            <span className="shrink-0 text-[14px] font-semibold text-ink">Lot {index + 1} ·</span>
            <input
              value={name}
              onChange={(e) => lh.onRename(sec.id, e.target.value)}
              className="-ml-1 h-8 min-w-0 flex-1 truncate rounded-md border border-transparent bg-transparent px-1 text-[14px] font-semibold text-ink hover:border-line2 focus:border-vi-300 focus:bg-white focus:outline-none sm:max-w-[260px]"
              aria-label="Nom du lot"
            />
          </>
        ) : (
          <span className="text-[14px] font-semibold">{name}</span>
        )}
        <span className="hidden shrink-0 text-[12.5px] text-ink-3 sm:inline">
          {count} ligne{count > 1 ? 's' : ''}
        </span>
        {lowMargin && (
          <Badge tone="warn" className="shrink-0">
            marge {pct(lot.marginRate)}
          </Badge>
        )}
      </div>
      <span className="num shrink-0 text-[13.5px] font-medium text-ink-2">{money(lot.ht)}</span>
      {sec && (
        <Menu
          trigger={({ toggle }) => (
            <button onClick={toggle} className={cn('grid h-8 w-8 place-items-center rounded-md text-ink-3 hover:bg-sub hover:text-ink', !phone && 'opacity-0 focus:opacity-100 group-hover:opacity-100')} aria-label="Actions du lot">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          )}
          items={[
            { label: 'Ajouter un texte', icon: <Type />, onClick: () => lh.onAddLines(sec.id, [{ id: uid('l'), kind: 'texte', designation: 'Précision pour le client', quantity: 0, unit: '', unitPriceHt: 0, unitCostHt: 0, vatRate: 0 }]) },
            { label: 'Monter le lot', icon: <ArrowUp />, onClick: () => lh.onMoveLot(sec.id, -1) },
            { label: 'Descendre le lot', icon: <ArrowDown />, onClick: () => lh.onMoveLot(sec.id, 1) },
            { label: 'Dupliquer le lot', icon: <Copy />, onClick: () => lh.onDuplicateLot(sec.id) },
            { label: 'Supprimer le lot', icon: <Trash2 />, onClick: () => lh.onRemoveLot(sec.id), danger: true, divider: true },
          ]}
        />
      )}
    </div>
  );

  if (phone)
    return (
      <div className="overflow-visible rounded-2xl border border-line bg-white">
        {header}
        {!collapsed && (
          <div className="border-t border-line px-4">
            {lot.items.map((l) => (
              <LineCard key={l.id} l={l} onOpen={() => h.onEdit(l.id)} />
            ))}
            <div className="py-2">
              <LineSearch big vatRate={vatRate} onAdd={(l) => lh.onAddLines(sec?.id ?? null, [l])} onVoice={lh.onVoice} />
            </div>
          </div>
        )}
      </div>
    );

  return (
    <div>
      {header}
      {!collapsed && (
        <>
          {lot.items.length > 0 && (
            <div className={cn('grid gap-1 border-b border-line py-2 text-[11.5px] font-medium text-ink-3', LINE_GRID)}>
              <span />
              <span className="px-1.5">Désignation</span>
              <span className="text-right">Qté</span>
              <span className="pl-1">U.</span>
              <span className="text-right">PU HT</span>
              <span className="text-right">TVA</span>
              <span className="text-right">Total HT</span>
              <span />
            </div>
          )}
          {lot.items.map((l) => (
            <LineRow key={l.id} l={l} h={h} />
          ))}
          <div className="border-b border-line py-1.5 pl-3">
            <LineSearch ref={searchRef} vatRate={vatRate} onAdd={(l) => lh.onAddLines(sec?.id ?? null, [l])} onVoice={lh.onVoice} />
          </div>
        </>
      )}
    </div>
  );
}
