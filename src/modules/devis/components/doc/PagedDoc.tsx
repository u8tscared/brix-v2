// Mise en pages A4 d'un document (devis, facture) : le contenu est découpé en blocs,
// mesurés hors écran, puis rangés page par page comme dans le PDF envoyé au client.
// Une page fait 794 × 1123 px, soit un A4 exact à 96 ppp : même rendu à l'écran et à l'impression.

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';

export const PAGE_W = 794;
export const PAGE_H = 1123;
const PAD_X = 56;
const PAD_T = 48;
const PAD_B = 30;
const FOOTER_H = 30;
const RUNNING_H = 44;
export const CONTENT_W = PAGE_W - PAD_X * 2;

export interface DocBlock {
  key: string;
  node: ReactNode;
  /** Espace avant le bloc (ignoré en haut de page). */
  gap?: number;
  /** Ligne de tableau : l'en-tête du tableau est répété en haut de chaque page. */
  row?: boolean;
  /** Ne jamais laisser ce bloc seul en bas de page (titre de lot). */
  keepWithNext?: boolean;
}

export interface DocSpec {
  blocks: DocBlock[];
  tableHead?: ReactNode;
  /** Petit rappel en haut des pages 2 et suivantes. */
  running?: ReactNode;
  footer: (page: number, total: number) => ReactNode;
}

type Item = { i: number; gap: number; head: boolean };

function paginate(spec: DocSpec, heights: number[], headH: number): Item[][] {
  const pages: Item[][] = [[]];
  let used = 0;
  const avail = (p: number) => PAGE_H - PAD_T - PAD_B - FOOTER_H - (p > 0 ? RUNNING_H : 0);
  const cost = (i: number, top: boolean, prevRow: boolean) => {
    const b = spec.blocks[i];
    const head = !!b.row && !!spec.tableHead && (top || !prevRow);
    const gap = top ? 0 : b.gap ?? 0;
    return { head, gap, h: gap + (head ? headH : 0) + (heights[i] ?? 0) };
  };
  spec.blocks.forEach((b, i) => {
    let page = pages[pages.length - 1];
    const prevRow = page.length > 0 && !!spec.blocks[page[page.length - 1].i].row;
    let c = cost(i, used === 0, prevRow);
    let need = c.h;
    if (b.keepWithNext && i + 1 < spec.blocks.length) need += (spec.blocks[i + 1].gap ?? 0) + (heights[i + 1] ?? 0);
    if (used > 0 && used + need > avail(pages.length - 1)) {
      page = [];
      pages.push(page);
      used = 0;
      c = cost(i, true, false);
    }
    page.push({ i, gap: c.gap, head: c.head });
    used += c.h;
  });
  return pages;
}

/** Calcule la mise en pages (mesure hors écran) et rend les pages. */
export function usePages(spec: DocSpec) {
  const measure = useRef<HTMLDivElement>(null);
  const [m, setM] = useState<{ heights: number[]; head: number } | null>(null);
  const [fontsTick, setFontsTick] = useState(0);
  useEffect(() => {
    let alive = true;
    document.fonts?.ready.then(() => alive && setFontsTick((t) => t + 1));
    return () => {
      alive = false;
    };
  }, []);
  useLayoutEffect(() => {
    const el = measure.current;
    if (!el) return;
    const heights = Array.from(el.querySelectorAll<HTMLElement>(':scope > [data-b]')).map((n) => n.offsetHeight);
    const head = el.querySelector<HTMLElement>(':scope > [data-head]')?.offsetHeight ?? 0;
    if (!m || m.head !== head || heights.length !== m.heights.length || heights.some((h, i) => h !== m.heights[i])) setM({ heights, head });
  });
  void fontsTick;
  const pages = useMemo(() => (m && m.heights.length === spec.blocks.length ? paginate(spec, m.heights, m.head) : null), [m, spec]);
  const measurer = (
    <div ref={measure} aria-hidden style={{ position: 'absolute', left: -20000, top: 0, width: CONTENT_W, visibility: 'hidden', pointerEvents: 'none' }} className="pdf-doc font-sans text-[11.5px] leading-[1.45] text-[#1d1d27]">
      {spec.tableHead && <div data-head>{spec.tableHead}</div>}
      {spec.blocks.map((b) => (
        <div key={b.key} data-b>
          {b.node}
        </div>
      ))}
    </div>
  );
  return { pages, measurer };
}

/** Une page A4 à taille réelle. */
export function DocPage({ spec, items, index, total, style, className }: { spec: DocSpec; items: Item[]; index: number; total: number; style?: CSSProperties; className?: string }) {
  return (
    <div className={`doc-page pdf-doc relative overflow-hidden bg-white font-sans text-[11.5px] leading-[1.45] text-[#1d1d27] ${className ?? ''}`} style={{ width: PAGE_W, height: PAGE_H, padding: `${PAD_T}px ${PAD_X}px ${PAD_B}px`, ...style }}>
      {index > 0 && spec.running && <div style={{ height: RUNNING_H }}>{spec.running}</div>}
      {items.map((it) => (
        <div key={spec.blocks[it.i].key} style={{ paddingTop: it.gap }}>
          {it.head && spec.tableHead}
          {spec.blocks[it.i].node}
        </div>
      ))}
      <div className="absolute inset-x-0 bottom-0" style={{ padding: `0 ${PAD_X}px ${PAD_B - 8}px`, height: FOOTER_H + PAD_B - 8 }}>
        {spec.footer(index + 1, total)}
      </div>
    </div>
  );
}

/**
 * Pages empilées à l'échelle voulue. `pageRef` permet au visionneur de suivre la page visible.
 */
export function DocPages({ spec, scale = 1, gap = 24, pageClassName, onCount, pageRef, animate }: { spec: DocSpec; scale?: number; gap?: number; pageClassName?: string; onCount?: (n: number) => void; pageRef?: (i: number, el: HTMLDivElement | null) => void; animate?: boolean }) {
  const { pages, measurer } = usePages(spec);
  const n = pages?.length ?? 0;
  useEffect(() => {
    if (n) onCount?.(n);
  }, [n]);
  return (
    <>
      {measurer}
      <div className="flex flex-col items-center" style={{ gap }}>
        {(pages ?? [[]]).map((items, i) => (
          <div
            key={i}
            ref={(el) => pageRef?.(i, el)}
            data-page={i}
            className={`${animate ? 'animate-[fade-up_.5s_var(--ease)_both]' : ''} ${pageClassName ?? ''}`}
            style={{ width: PAGE_W * scale, height: PAGE_H * scale, animationDelay: animate ? `${80 + i * 70}ms` : undefined }}
          >
            <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: PAGE_W, height: PAGE_H }}>
              {pages ? <DocPage spec={spec} items={items} index={i} total={n} /> : <div className="bg-white" style={{ width: PAGE_W, height: PAGE_H }} />}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
