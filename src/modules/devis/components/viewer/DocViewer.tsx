// Visionneur plein écran d'un devis ou d'une facture : vraies pages A4, zoom, miniatures,
// impression propre et liste de vérification avant envoi. Partagé par Devis et Factures.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, ListChecks, Maximize2, Minus, PenLine, Plus, Printer, Send, X } from 'lucide-react';
import { Button, Kbd, cn, toast } from '@/components/ui';
import { usePresence } from '@/components/motion';
import { useMediaQuery } from '@/components/layout/useMediaQuery';
import { checkScore, type CheckItem, type FixTarget } from '../../checks';
import { DocPages, type DocSpec } from '../doc/PagedDoc';
import { printDoc } from '../doc/print';
import { CheckIcon, CheckList, CheckSummary } from './CheckPanel';
import { useZoom } from './useZoom';

export interface DocViewerProps {
  open: boolean;
  onClose: () => void;
  spec: DocSpec;
  kind: string; // « Devis », « Facture d'acompte »…
  reference: string;
  subtitle?: ReactNode;
  status?: ReactNode;
  checks?: CheckItem[];
  onFix?: (t: FixTarget) => void;
  onEdit?: () => void;
  editLabel?: string;
  onSend?: () => void;
  sendLabel?: string;
}

export function DocViewer(p: DocViewerProps) {
  const { mounted, closing } = usePresence(p.open, 260);
  if (!mounted) return null;
  return createPortal(<Viewer {...p} closing={closing} />, document.body);
}

