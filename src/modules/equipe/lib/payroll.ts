// Préparation des bulletins de paie BTP (ouvriers, entreprise de moins de 11 salariés).
//
// Fonctions pures, sans dépendance : elles prennent des heures pointées et un contrat,
// et rendent un bulletin détaillé (brut, cotisations, net, coût employeur).
//
// IMPORTANT : Brix PRÉPARE la paie, il ne la valide pas. Toutes les constantes ci-dessous
// sont des ordres de grandeur au 1er janvier 2026, À FAIRE VALIDER PAR L'EXPERT-COMPTABLE
// (ou le partenaire paie) avant tout usage réel : taux AT/MP notifié, accords PRO BTP de
// l'entreprise, barème régional des petits déplacements, taux CIBTP de la caisse, etc.

export const PAYROLL_CONSTANTS_2026 = {
  /** Date de référence des constantes. */
  asOf: '2026-01-01',
  status: 'à faire valider par l’expert-comptable' as const,

  /** SMIC horaire brut au 1er janvier 2026. */
  smicHoraire: 12.02,
  /** Durée légale mensualisée (35 h × 52 / 12). */
  dureeMensuelle: 151.67,
  /** Plafond mensuel de la Sécurité sociale 2026. */
  pmss: 4005,

  /** Heures supplémentaires (convention BTP : décompte à la semaine). */
  seuilHebdo: 35,
  seuilMajoration50: 43,
  majoration1: 0.25,
  majoration2: 0.5,
  /** Réduction de cotisations salariales sur les heures sup (plafond 11,31 %). */
  reductionSalarialeHS: 0.1131,
  /** Déduction forfaitaire patronale par heure sup (moins de 20 salariés). */
  deductionPatronaleHS: 1.5,

  /** Panier repas conventionnel (exemple région Auvergne-Rhône-Alpes). */
  panier: 10.9,
  /** Part du panier exonérée de cotisations (repas sur chantier, limite URSSAF). */
  panierPlafondExonere: 10.3,

  /**
   * Petits déplacements BTP, par jour travaillé (barème régional d'exemple).
   * L'indemnité de trajet est un complément de salaire : soumise à cotisations.
   * L'indemnité de transport rembourse les frais : non soumise.
   */
  zones: {
    1: { label: 'Zone 1 · 0 à 10 km', trajet: 1.1, transport: 2.2 },
    2: { label: 'Zone 2 · 10 à 20 km', trajet: 2.35, transport: 4.6 },
    3: { label: 'Zone 3 · 20 à 30 km', trajet: 3.6, transport: 7.1 },
    4: { label: 'Zone 4 · 30 à 40 km', trajet: 4.85, transport: 9.7 },
    5: { label: 'Zone 5 · 40 à 50 km', trajet: 6.1, transport: 12.2 },
  } as Record<Zone, { label: string; trajet: number; transport: number }>,

  /** Complémentaire santé obligatoire (forfait mensuel, part salarié / part employeur). */
  mutuelleSalarie: 28,
  mutuelleEmployeur: 28,

  /** Assiette CSG/CRDS : 98,25 % du brut (abattement frais professionnels 1,75 %). */
  assietteCsg: 0.9825,

  /** Apprentis : salaire exonéré de cotisations salariales jusqu'à 50 % du SMIC. */
  apprentiSeuilExoneration: 0.5,

  /** Réduction générale dégressive unique (RGDU 2026). */
  rgdu: { tMin: 0.02, tDelta: 0.3781, puissance: 1.75, plafondSmic: 3, majorationCaisseConges: 100 / 90 },
};

export type Zone = 1 | 2 | 3 | 4 | 5;

/** Taux en pourcentage. `base` : sur quoi le taux s'applique. */
export interface CotisationDef {
  key: string;
  group: 'sante' | 'at' | 'retraite' | 'famille' | 'chomage' | 'autres' | 'csg';
  label: string;
  base: 'brut' | 't1' | 'csg' | 'forfait';
  sal: number;
  pat: number;
  note?: string;
}

