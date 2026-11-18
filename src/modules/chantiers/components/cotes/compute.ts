// Calculs de métrés et génération des lignes de devis selon le métier.

import { uid } from '@/lib/format';
import type { DevisLigne, LineKind, TradeKey } from '@/lib/types';

export type RoomType = 'sejour' | 'chambre' | 'cuisine' | 'sdb' | 'entree' | 'wc' | 'couloir' | 'bureau' | 'autre';

export const ROOM_TYPES: { key: RoomType; label: string }[] = [
  { key: 'sejour', label: 'Séjour' },
  { key: 'chambre', label: 'Chambre' },
  { key: 'cuisine', label: 'Cuisine' },
  { key: 'sdb', label: 'Salle de bain' },
  { key: 'entree', label: 'Entrée' },
  { key: 'wc', label: 'WC' },
  { key: 'couloir', label: 'Couloir' },
  { key: 'bureau', label: 'Bureau' },
  { key: 'autre', label: 'Autre pièce' },
];

export interface Room {
  id: string;
  type: RoomType;
  name: string;
  L?: number; // longueur (m)
  W?: number; // largeur (m)
  H?: number; // hauteur sous plafond (m)
  doors: number;
  windows: number;
}

export const DOOR = { w: 0.83, h: 2.04 };
export const WINDOW = { w: 1.2, h: 1.35 };

export interface Measures {
  floor: number;
  ceiling: number;
  perimeter: number;
  wallsGross: number;
  openings: number;
  wallsNet: number;
  plinths: number;
}

export function measures(r: Room): Measures {
  const L = r.L ?? 0;
  const W = r.W ?? 0;
  const H = r.H ?? 0;
  const floor = L * W;
  const perimeter = 2 * (L + W);
  const wallsGross = perimeter * H;
  const openings = H ? r.doors * DOOR.w * DOOR.h + r.windows * WINDOW.w * WINDOW.h : 0;
  return { floor, ceiling: floor, perimeter, wallsGross, openings, wallsNet: Math.max(0, wallsGross - openings), plinths: Math.max(0, perimeter - r.doors * DOOR.w) };
}

export const r2 = (n: number) => Math.round(n * 100) / 100;
export const m2 = (n: number) => `${n.toFixed(2).replace('.', ',')} m²`;
export const ml = (n: number) => `${n.toFixed(2).replace('.', ',')} m`;

type L = [designation: string, qty: number, unit: string, price: number, cost: number, kind?: LineKind];

const ELEC_PRISES: Record<RoomType, number> = { sejour: 5, chambre: 3, cuisine: 6, sdb: 1, entree: 1, wc: 0, couloir: 1, bureau: 4, autre: 2 };

