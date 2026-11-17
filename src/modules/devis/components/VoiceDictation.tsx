import { useEffect, useMemo, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Check, ChevronLeft, Clock, Mic, Pause, RotateCcw } from 'lucide-react';
import { Button, cn } from '@/components/ui';
import { money, num, pct, totals } from '@/lib/format';
import type { DevisLigne } from '@/lib/types';
import type { LibTrade } from '../library';
import { useDictation } from '../useDictation';
import { chunksToLines, parseDictation, type VoiceChunk } from '../voiceParser';

interface Props {
  open: boolean;
  onClose: () => void;
  onInsert: (lines: (DevisLigne & { lot: string })[]) => void;
  hourlyRate: number;
  vatRate: number;
  trade?: LibTrade;
  subtitle: string;
  fullscreen: boolean;
}

/** Phrase dictée, avec les morceaux reconnus surlignés au fur et à mesure. */
function Highlighted({ text, chunks, interim }: { text: string; chunks: VoiceChunk[]; interim: string }) {
  const parts: ReactNode[] = [];
  let at = 0;
  chunks.forEach((c, i) => {
    if (!c.item) return;
    if (c.start > at) parts.push(<span key={`t${i}`}>{text.slice(at, c.start)}</span>);
    parts.push(
      <mark key={`m${i}`} className="animate-[fade-up_.25s_ease_both] rounded-[3px] bg-vi-50 px-0.5 text-vi-700 underline decoration-vi-300 decoration-2 underline-offset-4">
        {text.slice(c.start, c.end)}
      </mark>,
    );
    at = c.end;
  });
  parts.push(<span key="end">{text.slice(at)}</span>);
  return (
    <p className="text-[17px] leading-[1.6] text-ink md:text-[16px]">
      {parts}
      {interim && <span className="text-ink-3"> {interim}</span>}
      <span className="ml-0.5 inline-block h-[18px] w-[2px] translate-y-[3px] animate-pulse bg-vi-500" />
    </p>
  );
}

function Wave({ on }: { on: boolean }) {
  return (
    <div className="flex h-6 items-center gap-[3px]" aria-hidden>
      {Array.from({ length: 7 }).map((_, i) => (
        <i key={i} className={cn('block w-[3px] rounded-full bg-vi-300', on ? 'h-6 animate-wave' : 'h-1.5')} style={{ animationDelay: `${(i * 0.13) % 0.8}s` }} />
      ))}
    </div>
  );
}