/** Cotisations d'un ouvrier du BTP, non cadre. Taux 2026 indicatifs, à faire valider. */
export const COTISATIONS_2026: CotisationDef[] = [
  { key: 'maladie', group: 'sante', label: 'Sécurité sociale maladie, maternité', base: 'brut', sal: 0, pat: 7 },
  { key: 'mutuelle', group: 'sante', label: 'Complémentaire santé', base: 'forfait', sal: 0, pat: 0, note: 'forfait' },
  { key: 'prevoyance', group: 'sante', label: 'Prévoyance PRO BTP', base: 't1', sal: 0.35, pat: 1.75 },
  { key: 'atmp', group: 'at', label: 'Accidents du travail (taux notifié)', base: 'brut', sal: 0, pat: 3.1 },
  { key: 'vieillesse_plaf', group: 'retraite', label: 'Vieillesse plafonnée', base: 't1', sal: 6.9, pat: 8.55 },
  { key: 'vieillesse_deplaf', group: 'retraite', label: 'Vieillesse déplafonnée', base: 'brut', sal: 0.4, pat: 2.02 },
  { key: 'retraite_t1', group: 'retraite', label: 'Retraite complémentaire PRO BTP T1', base: 't1', sal: 3.15, pat: 4.72 },
  { key: 'ceg_t1', group: 'retraite', label: 'Contribution d’équilibre général T1', base: 't1', sal: 0.86, pat: 1.29 },
  { key: 'famille', group: 'famille', label: 'Allocations familiales', base: 'brut', sal: 0, pat: 3.45 },
  { key: 'chomage', group: 'chomage', label: 'Assurance chômage', base: 'brut', sal: 0, pat: 4 },
  { key: 'ags', group: 'chomage', label: 'AGS (garantie des salaires)', base: 'brut', sal: 0, pat: 0.25 },
  { key: 'cibtp', group: 'autres', label: 'Caisse de congés payés CIBTP', base: 'brut', sal: 0, pat: 19.95, note: 'la caisse verse les congés au salarié' },
  { key: 'intemperies', group: 'autres', label: 'Chômage intempéries (CIBTP)', base: 'brut', sal: 0, pat: 0.68 },
  { key: 'oppbtp', group: 'autres', label: 'OPPBTP (prévention)', base: 'brut', sal: 0, pat: 0.11 },
  { key: 'formation', group: 'autres', label: 'Formation, apprentissage et CCCA-BTP', base: 'brut', sal: 0, pat: 1.53 },
  { key: 'fnal', group: 'autres', label: 'FNAL', base: 't1', sal: 0, pat: 0.1 },
  { key: 'csa', group: 'autres', label: 'Contribution solidarité autonomie', base: 'brut', sal: 0, pat: 0.3 },
  { key: 'dialogue', group: 'autres', label: 'Dialogue social', base: 'brut', sal: 0, pat: 0.016 },
  { key: 'csg_ded', group: 'csg', label: 'CSG déductible de l’impôt', base: 'csg', sal: 6.8, pat: 0 },
  { key: 'csg_nd', group: 'csg', label: 'CSG non déductible', base: 'csg', sal: 2.4, pat: 0 },
  { key: 'crds', group: 'csg', label: 'CRDS', base: 'csg', sal: 0.5, pat: 0 },
];

/** Grille du taux neutre du prélèvement à la source (métropole), revenus mensuels. */
export const TAUX_NEUTRE_2026: [number, number][] = [
  [1620, 0], [1683, 0.5], [1791, 1.3], [1911, 2.1], [2042, 2.9], [2151, 3.5], [2294, 4.1], [2714, 5.3], [3107, 7.5],
  [3539, 9.9], [3983, 11.9], [4648, 13.8], [5574, 15.8], [6974, 17.9], [8711, 20], [12091, 24], [16376, 28], [25706, 33], [55062, 38], [Infinity, 43],
];

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Découpe les heures d'une semaine : normales (≤ 35 h), majorées 25 % (36e à 43e), majorées 50 % (au-delà). */
export function splitWeek(hours: number, threshold = PAYROLL_CONSTANTS_2026.seuilHebdo) {
  const C = PAYROLL_CONSTANTS_2026;
  const band = C.seuilMajoration50 - C.seuilHebdo; // 8 h à 25 %
  const normal = Math.min(hours, threshold);
  const over = Math.max(0, hours - threshold);
  const ot25 = Math.min(over, band);
  const ot50 = Math.max(0, over - band);
  return { normal: round2(normal), ot25: round2(ot25), ot50: round2(ot50) };
}

