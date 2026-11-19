import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { money } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { useUI } from '@/lib/ui';
import type { CockpitData } from '../useCockpitData';

export interface TodayItem {
  key: string;
  kind: 'chantier' | 'devis' | 'argent' | 'demande' | 'equipe';
  title: string;
  sub: string;
  /** Petite phrase de Brix AI (il tutoie). */
  bob?: string;
  progress?: number;
  action: { label: string; icon: 'phone' | 'send' | 'open' | 'route'; run: () => void };
  open: () => void;
}

const storeKey = (day: string) => `brix-today-${day}`;
const read = (day: string): Record<string, boolean> => {
  try {
    return JSON.parse(localStorage.getItem(storeKey(day)) || '{}');
  } catch {
    return {};
  }
};

/** Les 3 à 5 choses concrètes qui comptent aujourd'hui, et leur état coché (gardé pour la journée). */
export function useTodayItems(data: CockpitData) {
  const navigate = useNavigate();
  const ui = useUI();
  const clients = useBrix((s) => s.clients);
  const employees = useBrix((s) => s.employees);
  const [done, setDone] = useState<Record<string, boolean>>(() => read(data.today));
  useEffect(() => {
    try {
      localStorage.setItem(storeKey(data.today), JSON.stringify(done));
    } catch {
      /* navigation privée : l'état reste en mémoire */
    }
  }, [done, data.today]);

  const items = useMemo(() => {
    const list: TodayItem[] = [];
    const name = (id: string) => clients.find((c) => c.id === id);
    const tel = (phone?: string) => () => phone && window.open(`tel:${phone.replace(/\s/g, '')}`, '_self');

    // 1. Le chantier où l'on va ce matin.
    const firstSite = data.todayEvents.filter((e) => e.chantierId).sort((a, b) => a.start.localeCompare(b.start))[0];
    const ch = data.activeChantiers.find((c) => c.id === firstSite?.chantierId) ?? data.activeChantiers.find((c) => c.status === 'en_cours');
    if (ch) {
      const crew = [...new Set(data.todayEvents.filter((e) => e.chantierId === ch.id).map((e) => e.employeeId))].map((id) => employees.find((e) => e.id === id)?.firstName).filter(Boolean);
      list.push({
        key: `ch-${ch.id}`,
        kind: 'chantier',
        title: `${ch.name.split('·')[0].trim()} · ${(firstSite?.start ?? '08:00').replace(':', ' h ').replace(/ 00$/, '')}`,
        sub: [ch.address, crew.length ? crew.join(', ') : ch.city].filter(Boolean).join(' · '),
        progress: ch.progress,
        action: { label: 'Itinéraire', icon: 'route', run: () => window.open(`https://maps.google.com/?q=${encodeURIComponent(`${ch.address} ${ch.city}`)}`, '_blank') },
        open: () => navigate(`/app/chantiers/${ch.id}`),
      });
    }
    // 2. Un client qui relit un devis.
    const seen = [...data.seen].sort((a, b) => (b.d.views ?? 0) - (a.d.views ?? 0))[0];
    if (seen) {
      const c = name(seen.d.clientId);
      list.push({
        key: `vu-${seen.d.id}`,
        kind: 'devis',
        title: `${c?.name ?? 'Un client'} relit votre devis`,
        sub: `${money(seen.t.ttc, true)} · ouvert ${seen.d.views ?? 1} fois`,
        bob: `Il l’a ouvert ${seen.d.views ?? 1} fois. Appelle-le en fin de journée, c’est le bon moment.`,
        action: { label: 'Appeler', icon: 'phone', run: tel(c?.phone) },
        open: () => navigate(`/app/devis/${seen.d.id}`),
      });
    }
    // 3. Une facture en retard.
    const late = data.late[0];
    if (late) {
      const c = name(late.f.clientId);
      const days = Math.max(1, Math.round((Date.now() - new Date(late.f.dueDate + 'T12:00:00').getTime()) / 86400000));
      list.push({
        key: `late-${late.f.id}`,
        kind: 'argent',
        title: `Relancer ${c?.name ?? 'un client'}`,
        sub: `${money(late.a.remaining, true)} · ${days} jour${days > 1 ? 's' : ''} de retard`,
        action: { label: 'Relancer', icon: 'send', run: () => ui.askBob('Relance les factures en retard') },
        open: () => navigate(`/app/factures/${late.f.id}`),
      });
    }
    // 4. La demande la plus chaude.
    const lead = data.newLeads[0];
    if (lead) {
      list.push({
        key: `lead-${lead.id}`,
        kind: 'demande',
        title: `Rappeler ${lead.name}`,
        sub: lead.request,
        action: { label: 'Appeler', icon: 'phone', run: tel(lead.phone) },
        open: () => navigate('/app/demandes'),
      });
    }
    // 5. Une habilitation qui expire.
    const hab = data.habAlerts[0];
    if (hab) {
      list.push({
        key: `hab-${hab.e.id}-${hab.h.label}`,
        kind: 'equipe',
        title: hab.left < 0 ? `${hab.h.label} de ${hab.e.firstName} expirée` : `${hab.h.label} de ${hab.e.firstName} à renouveler`,
        sub: hab.left < 0 ? `depuis ${-hab.left} jours · à planifier` : `expire dans ${hab.left} jours`,
        action: { label: 'Voir', icon: 'open', run: () => navigate('/app/habilitations') },
        open: () => navigate('/app/habilitations'),
      });
    }
    return list.slice(0, 5);
  }, [data, clients, employees]);

  const toggle = (k: string) => setDone((d) => ({ ...d, [k]: !d[k] }));
  return { items, done, toggle };
}
