// « Encaissé ce mois » : une seule source pour l'accueil et Bob (audit #10).
import { beforeEach, describe, expect, it } from 'vitest';
import { useBrix } from '@/lib/store';
import { todayISO } from '@/lib/format';
import { encaissements } from '@/modules/bob/outils/argent';
import { useFactures } from '../store';
import { encaisseDuMois } from './encaisse';

beforeEach(() => useBrix.getState().loadDemo('electricien'));

describe('encaissé ce mois', () => {
  it('Bob donne le même total que l’accueil', () => {
    const s = useBrix.getState();
    const accueil = encaisseDuMois(s.factures, useFactures.getState().payments, todayISO()).total;
    const bob = encaissements(s, 'mois').total;
    expect(bob).toBeCloseTo(accueil, 2);
    expect(accueil).toBeGreaterThan(0);
  });

  it('les virements sans facture sont signalés à part, hors total', () => {
    const r = encaissements(useBrix.getState(), 'mois');
    const ligne = r.card.rows?.find((x) => /sans facture/.test(x.label));
    if (r.sansFacture) expect(ligne?.sub).toMatch(/non compté/);
  });
});
