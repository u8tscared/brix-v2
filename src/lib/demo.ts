// Données de démonstration : Benali Électricité (Karim Benali, Villeurbanne).
// Toutes les dates sont relatives à aujourd'hui pour que la démo reste vivante.

import { dayOffset as d } from './format';
import type { BankTx, BobAction, Chantier, Client, Company, Devis, DevisLigne, Employee, Expense, Facture, Lead, PlanningEvent, User } from './types';

let n = 0;
const L = (designation: string, quantity: number, unit: string, unitPriceHt: number, unitCostHt: number, extra: Partial<DevisLigne> = {}): DevisLigne => ({
  id: `l${++n}`,
  kind: extra.kind ?? (unit === 'h' ? 'main_oeuvre' : 'fourniture'),
  designation,
  quantity,
  unit,
  unitPriceHt,
  unitCostHt,
  vatRate: 10,
  source: unit === 'h' ? 'taux' : 'bibliotheque',
  ...extra,
});
const S = (designation: string): DevisLigne => ({ id: `l${++n}`, kind: 'section', designation, quantity: 0, unit: '', unitPriceHt: 0, unitCostHt: 0, vatRate: 0 });

export const demoCompany: Company = {
  name: 'Benali Électricité',
  legalName: 'BENALI ELECTRICITE SARL',
  siret: '812 457 963 00021',
  vatNumber: 'FR 41 812457963',
  address: '12 rue Francis de Pressensé',
  city: '69100 Villeurbanne',
  phone: '06 12 45 78 90',
  email: 'contact@benali-elec.fr',
  trade: 'electricien',
  secondaryTrades: [],
  size: 'petite',
  employees: 4,
  rge: true,
  decennale: 'AXA n° 7845120 · valable au 31/12',
  iban: 'FR76 3000 4000 0312 3456 7890 143',
  hourlyRate: 55,
  defaultVat: 10,
  logoInitials: 'BE',
};

export const demoUser: User = { id: 'u_karim', firstName: 'Karim', lastName: 'Benali', email: 'karim@benali-elec.fr', role: 'patron' };

export const demoEmployees: Employee[] = [
  { id: 'e_karim', firstName: 'Karim', lastName: 'Benali', initials: 'KB', role: 'patron', color: '#17171f', phone: '06 12 45 78 90', email: 'karim@benali-elec.fr', hourlyCost: 0, contract: 'Gérant', grossMonthly: 0, hireDate: '2015-03-01', habilitations: [{ label: 'BR / B2V', expires: d(420) }], leaveBalance: 0, clockedInAt: '07:48' },
  { id: 'e_yanis', firstName: 'Yanis', lastName: 'Moreau', initials: 'YM', role: 'chef_equipe', color: '#f59e0b', phone: '06 22 31 44 10', email: 'yanis@benali-elec.fr', hourlyCost: 31.5, contract: 'CDI', grossMonthly: 2650, hireDate: '2019-09-02', habilitations: [{ label: 'BR / B2V / BC', expires: d(23) }, { label: 'Travail en hauteur', expires: d(210) }], leaveBalance: 14.5, clockedInAt: '07:52' },
  { id: 'e_mehdi', firstName: 'Mehdi', lastName: 'Diallo', initials: 'MD', role: 'ouvrier', color: '#6366f1', phone: '06 78 12 90 45', email: 'mehdi@benali-elec.fr', hourlyCost: 27.8, contract: 'CDI', grossMonthly: 2230, hireDate: '2022-01-10', habilitations: [{ label: 'B1V / BR', expires: d(160) }, { label: 'CACES R486 nacelle', expires: d(-5) }], leaveBalance: 9, clockedInAt: '07:31' },
  { id: 'e_lucas', firstName: 'Lucas', lastName: 'Teixeira', initials: 'LT', role: 'apprenti', color: '#10b981', phone: '07 61 20 33 88', email: 'lucas@benali-elec.fr', hourlyCost: 12.4, contract: 'Apprenti', grossMonthly: 1080, hireDate: '2025-09-01', habilitations: [{ label: 'B0 / H0', expires: d(300) }], leaveBalance: 11 },
];

