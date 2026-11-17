// Bibliothèque d'ouvrages que Bob connaît pour chiffrer un devis dicté.
// Prix HT fournis-posés « moyens » d'un artisan en région lyonnaise (2026),
// remplacés par la mémoire de prix quand l'artisan en a une.

import type { DevisLigne } from '@/lib/types';
import { uid } from '@/lib/format';
import { norm } from './text';

export interface LibItem {
  keys: string[];
  designation: string;
  unit: string;
  price: number;
  cost: number;
  hours: number; // heures de pose par unité
  supplier?: string;
}

export const LIBRARY: LibItem[] = [
  // Électricité
  { keys: ['prise rj45', 'rj45', 'prise reseau'], designation: 'Prise RJ45 catégorie 6A', unit: 'u', price: 46, cost: 21, hours: 0.6, supplier: 'Rexel' },
  { keys: ['prise usb'], designation: 'Prise 2P+T avec chargeur USB A+C', unit: 'u', price: 58, cost: 34, hours: 0.5, supplier: 'Rexel' },
  { keys: ['prise 32', 'prise cuisson', 'prise four', 'prise plaque'], designation: 'Sortie de câble 32 A pour plaque de cuisson', unit: 'u', price: 74, cost: 38, hours: 1.2, supplier: 'Rexel' },
  { keys: ['prise', 'pc', 'prise de courant'], designation: 'Prise 2P+T 16 A Céliane blanc', unit: 'u', price: 24.5, cost: 12.8, hours: 0.5, supplier: 'Rexel' },
  { keys: ['va-et-vient', 'va et vient'], designation: 'Interrupteur va-et-vient Céliane', unit: 'u', price: 29.9, cost: 15.2, hours: 0.5, supplier: 'Rexel' },
  { keys: ['interrupteur', 'inter'], designation: 'Interrupteur simple allumage Céliane', unit: 'u', price: 22.9, cost: 11.4, hours: 0.4, supplier: 'Rexel' },
  { keys: ['radiateur', 'convecteur', 'chauffage'], designation: 'Radiateur à inertie 1 500 W programmable', unit: 'u', price: 389, cost: 248, hours: 1.5, supplier: 'Rexel' },
  { keys: ['seche-serviette', 'seche serviette'], designation: 'Sèche-serviettes électrique 750 W', unit: 'u', price: 329, cost: 205, hours: 1.5, supplier: 'Rexel' },
  { keys: ['spot', 'spots'], designation: 'Spot LED encastré 7 W IP65', unit: 'u', price: 38.9, cost: 26.4, hours: 0.4, supplier: 'Rexel' },
  { keys: ['point lumineux', 'luminaire', 'plafonnier', 'dcl', 'lampe', 'eclairage'], designation: 'Point lumineux DCL avec douille', unit: 'u', price: 34, cost: 14, hours: 0.6, supplier: 'Rexel' },
  { keys: ['detecteur de fumee', 'daaf', 'detecteur fumee'], designation: 'Détecteur de fumée DAAF NF', unit: 'u', price: 39, cost: 18, hours: 0.25, supplier: 'Rexel' },
  { keys: ['detecteur', 'detecteur de presence'], designation: 'Détecteur de présence 360°', unit: 'u', price: 89, cost: 52, hours: 0.6, supplier: 'Rexel' },
  { keys: ['differentiel', 'interrupteur differentiel'], designation: 'Interrupteur différentiel 40 A 30 mA type A', unit: 'u', price: 64.9, cost: 44.2, hours: 0.3, supplier: 'Rexel' },
  { keys: ['disjoncteur'], designation: 'Disjoncteur DX³ 16 A courbe C', unit: 'u', price: 11.2, cost: 7.1, hours: 0.2, supplier: 'Rexel' },
  { keys: ['tableau', 'coffret', 'tableau electrique'], designation: 'Tableau 3 rangées équipé (différentiels et disjoncteurs)', unit: 'u', price: 890, cost: 540, hours: 6, supplier: 'Rexel' },
  { keys: ['borne', 'irve', 'recharge', 'wallbox'], designation: 'Borne de recharge 7,4 kW avec protection', unit: 'u', price: 1180, cost: 790, hours: 7, supplier: 'Rexel' },
  { keys: ['vmc'], designation: 'VMC simple flux hygroréglable B', unit: 'u', price: 480, cost: 260, hours: 4, supplier: 'Rexel' },
  { keys: ['interphone', 'visiophone'], designation: 'Visiophone 7 pouces 2 fils', unit: 'u', price: 289, cost: 168, hours: 2, supplier: 'Rexel' },
  { keys: ['volet', 'volet roulant'], designation: 'Motorisation de volet roulant connectée', unit: 'u', price: 189, cost: 112, hours: 1.5, supplier: 'Rexel' },
  { keys: ['cable', 'metre de cable'], designation: 'Câble R2V 3G2,5 mm²', unit: 'm', price: 2.35, cost: 1.42, hours: 0.05, supplier: 'Cédéo' },
  // Plomberie
  { keys: ['chauffe-eau', 'chauffe eau', 'ballon', 'cumulus'], designation: 'Chauffe-eau électrique 200 L vertical', unit: 'u', price: 690, cost: 430, hours: 4, supplier: 'Cédéo' },
  { keys: ['mitigeur', 'robinet'], designation: 'Mitigeur lavabo chromé', unit: 'u', price: 119, cost: 64, hours: 1, supplier: 'Cédéo' },
  { keys: ['wc', 'toilette', 'cuvette'], designation: 'WC suspendu avec bâti-support', unit: 'u', price: 690, cost: 410, hours: 5, supplier: 'Cédéo' },
  { keys: ['lavabo', 'vasque'], designation: 'Meuble vasque 80 cm', unit: 'u', price: 520, cost: 310, hours: 3, supplier: 'Cédéo' },
  { keys: ['douche', 'receveur'], designation: 'Receveur extra-plat 90 x 120 et paroi', unit: 'u', price: 890, cost: 520, hours: 8, supplier: 'Cédéo' },
  // Second œuvre
  { keys: ['peinture', 'm2 de peinture', 'mur'], designation: 'Peinture murs 2 couches acrylique velours', unit: 'm²', price: 24, cost: 4.5, hours: 0.35 },
  { keys: ['carrelage', 'faience'], designation: 'Pose de carrelage collé (hors fourniture)', unit: 'm²', price: 45, cost: 6, hours: 0.8 },
  { keys: ['placo', 'cloison', 'plaque de platre'], designation: 'Cloison 72/48 avec isolant', unit: 'm²', price: 52, cost: 18, hours: 0.6 },
];

