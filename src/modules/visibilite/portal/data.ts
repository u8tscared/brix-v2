// Données du portail client public (/p/:token).
// En démo, le jeton « demo » ouvre le chantier Lefèvre ; si le navigateur n'a pas chargé la démo,
// on lit directement les données de démonstration. Vraie version : GET /api/portail/:token (worker).
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as demo from '@/lib/demo';
import { dayOffset, totals } from '@/lib/format';
import { useBrix } from '@/lib/store';

export function usePortalData(_token: string) {
  const s = useBrix();
  const has = s.chantiers.some((c) => c.id === 'ch_lefevre');
  const src = has ? s : { company: demo.demoCompany, chantiers: demo.demoChantiers, clients: demo.demoClients, devis: demo.demoDevis, factures: demo.demoFactures, employees: demo.demoEmployees, events: demo.demoEvents };
  const chantier = src.chantiers.find((c) => c.id === 'ch_lefevre') ?? demo.demoChantiers[0];
  const client = src.clients.find((c) => c.id === chantier.clientId) ?? demo.demoClients[0];
  const devis = src.devis.find((d) => d.id === chantier.devisId);
  const factures = src.factures.filter((f) => f.chantierId === chantier.id);
  const team = chantier.team.map((id) => src.employees.find((e) => e.id === id)).filter(Boolean) as typeof src.employees;
  const next = src.events.filter((e) => e.chantierId === chantier.id && e.date > dayOffset(0)).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const nextDate = next[0]?.date;
  const nextTeam = next.filter((e) => e.date === nextDate).map((e) => src.employees.find((x) => x.id === e.employeeId)).filter((v, i, a) => v && a.indexOf(v) === i) as typeof src.employees;
  const devisTtc = devis ? totals(devis.lines).ttc : 0;
  const situation = { id: 'portal_sit1', number: 'F-2026-206', title: 'Situation n°1 · 40 % des travaux', amount: Math.round(devisTtc * 0.4 * 100) / 100, dueDate: dayOffset(14) };
  return { company: src.company, chantier, client, devis, devisTtc, factures, team, next: next[0], nextTeam, situation };
}

export interface ChatMsg { id: string; from: 'client' | 'pro'; text: string; at: string }

interface PortalLocal {
  paid: string[];
  review: { rating: number; text: string } | null;
  messages: ChatMsg[];
  pay: (id: string) => void;
  setReview: (r: { rating: number; text: string }) => void;
  addMessage: (m: ChatMsg) => void;
}

const ts = (d: number, h: string) => `${dayOffset(d)}T${h}`;

export const usePortalLocal = create<PortalLocal>()(
  persist(
    (set) => ({
      paid: [],
      review: null,
      messages: [
        { id: 'm1', from: 'pro', text: 'Bonjour Madame Lefèvre, les saignées du séjour sont terminées. Je vous ai mis les photos. On attaque les spots demain.', at: ts(-1, '18:10') },
        { id: 'm2', from: 'client', text: 'Super, merci ! Est-ce qu\'on peut ajouter une prise USB à côté du lit ?', at: ts(-1, '20:42') },
        { id: 'm3', from: 'pro', text: 'Bien sûr, c\'est 48 € posée. Je l\'ajoute et je vous envoie le petit avenant à signer ici.', at: ts(0, '07:35') },
      ],
      pay: (id) => set((s) => ({ paid: [...s.paid, id] })),
      setReview: (review) => set({ review }),
      addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
    }),
    { name: 'brix-v2-portail-client', version: 1 },
  ),
);

/** Paiement en ligne. Vraie version : Stripe Checkout / virement instantané via le worker (POST /api/portail/pay). */
export async function payInvoice(_id: string, _method: 'card' | 'apple' | 'virement') {
  await new Promise((r) => setTimeout(r, 1600));
  return { ok: true, demo: true };
}