export const demoClients: Client[] = [
  { id: 'c_lefevre', kind: 'particulier', name: 'Claire Lefèvre', email: 'claire.lefevre@gmail.com', phone: '06 45 12 78 33', address: '18 rue Paul Bert', city: '69003 Lyon', tags: ['Rénovation'], createdAt: d(-34), source: 'site' },
  { id: 'c_garnier', kind: 'particulier', name: 'Thomas Garnier', email: 't.garnier@orange.fr', phone: '06 11 98 76 54', address: '4 impasse des Lilas', city: '69300 Caluire-et-Cuire', tags: ['Mise en conformité'], createdAt: d(-12), source: 'google' },
  { id: 'c_martin', kind: 'pro', name: 'Boulangerie Martin', contact: 'Sophie Martin', email: 'contact@boulangerie-martin.fr', phone: '04 78 85 12 40', address: '27 cours Émile Zola', city: '69100 Villeurbanne', siret: '501 234 567 00018', tags: ['Commerce', 'Triphasé'], createdAt: d(-60), source: 'bouche-a-oreille' },
  { id: 'c_tilleuls', kind: 'pro', name: 'SCI Les Tilleuls', contact: 'Marc Roche', email: 'gestion@sci-tilleuls.fr', phone: '04 72 33 18 90', address: '9 rue Duguesclin', city: '69006 Lyon', siret: '789 456 123 00012', tags: ['Syndic', 'Récurrent'], createdAt: d(-140), source: 'parrainage' },
  { id: 'c_nguyen', kind: 'pro', name: 'Cabinet Dr Nguyen', contact: 'Dr Linh Nguyen', email: 'cabinet.nguyen@medecin.fr', phone: '04 78 60 11 22', address: '102 rue de Marseille', city: '69007 Lyon', siret: '832 111 456 00027', tags: ['Santé'], createdAt: d(-45), source: 'site' },
  { id: 'c_dupuis', kind: 'particulier', name: 'Antoine Dupuis', email: 'antoine.dupuis@free.fr', phone: '06 99 45 23 11', address: '15 chemin de Crépieux', city: '69300 Caluire-et-Cuire', tags: ['IRVE'], createdAt: d(-20), source: 'plateforme' },
  { id: 'c_roux', kind: 'particulier', name: 'Michel Roux', email: 'michel.roux@laposte.net', phone: '06 32 14 58 77', address: '3 place Lazare Goujon', city: '69100 Villeurbanne', tags: [], createdAt: d(-90), source: 'telephone' },
  { id: 'c_benoit', kind: 'particulier', name: 'Julie Benoît', email: 'julie.benoit@gmail.com', phone: '07 81 22 45 60', address: '56 avenue Jean Jaurès', city: '69007 Lyon', tags: ['Domotique'], createdAt: d(-8), source: 'google' },
];

const devisLefevre: DevisLigne[] = [
  S('Lot 1 · Tableau électrique'),
  L('Coffret Drivia 3 rangées 39 modules', 1, 'u', 118.4, 82.9, { supplier: 'Rexel', supplierRef: 'Legrand 401213' }),
  L('Interrupteur différentiel 40 A 30 mA type A', 2, 'u', 64.9, 44.2, { supplier: 'Rexel', supplierRef: 'Legrand 411650' }),
  L('Interrupteur différentiel 40 A 30 mA type F', 1, 'u', 112.5, 78.0, { supplier: 'Rexel', supplierRef: 'Legrand 411652', source: 'bob', detail: 'Ajouté par Bob : plaque induction' }),
  L('Disjoncteur DX³ 16 A courbe C', 8, 'u', 11.2, 7.1, { supplier: 'Rexel', supplierRef: 'Legrand 406774' }),
  L('Disjoncteur DX³ 20 A courbe C', 4, 'u', 11.9, 7.6, { supplier: 'Rexel', supplierRef: 'Legrand 406775' }),
  L('Pose et raccordement du tableau', 6, 'h', 55, 31.5, { detail: "Main d'œuvre · taux compagnon" }),
  S('Lot 2 · Distribution et prises'),
  L('Prise 2P+T Céliane blanc', 20, 'u', 24.5, 12.8, { supplier: 'Rexel', supplierRef: 'Legrand 067111' }),
  L('Câble R2V 3G2,5 mm²', 84, 'm', 2.35, 1.42, { supplier: 'Cédéo', supplierRef: 'Nexans 3G2.5' }),
  L('Saignées, tirage et raccordement', 22, 'h', 55, 31.5),
  S('Lot 3 · Éclairage'),
  L('Spot LED encastré 7 W IP65', 12, 'u', 38.9, 26.4, { supplier: 'Rexel' }),
  L('Pose points lumineux', 9, 'h', 55, 31.5),
  S('Lot 4 · Mise en service'),
  L('Essais, repérage et mise en service', 2, 'h', 55, 31.5),
  L('Attestation Consuel', 1, 'forfait', 180, 120, { kind: 'ouvrage', source: 'bob', vatRate: 10 }),
];