/** Taux neutre applicable à un net imposable mensuel (en %). */
export function tauxNeutre(netImposable: number) {
  return TAUX_NEUTRE_2026.find(([max]) => netImposable <= max)?.[1] ?? 43;
}

/** Coefficient de la réduction générale (RGDU 2026), avant majoration caisse de congés. */
export function rgduCoefficient(brut: number, smicReference: number) {
  const { tMin, tDelta, puissance, plafondSmic } = PAYROLL_CONSTANTS_2026.rgdu;
  if (brut <= 0 || brut >= plafondSmic * smicReference) return 0;
  const ratio = Math.max(0, 0.5 * ((plafondSmic * smicReference) / brut - 1));
  return Math.min(tMin + tDelta, tMin + tDelta * Math.pow(ratio, puissance));
}

export interface PayrollInput {
  name: string;
  contract: 'CDI' | 'CDD' | 'Apprenti' | 'Intérim' | 'Gérant';
  /** Salaire de base mensuel brut pour 151,67 h. */
  grossMonthly: number;
  /** Heures sup du mois, déjà découpées par semaine. */
  ot25: number;
  ot50: number;
  /** Heures d'absence non payées par l'employeur (congés payés par la caisse, sans solde). */
  absenceHours?: number;
  absenceLabel?: string;
  paniers: number;
  /** Nombre de jours travaillés par zone de petits déplacements. */
  zoneDays: Partial<Record<Zone, number>>;
  /** Taux personnalisé transmis par l'administration (en %), sinon taux neutre. */
  pasRate?: number | null;
}

export interface PayLine {
  key: string;
  group: CotisationDef['group'] | 'brut' | 'nonsoumis';
  label: string;
  base?: number;
  qty?: number;
  rateSal?: number;
  amountSal?: number;
  ratePat?: number;
  amountPat?: number;
  /** Montant ajouté au brut (rubriques de salaire) ou au net (non soumis). */
  gain?: number;
  note?: string;
}

export interface Payslip {
  input: PayrollInput;
  hourlyRate: number;
  earnings: PayLine[];
  cotisations: PayLine[];
  nonSoumis: PayLine[];
  brut: number;
  overtimePay: number;
  overtimeHours: number;
  totalSal: number;
  totalPat: number;
  reductionHS: number;
  reductionGenerale: number;
  deductionPatronaleHS: number;
  netSocial: number;
  netAvantImpot: number;
  netImposable: number;
  pasRate: number;
  pasNeutral: boolean;
  pas: number;
  netAPayer: number;
  coutEmployeur: number;
}

