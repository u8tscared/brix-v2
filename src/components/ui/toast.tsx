import { create } from 'zustand';
import { AlertTriangle, Info } from 'lucide-react';
import { SuccessDot } from '@/components/motion';
import { cn } from './cn';

interface ToastItem { id: number; text: string; tone: 'ok' | 'info' | 'warn'; action?: { label: string; run: () => void }; leaving?: boolean }
const useToasts = create<{ items: ToastItem[]; push: (t: Omit<ToastItem, 'id'>) => void; drop: (id: number) => void }>((set, get) => ({
  items: [],
  push: (t) => {
    const id = Date.now() + Math.random();
    set((s) => ({ items: [...s.items.slice(-2), { ...t, id }] }));
    setTimeout(() => get().drop(id), 4000);
  },
  drop: (id) => {
    set((s) => ({ items: s.items.map((x) => (x.id === id ? { ...x, leaving: true } : x)) }));
    setTimeout(() => set((s) => ({ items: s.items.filter((x) => x.id !== id) })), 220);
  },
}));

/** Affiche une confirmation discrète en bas de l'écran. */
export const toast = (text: string, tone: ToastItem['tone'] = 'ok', action?: ToastItem['action']) => useToasts.getState().push({ text, tone, action });

export function Toaster() {
  const { items, drop } = useToasts();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(92px+var(--safe-b))] z-[90] flex flex-col items-center gap-2 px-4 md:bottom-6">
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            'pointer-events-auto relative flex max-w-md items-center gap-2.5 overflow-hidden rounded-[14px] bg-[#15122a]/95 py-2.5 pl-3 pr-4 text-[13.5px] text-white shadow-pop backdrop-blur-xl',
            t.leaving ? 'animate-[scale-out_.2s_var(--ease)_both]' : 'animate-[toast-in_.45s_var(--spring)_both]',
          )}
        >
          {t.tone === 'ok' ? <SuccessDot size={18} className="bg-[#22c55e]" /> : t.tone === 'warn' ? <AlertTriangle className="h-4 w-4 text-peach" /> : <Info className="h-4 w-4 text-vi-300" />}
          <span className="leading-snug">{t.text}</span>
          {t.action && (
            <button className="ml-1 rounded-md px-1.5 py-0.5 font-semibold text-vi-300 transition hover:bg-white/10 hover:text-white" onClick={() => { t.action!.run(); drop(t.id); }}>
              {t.action.label}
            </button>
          )}
          <span className="absolute inset-x-0 bottom-0 h-[2px] origin-left animate-[toast-life_4s_linear_both] bg-white/20" />
        </div>
      ))}
    </div>
  );
}