const simple = (items: [string, number, string, number, number][]) => items.map(([a, b, c, e, f]) => L(a, b, c, e, f));

export const demoDevis: Devis[] = [
  { id: 'q_121', number: 'D-2026-121', clientId: 'c_lefevre', chantierId: 'ch_lefevre', title: 'Rénovation électrique appartement T3', status: 'signe', createdAt: d(-30), sentAt: d(-29), viewedAt: d(-28), views: 4, signedAt: d(-26), validityDays: 30, depositPercent: 30, lines: devisLefevre },
  { id: 'q_118', number: 'D-2026-118', clientId: 'c_garnier', title: 'Mise en conformité NF C 15-100', status: 'vu', createdAt: d(-6), sentAt: d(-5), viewedAt: d(0), views: 3, validityDays: 30, depositPercent: 30, lines: [S('Mise en conformité'), ...simple([['Tableau électrique 2 rangées équipé', 1, 'u', 690, 410], ['Liaison équipotentielle salle de bain', 1, 'forfait', 240, 90], ['Remplacement prises sans terre', 14, 'u', 42, 18], ['Main d\'œuvre', 38, 'h', 55, 31.5], ['Option VMC simple flux hygro B', 1, 'u', 480, 260]])] },
  { id: 'q_115', number: 'D-2026-115', clientId: 'c_martin', chantierId: 'ch_martin', title: 'Boulangerie : passage en triphasé', status: 'envoye', createdAt: d(-9), sentAt: d(-8), validityDays: 30, depositPercent: 40, lines: [S('Alimentation triphasée'), ...simple([['Tableau triphasé 4 rangées', 1, 'u', 1240, 820], ['Câble U1000 R2V 5G10', 35, 'm', 18.5, 11.2], ['Raccordement four et chambre froide', 2, 'forfait', 680, 300], ['Main d\'œuvre', 42, 'h', 58, 31.5]])] },
  { id: 'q_119', number: 'D-2026-119', clientId: 'c_dupuis', chantierId: 'ch_dupuis', title: 'Borne de recharge IRVE 7 kW', status: 'envoye', createdAt: d(-4), sentAt: d(-3), validityDays: 30, depositPercent: 30, aides: [{ label: 'Crédit d\'impôt borne (75 %, plafond 500 €)', amount: 500 }], lines: [S('Borne IRVE'), ...simple([['Borne Legrand Green\'up 7,4 kW', 1, 'u', 1180, 790], ['Protection différentielle type A 40 A', 1, 'u', 96, 58], ['Câble 3G6 mm²', 18, 'm', 6.4, 3.9], ['Pose et mise en service IRVE', 7, 'h', 60, 31.5]])] },
  { id: 'q_122', number: 'D-2026-122', clientId: 'c_benoit', title: 'Domotique et volets roulants', status: 'brouillon', createdAt: d(-1), validityDays: 30, depositPercent: 30, lines: [S('Domotique'), ...simple([['Box domotique Netatmo', 1, 'u', 320, 210], ['Module volet roulant connecté', 6, 'u', 89, 54], ['Main d\'œuvre', 10, 'h', 55, 31.5]])] },
  { id: 'q_110', number: 'D-2026-110', clientId: 'c_tilleuls', chantierId: 'ch_tilleuls', title: 'Éclairage LED des 3 cages d\'escalier', status: 'signe', createdAt: d(-48), sentAt: d(-47), signedAt: d(-40), validityDays: 30, depositPercent: 30, lines: [S('Éclairage communs'), ...simple([['Hublot LED à détection 15 W', 36, 'u', 78, 46], ['Minuterie et détecteurs', 3, 'u', 145, 80], ['Main d\'œuvre', 64, 'h', 55, 31.5]])] },
  { id: 'q_112', number: 'D-2026-112', clientId: 'c_nguyen', chantierId: 'ch_nguyen', title: 'Cabinet médical : VDI et éclairage', status: 'signe', createdAt: d(-38), sentAt: d(-37), signedAt: d(-33), validityDays: 30, depositPercent: 30, lines: [S('Courants faibles'), ...simple([['Baie de brassage 19" 12U', 1, 'u', 690, 430], ['Prise RJ45 cat. 6A', 18, 'u', 46, 21], ['Dalle LED 60x60 UGR<19', 14, 'u', 92, 58], ['Main d\'œuvre', 46, 'h', 55, 31.5]])] },
  { id: 'q_104', number: 'D-2026-104', clientId: 'c_roux', title: 'Remplacement tableau maison', status: 'refuse', createdAt: d(-70), sentAt: d(-69), validityDays: 30, depositPercent: 30, lines: simple([['Tableau 3 rangées équipé', 1, 'u', 890, 540], ['Main d\'œuvre', 8, 'h', 55, 31.5]]) },
];

