import { useState } from 'react';
import { ArrowDown, ArrowUp, AudioLines, BookOpen, Clock, Copy, GripVertical, MoreHorizontal, PenLine, Trash2 } from 'lucide-react';
import { cn } from '@/components/ui';
import { money, num } from '@/lib/format';
import type { DevisLigne } from '@/lib/types';
import { Menu, NumInput } from './bits';

export const VAT_RATES = [20, 10, 5.5, 0];

export function sourceInfo(l: DevisLigne): { icon: JSX.Element; text: string; bob?: boolean } {
  if (l.source === 'bob') return { icon: <AudioLines className="h-3 w-3" />, text: l.detail && /bob/i.test(l.detail) ? l.detail : 'Proposé par Bob', bob: true };
  if (l.source === 'taux' || l.unit === 'h') return { icon: <Clock className="h-3 w-3" />, text: l.detail ?? "Main d'œuvre · ton taux" };
  if (l.supplierRef || l.supplier) return { icon: <BookOpen className="h-3 w-3" />, text: [l.supplierRef, l.supplier].filter(Boolean).join(' · ') };
  if (l.source === 'bibliotheque') return { icon: <BookOpen className="h-3 w-3" />, text: l.detail ?? 'Bibliothèque de prix' };
  if (l.detail) return { icon: <PenLine className="h-3 w-3" />, text: l.detail };
  return { icon: <PenLine className="h-3 w-3" />, text: 'Ligne libre' };
}

export interface LineHandlers {
  onChange: (id: string, p: Partial<DevisLigne>) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
  onDrop: (dragId: string, beforeId: string) => void;
}

export const LINE_GRID = 'grid-cols-[14px_minmax(0,1fr)_48px_46px_78px_52px_86px_26px]';

/** Ligne éditable en place (ordinateur et tablette). */
export function LineRow({ l, h }: { l: DevisLigne; h: LineHandlers }) {
  const [over, setOver] = useState(false);
  const src = sourceInfo(l);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false);
        const id = e.dataTransfer.getData('text/brix-line');
        if (id) h.onDrop(id, l.id);
      }}
      className={cn('group grid items-center gap-1 border-b border-line py-1.5', LINE_GRID, over && 'shadow-[inset_0_2px_0_#8b5cf6]')}
    >
      <span
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/brix-line', l.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        className="grid h-8 cursor-grab place-items-center text-ink-3 opacity-0 transition group-hover:opacity-100"
        title="Glisser pour déplacer"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </span>
      {l.kind === 'texte' ? (
        <input value={l.designation} onChange={(e) => h.onChange(l.id, { designation: e.target.value })} className="col-span-6 h-8 rounded-md bg-transparent px-1.5 text-[13px] italic text-ink-2 hover:bg-sub focus:bg-white focus:outline-none focus:ring-2 focus:ring-vi-100" aria-label="Texte libre" />
      ) : (
        <>
          <div className="min-w-0">
            <textarea
              rows={1}
              value={l.designation}
              onChange={(e) => h.onChange(l.id, { designation: e.target.value.replace(/\n/g, ' ') })}
              style={{ fieldSizing: 'content' } as React.CSSProperties}
              className="block min-h-[28px] w-full resize-none overflow-hidden rounded-md border border-transparent bg-transparent px-1.5 py-[3px] text-[13.5px] leading-snug text-ink transition hover:border-line2 focus:border-vi-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-vi-100"
              aria-label="Désignation"
            />
            <button onClick={() => h.onEdit(l.id)} className={cn('flex max-w-full items-center gap-1 truncate px-1.5 text-left text-[11.5px] hover:underline', src.bob ? 'text-vi-700' : 'text-ink-3')}>
              {src.icon}
              <span className="truncate">{src.text}</span>
            </button>
          </div>
          <NumInput value={l.quantity} onChange={(v) => h.onChange(l.id, { quantity: v })} ariaLabel="Quantité" />
          <input value={l.unit} onChange={(e) => h.onChange(l.id, { unit: e.target.value })} className="h-8 w-full rounded-md border border-transparent bg-transparent px-1 text-[13px] text-ink-2 hover:border-line2 focus:border-vi-300 focus:bg-white focus:outline-none" aria-label="Unité" />
          <NumInput fixed value={l.unitPriceHt} onChange={(v) => h.onChange(l.id, { unitPriceHt: v, source: l.source === 'bibliotheque' ? 'manuel' : l.source })} ariaLabel="Prix unitaire HT" />
          <select value={l.vatRate} onChange={(e) => h.onChange(l.id, { vatRate: Number(e.target.value) })} className="num h-8 w-full appearance-none rounded-md border border-transparent bg-transparent px-1 text-right text-[12.5px] text-ink-2 hover:border-line2 focus:border-vi-300 focus:outline-none" aria-label="TVA">
            {VAT_RATES.map((r) => (
              <option key={r} value={r}>
                {num(r, 1)} %
              </option>
            ))}
          </select>
          <div className={cn('num text-right text-[13.5px] font-semibold', l.unitPriceHt < 0 && 'text-ok')}>{money(l.quantity * l.unitPriceHt)}</div>
        </>
      )}
      <LineMenu l={l} h={h} />
    </div>
  );
}