export function findItem(label: string): LibItem | null {
  const n = norm(label);
  let best: LibItem | null = null;
  let bestLen = 0;
  for (const it of LIBRARY) {
    for (const k of it.keys) {
      const re = new RegExp(`\\b${k.replace(/[-]/g, '[- ]?')}s?\\b`);
      const score = k.length + (/[ -]/.test(k) ? 20 : 0);
      if (re.test(n) && score > bestLen) {
        best = it;
        bestLen = score;
      }
    }
  }
  return best;
}

export function lineFrom(item: LibItem, qty: number, vat: number): DevisLigne {
  return {
    id: uid('l'),
    kind: 'fourniture',
    designation: item.designation,
    quantity: qty,
    unit: item.unit,
    unitPriceHt: item.price,
    unitCostHt: item.cost,
    vatRate: vat,
    supplier: item.supplier,
    source: 'bob',
  };
}

export function laborLine(hours: number, rate: number, hourlyCost: number, vat: number): DevisLigne {
  return {
    id: uid('l'),
    kind: 'main_oeuvre',
    designation: 'Pose, raccordement et essais',
    detail: "Main d'œuvre · ton taux horaire",
    quantity: Math.max(1, Math.round(hours * 2) / 2),
    unit: 'h',
    unitPriceHt: rate,
    unitCostHt: hourlyCost,
    vatRate: vat,
    source: 'taux',
  };
}