function Viewer({ onClose, spec, kind, reference, subtitle, status, checks, onFix, onEdit, editLabel = 'Modifier', onSend, sendLabel = 'Envoyer', closing }: DocViewerProps & { closing: boolean }) {
  const phone = !useMediaQuery('(min-width: 768px)');
  const showThumbs = useMediaQuery('(min-width: 1024px)');
  const wideChecks = useMediaQuery('(min-width: 1280px)');
  const canvas = useRef<HTMLDivElement>(null);
  const pages = useRef<(HTMLDivElement | null)[]>([]);
  const [count, setCount] = useState(1);
  const [page, setPage] = useState(0);
  const [checksOpen, setChecksOpen] = useState(false);
  const pad = phone ? 12 : 40;
  const { scale, isFit, live, setZoom, step } = useZoom(canvas, pad, phone ? 2 : 1.15);
  const score = checks ? checkScore(checks) : null;

  const print = () => {
    toast('Choisissez « Enregistrer au format PDF » pour le télécharger', 'info');
    printDoc(spec, `${kind} ${reference}`);
  };
  const goto = (i: number) => {
    const el = pages.current[Math.max(0, Math.min(count - 1, i))];
    if (el && canvas.current) canvas.current.scrollTo({ top: el.offsetTop - pad, behavior: 'smooth' });
  };
  const fix = (t: FixTarget) => {
    onClose();
    setTimeout(() => onFix?.(t), 280);
  };

  // Page visible = celle qui occupe le centre de l'écran.
  const onScroll = () => {
    const el = canvas.current;
    if (!el) return;
    const mid = el.scrollTop + el.clientHeight / 2;
    let best = 0;
    pages.current.forEach((pg, i) => {
      if (pg && pg.offsetTop <= mid) best = i;
    });
    if (best !== page) setPage(best);
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const k = (e: KeyboardEvent) => {
      const typing = /input|textarea|select/i.test((e.target as HTMLElement).tagName);
      const otherDialog = document.querySelectorAll('[role="dialog"]').length > 1;
      if (otherDialog) return;
      if (e.key === 'Escape') onClose();
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        print();
      } else if (typing) return;
      else if (e.key === '+' || e.key === '=') step(1);
      else if (e.key === '-') step(-1);
      else if (e.key === '0') setZoom(null);
      else if (e.key === 'PageDown' || e.key === 'j') goto(page + 1);
      else if (e.key === 'PageUp' || e.key === 'k') goto(page - 1);
    };
    window.addEventListener('keydown', k);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', k);
    };
  });

  const zoomCtl = (
    <div className="flex items-center rounded-full bg-halo-track p-[3px]">
      <IconBtn label="Réduire (-)" onClick={() => step(-1)}>
        <Minus />
      </IconBtn>
      <button onClick={() => setZoom(isFit ? 1 : null)} className="num h-7 min-w-[54px] rounded-full px-1.5 text-[12.5px] font-medium text-ink transition hover:bg-white" title={isFit ? 'Taille réelle' : 'Ajuster à la largeur (0)'}>
        {Math.round(scale * live * 100)} %
      </button>
      <IconBtn label="Agrandir (+)" onClick={() => step(1)}>
        <Plus />
      </IconBtn>
      <span className="mx-0.5 h-4 w-px bg-[#dcd6ea]" />
      <IconBtn label="Ajuster à la largeur (0)" onClick={() => setZoom(null)} active={isFit}>
        <Maximize2 />
      </IconBtn>
    </div>
  );

  const pageNav = count > 1 && (
    <div className="flex items-center gap-0.5 text-[12.5px] text-ink-2">
      <IconBtn label="Page précédente" onClick={() => goto(page - 1)} disabled={page === 0}>
        <ChevronUp />
      </IconBtn>
      <span className="num min-w-[52px] text-center">
        <b className="font-semibold text-ink">{page + 1}</b> / {count}
      </span>
      <IconBtn label="Page suivante" onClick={() => goto(page + 1)} disabled={page >= count - 1}>
        <ChevronDown />
      </IconBtn>
    </div>
  );

  return (
    <div role="dialog" aria-modal="true" aria-label={`Aperçu ${kind} ${reference}`} className={cn('fixed inset-0 isolate z-[75] flex flex-col overflow-hidden bg-[#f3f0fa]', closing ? 'animate-[fade-out_.24s_ease_both]' : 'animate-[fade-in_.25s_ease_both]')}>
      {/* Halo Aube diffus derrière les pages */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-40 -top-56 h-[460px] w-[680px] rounded-full bg-[radial-gradient(closest-side,#e9b8f5,transparent)] opacity-60 blur-[70px]" />
        <div className="absolute -top-64 right-[30%] h-[400px] w-[560px] rounded-full bg-[radial-gradient(closest-side,#c7b4fb,transparent)] opacity-55 blur-[70px]" />
        <div className="absolute -bottom-40 -left-24 h-[360px] w-[520px] rounded-full bg-[radial-gradient(closest-side,#ffd9bc,transparent)] opacity-45 blur-[80px]" />
      </div>
      {/* Barre du haut : pilule de verre */}
      <div className="relative z-[2] shrink-0 px-2 pt-2 md:px-3 md:pt-3">
      <header className={cn('glass flex h-14 items-center gap-2 rounded-full px-1.5 md:h-[60px] md:gap-3 md:rounded-[22px] md:px-2.5', !closing && 'animate-[fade-in_.3s_ease_both]')}>
        <button onClick={onClose} aria-label="Fermer l’aperçu" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-2 transition duration-300 ease-spring hover:rotate-90 hover:bg-white hover:text-ink hover:shadow-pill md:h-10 md:w-10">
          <X className="h-[18px] w-[18px]" />
        </button>
        <div className="min-w-0 flex-1 md:flex-none">
          <div className="flex items-center gap-2">
            <span className="truncate text-[14px] font-semibold tracking-[-0.015em]">{kind}</span>
            <span className="font-mono text-[12.5px] text-ink-2">{reference}</span>
            <span className="hidden sm:inline-flex">{status}</span>
          </div>
          {subtitle && <div className="truncate text-[12px] text-ink-3">{subtitle}</div>}
        </div>
        <div className="hidden flex-1 items-center justify-center gap-3 md:flex">
          {pageNav}
          {zoomCtl}
        </div>
        {score && !wideChecks && (
          <button onClick={() => setChecksOpen(true)} className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-white/70 px-3 text-[13px] font-medium text-ink shadow-[0_0_0_1px_#ece8f6] transition hover:bg-white max-md:hidden" aria-label="Vérification avant envoi">
            {score.bad + score.warn ? <CheckIcon state={score.bad ? 'bad' : 'warn'} /> : <CheckIcon state="ok" />}
            <span className="num">
              {score.ok}/{score.total}
            </span>
            <span className="hidden lg:inline">vérifiés</span>
          </button>
        )}
        <div className="hidden items-center gap-2 md:flex">
          {onEdit && (
            <Button variant="secondary" size="sm" icon={<PenLine />} onClick={() => (onClose(), setTimeout(onEdit, 200))}>
              {editLabel}
            </Button>
          )}
          <Button variant="secondary" size="sm" icon={<Printer />} onClick={print} kbd="⌘P">
            Imprimer
          </Button>
          {onSend && (
            <Button variant="dawn" size="sm" icon={<Send />} onClick={onSend}>
              {sendLabel}
            </Button>
          )}
        </div>
      </header>
      </div>

      <div className="relative flex min-h-0 flex-1">
        {/* Miniatures */}
        {showThumbs && count > 1 && (
          <nav aria-label="Pages" className="w-[132px] shrink-0 overflow-y-auto px-4 py-5" onClick={(e) => {
            const el = (e.target as HTMLElement).closest('[data-page]');
            if (el) goto(Number(el.getAttribute('data-page')));
          }}>
            <div className="[&_[data-page]]:cursor-pointer [&_[data-page]]:rounded-[3px] [&_[data-page]]:ring-offset-2 [&_[data-page]]:ring-offset-[#f3f0fa] [&_[data-page]]:transition-shadow [&_[data-page]]:duration-300">
              <style>{`[data-thumbs] [data-page="${page}"]{box-shadow:0 0 0 2px #fff,0 0 0 4px #c084fc;}`}</style>
              <div data-thumbs>
                <DocPages spec={spec} scale={100 / 794} gap={30} pageClassName="shadow-[0_1px_2px_rgba(60,30,120,.1),0_6px_14px_-6px_rgba(60,30,120,.2)] bg-white" />
              </div>
            </div>
          </nav>
        )}

        {/* Pages */}
        <div ref={canvas} onScroll={onScroll} className="relative min-w-0 flex-1 touch-pan-x touch-pan-y overflow-auto overscroll-contain" style={{ padding: `${phone ? 14 : 32}px ${pad}px ${phone ? 110 : 48}px` }}>
          <div className="mx-auto w-fit" style={{ transform: live !== 1 ? `scale(${live})` : undefined, transformOrigin: 'top center', transition: live === 1 ? 'transform .2s var(--ease)' : undefined }}>
            <DocPages
              spec={spec}
              scale={scale}
              gap={phone ? 12 : 28}
              animate
              onCount={setCount}
              pageRef={(i, el) => (pages.current[i] = el)}
              pageClassName="rounded-[6px] shadow-[0_1px_2px_rgba(60,30,120,.06),0_30px_60px_-24px_rgba(60,30,120,.35)] overflow-hidden"
            />
          </div>
          {phone && count > 1 && (
            <div className="glass num pointer-events-none fixed left-1/2 top-[74px] z-[3] -translate-x-1/2 rounded-full px-2.5 py-1 text-[11.5px] font-medium text-ink">
              {page + 1} / {count}
            </div>
          )}
        </div>

        {/* Vérification (ordinateur large) */}
        {checks && wideChecks && (
          <aside className="m-3 ml-0 flex w-[360px] shrink-0 animate-[slide-left_.45s_var(--ease)_.1s_both] flex-col overflow-hidden rounded-card bg-white shadow-halo">
            <div className="border-b border-[#f2eff8] px-5 py-5">
              <CheckSummary items={checks} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              <CheckList items={checks} onFix={onFix ? fix : undefined} />
            </div>
            <div className="border-t border-[#f2eff8] px-5 py-3.5 text-[12px] leading-relaxed text-ink-3">
              <span className="inline-flex items-center gap-1.5">
                <Kbd>+</Kbd>
                <Kbd>-</Kbd> zoom · <Kbd>0</Kbd> ajuster · <Kbd>Ctrl</Kbd> + molette
              </span>
            </div>
          </aside>
        )}

        {/* Vérification (tablette, téléphone) : panneau qui monte */}
        {checks && !wideChecks && <ChecksDrawer open={checksOpen} onClose={() => setChecksOpen(false)} items={checks} onFix={onFix ? fix : undefined} phone={phone} />}
      </div>

      {/* Barre d'actions du téléphone */}
      {phone && (
        <div className="absolute inset-x-0 bottom-0 z-[2] animate-[slide-up_.45s_var(--ease)_both] px-3 pb-[calc(10px+var(--safe-b))]">
          <div className="glass-strong flex items-center gap-2 rounded-[26px] p-2">
          {onEdit && (
            <Button variant="secondary" size="icon" aria-label={editLabel} onClick={() => (onClose(), setTimeout(onEdit, 200))} className="h-12 w-12">
              <PenLine />
            </Button>
          )}
          <Button variant="secondary" size="icon" aria-label="Imprimer ou télécharger" onClick={print} className="h-12 w-12">
            <Printer />
          </Button>
          {score && (
            <Button variant="secondary" size="lg" onClick={() => setChecksOpen(true)} className="flex-1 justify-center" icon={<ListChecks />}>
              <span className="num">
                {score.ok}/{score.total}
              </span>
            </Button>
          )}
          {onSend && (
            <Button variant="dawn" size="lg" icon={<Send />} onClick={onSend} className="flex-[1.6] justify-center">
              {sendLabel}
            </Button>
          )}
          </div>
        </div>
      )}
    </div>
  );
}

function ChecksDrawer({ open, onClose, items, onFix, phone }: { open: boolean; onClose: () => void; items: CheckItem[]; onFix?: (t: FixTarget) => void; phone: boolean }) {
  const { mounted, closing } = usePresence(open, 240);
  if (!mounted) return null;
  return (
    <div className="absolute inset-0 z-[4]">
      <div className={cn('absolute inset-0 bg-[#2a1f4d]/15 backdrop-blur-[2px]', closing ? 'animate-[fade-out_.22s_ease_both]' : 'animate-[fade-in_.25s_ease_both]')} onClick={onClose} />
      <div
        className={cn(
          'absolute flex flex-col bg-white shadow-[0_30px_80px_-20px_rgba(60,30,120,.35)]',
          phone ? 'inset-x-2 bottom-2 max-h-[82%] rounded-sheet' : 'bottom-3 right-3 top-3 w-[380px] rounded-sheet',
          closing ? (phone ? 'animate-[slide-down_.24s_var(--ease)_both]' : 'animate-[slide-right-out_.22s_var(--ease)_both]') : phone ? 'animate-[slide-up_.4s_var(--ease)_both]' : 'animate-[slide-left_.35s_var(--ease)_both]',
        )}
      >
        {phone && <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[#dcd6ea]" />}
        <div className="flex items-center gap-3 border-b border-[#f2eff8] px-5 py-4">
          <div className="flex-1">
            <CheckSummary items={items} compact />
          </div>
          <button onClick={onClose} aria-label="Fermer" className="grid h-10 w-10 place-items-center rounded-full text-ink-3 transition hover:bg-halo-hover hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[calc(16px+var(--safe-b))] pt-2">
          <CheckList items={items} onFix={onFix} />
        </div>
      </div>
    </div>
  );
}

function IconBtn({ label, onClick, children, disabled, active }: { label: string; onClick: () => void; children: ReactNode; disabled?: boolean; active?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label} title={label} className={cn('grid h-7 w-7 place-items-center rounded-full text-ink-2 transition hover:bg-white hover:text-ink disabled:opacity-35 [&_svg]:h-3.5 [&_svg]:w-3.5', active && 'bg-white text-deep-v shadow-pill')}>
      {children}
    </button>
  );
}