function linesForRoom(r: Room, trade: TradeKey, rate: number): L[] {
  const m = measures(r);
  const mo = (label: string, h: number): L => [label, Math.max(0.5, Math.round(h * 2) / 2), 'h', rate, 31.5, 'main_oeuvre'];
  switch (trade) {
    case 'electricien': {
      const prises = r.type === 'sejour' ? Math.max(5, Math.ceil(m.floor / 4)) : ELEC_PRISES[r.type];
      const lights = r.type === 'sejour' && m.floor > 20 ? 2 : 1;
      const inter = r.type === 'couloir' ? 2 : 1;
      const out: L[] = [];
      if (prises) out.push(['Prise 2P+T 16 A encastrée', prises, 'u', 24.5, 12.8]);
      if (r.type === 'cuisine') out.push(['Circuit spécialisé 32 A (plaque) et 20 A (four, lave-vaisselle)', 3, 'u', 96, 48]);
      if (r.type === 'sdb') out.push(['Liaison équipotentielle locale', 1, 'forfait', 120, 35]);
      out.push(['Point lumineux DCL', lights, 'u', 32, 14]);
      out.push([inter === 2 ? 'Interrupteur va-et-vient' : 'Interrupteur simple allumage', inter, 'u', 22, 9.5]);
      out.push(['Câble R2V 3G2,5 mm²', Math.ceil(prises * 6 + m.perimeter), 'm', 2.35, 1.42]);
      out.push(['Câble R2V 3G1,5 mm²', Math.ceil(lights * 8 + (r.H ?? 2.5) * 2), 'm', 1.9, 1.05]);
      out.push(mo('Saignées, tirage et raccordement', prises * 0.75 + lights + inter * 0.5 + (r.type === 'cuisine' ? 2 : 0)));
      return out;
    }
    case 'peintre':
      return [
        ['Protection des sols et préparation des supports', r2(m.floor), 'm²', 4.5, 1.2],
        ['Enduit de lissage et ponçage des murs', r2(m.wallsNet), 'm²', 9, 2.4],
        ['Peinture murs acrylique velours, 2 couches', r2(m.wallsNet), 'm²', 18, 4.2],
        ['Peinture plafond mat, 2 couches', r2(m.ceiling), 'm²', 21, 4.6],
        ['Peinture des plinthes', r2(m.plinths), 'm', 6.5, 1.1],
      ];
    case 'carreleur':
    case 'cuisiniste': {
      const out: L[] = [
        ['Fourniture carrelage sol (chutes 10 % incluses)', r2(m.floor * 1.1), 'm²', 34, 22],
        ['Pose carrelage sol collé, joints', r2(m.floor), 'm²', 46, 12],
        ['Plinthes carrelage assorties', r2(m.plinths), 'm', 14, 5.5],
      ];
      if (r.type === 'sdb' || r.type === 'cuisine') out.push(['Faïence murale, fourniture et pose', r2(r.type === 'sdb' ? m.wallsNet * 0.8 : m.perimeter * 0.6), 'm²', 78, 31]);
      return out;
    }
    case 'plaquiste':
      return [
        ['Doublage collé plaque de plâtre BA13 + isolant', r2(m.wallsNet), 'm²', 42, 17],
        ['Plafond suspendu sur ossature BA13', r2(m.ceiling), 'm²', 48, 19],
        ['Bandes, enduits et finition', r2(m.wallsNet + m.ceiling), 'm²', 9, 2],
      ];
    case 'plombier':
    case 'climaticien': {
      if (r.type === 'sdb') return [['Alimentation et évacuation lavabo', 1, 'u', 290, 95], ['Alimentation et évacuation douche', 1, 'u', 420, 140], ['Sèche-serviettes électrique 750 W', 1, 'u', 480, 260], mo('Pose et raccordements', 9)];
      if (r.type === 'cuisine') return [['Alimentation et évacuation évier', 1, 'u', 260, 85], ['Attente lave-vaisselle', 1, 'u', 140, 45], mo('Pose et raccordements', 4)];
      if (r.type === 'wc') return [['WC suspendu avec bâti-support', 1, 'u', 690, 380], mo('Pose et raccordement WC', 4)];
      return [[`Radiateur dimensionné pour ${r2(m.floor * (r.H ?? 2.5)).toString().replace('.', ',')} m³`, 1, 'u', 520, 290], mo('Pose et raccordement radiateur', 3)];
    }
    case 'menuisier': {
      const out: L[] = [];
      if (r.windows) out.push([`Fenêtre PVC double vitrage ${Math.round(WINDOW.w * 100)} x ${Math.round(WINDOW.h * 100)} cm, Uw 1,3`, r.windows, 'u', 690, 410]);
      if (r.doors) out.push(['Bloc-porte intérieur 83 cm', r.doors, 'u', 340, 170]);
      out.push(['Plinthes bois à peindre', r2(m.plinths), 'm', 9, 3.2]);
      out.push(mo('Dépose et pose', r.windows * 2.5 + r.doors * 1.5 + 0.5));
      return out;
    }
    default:
      return [
        ['Peinture murs, 2 couches', r2(m.wallsNet), 'm²', 19, 4.4],
        ['Peinture plafond, 2 couches', r2(m.ceiling), 'm²', 22, 4.8],
        ['Revêtement de sol stratifié, fourniture et pose', r2(m.floor), 'm²', 42, 19],
        ['Plinthes', r2(m.plinths), 'm', 11, 4],
      ];
  }
}

export function buildLines(rooms: Room[], trade: TradeKey, rate: number, vat: number): DevisLigne[] {
  const out: DevisLigne[] = [];
  rooms.filter((r) => r.L && r.W).forEach((r) => {
    const m = measures(r);
    out.push({ id: uid('l'), kind: 'section', designation: r.name, detail: `${m2(m.floor)} au sol · ${m2(m.wallsNet)} de murs`, quantity: 0, unit: '', unitPriceHt: 0, unitCostHt: 0, vatRate: 0 });
    for (const [designation, quantity, unit, price, cost, kind] of linesForRoom(r, trade, rate)) {
      if (!quantity) continue;
      out.push({ id: uid('l'), kind: kind ?? (unit === 'h' ? 'main_oeuvre' : 'fourniture'), designation, quantity, unit, unitPriceHt: price, unitCostHt: cost, vatRate: vat, source: unit === 'h' ? 'taux' : 'bibliotheque' });
    }
  });
  return out;
}
