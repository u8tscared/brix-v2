// Visionneuse plein écran : flèches, clavier, glisser au doigt, vignettes. Fond nuit, image au centre.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, ShieldCheck, Trash2, X } from 'lucide-react';
import { usePresence } from '@/components/motion';
import { Avatar, cn } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { dateShort } from '@/lib/format';
import type { ChantierPhoto } from '../../store';
import { PHASE_LABEL } from '../../lib/quality';
import { PhotoArt } from './PhotoArt';

export function PhotoViewer({ photos, index, onIndex, onClose, onDelete, label }: { photos: ChantierPhoto[]; index: number | null; onIndex: (i: number) => void; onClose: () => void; onDelete?: (p: ChantierPhoto) => void; label?: (p: ChantierPhoto) => string | undefined }) {
  const open = index !== null && !!photos[index];
  const { mounted, closing } = usePresence(open, 220);
  const employees = useBrix((s) => s.employees);
  const [dir, setDir] = useState<1 | -1>(1);
  const last = useRef<ChantierPhoto | null>(null);
  const touch = useRef<number | null>(null);
  if (open) last.current = photos[index!];
  const p = last.current;
  const i = index ?? 0;

  const go = (d: 1 | -1) => {
    if (!photos.length) return;
    setDir(d);
    onIndex((i + d + photos.length) % photos.length);
  };

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', k);
      document.body.style.overflow = prev;
    };
  });

  if (!mounted || !p) return null;
  const by = employees.find((e) => e.id === p.by);
  const time = p.at.length > 10 ? p.at.slice(11, 16).replace(':', ' h ') : '';

  return createPortal(
    <div className={cn('fixed inset-0 z-[85] flex flex-col bg-[#0d0a1c]/95 text-white backdrop-blur-md', closing ? 'animate-[fade-out_.2s_ease_both]' : 'animate-[fade-in_.25s_ease_both]')} role="dialog" aria-modal="true" aria-label={p.caption}>
      {/* Barre du haut */}
      <div className="flex items-center gap-3 px-4 pb-2 pt-[calc(12px+var(--safe-t,0px))] md:px-6 md:pt-5">
        <span className="num rounded-full bg-white/10 px-2.5 py-1 text-[12px] font-medium text-white/80">
          {i + 1} / {photos.length}
        </span>
        <div className="min-w-0 flex-1 truncate text-[13px] text-white/60">{label?.(p) ?? p.room}</div>
        {onDelete && (
          <button onClick={() => onDelete(p)} className="grid h-10 w-10 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white" aria-label="Supprimer la photo">
            <Trash2 className="h-[18px] w-[18px]" />
          </button>
        )}
        <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:rotate-90 hover:bg-white/20" aria-label="Fermer">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Image */}
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-3 md:px-20"
        onClick={(e) => e.target === e.currentTarget && onClose()}
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch.current === null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          touch.current = null;
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        }}
      >
        <div key={p.id} className={cn('aspect-[4/3] max-h-full w-full max-w-[1000px] overflow-hidden rounded-card-sm bg-black/30 shadow-[0_30px_80px_-20px_rgba(0,0,0,.6)]', dir === 1 ? 'animate-[slide-left_.35s_var(--ease)_both]' : 'animate-[fade-up_.35s_var(--ease)_both]', closing && 'animate-[scale-out_.2s_var(--ease)_both]')}>
          <PhotoArt art={p.art} phase={p.phase} seed={p.id} src={p.src} alt={p.caption} />
        </div>
        {photos.length > 1 && (
          <>
            <button onClick={() => go(-1)} className="absolute left-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 transition hover:bg-white/20 md:grid" aria-label="Photo précédente">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={() => go(1)} className="absolute right-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 transition hover:bg-white/20 md:grid" aria-label="Photo suivante">
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Légende et vignettes */}
      <div className="mx-auto w-full max-w-[1000px] px-4 pb-[calc(16px+var(--safe-b))] pt-4 md:px-6">
        <div key={p.id + 'c'} className="flex animate-fade-up flex-wrap items-center gap-x-4 gap-y-2">
          <div className="min-w-0 flex-1">
            <div className="text-[16px] font-semibold tracking-[-0.02em]">{p.caption}</div>
            <div className="mt-0.5 text-[12.5px] text-white/55">
              {PHASE_LABEL[p.phase]} · {dateShort(p.at.slice(0, 10))}
              {time && ` à ${time}`}
            </div>
          </div>
          {p.tag && (
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[#22c55e]/15 px-2.5 text-[12px] font-medium text-[#86efac]">
              <ShieldCheck className="h-3.5 w-3.5" /> Contrôle qualité
            </span>
          )}
          {by && (
            <span className="flex items-center gap-2 text-[12.5px] text-white/70">
              <Avatar initials={by.initials} color={by.color} size={24} /> {by.firstName}
            </span>
          )}
        </div>
        {photos.length > 1 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {photos.map((x, j) => (
              <button
                key={x.id}
                onClick={() => {
                  setDir(j > i ? 1 : -1);
                  onIndex(j);
                }}
                className={cn('h-12 w-16 shrink-0 overflow-hidden rounded-[8px] transition duration-200', j === i ? 'opacity-100 ring-2 ring-white' : 'opacity-45 hover:opacity-80')}
                aria-label={x.caption}
              >
                <PhotoArt art={x.art} phase={x.phase} seed={x.id + 't'} src={x.src} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