/** Calcule un bulletin complet. */
export function computePayslip(input: PayrollInput, C = PAYROLL_CONSTANTS_2026, defs = COTISATIONS_2026): Payslip {
  const hourlyRate = round2(input.grossMonthly / C.dureeMensuelle);
  const earnings: PayLine[] = [];
  earnings.push({ key: 'base', group: 'brut', label: 'Salaire de base', qty: C.dureeMensuelle, base: hourlyRate, gain: round2(input.grossMonthly) });

  if (input.absenceHours) {
    earnings.push({ key: 'absence', group: 'brut', label: input.absenceLabel ?? 'Absence (congés payés par la caisse CIBTP)', qty: input.absenceHours, base: hourlyRate, gain: -round2(input.absenceHours * hourlyRate) });
  }
  const ot25Pay = round2(input.ot25 * hourlyRate * (1 + C.majoration1));
  const ot50Pay = round2(input.ot50 * hourlyRate * (1 + C.majoration2));
  if (input.ot25) earnings.push({ key: 'hs25', group: 'brut', label: 'Heures supplémentaires à 25 %', qty: input.ot25, base: round2(hourlyRate * 1.25), gain: ot25Pay });
  if (input.ot50) earnings.push({ key: 'hs50', group: 'brut', label: 'Heures supplémentaires à 50 %', qty: input.ot50, base: round2(hourlyRate * 1.5), gain: ot50Pay });

  const nonSoumis: PayLine[] = [];
  let trajet = 0;
  let transport = 0;
  for (const z of [1, 2, 3, 4, 5] as Zone[]) {
    const days = input.zoneDays[z] ?? 0;
    if (!days) continue;
    const t = C.zones[z];
    trajet += days * t.trajet;
    transport += days * t.transport;
    earnings.push({ key: `trajet${z}`, group: 'brut', label: `Indemnité de trajet ${t.label.split(' · ')[0].toLowerCase()}`, qty: days, base: t.trajet, gain: round2(days * t.trajet) });
    nonSoumis.push({ key: `transport${z}`, group: 'nonsoumis', label: `Indemnité de transport ${t.label.split(' · ')[0].toLowerCase()}`, qty: days, base: t.transport, gain: round2(days * t.transport) });
  }
  const panierExcess = Math.max(0, C.panier - C.panierPlafondExonere);
  if (input.paniers) {
    nonSoumis.push({ key: 'panier', group: 'nonsoumis', label: 'Paniers repas (part exonérée)', qty: input.paniers, base: C.panierPlafondExonere, gain: round2(input.paniers * Math.min(C.panier, C.panierPlafondExonere)) });
    if (panierExcess > 0) earnings.push({ key: 'panier_soumis', group: 'brut', label: 'Paniers repas (part soumise)', qty: input.paniers, base: round2(panierExcess), gain: round2(input.paniers * panierExcess) });
  }

  const brut = round2(earnings.reduce((s, l) => s + (l.gain ?? 0), 0));
  const overtimePay = round2(ot25Pay + ot50Pay);
  const overtimeHours = input.ot25 + input.ot50;
  const isApprenti = input.contract === 'Apprenti';
  const smicMensuel = C.smicHoraire * C.dureeMensuelle;
  // Apprentis : pas de cotisations salariales ni CSG/CRDS sous 50 % du SMIC.
  const salBase = isApprenti ? Math.max(0, brut - C.apprentiSeuilExoneration * smicMensuel) : brut;
  const t1 = Math.min(brut, C.pmss);
  const salT1 = Math.min(salBase, C.pmss);

  const patSante = round2(C.mutuelleEmployeur + (t1 * (defs.find((d) => d.key === 'prevoyance')?.pat ?? 0)) / 100);
  const csgBase = round2(C.assietteCsg * salBase + (isApprenti && salBase === 0 ? 0 : patSante));

  const maladieRate = brut > 2.25 * smicMensuel ? 13 : 7;
  const familleRate = brut > 3.5 * smicMensuel ? 5.25 : 3.45;

  const cotisations: PayLine[] = defs.map((d) => {
    if (d.base === 'forfait') {
      return { key: d.key, group: d.group, label: d.label, amountSal: isApprenti && salBase === 0 ? 0 : C.mutuelleSalarie, amountPat: C.mutuelleEmployeur, note: 'forfait mensuel' };
    }
    const patBase = d.base === 't1' ? t1 : d.base === 'csg' ? csgBase : brut;
    const sBase = d.base === 't1' ? salT1 : d.base === 'csg' ? csgBase : salBase;
    const pat = d.key === 'maladie' ? maladieRate : d.key === 'famille' ? familleRate : d.pat;
    return {
      key: d.key,
      group: d.group,
      label: d.label,
      base: round2(d.sal ? sBase : patBase),
      rateSal: d.sal || undefined,
      amountSal: d.sal ? round2((sBase * d.sal) / 100) : 0,
      ratePat: pat || undefined,
      amountPat: pat ? round2((patBase * pat) / 100) : 0,
      note: d.note,
    };
  });

  // Réduction salariale sur heures sup : au plus 11,31 % (somme des taux vieillesse + retraite).
  const retraiteSalRate = defs.filter((d) => d.group === 'retraite').reduce((s, d) => s + d.sal, 0) / 100;
  const reductionHS = isApprenti ? 0 : round2(overtimePay * Math.min(C.reductionSalarialeHS, retraiteSalRate));

  const salHorsCsg = cotisations.filter((c) => c.group !== 'csg').reduce((s, c) => s + (c.amountSal ?? 0), 0);
  const csgDed = cotisations.find((c) => c.key === 'csg_ded')?.amountSal ?? 0;
  const csgNdCrds = cotisations.filter((c) => c.key === 'csg_nd' || c.key === 'crds').reduce((s, c) => s + (c.amountSal ?? 0), 0);
  const totalSal = round2(salHorsCsg + csgDed + csgNdCrds - reductionHS);

  // Réduction générale : coefficient × brut, majoré de 100/90 pour les entreprises affiliées à une caisse de congés.
  const smicReference = C.smicHoraire * (C.dureeMensuelle + overtimeHours - (input.absenceHours ?? 0));
  const coef = rgduCoefficient(brut, smicReference);
  const reductionGenerale = round2(Math.min(coef * C.rgdu.majorationCaisseConges, C.rgdu.tMin + C.rgdu.tDelta) * brut);
  const deductionPatronaleHS = round2(overtimeHours * C.deductionPatronaleHS);
  const patBrutes = cotisations.reduce((s, c) => s + (c.amountPat ?? 0), 0);
  const totalPat = round2(Math.max(0, patBrutes - reductionGenerale - deductionPatronaleHS));

  const nonSoumisTotal = round2(nonSoumis.reduce((s, l) => s + (l.gain ?? 0), 0));
  const netSocial = round2(brut - (salHorsCsg - reductionHS));
  const netAvantImpot = round2(brut - totalSal + nonSoumisTotal);

  // Heures sup exonérées d'impôt (dans la limite annuelle de 7 500 € nets).
  const salRateOnHs = (salHorsCsg / (brut || 1)) - Math.min(C.reductionSalarialeHS, retraiteSalRate);
  const hsExoneree = isApprenti ? 0 : round2(Math.max(0, overtimePay * (1 - Math.max(0, salRateOnHs) - (C.assietteCsg * 6.8) / 100)));
  // Apprentis : salaire exonéré d'impôt jusqu'au SMIC annuel, on retient la part mensuelle.
  const apprentiExo = isApprenti ? Math.min(brut - totalSal + csgNdCrds, smicMensuel) : 0;
  const netImposable = round2(Math.max(0, brut - totalSal + csgNdCrds + C.mutuelleEmployeur - hsExoneree - apprentiExo));

  const pasNeutral = input.pasRate == null;
  const pasRate = pasNeutral ? tauxNeutre(netImposable) : (input.pasRate as number);
  const pas = round2((netImposable * pasRate) / 100);
  const netAPayer = round2(netAvantImpot - pas);
  const coutEmployeur = round2(brut + totalPat + nonSoumisTotal);

  return {
    input, hourlyRate, earnings, cotisations, nonSoumis, brut, overtimePay, overtimeHours,
    totalSal, totalPat, reductionHS, reductionGenerale, deductionPatronaleHS,
    netSocial, netAvantImpot, netImposable, pasRate, pasNeutral, pas, netAPayer, coutEmployeur,
  };
}

