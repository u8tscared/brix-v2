import { ArrowDown, ArrowUp, ChevronRight, Copy, MoreHorizontal, Trash2, Type } from 'lucide-react';
import { Badge, cn } from '@/components/ui';
import { AnimatedNumber } from '@/components/motion';
import { money, pct, uid } from '@/lib/format';
import type { DevisLigne } from '@/lib/types';
import type { Lot } from '../logic';
import { lotName } from '../logic';
import { Menu } from './bits';
import { LINE_GRID, LineCard, LineRow, type LineHandlers } from './LineRow';
import { LineSearch } from './LineSearch';
import { useFlip } from './useFlip';

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

const fmt = (n: number) => money(n);

/** Un lot du devis : titre éditable, lignes, recherche de prix. Carte blanche posée sur la page. */
export function LotBlock({ lot, index, collapsed, onToggle, vatRate, h, lh, phone, searchRef }: Props) {
  const sec = lot.section;
  const lowMargin = lot.cost > 0 && lot.ht > 50 && lot.marginRate < 25;
  const name = sec ? lotName(sec.designation) : 'Lignes sans lot';
  const count = lot.items.filter((l) => l.kind !== 'texte').length;
  const flip = useFlip<HTMLDivElement>(lot.items.map((l) => l.id).join('|'));

  const header = (
    <div className={cn('group flex items-center gap-2', phone ? 'min-h-[56px] px-3' : 'h-[52px] px-3')}>
      <button onClick={onToggle} className="grid h-9 w-8 place-items-center rounded-[8px] text-ink-3 transition hover:bg-sub hover:text-ink" aria-label={collapsed ? 'Déplier le lot' : 'Replier le lot'} aria-expanded={!collapsed}>
        <ChevronRight className={cn('h-4 w-4 transition-transform duration-300 ease-out-quint', !collapsed && 'rotate-90')} />
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {sec ? (
          <>
            <span className="num grid h-6 min-w-6 shrink-0 place-items-center rounded-[7px] bg-[#f3edff] px-1 font-mono text-[11px] font-semibold text-[#6d28d9]">{String(index + 1).padStart(2, '0')}</span>
            <input
              value={name}
              onChange={(e) => lh.onRename(sec.id, e.target.value)}
              className="-ml-0.5 h-8 min-w-0 flex-1 truncate rounded-[8px] border border-transparent bg-transparent px-1.5 text-[15px] font-semibold tracking-[-0.015em] text-ink transition hover:border-line2 focus:border-vi-300 focus:bg-white focus:outline-none sm:max-w-[300px]"
              aria-label="Nom du lot"
            />
          </>
        ) : (
          <span className="pl-1 text-[15px] font-semibold">{name}</span>
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
      <AnimatedNumber value={lot.ht} format={fmt} duration={500} className="shrink-0 text-[14px] font-semibold text-ink" />
      {sec && (
        <Menu
          trigger={({ toggle }) => (
            <button onClick={toggle} className={cn('grid h-9 w-9 place-items-center rounded-[8px] text-ink-3 transition hover:bg-sub hover:text-ink', !phone && 'opacity-0 focus:opacity-100 group-hover:opacity-100')} aria-label="Actions du lot">
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
      <div className="rounded-[18px] bg-white shadow-card">
        {header}
        <div className={cn('grid transition-[grid-template-rows] duration-300 ease-out-quint', collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]')}>
          <div className="overflow-hidden">
            <div ref={flip} className="border-t border-line px-4">
              {lot.items.map((l) => (
                <div key={l.id} data-flip={l.id}>
                  <LineCard l={l} onOpen={() => h.onEdit(l.id)} />
                </div>
              ))}
              <div className="py-2.5">
                <LineSearch big vatRate={vatRate} onAdd={(l) => lh.onAddLines(sec?.id ?? null, [l])} onVoice={lh.onVoice} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );

  return (
    <div className="rounded-[16px] bg-white shadow-card">
      {header}
      <div className={cn('grid transition-[grid-template-rows] duration-300 ease-out-quint', collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]')}>
        <div className={cn(collapsed ? 'overflow-hidden' : 'overflow-visible')}>
          {lot.items.length > 0 && (
            <div className={cn('grid gap-1 border-y border-line bg-[#faf9fd] px-3 py-1.5 text-[11.5px] font-medium text-ink-3', LINE_GRID)}>
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
          <div ref={flip} className="px-3">
            {lot.items.map((l) => (
              <div key={l.id} data-flip={l.id} className="rounded-[8px]">
                <LineRow l={l} h={h} />
              </div>
            ))}
          </div>
          <div className={cn('px-3 py-2', lot.items.length === 0 && 'border-t border-line')}>
            <LineSearch ref={searchRef} vatRate={vatRate} onAdd={(l) => lh.onAddLines(sec?.id ?? null, [l])} onVoice={lh.onVoice} />
          </div>
        </div>
      </div>
    </div>
  );
}
