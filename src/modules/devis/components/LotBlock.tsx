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
import { useFresh } from './editorMotion';

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

/** Un lot du devis : titre éditable, lignes en cartes avec pastille, recherche de prix. */
export function LotBlock({ lot, index, collapsed, onToggle, vatRate, h, lh, phone, searchRef }: Props) {
  const sec = lot.section;
  const lowMargin = lot.cost > 0 && lot.ht > 50 && lot.marginRate < 25;
  const name = sec ? lotName(sec.designation) : 'Lignes sans lot';
  const count = lot.items.filter((l) => l.kind !== 'texte').length;
  const flip = useFlip<HTMLDivElement>(lot.items.map((l) => l.id).join('|'));

  const fresh = useFresh(lot.items.map((l) => l.id));

  const header = (
    <div className={cn('group flex items-center gap-2', phone ? 'min-h-[52px] px-1' : 'h-12 pl-1 pr-1.5')}>
      <button onClick={onToggle} className="grid h-9 w-8 place-items-center rounded-full text-ink-3 transition hover:bg-white/70 hover:text-ink" aria-label={collapsed ? 'Déplier le lot' : 'Replier le lot'} aria-expanded={!collapsed}>
        <ChevronRight className={cn('h-4 w-4 transition-transform duration-300 ease-spring', !collapsed && 'rotate-90')} />
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {sec ? (
          <>
            <span className="num grid h-7 min-w-7 shrink-0 place-items-center rounded-[9px] bg-pale-v px-1.5 text-[12px] font-semibold text-deep-v">{String(index + 1).padStart(2, '0')}</span>
            <input
              value={name}
              onChange={(e) => lh.onRename(sec.id, e.target.value)}
              className="h-9 min-w-0 flex-1 truncate rounded-full border border-transparent bg-transparent px-2.5 text-[16px] font-semibold tracking-[-0.02em] text-ink transition hover:bg-white/70 focus:border-vi-300 focus:bg-white focus:outline-none sm:max-w-[320px]"
              aria-label="Nom du lot"
            />
          </>
        ) : (
          <span className="pl-1 text-[16px] font-semibold tracking-[-0.02em]">{name}</span>
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
      <AnimatedNumber value={lot.ht} format={fmt} duration={500} className="num shrink-0 text-[14.5px] font-semibold tracking-[-0.01em] text-ink" />
      {sec && (
        <Menu
          trigger={({ toggle }) => (
            <button onClick={toggle} className={cn('grid h-9 w-9 place-items-center rounded-full text-ink-3 transition hover:bg-white/70 hover:text-ink', !phone && 'opacity-0 focus:opacity-100 group-hover:opacity-100 touch:opacity-100')} aria-label="Actions du lot">
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

  return (
    <section aria-label={name}>
      {header}
      <div className={cn('grid transition-[grid-template-rows] duration-300 ease-out-quint', collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]')}>
        <div className={cn(collapsed ? 'overflow-hidden' : 'overflow-visible')}>
          {!phone && lot.items.length > 0 && (
            <div className={cn('grid gap-1.5 pb-1.5 pl-3 pr-1.5 pt-0.5 text-[11.5px] font-medium text-ink-3', LINE_GRID)} aria-hidden>
              <span />
              <span className="px-2">Désignation</span>
              <span className="text-right">Qté</span>
              <span className="pl-1">Unité</span>
              <span className="text-right">PU HT</span>
              <span className="text-right">TVA</span>
              <span className="pr-1 text-right">Total HT</span>
              <span />
            </div>
          )}
          <div ref={flip} className="space-y-2">
            {lot.items.map((l) => (
              <div key={l.id} data-flip={l.id}>
                {phone ? <LineCard l={l} fresh={fresh.has(l.id)} onOpen={() => h.onEdit(l.id)} /> : <LineRow l={l} h={h} fresh={fresh.has(l.id)} />}
              </div>
            ))}
          </div>
          <div className="pt-2">
            <LineSearch ref={phone ? undefined : searchRef} big={phone} vatRate={vatRate} onAdd={(l) => lh.onAddLines(sec?.id ?? null, [l])} onVoice={lh.onVoice} />
          </div>
        </div>
      </div>
    </section>
  );
}
