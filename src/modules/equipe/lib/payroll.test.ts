import { describe, expect, it } from 'vitest';
import { computePayslip, PAYROLL_CONSTANTS_2026 as C, payslipsToCsv, rgduCoefficient, splitWeek, tauxNeutre } from './payroll';

const base = { name: 'Test', contract: 'CDI' as const, ot25: 0, ot50: 0, paniers: 0, zoneDays: {} };

describe('splitWeek', () => {
  it('ne majore rien jusqu’à 35 h', () => expect(splitWeek(35)).toEqual({ normal: 35, ot25: 0, ot50: 0 }));
  it('majore à 25 % de la 36e à la 43e heure', () => expect(splitWeek(40)).toEqual({ normal: 35, ot25: 5, ot50: 0 }));
  it('majore à 50 % au-delà de 43 h', () => expect(splitWeek(46.5)).toEqual({ normal: 35, ot25: 8, ot50: 3.5 }));
});

describe('taux neutre', () => {
  it('vaut 0 % sous 1 620 €', () => expect(tauxNeutre(1500)).toBe(0));
  it('suit la grille', () => expect(tauxNeutre(2500)).toBe(5.3));
});

describe('réduction générale', () => {
  it('est maximale au SMIC', () => {
    const smic = C.smicHoraire * C.dureeMensuelle;
    expect(rgduCoefficient(smic, smic)).toBeCloseTo(C.rgdu.tMin + C.rgdu.tDelta, 3);
  });
  it('s’annule à 3 SMIC', () => {
    const smic = C.smicHoraire * C.dureeMensuelle;
    expect(rgduCoefficient(3 * smic, smic)).toBe(0);
  });
});

describe('computePayslip', () => {
  const p = computePayslip({ ...base, grossMonthly: 2650 });

  it('garde un brut égal au salaire de base sans variable', () => expect(p.brut).toBe(2650));
  it('donne un net cohérent (environ 77 à 80 % du brut)', () => {
    expect(p.netAvantImpot / p.brut).toBeGreaterThan(0.76);
    expect(p.netAvantImpot / p.brut).toBeLessThan(0.81);
  });
  it('donne un coût employeur BTP plausible (avec CIBTP)', () => {
    expect(p.coutEmployeur / p.brut).toBeGreaterThan(1.3);
    expect(p.coutEmployeur / p.brut).toBeLessThan(1.6);
  });
  it('net à payer = net avant impôt − prélèvement', () => expect(p.netAPayer).toBeCloseTo(p.netAvantImpot - p.pas, 2));
  it('applique le taux neutre faute de taux transmis', () => {
    expect(p.pasNeutral).toBe(true);
    expect(p.pasRate).toBe(tauxNeutre(p.netImposable));
  });
  it('utilise le taux transmis quand il existe', () => {
    const q = computePayslip({ ...base, grossMonthly: 2650, pasRate: 4.2 });
    expect(q.pasRate).toBe(4.2);
    expect(q.pas).toBeCloseTo((q.netImposable * 4.2) / 100, 2);
  });

  it('majore les heures sup et réduit les cotisations salariales', () => {
    const hs = computePayslip({ ...base, grossMonthly: 2650, ot25: 20, ot50: 2 });
    const rate = 2650 / C.dureeMensuelle;
    expect(hs.overtimePay).toBeCloseTo(20 * rate * 1.25 + 2 * rate * 1.5, 0);
    expect(hs.reductionHS).toBeCloseTo(hs.overtimePay * C.reductionSalarialeHS, 1);
    expect(hs.deductionPatronaleHS).toBe(33);
    expect(hs.netImposable).toBeLessThan(hs.netAvantImpot);
  });

  it('verse paniers et transport hors cotisations', () => {
    const z = computePayslip({ ...base, grossMonthly: 2230, paniers: 20, zoneDays: { 1: 15, 2: 5 } });
    const transport = 15 * C.zones[1].transport + 5 * C.zones[2].transport;
    const paniers = 20 * C.panierPlafondExonere;
    expect(z.nonSoumis.reduce((s, l) => s + (l.gain ?? 0), 0)).toBeCloseTo(transport + paniers, 2);
    // indemnité de trajet + part soumise du panier dans le brut
    expect(z.brut).toBeCloseTo(2230 + 15 * C.zones[1].trajet + 5 * C.zones[2].trajet + 20 * (C.panier - C.panierPlafondExonere), 2);
  });

  it('déduit une absence payée par la caisse de congés', () => {
    const a = computePayslip({ ...base, grossMonthly: 2230, absenceHours: 14 });
    expect(a.brut).toBeCloseTo(2230 - 14 * Math.round((2230 / C.dureeMensuelle) * 100) / 100, 2);
  });

  it('exonère l’apprenti sous 50 % du SMIC', () => {
    const smic = C.smicHoraire * C.dureeMensuelle;
    const ap = computePayslip({ ...base, contract: 'Apprenti', grossMonthly: Math.floor(smic * 0.45) });
    expect(ap.totalSal).toBe(0);
    expect(ap.netAvantImpot).toBe(ap.brut);
    const ap2 = computePayslip({ ...base, contract: 'Apprenti', grossMonthly: 1080 });
    expect(ap2.totalSal).toBeGreaterThan(0);
    expect(ap2.totalSal).toBeLessThan(80);
  });

  it('exporte un CSV lisible par Excel FR', () => {
    const csv = payslipsToCsv([p], '2026-10');
    expect(csv.split('\n')).toHaveLength(2);
    expect(csv).toContain('2650,00');
  });
});