export const demoChantiers: Chantier[] = [
  { id: 'ch_lefevre', clientId: 'c_lefevre', name: 'Rénovation T3 · Mme Lefèvre', address: '18 rue Paul Bert', city: 'Lyon 3e', status: 'en_cours', startDate: d(-6), endDate: d(9), progress: 38, budgetHt: 5028.4, costHt: 1310, team: ['e_karim', 'e_yanis', 'e_lucas'], nextStep: 'Passage Consuel le ' + new Date(d(8) + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }), devisId: 'q_121', photos: 23, pinned: true },
  { id: 'ch_martin', clientId: 'c_martin', name: 'Boulangerie Martin · triphasé', address: '27 cours Émile Zola', city: 'Villeurbanne', status: 'en_cours', startDate: d(-14), endDate: d(3), progress: 88, budgetHt: 6240, costHt: 4430, team: ['e_mehdi'], nextStep: 'Mise en service lundi', devisId: 'q_115', photos: 41 },
  { id: 'ch_tilleuls', clientId: 'c_tilleuls', name: 'SCI Les Tilleuls · LED', address: '9 rue Duguesclin', city: 'Lyon 6e', status: 'en_cours', startDate: d(-20), endDate: d(12), progress: 52, budgetHt: 6787, costHt: 4120, team: ['e_yanis', 'e_lucas'], nextStep: '+6 h : avenant à proposer', devisId: 'q_110', photos: 18 },
  { id: 'ch_nguyen', clientId: 'c_nguyen', name: 'Cabinet Nguyen · VDI', address: '102 rue de Marseille', city: 'Lyon 7e', status: 'en_cours', startDate: d(-10), endDate: d(6), progress: 70, budgetHt: 5354, costHt: 3410, team: ['e_mehdi'], nextStep: 'Baie livrée mercredi', devisId: 'q_112', photos: 12 },
  { id: 'ch_dupuis', clientId: 'c_dupuis', name: 'Maison Dupuis · borne IRVE', address: '15 chemin de Crépieux', city: 'Caluire-et-Cuire', status: 'a_planifier', startDate: d(5), endDate: d(6), progress: 10, budgetHt: 1904.2, costHt: 120, team: ['e_karim'], nextStep: 'Attente accord Enedis', devisId: 'q_119', photos: 2 },
  { id: 'ch_morel', clientId: 'c_roux', name: 'Dépannage Roux · tableau', address: '3 place Lazare Goujon', city: 'Villeurbanne', status: 'termine', startDate: d(-40), endDate: d(-38), progress: 100, budgetHt: 640, costHt: 310, team: ['e_karim'], nextStep: 'Demander un avis', photos: 6 },
];

const ev = (h: Facture['einvoice']['status'], days: number): Facture['einvoice'] => ({
  status: h,
  platform: 'Brix (PA partenaire)',
  format: 'factur-x',
  history: (['deposee', 'emise', 'recue', 'mise_a_disposition', 'prise_en_charge', 'approuvee', 'encaissee'] as const)
    .slice(0, Math.max(1, ['deposee', 'emise', 'recue', 'mise_a_disposition', 'prise_en_charge', 'approuvee', 'encaissee'].indexOf(h) + 1))
    .map((s, i) => ({ at: d(days + Math.min(i, 3)), status: s })),
});

