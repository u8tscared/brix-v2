// Métadonnées des outils métier. Les clés et noms courts viennent de TRADES
// (catalog.ts) ; on ajoute ici une phrase plus complète et la liste des métiers.

import { TRADES } from '@/lib/catalog';
import type { TradeKey } from '@/lib/types';

export interface ToolMeta {
  key: string;
  name: string;
  short: string;
  long: string;
  icon: string;
  trades: TradeKey[];
}

const LONG: Record<string, string> = {
  'section-cable': 'Section minimale et chute de tension, cuivre ou alu, mono ou tri.',
  nfc15100: 'Prises, éclairage, circuits et protections pièce par pièce.',
  tableau: 'Schéma de tableau simplifié depuis la liste des circuits.',
  irve: 'Protection, câble et puissance pour une borne de recharge.',
  evacuation: 'Diamètres et pentes des évacuations, appareil par appareil.',
  'bilan-thermique': 'Puissance de chaudière ou de pompe à chaleur selon le logement.',
  ballon: 'Volume et puissance du chauffe-eau selon le foyer.',
  peinture: 'Surfaces, couches, litres et pots, pièce par pièce.',
  calepinage: 'Carreaux, chutes, colle et joints, avec la coupe en bordure.',
  cloison: 'Plaques, rails, montants, vis, bandes et enduit.',
  menuiserie: 'Cotes de fabrication depuis le tableau, et éligibilité aux aides.',
  toiture: 'Surface rampante, tuiles, liteaux et faîtage.',
  beton: 'Volume, sacs de ciment, sable, gravier et treillis.',
  gazon: 'Terre végétale, semences, rouleaux et sacs.',
  clim: 'Puissance froid par pièce et choix des unités.',
  express: 'Devis et facture de dépannage sur place, en 30 secondes.',
};

export const TOOL_META: Record<string, ToolMeta> = {};
for (const t of TRADES) {
  for (const tool of t.tools) {
    const m = TOOL_META[tool.key];
    if (m) {
      if (!m.trades.includes(t.key)) m.trades.push(t.key);
    } else {
      TOOL_META[tool.key] = { key: tool.key, name: tool.name, short: tool.short, long: LONG[tool.key] ?? tool.short, icon: tool.icon, trades: [t.key] };
    }
  }
}
// Noms plus parlants hors contexte métier
if (TOOL_META.calepinage) TOOL_META.calepinage.name = 'Calepinage carrelage';
if (TOOL_META.peinture) TOOL_META.peinture.name = 'Peinture : surfaces et litres';
if (TOOL_META['bilan-thermique']) TOOL_META['bilan-thermique'].short = 'Puissance chaudière ou PAC';

export const ALL_TOOLS = Object.values(TOOL_META);
