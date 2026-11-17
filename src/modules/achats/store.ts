// Store local du département Achats (zustand persisté), en attendant le worker.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dayOffset, uid } from '@/lib/format';
import { demoArticles, demoMovements, demoSubs, demoTools, demoVehicles, type Article, type LocationKey, type Movement, type SubContractor, type Tool, type Vehicle } from './data';

interface AchatsState {
  articles: Article[];
  movements: Movement[];
  vehicles: Vehicle[];
  tools: Tool[];
  subs: SubContractor[];

  moveStock: (m: Omit<Movement, 'id' | 'date'>) => void;
  setCount: (articleId: string, loc: LocationKey, qty: number) => void;
  upsertVehicle: (v: Vehicle) => void;
  upsertTool: (t: Tool) => void;
  upsertSub: (s: SubContractor) => void;
  resetDemo: () => void;
}

const initial = () => ({ articles: demoArticles(), movements: demoMovements(), vehicles: demoVehicles(), tools: demoTools(), subs: demoSubs() });
const replace = <T extends { id: string }>(list: T[], item: T) => (list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list]);

export const useAchats = create<AchatsState>()(
  persist(
    (set) => ({
      ...initial(),
      moveStock: (m) =>
        set((s) => ({
          movements: [{ ...m, id: uid('m'), date: dayOffset(0) }, ...s.movements],
          articles: s.articles.map((a) => {
            if (a.id !== m.articleId) return a;
            const qty = { ...a.qty };
            if (m.kind === 'entree') qty[m.from] += m.qty;
            else qty[m.from] = Math.max(0, qty[m.from] - m.qty);
            if (m.kind === 'transfert' && m.to) qty[m.to] += m.qty;
            return { ...a, qty };
          }),
        })),
      setCount: (id, loc, qty) => set((s) => ({ articles: s.articles.map((a) => (a.id === id ? { ...a, qty: { ...a.qty, [loc]: qty } } : a)) })),
      upsertVehicle: (v) => set((s) => ({ vehicles: replace(s.vehicles, v) })),
      upsertTool: (t) => set((s) => ({ tools: replace(s.tools, t) })),
      upsertSub: (x) => set((s) => ({ subs: replace(s.subs, x) })),
      resetDemo: () => set(initial()),
    }),
    { name: 'brix-v2-achats', version: 1 },
  ),
);

export const totalQty = (a: Article) => a.qty.depot + a.qty.van_yanis + a.qty.van_mehdi;
/** Article à réapprovisionner : dépôt sous le seuil, ou camion sous son seuil sans réserve au dépôt. */
export const isLow = (a: Article) => a.qty.depot < a.min;
export const vanLow = (a: Article, loc: LocationKey) => loc !== 'depot' && a.vanMin > 0 && a.qty[loc] < a.vanMin;
