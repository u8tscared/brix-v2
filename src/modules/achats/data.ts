// Données de démonstration du département Achats (hors fournisseurs) : stock,
// véhicules, outillage et sous-traitants de Benali Électricité.

import { dayOffset as d } from '@/lib/format';

/* ------------------------------------------------------------------ Stock */

export type LocationKey = 'depot' | 'van_yanis' | 'van_mehdi';
export const LOCATIONS: { key: LocationKey; name: string; short: string; employeeId?: string }[] = [
  { key: 'depot', name: 'Dépôt de Villeurbanne', short: 'Dépôt' },
  { key: 'van_yanis', name: 'Kangoo de Yanis', short: 'Kangoo', employeeId: 'e_yanis' },
  { key: 'van_mehdi', name: 'Trafic de Mehdi', short: 'Trafic', employeeId: 'e_mehdi' },
];

export interface Article {
  id: string;
  ref: string;
  name: string;
  category: string;
  unit: string;
  cost: number; // prix d'achat HT
  supplier: string;
  barcode: string;
  min: number; // seuil du dépôt
  vanMin: number; // seuil par camion
  qty: Record<LocationKey, number>;
}

export const demoArticles = (): Article[] => [
  { id: 'a1', ref: 'Nexans 3G2.5', name: 'Câble R2V 3G2,5 mm²', category: 'Câbles', unit: 'm', cost: 1.42, supplier: 'Cédéo', barcode: '3410530201254', min: 200, vanMin: 50, qty: { depot: 340, van_yanis: 64, van_mehdi: 22 } },
  { id: 'a2', ref: 'Nexans 3G1.5', name: 'Câble R2V 3G1,5 mm²', category: 'Câbles', unit: 'm', cost: 0.98, supplier: 'Cédéo', barcode: '3410530201155', min: 200, vanMin: 50, qty: { depot: 410, van_yanis: 80, van_mehdi: 75 } },
  { id: 'a3', ref: 'ICTA 3422 20', name: 'Gaine ICTA Ø 20 (couronne 100 m)', category: 'Conduits', unit: 'couronne', cost: 31.5, supplier: 'Rexel', barcode: '3245060022204', min: 6, vanMin: 1, qty: { depot: 4, van_yanis: 1, van_mehdi: 2 } },
  { id: 'a4', ref: 'Legrand 406774', name: 'Disjoncteur DX³ 16 A courbe C', category: 'Protection', unit: 'u', cost: 7.1, supplier: 'Rexel', barcode: '3414971406774', min: 20, vanMin: 6, qty: { depot: 32, van_yanis: 8, van_mehdi: 3 } },
  { id: 'a5', ref: 'Legrand 406775', name: 'Disjoncteur DX³ 20 A courbe C', category: 'Protection', unit: 'u', cost: 7.6, supplier: 'Rexel', barcode: '3414971406775', min: 15, vanMin: 4, qty: { depot: 18, van_yanis: 5, van_mehdi: 4 } },
  { id: 'a6', ref: 'Legrand 411650', name: 'Interrupteur différentiel 40 A 30 mA type A', category: 'Protection', unit: 'u', cost: 44.2, supplier: 'Rexel', barcode: '3414971411650', min: 6, vanMin: 1, qty: { depot: 3, van_yanis: 1, van_mehdi: 0 } },
  { id: 'a7', ref: 'Legrand 067111', name: 'Prise 2P+T Céliane blanc', category: 'Appareillage', unit: 'u', cost: 12.8, supplier: 'Rexel', barcode: '3414970671118', min: 30, vanMin: 10, qty: { depot: 46, van_yanis: 12, van_mehdi: 9 } },
  { id: 'a8', ref: 'Schneider IMT35021', name: 'Boîte d’encastrement Multifix Ø 67', category: 'Appareillage', unit: 'u', cost: 0.62, supplier: 'Cédéo', barcode: '3606480350210', min: 150, vanMin: 40, qty: { depot: 260, van_yanis: 55, van_mehdi: 48 } },
  { id: 'a9', ref: 'Wago 221-413', name: 'Bornes Wago 221 3 entrées (boîte de 50)', category: 'Connexion', unit: 'boîte', cost: 14.9, supplier: 'Rexel', barcode: '4055143704170', min: 8, vanMin: 2, qty: { depot: 5, van_yanis: 2, van_mehdi: 1 } },
  { id: 'a10', ref: 'Aric 50820', name: 'Spot LED encastré 7 W IP65', category: 'Éclairage', unit: 'u', cost: 26.4, supplier: 'Rexel', barcode: '3700221508206', min: 12, vanMin: 0, qty: { depot: 14, van_yanis: 0, van_mehdi: 0 } },
  { id: 'a11', ref: 'Legrand 031908', name: 'Colliers Colring 180 mm (sachet de 100)', category: 'Fixation', unit: 'sachet', cost: 5.3, supplier: 'Rexel', barcode: '3245060319083', min: 10, vanMin: 2, qty: { depot: 12, van_yanis: 3, van_mehdi: 2 } },
  { id: 'a12', ref: 'Fischer 50155', name: 'Chevilles DuoPower 6×30 (boîte de 100)', category: 'Fixation', unit: 'boîte', cost: 9.8, supplier: 'Würth', barcode: '4048962501553', min: 6, vanMin: 1, qty: { depot: 7, van_yanis: 1, van_mehdi: 1 } },
];