export const demoFactures: Facture[] = [
  { id: 'f_201', number: 'F-2026-201', kind: 'acompte', clientId: 'c_lefevre', chantierId: 'ch_lefevre', devisId: 'q_121', title: 'Acompte 30 % · Rénovation T3', status: 'payee', issueDate: d(-26), dueDate: d(-26), lines: [L('Acompte 30 % sur devis D-2026-121', 1, 'forfait', 1508.52, 0, { kind: 'ouvrage' })], paidAmount: 1659.37, einvoice: { status: 'non_transmise', history: [] }, remindersSent: 0 },
  { id: 'f_198', number: 'F-2026-198', kind: 'situation', clientId: 'c_tilleuls', chantierId: 'ch_tilleuls', devisId: 'q_110', title: 'Situation n°2 · Éclairage LED', status: 'en_retard', issueDate: d(-42), dueDate: d(-12), lines: [L('Situation n°2 · 45 % cumulés', 1, 'forfait', 2180, 0, { kind: 'ouvrage', vatRate: 10 })], paidAmount: 0, retenueGarantie: 5, einvoice: ev('approuvee', -42), remindersSent: 1 },
  { id: 'f_199', number: 'F-2026-199', kind: 'facture', clientId: 'c_roux', title: 'Dépannage tableau', status: 'en_retard', issueDate: d(-25), dueDate: d(-5), lines: [L('Recherche de panne et remplacement disjoncteur', 1, 'forfait', 640, 310, { kind: 'ouvrage' })], paidAmount: 0, einvoice: { status: 'non_transmise', history: [] }, remindersSent: 1 },
  { id: 'f_202', number: 'F-2026-202', kind: 'acompte', clientId: 'c_nguyen', chantierId: 'ch_nguyen', devisId: 'q_112', title: 'Acompte 30 % · VDI', status: 'payee', issueDate: d(-33), dueDate: d(-33), lines: [L('Acompte 30 % sur devis D-2026-112', 1, 'forfait', 1606.2, 0, { kind: 'ouvrage', vatRate: 20 })], paidAmount: 1927.44, einvoice: ev('encaissee', -33), remindersSent: 0 },
  { id: 'f_203', number: 'F-2026-203', kind: 'situation', clientId: 'c_martin', chantierId: 'ch_martin', devisId: 'q_115', title: 'Situation n°1 · Triphasé', status: 'envoyee', issueDate: d(-7), dueDate: d(23), lines: [L('Situation n°1 · 60 %', 1, 'forfait', 3744, 0, { kind: 'ouvrage', vatRate: 20 })], paidAmount: 0, einvoice: ev('prise_en_charge', -7), remindersSent: 0 },
  { id: 'f_204', number: 'F-2026-204', kind: 'facture', clientId: 'c_tilleuls', title: 'Remplacement minuteries', status: 'payee', issueDate: d(-18), dueDate: d(12), lines: [L('Minuterie et main d\'œuvre', 1, 'forfait', 980, 420, { kind: 'ouvrage', vatRate: 10 })], paidAmount: 1078, einvoice: ev('encaissee', -18), remindersSent: 0 },
  { id: 'f_205', number: 'F-2026-205', kind: 'facture', clientId: 'c_benoit', title: 'Diagnostic électrique', status: 'envoyee', issueDate: d(-3), dueDate: d(27), lines: [L('Diagnostic et rapport', 1, 'forfait', 180, 40, { kind: 'ouvrage', vatRate: 20 })], paidAmount: 0, einvoice: { status: 'non_transmise', history: [] }, remindersSent: 0 },
  { id: 'f_196', number: 'F-2026-196', kind: 'facture', clientId: 'c_martin', title: 'Dépannage chambre froide', status: 'payee', issueDate: d(-12), dueDate: d(-2), lines: [L('Intervention urgente', 1, 'forfait', 2960, 900, { kind: 'ouvrage', vatRate: 20 })], paidAmount: 3552, einvoice: ev('encaissee', -12), remindersSent: 0 },
  { id: 'f_195', number: 'F-2026-195', kind: 'facture', clientId: 'c_nguyen', title: 'Prises supplémentaires', status: 'payee', issueDate: d(-15), dueDate: d(-5), lines: [L('Ajout de 8 prises', 1, 'forfait', 1840, 700, { kind: 'ouvrage', vatRate: 20 })], paidAmount: 2208, einvoice: ev('encaissee', -15), remindersSent: 0 },
];

