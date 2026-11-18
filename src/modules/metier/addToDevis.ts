// « Ajouter au devis » depuis un outil métier : nouveau brouillon ou dernier brouillon.

import { useBrix } from '@/lib/store';
import { todayISO, uid } from '@/lib/format';
import type { Devis, DevisLigne, LineKind } from '@/lib/types';

export interface QuoteLine {
  designation: string;
  detail?: string;
  quantity: number;
  unit: string;
  unitPriceHt: number;
  unitCostHt?: number;
  kind?: LineKind;
  vatRate?: number;
}

export function lastDraft(): Devis | undefined {
  return [...useBrix.getState().devis].filter((d) => d.status === 'brouillon').sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

function toLines(lines: QuoteLine[], section: string): DevisLigne[] {
  const vat = useBrix.getState().company.defaultVat || 10;
  const rate = useBrix.getState().company.hourlyRate || 55;
  return [
    { id: uid('l'), kind: 'section', designation: section, quantity: 0, unit: '', unitPriceHt: 0, unitCostHt: 0, vatRate: 0 },
    ...lines
      .filter((l) => l.quantity > 0)
      .map((l) => ({
        id: uid('l'),
        kind: l.kind ?? (l.unit === 'h' ? 'main_oeuvre' : 'fourniture'),
        designation: l.designation,
        detail: l.detail,
        quantity: Math.round(l.quantity * 100) / 100,
        unit: l.unit,
        unitPriceHt: l.unit === 'h' && !l.unitPriceHt ? rate : l.unitPriceHt,
        unitCostHt: l.unitCostHt ?? Math.round(l.unitPriceHt * 0.6 * 100) / 100,
        vatRate: l.vatRate ?? vat,
        source: 'bibliotheque' as const,
      })),
  ];
}

/** Ajoute les lignes et renvoie l'identifiant du devis modifié ou créé. */
export function addLinesToDevis(lines: QuoteLine[], opts: { mode: 'new' | 'last'; clientId?: string; title: string }): string {
  const s = useBrix.getState();
  const built = toLines(lines, opts.title);
  const draft = opts.mode === 'last' ? lastDraft() : undefined;
  if (draft) {
    s.upsertDevis({ ...draft, lines: [...draft.lines, ...built] });
    return draft.id;
  }
  const d: Devis = {
    id: uid('q'),
    number: s.nextNumber('devis'),
    clientId: opts.clientId ?? s.clients[0]?.id ?? '',
    title: opts.title,
    status: 'brouillon',
    createdAt: todayISO(),
    validityDays: 30,
    depositPercent: 30,
    lines: built,
  };
  s.upsertDevis(d);
  return d.id;
}

/** Prix unitaire effectif : la main d'œuvre sans prix prend le taux horaire de l'entreprise. */
export const priceOf = (l: QuoteLine, rate = useBrix.getState().company.hourlyRate || 55) => (l.unit === 'h' && !l.unitPriceHt ? rate : l.unitPriceHt);