export interface Movement {
  id: string;
  date: string;
  articleId: string;
  qty: number;
  from: LocationKey;
  to?: LocationKey;
  chantierId?: string;
  employeeId?: string;
  kind: 'sortie' | 'entree' | 'transfert' | 'inventaire';
}

export const demoMovements = (): Movement[] => [
  { id: 'm1', date: d(0), articleId: 'a1', qty: 42, from: 'van_yanis', chantierId: 'ch_lefevre', employeeId: 'e_yanis', kind: 'sortie' },
  { id: 'm2', date: d(0), articleId: 'a8', qty: 14, from: 'van_yanis', chantierId: 'ch_lefevre', employeeId: 'e_yanis', kind: 'sortie' },
  { id: 'm3', date: d(-1), articleId: 'a6', qty: 2, from: 'van_mehdi', chantierId: 'ch_martin', employeeId: 'e_mehdi', kind: 'sortie' },
  { id: 'm4', date: d(-1), articleId: 'a4', qty: 6, from: 'van_mehdi', chantierId: 'ch_martin', employeeId: 'e_mehdi', kind: 'sortie' },
  { id: 'm5', date: d(-2), articleId: 'a7', qty: 8, from: 'depot', chantierId: 'ch_lefevre', employeeId: 'e_karim', kind: 'sortie' },
  { id: 'm6', date: d(-3), articleId: 'a10', qty: 12, from: 'depot', chantierId: 'ch_tilleuls', employeeId: 'e_yanis', kind: 'sortie' },
  { id: 'm7', date: d(-3), articleId: 'a3', qty: 1, from: 'depot', chantierId: 'ch_nguyen', employeeId: 'e_mehdi', kind: 'sortie' },
  { id: 'm8', date: d(-4), articleId: 'a1', qty: 60, from: 'depot', to: 'van_yanis', employeeId: 'e_yanis', kind: 'transfert' },
  { id: 'm9', date: d(-6), articleId: 'a9', qty: 2, from: 'van_mehdi', chantierId: 'ch_nguyen', employeeId: 'e_mehdi', kind: 'sortie' },
];

/* ------------------------------------------------------------------ Véhicules */

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  driverId?: string;
  km: number;
  kmAt: string;
  nextServiceKm: number;
  nextServiceDate: string;
  ctDate: string;
  insuranceDate: string;
  insurer: string;
  critair: string;
  energy: string;
}

export const demoVehicles = (): Vehicle[] => [
  { id: 'v1', name: 'Renault Kangoo Van E-Tech', plate: 'GH-482-QT', driverId: 'e_yanis', km: 38420, kmAt: d(-3), nextServiceKm: 40000, nextServiceDate: d(70), ctDate: d(410), insuranceDate: d(46), insurer: 'AXA Flotte', critair: '0 (électrique)', energy: 'Électrique' },
  { id: 'v2', name: 'Renault Trafic L2H1', plate: 'FS-207-LB', driverId: 'e_mehdi', km: 126950, kmAt: d(-1), nextServiceKm: 127500, nextServiceDate: d(12), ctDate: d(19), insuranceDate: d(46), insurer: 'AXA Flotte', critair: '2', energy: 'Diesel' },
  { id: 'v3', name: 'Peugeot Partner', plate: 'EZ-651-MC', driverId: 'e_karim', km: 98310, kmAt: d(-7), nextServiceKm: 105000, nextServiceDate: d(160), ctDate: d(280), insuranceDate: d(46), insurer: 'AXA Flotte', critair: '2', energy: 'Diesel' },
];

/* ------------------------------------------------------------------ Outillage et EPI */

export interface Tool {
  id: string;
  name: string;
  brand: string;
  serial: string;
  category: 'Électroportatif' | 'Mesure' | 'EPI' | 'Accès';
  holderId?: string; // personne qui l'a ; vide = au dépôt
  since?: string;
  checkMonths?: number; // vérification périodique
  lastCheck?: string;
  checkLabel?: string;
}