const week = (offset: number) => d(offset);
export const demoEvents: PlanningEvent[] = [
  ...[0, 1, 2, 3, 4].flatMap((i) => [
    { id: `pe_y${i}`, employeeId: 'e_yanis', chantierId: i < 3 ? 'ch_lefevre' : 'ch_tilleuls', title: i < 3 ? 'Lefèvre · T3' : 'Tilleuls · cage B', date: week(i), start: '08:00', end: '12:00', kind: 'chantier' as const },
    { id: `pe_y${i}b`, employeeId: 'e_yanis', chantierId: i < 3 ? 'ch_lefevre' : 'ch_tilleuls', title: i < 3 ? 'Lefèvre · saignées séjour' : 'Tilleuls · cage C', date: week(i), start: '13:00', end: '17:00', kind: 'chantier' as const },
    { id: `pe_m${i}`, employeeId: 'e_mehdi', chantierId: i % 2 ? 'ch_nguyen' : 'ch_martin', title: i % 2 ? 'Dr Nguyen · VDI' : 'Boulangerie Martin', date: week(i), start: '07:30', end: '12:00', kind: 'chantier' as const },
    { id: `pe_m${i}b`, employeeId: 'e_mehdi', chantierId: 'ch_nguyen', title: 'Dr Nguyen · baie', date: week(i), start: '13:30', end: '17:00', kind: 'chantier' as const },
    { id: `pe_l${i}`, employeeId: 'e_lucas', chantierId: 'ch_lefevre', title: i === 2 ? 'CFA · cours' : 'Lefèvre · T3', date: week(i), start: '08:00', end: '16:30', kind: i === 2 ? ('formation' as const) : ('chantier' as const) },
  ]),
  { id: 'pe_k0', employeeId: 'e_karim', title: 'RDV Garnier · relecture devis', date: week(0), start: '09:30', end: '10:30', kind: 'rdv' },
  { id: 'pe_k1', employeeId: 'e_karim', chantierId: 'ch_lefevre', title: 'Lefèvre · point client', date: week(0), start: '11:00', end: '12:00', kind: 'chantier' },
  { id: 'pe_k2', employeeId: 'e_karim', title: 'Visite Mme Benoît · domotique', date: week(0), start: '14:00', end: '15:30', kind: 'rdv' },
  { id: 'pe_k3', employeeId: 'e_karim', title: 'Entretien annuel · SCI Tilleuls', date: week(1), start: '08:30', end: '10:00', kind: 'sav' },
  { id: 'pe_k4', employeeId: 'e_karim', chantierId: 'ch_dupuis', title: 'Dupuis · pose borne', date: week(5), start: '08:00', end: '16:00', kind: 'chantier' },
  { id: 'pe_k5', employeeId: 'e_karim', title: 'Comptable · bilan trimestriel', date: week(2), start: '16:00', end: '17:00', kind: 'interne' },
];

export const demoLeads: Lead[] = [
  { id: 'ld_1', name: 'Sarah Kaci', phone: '06 51 23 98 70', email: 'sarah.kaci@gmail.com', city: 'Villeurbanne', request: 'Installer 4 prises et un radiateur dans une chambre, maison de 1975.', source: 'site', receivedAt: d(0), status: 'nouveau', estimate: 980, score: 82 },
  { id: 'ld_2', name: 'Restaurant Le Comptoir', phone: '04 78 52 10 20', city: 'Lyon 2e', request: 'Disjoncteur qui saute en cuisine pendant le service, urgent.', source: 'telephone', receivedAt: d(0), status: 'nouveau', estimate: 450, score: 91 },
  { id: 'ld_3', name: 'Paul Arnaud', phone: '06 77 12 34 56', city: 'Bron', request: 'Devis pour borne de recharge Tesla, garage à 12 m du tableau.', source: 'plateforme', receivedAt: d(-1), status: 'qualifie', estimate: 1650, score: 74 },
  { id: 'ld_4', name: 'Inès Fabre', phone: '07 45 89 12 30', city: 'Lyon 8e', request: 'Rénovation complète électricité appartement 68 m², achat récent.', source: 'google', receivedAt: d(-2), status: 'rdv', estimate: 7800, score: 88 },
  { id: 'ld_5', name: 'Copropriété Bellecour', phone: '04 72 41 00 00', city: 'Lyon 2e', request: 'Contrat d\'entretien des parties communes, 2 bâtiments.', source: 'parrainage', receivedAt: d(-4), status: 'devis', estimate: 3200, score: 69 },
  { id: 'ld_6', name: 'Hugo Lemaire', phone: '06 10 20 30 40', city: 'Vénissieux', request: 'Prix pour changer 3 interrupteurs.', source: 'whatsapp', receivedAt: d(-6), status: 'perdu', estimate: 160, score: 22 },
];

