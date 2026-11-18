// Factures fournisseurs reçues par la plateforme agréée (démo).

import { dayOffset } from '@/lib/format';

export interface SupplierInvoice {
  id: string;
  supplier: string;
  siren: string;
  number: string;
  date: string;
  dueDate: string;
  ht: number;
  tva: number;
  label: string;
  chantierId?: string;
  /** Ligne bancaire qui correspond (rapprochement proposé). */
  bankHint?: { label: string; date: string; amount: number };
  lines: { label: string; qty: number; unit: string; price: number }[];
}

export const SUPPLIER_INVOICES: SupplierInvoice[] = [
  {
    id: 'si_rexel',
    supplier: 'Rexel France',
    siren: '542065479',
    number: 'REX-2611-4471',
    date: dayOffset(-2),
    dueDate: dayOffset(43),
    ht: 510.33,
    tva: 102.07,
    label: 'Matériel chantier Lefèvre',
    chantierId: 'ch_lefevre',
    bankHint: { label: 'CB REXEL 69 VILLEURBANNE', date: dayOffset(-3), amount: -612.4 },
    lines: [
      { label: 'Coffret Drivia 3 rangées', qty: 1, unit: 'u', price: 82.9 },
      { label: 'Disjoncteur DX³ 16 A', qty: 8, unit: 'u', price: 7.1 },
      { label: 'Prise Céliane 2P+T', qty: 20, unit: 'u', price: 12.8 },
      { label: 'Spot LED 7 W IP65', qty: 2, unit: 'u', price: 26.4 },
    ],
  },
  {
    id: 'si_cedeo',
    supplier: 'Cédéo',
    siren: '311349209',
    number: 'CED-98123',
    date: dayOffset(-9),
    dueDate: dayOffset(21),
    ht: 119.28,
    tva: 23.86,
    label: 'Câble R2V 3G2,5 · 84 m',
    chantierId: 'ch_lefevre',
    lines: [{ label: 'Câble R2V 3G2,5 mm²', qty: 84, unit: 'm', price: 1.42 }],
  },
  {
    id: 'si_pointp',
    supplier: 'Point.P',
    siren: '485206721',
    number: 'PP-77-201845',
    date: dayOffset(-5),
    dueDate: dayOffset(25),
    ht: 86.5,
    tva: 17.3,
    label: 'Plâtre et enduit de rebouchage',
    chantierId: 'ch_lefevre',
    lines: [
      { label: 'Plâtre gros 25 kg', qty: 4, unit: 'u', price: 12.9 },
      { label: 'Enduit de rebouchage', qty: 3, unit: 'u', price: 11.63 },
    ],
  },
  {
    id: 'si_sonepar',
    supplier: 'Sonepar',
    siren: '572197051',
    number: 'SON-1126-0932',
    date: dayOffset(-12),
    dueDate: dayOffset(18),
    ht: 1092.6,
    tva: 218.52,
    label: 'Baie de brassage et RJ45 · Cabinet Nguyen',
    chantierId: 'ch_nguyen',
    lines: [
      { label: 'Baie 19" 12U', qty: 1, unit: 'u', price: 430 },
      { label: 'Prise RJ45 cat. 6A', qty: 18, unit: 'u', price: 21 },
      { label: 'Dalle LED 60x60', qty: 5, unit: 'u', price: 56.92 },
    ],
  },
  {
    id: 'si_kiloutou',
    supplier: 'Kiloutou',
    siren: '642061542',
    number: 'KIL-LY-55120',
    date: dayOffset(-15),
    dueDate: dayOffset(-1),
    ht: 245,
    tva: 49,
    label: 'Location nacelle 2 jours · SCI Les Tilleuls',
    chantierId: 'ch_tilleuls',
    lines: [{ label: 'Nacelle ciseaux 8 m', qty: 2, unit: 'jour', price: 122.5 }],
  },
];