export const demoTools = (): Tool[] => [
  { id: 't1', name: 'Perforateur SDS-Plus 18 V', brand: 'Hilti TE 4-A22', serial: 'HT-4A22-88412', category: 'Électroportatif', holderId: 'e_yanis', since: d(-40), checkMonths: 12, lastCheck: d(-300), checkLabel: 'Contrôle électrique' },
  { id: 't2', name: 'Visseuse à chocs 18 V', brand: 'Makita DTD172', serial: 'MK-172-55120', category: 'Électroportatif', holderId: 'e_mehdi', since: d(-120), checkMonths: 12, lastCheck: d(-200), checkLabel: 'Contrôle électrique' },
  { id: 't3', name: 'Rainureuse murale', brand: 'Bosch GNF 35 CA', serial: 'BO-35CA-20981', category: 'Électroportatif', holderId: 'e_lucas', since: d(-2), checkMonths: 12, lastCheck: d(-380), checkLabel: 'Contrôle électrique' },
  { id: 't4', name: 'Testeur d’installation multifonction', brand: 'Fluke 1664 FC', serial: 'FL-1664-3310', category: 'Mesure', holderId: 'e_karim', since: d(-10), checkMonths: 12, lastCheck: d(-340), checkLabel: 'Étalonnage' },
  { id: 't5', name: 'Vérificateur d’absence de tension', brand: 'Catu MS-958', serial: 'CA-958-1209', category: 'Mesure', holderId: 'e_yanis', since: d(-200), checkMonths: 12, lastCheck: d(-150), checkLabel: 'Vérification' },
  { id: 't6', name: 'Gants isolants classe 0', brand: 'Catu CG-05', serial: 'CA-CG05-771', category: 'EPI', holderId: 'e_mehdi', since: d(-90), checkMonths: 6, lastCheck: d(-176), checkLabel: 'Essai diélectrique' },
  { id: 't7', name: 'Harnais antichute', brand: 'Petzl Newton', serial: 'PZ-NEW-4402', category: 'EPI', checkMonths: 12, lastCheck: d(-330), checkLabel: 'Vérification annuelle' },
  { id: 't8', name: 'Échafaudage roulant 6 m', brand: 'Tubesca Alu', serial: 'TU-ALU-6M-12', category: 'Accès', checkMonths: 3, lastCheck: d(-70), checkLabel: 'Examen trimestriel' },
  { id: 't9', name: 'Détecteur de câbles et métaux', brand: 'Bosch D-tect 120', serial: 'BO-DT120-551', category: 'Mesure', checkMonths: 24, lastCheck: d(-400), checkLabel: 'Vérification' },
];

/* ------------------------------------------------------------------ Sous-traitants */

export interface SubContract {
  id: string;
  chantierId: string;
  object: string;
  amountHt: number;
  signedAt: string;
  status: 'brouillon' | 'signe' | 'termine';
  invoiced: number;
}

export interface SubContractor {
  id: string;
  name: string;
  trade: string;
  siret: string;
  contact: string;
  phone: string;
  email: string;
  urssafAt: string; // date de l'attestation de vigilance
  kbisAt: string;
  decennale: { insurer: string; expires: string };
  rcproExpires: string;
  accessChantierId?: string;
  contracts: SubContract[];
}

export const demoSubs = (): SubContractor[] => [
  {
    id: 's1', name: 'Rhône Plâtrerie Finitions', trade: 'Plâtrier plaquiste', siret: '851 236 974 00018', contact: 'Julien Faure', phone: '06 41 22 87 15', email: 'contact@rhone-platrerie.fr',
    urssafAt: d(-62), kbisAt: d(-40), decennale: { insurer: 'MAAF Pro', expires: d(410) }, rcproExpires: d(410), accessChantierId: 'ch_lefevre',
    contracts: [{ id: 'sc1', chantierId: 'ch_lefevre', object: 'Rebouchage des saignées et reprise des enduits', amountHt: 1850, signedAt: d(-8), status: 'signe', invoiced: 0 }],
  },
  {
    id: 's2', name: 'Lyon Tranchées TP', trade: 'Terrassement et VRD', siret: '799 541 203 00027', contact: 'Sofiane Haddad', phone: '06 77 03 41 90', email: 's.haddad@lyon-tranchees.fr',
    urssafAt: d(-171), kbisAt: d(-171), decennale: { insurer: 'SMABTP', expires: d(230) }, rcproExpires: d(230),
    contracts: [{ id: 'sc2', chantierId: 'ch_dupuis', object: 'Tranchée de 12 m pour l’alimentation de la borne', amountHt: 980, signedAt: d(-2), status: 'brouillon', invoiced: 0 }],
  },
  {
    id: 's3', name: 'Clim’Confort Services', trade: 'Climatisation et pompes à chaleur', siret: '842 017 665 00031', contact: 'Nathalie Brun', phone: '04 72 90 14 66', email: 'n.brun@climconfort.fr',
    urssafAt: d(-201), kbisAt: d(-210), decennale: { insurer: 'AXA', expires: d(-12) }, rcproExpires: d(150),
    contracts: [{ id: 'sc3', chantierId: 'ch_nguyen', object: 'Pose d’un split mural salle d’attente', amountHt: 6200, signedAt: d(-30), status: 'signe', invoiced: 3100 }],
  },
];
