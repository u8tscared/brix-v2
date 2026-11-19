import { ArrowDown, ArrowUp, AudioLines, BookOpen, Box, Cable, ChevronRight, Clock, Copy, Droplets, Fan, Hammer, HardHat, Lightbulb, MoreHorizontal, PaintRoller, PenLine, Percent, Plug, ShieldCheck, Trash2, Truck, Type, Wifi, Zap } from 'lucide-react';
import { IconTile, cn, type HaloTone } from '@/components/ui';
import { BrandSymbol } from '@/components/brand/Logo';
import { money, num } from '@/lib/format';
import type { DevisLigne } from '@/lib/types';
import { Menu, NumInput } from './bits';

export const VAT_RATES = [20, 10, 5.5, 0];

export function sourceInfo(l: DevisLigne): { icon: JSX.Element; text: string; bob?: boolean } {
  if (l.source === 'bob') return { icon: <AudioLines className="h-3 w-3" />, text: l.detail && /bob/i.test(l.detail) ? l.detail : 'Proposé par Brix AI', bob: true };
  if (l.source === 'taux' || l.unit === 'h') return { icon: <Clock className="h-3 w-3" />, text: (l.detail ?? "Main d'œuvre · votre taux").replace(/ton taux/, 'votre taux') };
  if (l.supplierRef || l.supplier) return { icon: <BookOpen className="h-3 w-3" />, text: [l.supplierRef, l.supplier].filter(Boolean).join(' · ') };
  if (l.source === 'bibliotheque') return { icon: <BookOpen className="h-3 w-3" />, text: l.detail ?? 'Bibliothèque de prix' };
  if (l.detail) return { icon: <PenLine className="h-3 w-3" />, text: l.detail };
  return { icon: <PenLine className="h-3 w-3" />, text: 'Ligne libre' };
}

// Familles d'ouvrages reconnues dans la désignation : la pastille dit ce qu'est la ligne.
const FAMILIES: { re: RegExp; tone: HaloTone; icon: () => JSX.Element }[] = [
  { re: /diff[ée]rentiel|protection|terre|équipotent|parafoudre|consuel|conformit|s[ée]curit/i, tone: 'green', icon: () => <ShieldCheck /> },
  { re: /tableau|disjonct|interrupteur|contacteur|triphas|borne|irve|recharge/i, tone: 'violet', icon: () => <Zap /> },
  { re: /prise|rj45|douille/i, tone: 'peach', icon: () => <Plug /> },
  { re: /c[âa]ble|gaine|fil |u1000|r2v|tirage/i, tone: 'amber', icon: () => <Cable /> },
  { re: /led|[ée]clairage|luminaire|spot|hublot|dalle|lumi/i, tone: 'amber', icon: () => <Lightbulb /> },
  { re: /vmc|ventil|clim|pompe à chaleur|pac\b/i, tone: 'cyan', icon: () => <Fan /> },
  { re: /baie|vdi|r[ée]seau|wifi|domotique|box|connect/i, tone: 'blue', icon: () => <Wifi /> },
  { re: /plomb|robinet|eau|ballon|chauffe-eau|wc|lavabo|douche/i, tone: 'blue', icon: () => <Droplets /> },
  { re: /peinture|enduit|sous-couche/i, tone: 'rose', icon: () => <PaintRoller /> },
  { re: /d[ée]pose|d[ée]molition|d[ée]montage|saign[ée]e|per[çc]age/i, tone: 'indigo', icon: () => <Hammer /> },
  { re: /d[ée]placement|livraison|[ée]vacuation|gravats/i, tone: 'neutral', icon: () => <Truck /> },
];

