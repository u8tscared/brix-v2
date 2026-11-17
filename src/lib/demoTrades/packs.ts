// Index des packs de démo par métier. L'électricien est la base (src/lib/demo.ts).

import type { TradeKey } from '../types';
import { carreleur, peintre, plaquiste, plombier } from './packs-eau-finitions';
import { couvreur, macon, menuisier, paysagiste } from './packs-gros-oeuvre';
import { climaticien, cuisiniste, renovation, serrurier } from './packs-confort';
import type { TradePack, TradeVoice } from './types';

export const PACKS: Partial<Record<TradeKey, TradePack>> = {
  plombier,
  peintre,
  carreleur,
  plaquiste,
  menuisier,
  couvreur,
  macon,
  paysagiste,
  climaticien,
  serrurier,
  cuisiniste,
  renovation,
  autre: renovation,
};

/** Pack du métier, ou undefined pour l'électricien (données de base). */
export function packFor(trade?: string | null): TradePack | undefined {
  if (!trade || trade === 'electricien') return undefined;
  return PACKS[trade as TradeKey] ?? renovation;
}

/** Voix de l'électricien (mêmes contenus que la démo historique). */
export const ELEC_VOICE: TradeVoice = {
  memory: [
    ['prix', 'Prise 2P+T posée', '24,50 € HT la prise + 0,5 h de pose'],
    ['prix', 'Radiateur électrique 1 500 W', '389 € HT fourni, 1,5 h de pose'],
    ['habitude', 'Attestation Consuel', 'Ajoutée d’office sur les rénovations complètes'],
  ],
  urgent: { name: 'Restaurant Le Comptoir', say: 'On a le disjoncteur de la cuisine qui saute en plein service, c’est la troisième fois.', ask: 'Je comprends, c’est urgent. Avez-vous débranché un appareil depuis ?', answer: 'On a coupé le lave-vaisselle mais ça recommence quand on allume le four.', summary: 'Le disjoncteur de la cuisine saute pendant le service. Ils ont coupé le lave-vaisselle, le problème continue.', request: 'Disjoncteur cuisine qui saute pendant le service (four), urgent.', estimate: 450 },
  visit: { say: 'On refait notre cuisine en janvier et il faudrait tout reprendre côté électricité, avec une plaque induction.', summary: 'Veut refaire l’électricité de sa cuisine (plaque induction, 6 prises). Maison à Villeurbanne, travaux en janvier.', request: 'Rénovation électrique cuisine : plaque induction, 6 prises. Travaux en janvier.', estimate: 2400 },
};

export const voiceFor = (trade?: string | null): TradeVoice => packFor(trade) ?? ELEC_VOICE;
