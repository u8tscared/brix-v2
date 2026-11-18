// Minimums NF C 15-100 (partie 10-1, locaux d'habitation) pièce par pièce.

export type RoomType = 'sejour' | 'chambre' | 'cuisine' | 'sdb' | 'wc' | 'entree' | 'bureau' | 'garage' | 'cellier';

export const ROOM_LABEL: Record<RoomType, string> = {
  sejour: 'Séjour', chambre: 'Chambre', cuisine: 'Cuisine', sdb: 'Salle de bain', wc: 'WC', entree: 'Entrée, couloir', bureau: 'Bureau', garage: 'Garage', cellier: 'Cellier, buanderie',
};

export interface Room { id: string; type: RoomType; surface: number }

export interface RoomNeeds { prises: number; plan: number; lumieres: number; rj45: number; dedicated: { label: string; amps: number; section: string }[]; note?: string }

export function roomNeeds(r: Room): RoomNeeds {
  switch (r.type) {
    case 'sejour':
      return { prises: r.surface > 28 ? 7 : 5, plan: 0, lumieres: 1, rj45: 1, dedicated: [], note: r.surface > 28 ? 'Plus de 28 m² : 7 prises.' : undefined };
    case 'chambre':
    case 'bureau':
      return { prises: 3, plan: 0, lumieres: 1, rj45: 1, dedicated: [] };
    case 'cuisine':
      return {
        prises: r.surface <= 4 ? 3 : 6,
        plan: r.surface <= 4 ? 3 : 4,
        lumieres: 1,
        rj45: 0,
        dedicated: [
          { label: 'Plaque de cuisson', amps: 32, section: '6 mm²' },
          { label: 'Four', amps: 20, section: '2,5 mm²' },
          { label: 'Lave-vaisselle', amps: 20, section: '2,5 mm²' },
        ],
        note: 'Pas de prise au-dessus de l’évier ni de la plaque.',
      };
    case 'sdb':
      return { prises: 1, plan: 0, lumieres: 1, rj45: 0, dedicated: [], note: 'Prise hors volumes, liaison équipotentielle.' };
    case 'wc':
      return { prises: 0, plan: 0, lumieres: 1, rj45: 0, dedicated: [] };
    case 'entree':
      return { prises: 1, plan: 0, lumieres: 1, rj45: 0, dedicated: [] };
    case 'garage':
    case 'cellier':
      return { prises: 1, plan: 0, lumieres: 1, rj45: 0, dedicated: [] };
  }
}

export interface Extras { lavelinge: boolean; secheLinge: boolean; chauffeEau: boolean; congelateur: boolean; vmc: boolean; volets: boolean; chauffage: number /* W total */ }

export interface Circuit { label: string; amps: number; section: string; count?: number; typeA?: boolean }

export function buildCircuits(rooms: Room[], ex: Extras) {
  const needs = rooms.map((r) => ({ r, n: roomNeeds(r) }));
  const prises = needs.reduce((x, y) => x + y.n.prises, 0);
  const lumieres = needs.reduce((x, y) => x + y.n.lumieres, 0);
  const rj45 = needs.reduce((x, y) => x + y.n.rj45, 0);
  const area = rooms.reduce((x, r) => x + r.surface, 0);
  const circuits: Circuit[] = [];
  // Prises : 8 max par circuit 2,5 mm² / 20 A (version 2002-A5, la plus restrictive). Cuisine : circuit séparé.
  const kitchenPrises = needs.filter((x) => x.r.type === 'cuisine').reduce((a, b) => a + b.n.prises, 0);
  const otherPrises = prises - kitchenPrises;
  for (let i = 0; i < Math.ceil(otherPrises / 8); i++) circuits.push({ label: `Prises ${i + 1}`, amps: 20, section: '2,5 mm²', count: Math.min(8, otherPrises - i * 8) });
  if (kitchenPrises) circuits.push({ label: 'Prises cuisine', amps: 20, section: '2,5 mm²', count: kitchenPrises });
  for (let i = 0; i < Math.ceil(lumieres / 8); i++) circuits.push({ label: `Éclairage ${i + 1}`, amps: 16, section: '1,5 mm²', count: Math.min(8, lumieres - i * 8) });
  needs.forEach(({ n }) => n.dedicated.forEach((d) => circuits.push({ label: d.label, amps: d.amps, section: d.section, typeA: d.label === 'Plaque de cuisson' })));
  if (ex.lavelinge) circuits.push({ label: 'Lave-linge', amps: 20, section: '2,5 mm²', typeA: true });
  if (ex.secheLinge) circuits.push({ label: 'Sèche-linge', amps: 20, section: '2,5 mm²' });
  if (ex.congelateur) circuits.push({ label: 'Congélateur', amps: 20, section: '2,5 mm²' });
  if (ex.chauffeEau) circuits.push({ label: 'Chauffe-eau', amps: 20, section: '2,5 mm²' });
  if (ex.vmc) circuits.push({ label: 'VMC', amps: 2, section: '1,5 mm²' });
  if (ex.volets) circuits.push({ label: 'Volets roulants', amps: 16, section: '1,5 mm²' });
  // Chauffage électrique : 4 500 W max par circuit 2,5 mm² / 20 A
  for (let i = 0; i < Math.ceil(ex.chauffage / 4500); i++) circuits.push({ label: `Chauffage ${i + 1}`, amps: 20, section: '2,5 mm²' });

  // Différentiels 30 mA : selon la surface, + type A pour plaque et lave-linge ; 8 circuits max par interrupteur.
  const typeACircuits = circuits.filter((c) => c.typeA).length;
  const others = circuits.length - typeACircuits;
  const bySurface = area <= 35 ? 1 : area <= 100 ? 2 : 3;
  const general = Math.max(bySurface, Math.ceil(others / 8));
  const diffs = { general, typeA: Math.max(1, Math.ceil(typeACircuits / 8)), amps: area <= 35 ? 25 : 40 };
  const modules = circuits.reduce((x, c) => x + (c.amps >= 32 ? 1 : 1), 0) + (diffs.general + diffs.typeA) * 2;
  const rows = Math.ceil((modules * 1.2) / 13);
  return { needs, prises, lumieres, rj45, area, circuits, diffs, modules, rows };
}