/** Libellés des familles de cotisations, dans l'ordre du bulletin clarifié. */
export const GROUP_LABEL: Record<CotisationDef['group'], string> = {
  sante: 'Santé',
  at: 'Accidents du travail et maladies professionnelles',
  retraite: 'Retraite',
  famille: 'Famille',
  chomage: 'Assurance chômage',
  autres: 'Autres contributions dues par l’employeur (dont BTP)',
  csg: 'CSG et CRDS',
};

/** Export comptable CSV (séparateur point-virgule, décimales à la virgule, pour Excel FR). */
export function payslipsToCsv(slips: Payslip[], period: string) {
  const f = (n: number) => n.toFixed(2).replace('.', ',');
  const head = ['Période', 'Salarié', 'Contrat', 'Brut', 'Heures sup', 'Cotisations salariales', 'Cotisations patronales', 'Réduction générale', 'Net imposable', 'Prélèvement à la source', 'Net à payer', 'Coût employeur'];
  const rows = slips.map((s) => [period, s.input.name, s.input.contract, f(s.brut), f(s.overtimePay), f(s.totalSal), f(s.totalPat), f(s.reductionGenerale), f(s.netImposable), f(s.pas), f(s.netAPayer), f(s.coutEmployeur)]);
  return [head, ...rows].map((r) => r.join(';')).join('\n');
}