function LineMenu({ l, h }: { l: DevisLigne; h: LineHandlers }) {
  return (
    <Menu
      trigger={({ toggle, open }) => (
        <button onClick={toggle} className={cn('grid h-8 w-7 place-items-center rounded-md text-ink-3 transition hover:bg-sub hover:text-ink', !open && 'opacity-0 group-hover:opacity-100 focus:opacity-100')} aria-label="Actions de la ligne">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      )}
      items={[
        { label: 'Modifier le détail', icon: <PenLine />, onClick: () => h.onEdit(l.id) },
        { label: 'Monter', icon: <ArrowUp />, onClick: () => h.onMove(l.id, -1) },
        { label: 'Descendre', icon: <ArrowDown />, onClick: () => h.onMove(l.id, 1) },
        { label: 'Dupliquer', icon: <Copy />, onClick: () => h.onDuplicate(l.id) },
        { label: 'Supprimer', icon: <Trash2 />, onClick: () => h.onRemove(l.id), danger: true, divider: true },
      ]}
    />
  );
}

/** Ligne en carte (téléphone) : un tap ouvre la fiche de la ligne. */
export function LineCard({ l, onOpen }: { l: DevisLigne; onOpen: () => void }) {
  const src = sourceInfo(l);
  if (l.kind === 'texte')
    return (
      <button onClick={onOpen} className="block w-full border-b border-line py-3 text-left text-[13.5px] italic text-ink-2 last:border-b-0">
        {l.designation}
      </button>
    );
  return (
    <button onClick={onOpen} className="flex min-h-[60px] w-full items-center gap-3 border-b border-line py-3 text-left last:border-b-0 active:bg-sub">
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] leading-snug text-ink">{l.designation}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] text-ink-3">
          <span className="num">
            {num(l.quantity)} {l.unit} × {money(l.unitPriceHt)}
          </span>
          <span className={cn('inline-flex max-w-[180px] items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[11px]', src.bob ? 'bg-vi-50 text-vi-700' : 'bg-sub text-ink-2')}>
            {src.icon}
            <span className="truncate">{src.bob ? 'Proposé par Bob' : l.source === 'taux' || l.unit === 'h' ? 'Ton taux' : l.supplier || l.source === 'bibliotheque' ? 'Bibliothèque' : 'Ligne libre'}</span>
          </span>
        </div>
      </div>
      <div className={cn('num shrink-0 text-[15px] font-semibold', l.unitPriceHt < 0 && 'text-ok')}>{money(l.quantity * l.unitPriceHt)}</div>
    </button>
  );
}