export function VoiceDictation({ open, onClose, onInsert, hourlyRate, vatRate, trade, subtitle, fullscreen }: Props) {
  const dict = useDictation();
  useEffect(() => {
    if (open) dict.start();
    else dict.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const chunks = useMemo(() => parseDictation(dict.text, trade), [dict.text, trade]);
  const lines = useMemo(() => chunksToLines(chunks, { hourlyRate, vatRate }), [chunks, hourlyRate, vatRate]);
  const t = totals(lines);
  const groups = useMemo(() => {
    const m = new Map<string, typeof lines>();
    lines.forEach((l) => m.set(l.lot, [...(m.get(l.lot) ?? []), l]));
    return [...m.entries()];
  }, [lines]);
  if (!open) return null;

  const listening = dict.status === 'listening';
  const mm = `${String(Math.floor(dict.elapsed / 60)).padStart(2, '0')}:${String(dict.elapsed % 60).padStart(2, '0')}`;
  const validate = () => {
    dict.finish();
    onInsert(lines);
  };

  const body = (
    <div className={cn('flex min-h-0 flex-1 flex-col gap-3', fullscreen ? 'overflow-y-auto px-4 pb-4' : '')}>
      <div className="rounded-2xl border border-line bg-white p-4">
        <div className="mb-1.5 flex items-center justify-between text-[12px] text-ink-3">
          <span>Tu dictes</span>
          <span>{dict.demo ? 'Dictée de démonstration' : 'Bob structure en direct'}</span>
        </div>
        {dict.text || dict.interim ? <Highlighted text={dict.text} chunks={chunks} interim={dict.interim} /> : <p className="text-[16px] leading-relaxed text-ink-3">Parle normalement : « trois prises, deux différentiels 30 mA type A, huit disjoncteurs 16 A et six heures de pose ».</p>}
      </div>

      {groups.map(([lot, ls]) => (
        <div key={lot} className="rounded-2xl border border-line bg-white px-4 py-1">
          <div className="flex items-center justify-between py-2.5 text-[13px]">
            <b className="font-semibold">{lot}</b>
            <span className="text-ink-3">
              {ls.length} ligne{ls.length > 1 ? 's' : ''}
            </span>
          </div>
          {ls.map((l, i) => (
            <div key={`${l.designation}-${i}`} className="flex animate-[fade-up_.3s_ease_both] items-center gap-3 border-t border-line py-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px]">{l.designation}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-ink-3">
                  <span className="num">
                    {l.supplierRef?.split(' ')[0] ?? 'Brix'} · {num(l.quantity)} {l.unit} × {money(l.unitPriceHt)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-sub px-1.5 py-px text-[10.5px] text-ink-2">
                    {l.source === 'taux' ? <Clock className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}
                    {l.source === 'taux' ? 'Ton taux' : 'Bibliothèque'}
                  </span>
                </div>
              </div>
              <span className="num shrink-0 text-[14px] font-semibold">{money(l.quantity * l.unitPriceHt)}</span>
            </div>
          ))}
        </div>
      ))}

      {lines.length > 0 && (
        <div className="flex items-end justify-between rounded-2xl border border-line bg-white px-4 py-3">
          <div>
            <div className="text-[12px] text-ink-3">Total HT</div>
            <div className="num font-display text-[24px] font-semibold leading-tight">{money(t.ht)}</div>
          </div>
          <div className="num text-right text-[12px] text-ink-2">
            TVA {pct(vatRate, vatRate % 1 ? 1 : 0)} · {money(t.tva)}
            <div className="font-semibold text-ink">TTC {money(t.ttc)}</div>
          </div>
        </div>
      )}
    </div>
  );

  const controls = (
    <div className="shrink-0">
      <div className="flex items-center justify-center gap-5 py-3">
        <button onClick={listening ? dict.pause : dict.reset} className="grid h-12 w-12 place-items-center rounded-full border border-line2 bg-white text-ink shadow-card" aria-label={listening ? 'Pause' : 'Recommencer'}>
          {listening ? <Pause className="h-5 w-5" /> : <RotateCcw className="h-5 w-5" />}
        </button>
        <Wave on={listening} />
        <button onClick={listening ? dict.pause : dict.start} className={cn('grid h-[72px] w-[72px] place-items-center rounded-full bg-dawn text-white shadow-dawn transition active:scale-95', listening && 'ring-[6px] ring-mag/15')} aria-label={listening ? 'Arrêter d’écouter' : 'Reprendre la dictée'}>
          <Mic className="h-7 w-7" />
        </button>
        <Wave on={listening} />
        <button onClick={validate} disabled={!lines.length} className="grid h-12 w-12 place-items-center rounded-full bg-ink text-white shadow-card disabled:opacity-40" aria-label="Ajouter au devis">
          <Check className="h-5 w-5" />
        </button>
      </div>
      <div className="pb-1 text-center text-[12.5px] text-ink-3">
        {listening ? 'Bob écoute · parle normalement' : dict.status === 'done' ? `${lines.length} ligne${lines.length > 1 ? 's' : ''} prête${lines.length > 1 ? 's' : ''} · touche la coche pour les ajouter` : 'En pause'}
        {dict.demo && <span className="block text-[11.5px]">Micro indisponible ici : dictée de démonstration</span>}
      </div>
    </div>
  );

  if (fullscreen)
    return createPortal(
      <div className="fixed inset-0 z-[85] flex animate-[fade-up_.25s_ease_both] flex-col bg-page pb-[var(--safe-b)] pt-safe">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-card" aria-label="Fermer la dictée">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <div className="text-[16px] font-semibold">Dicter le devis</div>
            <div className="truncate text-[12px] text-ink-3">{subtitle}</div>
          </div>
          <span className="num inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3 text-[13px] font-semibold shadow-card">
            <i className={cn('h-2 w-2 rounded-full', listening ? 'animate-pulse bg-[#f43f5e]' : 'bg-ink-3')} />
            {mm}
          </span>
        </div>
        {body}
        {controls}
      </div>,
      document.body,
    );

  return createPortal(
    <div className="fixed inset-0 z-[80] grid place-items-center p-4">
      <div className="absolute inset-0 animate-[fade-up_.2s_ease_both] bg-[#17171f]/30 backdrop-blur-[2px]" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Dicter le devis" className="relative flex max-h-[88dvh] w-[600px] max-w-full animate-scale-in flex-col gap-3 rounded-[20px] bg-page p-5 shadow-pop">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[17px] font-semibold">Dicter à Bob</div>
            <div className="truncate text-[12.5px] text-ink-3">{subtitle} · les lignes rejoignent les bons lots</div>
          </div>
          <span className="num inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-[12.5px] font-semibold shadow-card">
            <i className={cn('h-2 w-2 rounded-full', listening ? 'animate-pulse bg-[#f43f5e]' : 'bg-ink-3')} />
            {mm}
          </span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fermer
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
        {controls}
      </div>
    </div>,
    document.body,
  );
}
