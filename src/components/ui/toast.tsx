import { create } from 'zustand';
import { CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { cn } from './cn';

interface ToastItem { id: number; text: string; tone: 'ok' | 'info' | 'warn'; action?: { label: string; run: () => void } }
const useToasts = create<{ items: ToastItem[]; push: (t: Omit<ToastItem, 'id'>) => void; drop: (id: number) => void }>((set) => ({
  items: [],
  push: (t) => {
    const id = Date.now() + Math.random();
    set((s) => ({ items: [...s.items.slice(-2), { ...t, id }] }));
    setTimeout(() => set((s) => ({ items: s.items.filter((x) => x.id !== id) })), 3800);
  },
  drop: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
}));

/** Affiche une confirmation discrète en bas de l'écran. */
export const toast = (text: string, tone: ToastItem['tone'] = 'ok', action?: ToastItem['action']) => useToasts.getState().push({ text, tone, action });

export function Toaster() {
  const { items, drop } = useToasts();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(88px+var(--safe-b))] z-[90] flex flex-col items-center gap-2 px-4 lg:bottom-6">
      {items.map((t) => (
        <div key={t.id} className="pointer-events-auto flex max-w-md animate-[fade-up_.25s_ease_both] items-center gap-2.5 rounded-xl bg-ink px-4 py-3 text-[13.5px] text-white shadow-pop">
          {t.tone === 'ok' ? <CheckCircle2 className="h-4 w-4 text-[#4ade80]" /> : t.tone === 'warn' ? <AlertTriangle className="h-4 w-4 text-peach" /> : <Info className="h-4 w-4 text-vi-300" />}
          <span>{t.text}</span>
          {t.action && (
            <button className={cn('ml-2 font-semibold text-vi-300 hover:text-white')} onClick={() => { t.action!.run(); drop(t.id); }}>
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
