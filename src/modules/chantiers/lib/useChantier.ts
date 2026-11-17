import { useMemo } from 'react';
import { useBrix } from '@/lib/store';
import type { Chantier } from '@/lib/types';
import { chantierMetrics, type ChantierMetrics } from './metrics';

export interface ChantierView {
  ch: Chantier;
  client?: ReturnType<typeof useBrix.getState>['clients'][number];
  devis?: ReturnType<typeof useBrix.getState>['devis'][number];
  team: ReturnType<typeof useBrix.getState>['employees'];
  m: ChantierMetrics;
}

/** Toutes les vues dérivées des chantiers (client, devis, équipe, métriques). */
export function useChantierViews(): ChantierView[] {
  const chantiers = useBrix((s) => s.chantiers);
  const clients = useBrix((s) => s.clients);
  const devis = useBrix((s) => s.devis);
  const employees = useBrix((s) => s.employees);
  return useMemo(
    () =>
      chantiers.map((ch) => {
        const dv = devis.find((d) => d.id === ch.devisId) ?? devis.find((d) => d.chantierId === ch.id);
        return {
          ch,
          client: clients.find((c) => c.id === ch.clientId),
          devis: dv,
          team: ch.team.map((id) => employees.find((e) => e.id === id)).filter(Boolean) as ChantierView['team'],
          m: chantierMetrics(ch, dv),
        };
      }),
    [chantiers, clients, devis, employees],
  );
}

export const useChantierView = (id?: string) => useChantierViews().find((v) => v.ch.id === id);
