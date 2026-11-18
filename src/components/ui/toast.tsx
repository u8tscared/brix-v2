import { createPortal } from 'react-dom';
import { create } from 'zustand';
import { AlertTriangle, Info } from 'lucide-react';
import { SuccessDot } from '@/components/motion';
import { cn } from './cn';

interface ToastItem { id: number; text: string; tone: 'ok' | 'info' | 'warn'; action?: { label: string; run: () => void }; leaving?: boolean; duration?: number }
const useToasts = create<{ items: ToastItem[]; push: (t: Omit<ToastItem, 'id'>) => void; drop: (id: number) => void }>((set, get) => ({
  items: [],
  push: (t) => {
    const id = Date.now() + Math.random();
    set((s) => ({ items: [...s.items.slice(-2), { ...t, id }] }));
    const d = t.duration ?? 4000;
    if (d > 0) setTimeout(() => get().drop(id), d);
  },
  drop: (id) => {
    set((s) => ({ items: s.items.map((x) => (x.id === id ? { ...x, leaving: true } : x)) }));
    setTimeout(() => set((s) => ({ items: s.items.filter((x) => x.id !== id) })), 220);
  },
}));

/** Affiche une confirmation discrète en bas de l'écran. */
export const toast = (text: string, tone: ToastItem['tone'] = 'ok', action?: ToastItem['action'], opts?: { duration?: number }) => useToasts.getState().push({ text, tone, action, duration: opts?.duration });

export function Toaster() {
  const { items, drop } = useToasts();
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--toast-b,92px)+var(--safe-b))] z-[90] flex flex-col items-center gap-2 px-4 md:bottom-[calc(var(--toast-b-md,24px)+var(--safe-b))]">
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            'glass-strong pointer-events-auto relative flex min-h-[46px] max-w-md items-center gap-2.5 overflow-hidden rounded-full py-2 pl-2.5 pr-5 text-[13.5px] font-medium text-ink shadow-[inset_0_0_0_1px_rgba(255,255,255,.9),0_1px_2px_rgba(60,30,120,.06),0_18px_40px_-14px_rgba(60,30,120,.32)]',
            t.leaving ? 'animate-[scale-out_.2s_var(--ease)_both]' : 'animate-[toast-in_.45s_var(--spring)_both]',
          )}
        >
          {t.tone === 'ok' ? (
            <SuccessDot size={26} className="bg-[#16a34a] shadow-[0_4px_10px_-3px_rgba(22,163,74,.55)]" />
          ) : (
            <span className={cn('grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full', t.tone === 'warn' ? 'bg-pale-p text-deep-p' : 'bg-pale-v text-deep-v')}>
              {t.tone === 'warn' ? <AlertTriangle className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />}
            </span>
          )}
          <span className="leading-snug">{t.text}</span>
          {t.action && (
            <button className="-mr-2 ml-1 h-8 rounded-full bg-ink px-3 text-[12.5px] font-semibold text-white transition hover:bg-[#241f3f] active:scale-95" onClick={() => { t.action!.run(); drop(t.id); }}>
              {t.action.label}
            </button>
          )}
          {(t.duration ?? 4000) > 0 && <span className="absolute inset-x-6 bottom-0 h-[2px] origin-left rounded-full bg-dawn opacity-50" style={{ animation: `toast-life ${(t.duration ?? 4000) / 1000}s linear both` }} />}
        </div>
      ))}
    </div>,
    document.body,
  );
}