/** Pastille de la ligne : on reconnaît d'un coup d'œil la main-d'œuvre, la famille d'ouvrage, la remise, Brix AI. */
export function lineTile(l: DevisLigne): { tone: HaloTone; icon: JSX.Element } {
  if (l.kind === 'texte') return { tone: 'neutral', icon: <Type /> };
  if (l.unitPriceHt < 0) return { tone: 'green', icon: <Percent /> };
  if (l.source === 'bob') return { tone: 'violet', icon: <BrandSymbol className="!h-[15px] !w-[13px]" /> };
  if (l.kind === 'main_oeuvre' || l.source === 'taux' || l.unit === 'h' || /main[ -]d['’]?(œ|oe)uvre|pose et/i.test(l.designation)) return { tone: 'mag', icon: <HardHat /> };
  const f = FAMILIES.find((x) => x.re.test(l.designation));
  if (f) return { tone: f.tone, icon: f.icon() };
  if (l.kind === 'fourniture' || l.supplier || l.supplierRef) return { tone: 'peach', icon: <Box /> };
  if (l.source === 'manuel' && !l.detail) return { tone: 'blue', icon: <PenLine /> };
  return { tone: 'violet', icon: <Hammer /> };
}

export interface LineHandlers {
  onChange: (id: string, p: Partial<DevisLigne>) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
  onDrop: (dragId: string, beforeId: string) => void;
}

export const LINE_GRID = 'grid-cols-[34px_minmax(0,1fr)_50px_46px_80px_54px_92px_28px]';

/** Chip « Ajouté » qui apparaît avec un ressort sur une ligne qui vient d'arriver. */
function Fresh() {
  return <span className="devis-chip-in pointer-events-none absolute -top-2.5 right-12 inline-flex h-[22px] items-center rounded-full bg-pale-m px-2 text-[11.5px] font-medium text-deep-m shadow-[0_0_0_2px_#fff]">Ajouté</span>;
}

/** Ligne en carte, éditable en place (ordinateur et tablette). La pastille sert de poignée pour déplacer. */
/**
 * Déplacer une ligne au doigt ou à la souris (événements pointeur, fiable sur iPad, contrairement au glisser HTML5).
 * La pastille est la poignée ; au clavier, flèches haut et bas. Cible : la ligne sous le doigt (moitié haute = avant, basse = après).
 */
function startReorder(e: React.PointerEvent<HTMLElement>, id: string, h: LineHandlers) {
  if (e.button !== 0 && e.pointerType === 'mouse') return;
  const handle = e.currentTarget;
  const row = handle.closest<HTMLElement>('[data-line-id]');
  if (!row) return;
  e.preventDefault();
  handle.setPointerCapture(e.pointerId);
  const y0 = e.clientY;
  let moved = false;
  let target: { el: HTMLElement; after: boolean } | null = null;
  let scroll = 0;
  const mark = (t: typeof target) => {
    target?.el.removeAttribute('data-drop');
    target = t;
    target?.el.setAttribute('data-drop', target.after ? 'after' : 'before');
  };
  const move = (ev: PointerEvent) => {
    const dy = ev.clientY - y0 + (window.scrollY - scroll0);
    if (!moved && Math.abs(dy) < 6) return;
    moved = true;
    row.setAttribute('data-dragging', '');
    row.style.transform = `translateY(${dy}px)`;
    const rows = [...document.querySelectorAll<HTMLElement>('[data-line-id]')].filter((r) => r !== row);
    const t = rows.find((r) => {
      const b = r.getBoundingClientRect();
      return ev.clientY >= b.top && ev.clientY <= b.bottom;
    });
    if (t) {
      const b = t.getBoundingClientRect();
      mark({ el: t, after: ev.clientY > b.top + b.height / 2 });
    }
    // Défilement automatique près des bords.
    cancelAnimationFrame(scroll);
    const edge = ev.clientY < 90 ? -10 : ev.clientY > window.innerHeight - 130 ? 10 : 0;
    if (edge) {
      const step = () => {
        window.scrollBy(0, edge);
        scroll = requestAnimationFrame(step);
      };
      scroll = requestAnimationFrame(step);
    }
  };
  const scroll0 = window.scrollY;
  const end = (commit: boolean) => {
    cancelAnimationFrame(scroll);
    handle.removeEventListener('pointermove', move);
    handle.removeEventListener('pointerup', up);
    handle.removeEventListener('pointercancel', cancel);
    row.removeAttribute('data-dragging');
    row.style.transform = '';
    const t = target;
    mark(null);
    if (!commit || !moved || !t) return;
    const ids = [...document.querySelectorAll<HTMLElement>('[data-line-id]')].map((r) => r.dataset.lineId!);
    const ti = ids.indexOf(t.el.dataset.lineId!);
    if (!t.after) return h.onDrop(id, t.el.dataset.lineId!);
    const next = ids.slice(ti + 1).find((x) => x !== id);
    if (next) h.onDrop(id, next);
    else {
      h.onDrop(id, t.el.dataset.lineId!);
      h.onMove(id, 1);
    }
  };
  const up = () => end(true);
  const cancel = () => end(false);
  handle.addEventListener('pointermove', move);
  handle.addEventListener('pointerup', up);
  handle.addEventListener('pointercancel', cancel);
}

/** Ligne en carte, éditable en place (ordinateur et tablette). La pastille sert de poignée pour déplacer. */
export function LineRow({ l, h, fresh }: { l: DevisLigne; h: LineHandlers; fresh?: boolean }) {
  const src = sourceInfo(l);
  const tile = lineTile(l);
  return (
    <div
      data-line-id={l.id}
      className={cn(
        'devis-line group relative grid items-center gap-1.5 rounded-card-sm bg-white py-2 pl-3 pr-1.5 shadow-halo-sm transition-[box-shadow,transform] duration-300 ease-out-quint hover:-translate-y-px hover:shadow-[0_0_0_1px_#e3dcf3,0_10px_24px_-12px_rgba(60,30,120,.18)] focus-within:shadow-[0_0_0_1.5px_#d9ccfb,0_10px_24px_-12px_rgba(60,30,120,.18)]',
        'data-[dragging]:z-10 data-[dragging]:!transition-none data-[dragging]:shadow-lift data-[drop=before]:shadow-[0_-2px_0_#8b5cf6,0_0_0_1px_#f0edf7] data-[drop=after]:shadow-[0_2px_0_#8b5cf6,0_0_0_1px_#f0edf7]',
        LINE_GRID,
        fresh && 'devis-fresh',
      )}
    >
      {fresh && <Fresh />}
      <button
        type="button"
        onPointerDown={(e) => startReorder(e, l.id, h)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            h.onMove(l.id, e.key === 'ArrowUp' ? -1 : 1);
          }
        }}
        className="cursor-grab touch-none rounded-[13px] active:cursor-grabbing"
        aria-label={`Déplacer la ligne ${l.designation || ''} (flèches haut et bas)`}
        title="Glisser pour déplacer"
      >
        <IconTile icon={tile.icon} tone={tile.tone} size="row" className="transition-transform duration-300 ease-spring group-hover:scale-105" />
      </button>
      {l.kind === 'texte' ? (
        <input value={l.designation} onChange={(e) => h.onChange(l.id, { designation: e.target.value })} className="col-span-6 h-9 rounded-[10px] bg-transparent px-2 text-[13.5px] italic text-ink-2 hover:bg-halo-hover focus:bg-white focus:outline-none focus:ring-2 focus:ring-vi-100" aria-label="Texte libre" />
      ) : (
        <>
          <div className="min-w-0">
            <textarea
              rows={1}
              value={l.designation}
              onChange={(e) => h.onChange(l.id, { designation: e.target.value.replace(/\n/g, ' ') })}
              style={{ fieldSizing: 'content' } as React.CSSProperties}
              className="block min-h-[28px] w-full resize-none overflow-hidden rounded-[10px] border border-transparent bg-transparent px-2 py-[3px] text-[14px] font-medium leading-snug tracking-[-0.01em] text-ink transition hover:border-[#ece8f6] focus:border-vi-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-vi-100"
              aria-label="Désignation"
            />
            <button onClick={() => h.onEdit(l.id)} className={cn('flex max-w-full items-center gap-1 truncate px-2 text-left text-[12px] hover:underline', src.bob ? 'text-deep-v' : 'text-ink-3')}>
              {src.icon}
              <span className="truncate">{src.text}</span>
            </button>
          </div>
          <NumInput value={l.quantity} onChange={(v) => h.onChange(l.id, { quantity: v })} ariaLabel="Quantité" />
          <input value={l.unit} onChange={(e) => h.onChange(l.id, { unit: e.target.value })} className="h-8 w-full rounded-md border border-transparent bg-transparent px-1 text-[13px] text-ink-2 hover:border-[#ece8f6] focus:border-vi-300 focus:bg-white focus:outline-none" aria-label="Unité" />
          <NumInput fixed value={l.unitPriceHt} onChange={(v) => h.onChange(l.id, { unitPriceHt: v, source: l.source === 'bibliotheque' ? 'manuel' : l.source })} ariaLabel="Prix unitaire HT" />
          <select value={l.vatRate} onChange={(e) => h.onChange(l.id, { vatRate: Number(e.target.value) })} className="num h-8 w-full appearance-none rounded-md border border-transparent bg-transparent px-1 text-right text-[12.5px] text-ink-3 hover:border-[#ece8f6] focus:border-vi-300 focus:outline-none" aria-label="TVA">
            {VAT_RATES.map((r) => (
              <option key={r} value={r}>
                {num(r, 1)} %
              </option>
            ))}
          </select>
          <div className={cn('num pr-1 text-right text-[14px] font-semibold tracking-[-0.01em]', l.unitPriceHt < 0 && 'text-deep-g')}>{money(l.quantity * l.unitPriceHt)}</div>
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
        <button onClick={toggle} className={cn('grid h-8 w-7 place-items-center rounded-full text-ink-3 transition hover:bg-halo-hover hover:text-ink', !open && 'opacity-0 focus:opacity-100 group-hover:opacity-100 touch:opacity-100')} aria-label="Actions de la ligne">
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
export function LineCard({ l, onOpen, fresh }: { l: DevisLigne; onOpen: () => void; fresh?: boolean }) {
  const src = sourceInfo(l);
  const tile = lineTile(l);
  if (l.kind === 'texte')
    return (
      <button onClick={onOpen} className="block w-full rounded-card-sm bg-white/60 px-4 py-3 text-left text-[13.5px] italic text-ink-2 shadow-[0_0_0_1px_#f0edf7]">
        {l.designation}
      </button>
    );
  return (
    <button onClick={onOpen} className={cn('devis-line relative flex min-h-[64px] w-full items-center gap-3 rounded-card-sm bg-white px-3.5 py-3 text-left shadow-halo-sm transition active:scale-[.985]', fresh && 'devis-fresh')}>
      {fresh && <Fresh />}
      <IconTile icon={tile.icon} tone={tile.tone} size="row" />
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-medium leading-snug tracking-[-0.01em] text-ink">{l.designation}</div>
        <div className={cn('num mt-0.5 truncate text-[12.5px]', src.bob ? 'text-deep-v' : 'text-ink-3')}>
          {num(l.quantity)} {l.unit} × {money(l.unitPriceHt)}
        </div>
      </div>
      <div className={cn('num shrink-0 text-[15px] font-semibold tracking-[-0.01em]', l.unitPriceHt < 0 && 'text-deep-g')}>{money(l.quantity * l.unitPriceHt)}</div>
      <ChevronRight className="-mr-1 h-4 w-4 shrink-0 text-[#c9c4d9]" />
    </button>
  );
}