export const demoBob: BobAction[] = [
  { id: 'b1', at: '02:14', icon: 'Send', text: "J'ai relancé 2 clients", detail: 'M. Roux (704 €) et SCI Les Tilleuls (2 398 €)', cta: 'Voir les mails', to: '/app/relances', done: true },
  { id: 'b2', at: '03:40', icon: 'FileText', text: "J'ai préparé le devis de Mme Benoît", detail: 'depuis ta note vocale de 18 h 42 · 1 304 € HT', cta: 'Relire', to: '/app/devis/q_122' },
  { id: 'b3', at: '05:05', icon: 'Landmark', text: "J'ai rapproché 6 paiements", detail: '1 virement de 640 € reste sans facture', cta: 'Associer', to: '/app/tresorerie', done: true },
  { id: 'b4', at: '05:30', icon: 'Truck', text: 'Commande Rexel prête pour lundi', detail: '14 articles · 612,40 € HT pour le chantier Lefèvre', cta: 'Valider', to: '/app/fournisseurs' },
];

export const demoExpenses: Expense[] = [
  { id: 'x1', date: d(-1), supplier: 'Total Energies', category: 'Carburant', amountTtc: 86.4, vat: 14.4, employeeId: 'e_yanis', status: 'a_valider' },
  { id: 'x2', date: d(-2), supplier: 'Rexel Villeurbanne', category: 'Petites fournitures', amountTtc: 42.9, vat: 7.15, chantierId: 'ch_lefevre', employeeId: 'e_karim', status: 'validee' },
  { id: 'x3', date: d(-3), supplier: 'Boulangerie Paul', category: 'Repas', amountTtc: 13.8, vat: 1.25, employeeId: 'e_mehdi', status: 'a_valider' },
  { id: 'x4', date: d(-5), supplier: 'Parking Lyon Part-Dieu', category: 'Stationnement', amountTtc: 9.5, vat: 1.58, chantierId: 'ch_nguyen', employeeId: 'e_mehdi', status: 'remboursee' },
];

export const demoBank: BankTx[] = [
  { id: 't1', date: d(-1), label: 'VIR SCI LES TILLEULS', amount: 1078, matchedFactureId: 'f_204' },
  { id: 't2', date: d(-2), label: 'VIR BOULANGERIE MARTIN', amount: 3552, matchedFactureId: 'f_196' },
  { id: 't3', date: d(-3), label: 'PRLV URSSAF', amount: -1840, category: 'Charges sociales' },
  { id: 't4', date: d(-3), label: 'CB REXEL 69 VILLEURBANNE', amount: -612.4, category: 'Achats matériel' },
  { id: 't5', date: d(-4), label: 'VIR M ANTOINE DUPUIS', amount: 640 },
  { id: 't6', date: d(-6), label: 'VIR CABINET DR NGUYEN', amount: 2208, matchedFactureId: 'f_195' },
  { id: 't7', date: d(-8), label: 'PRLV AXA ASSURANCE DECENNALE', amount: -214.5, category: 'Assurances' },
  { id: 't8', date: d(-9), label: 'CARTE TOTAL ENERGIES', amount: -86.4, category: 'Carburant' },
  { id: 't9', date: d(-12), label: 'VIR SALAIRES NOVEMBRE', amount: -5960, category: 'Salaires' },
];

export const DEMO_CASH_BALANCE = 38650;
