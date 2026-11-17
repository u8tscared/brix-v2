// Bibliothèque de prix Brix : ouvrages, fournitures et main d'œuvre multi-métiers.
// Prix de vente HT et coût d'achat HT indicatifs (tarifs pros 2026, région lyonnaise).
// Plus tard : remplacée par GET /api/devis/bibliotheque (tarifs négociés fournisseurs).

import type { LineKind } from '@/lib/types';

export type LibTrade = 'electricite' | 'plomberie' | 'peinture' | 'carrelage' | 'platrerie' | 'menuiserie' | 'maconnerie' | 'general';

export interface LibItem {
  id: string;
  trade: LibTrade;
  lot: string;
  kind: LineKind;
  designation: string;
  unit: string;
  price: number;
  cost: number;
  /** Expressions reconnues à la voix (mots au singulier, sans accents). */
  match: string[];
  supplier?: string;
  ref?: string;
  vat?: number;
  /** Hausse fournisseur récente (en %) et depuis quand. */
  priceChange?: { pct: number; since: string; reason: string };
}

export const TRADE_LABEL: Record<LibTrade, string> = {
  electricite: 'Électricité',
  plomberie: 'Plomberie',
  peinture: 'Peinture',
  carrelage: 'Carrelage',
  platrerie: 'Plâtrerie',
  menuiserie: 'Menuiserie',
  maconnerie: 'Maçonnerie',
  general: 'Général',
};

const counters: Record<string, number> = {};
type Extra = Partial<Pick<LibItem, 'supplier' | 'ref' | 'kind' | 'vat' | 'priceChange'>>;
const mk = (trade: LibTrade, lot: string) => (designation: string, unit: string, price: number, cost: number, match: string, extra: Extra = {}): LibItem => {
  counters[trade] = (counters[trade] ?? 0) + 1;
  return {
    id: `${trade.slice(0, 4)}_${counters[trade]}`,
    trade,
    lot,
    kind: extra.kind ?? (unit === 'h' ? 'main_oeuvre' : unit === 'forfait' || unit === 'm²' || unit === 'ml' ? 'ouvrage' : 'fourniture'),
    designation,
    unit,
    price,
    cost,
    match: match.split('|').map((s) => s.trim()),
    ...extra,
  };
};

const CUIVRE = { pct: 4, since: 'le 1er du mois', reason: 'hausse du cuivre chez Rexel' };
const rx = (ref: string): Extra => ({ supplier: 'Rexel', ref });

// Électricité
const elT = mk('electricite', 'Tableau électrique');
const elD = mk('electricite', 'Distribution et prises');
const elE = mk('electricite', 'Éclairage');
const elC = mk('electricite', 'Courants faibles');
const elH = mk('electricite', 'Chauffage et ventilation');
const elB = mk('electricite', 'Borne de recharge');
const elS = mk('electricite', 'Mise en service');
const ELEC: LibItem[] = [
  elT('Coffret Drivia 1 rangée 13 modules', 'u', 52, 34, 'coffret 1rangee', rx('Legrand 401211')),
  elT('Coffret Drivia 2 rangées 26 modules', 'u', 84.5, 58.9, 'coffret 2rangee', rx('Legrand 401212')),
  elT('Coffret Drivia 3 rangées 39 modules', 'u', 118.4, 82.9, 'coffret 3rangee|coffret|3rangee', rx('Legrand 401213')),
  elT('Coffret Drivia 4 rangées 52 modules', 'u', 156, 109, 'coffret 4rangee|4rangee', rx('Legrand 401214')),
  elT('Tableau électrique 2 rangées pré-équipé', 'u', 690, 410, 'tableau 2rangee', rx('Legrand 093042')),
  elT('Tableau électrique 3 rangées pré-équipé', 'u', 890, 540, 'tableau|tableau 3rangee', rx('Legrand 093043')),
  elT('Interrupteur différentiel 40 A 30 mA type A', 'u', 64.9, 44.2, 'differentiel|differentiel typea|inter typea', rx('Legrand 411650')),
  elT('Interrupteur différentiel 40 A 30 mA type AC', 'u', 48.9, 31.5, 'differentiel typeac', rx('Legrand 411617')),
  elT('Interrupteur différentiel 40 A 30 mA type F', 'u', 112.5, 78, 'differentiel typef|inter typef', { ...rx('Legrand 411652'), priceChange: { pct: 3, since: 'cette semaine', reason: 'nouveau tarif Legrand' } }),
  elT('Interrupteur différentiel 63 A 30 mA type A', 'u', 89, 61, 'differentiel 63a', rx('Legrand 411651')),
  elT('Disjoncteur DX³ 2 A courbe C', 'u', 12.4, 7.9, 'disjoncteur 2a', rx('Legrand 406770')),
  elT('Disjoncteur DX³ 10 A courbe C', 'u', 11.2, 7.1, 'disjoncteur 10a', rx('Legrand 406773')),
  elT('Disjoncteur DX³ 16 A courbe C', 'u', 11.2, 7.1, 'disjoncteur|disjoncteur 16a', rx('Legrand 406774')),
  elT('Disjoncteur DX³ 20 A courbe C', 'u', 11.9, 7.6, 'disjoncteur 20a', rx('Legrand 406775')),
  elT('Disjoncteur DX³ 32 A courbe C', 'u', 13.9, 8.9, 'disjoncteur 32a', rx('Legrand 406777')),
  elT('Disjoncteur de branchement 15/45 A 500 mA', 'u', 98, 64, 'disjoncteur branchement|branchement', rx('Legrand 401004')),
  elT('Parafoudre monobloc 1P+N', 'u', 145, 92, 'parafoudre', rx('Legrand 412225')),
  elT("Peigne d'alimentation 13 modules", 'u', 14.5, 8.9, 'peigne', rx('Legrand 404926')),
  elT('Contacteur heures creuses 20 A', 'u', 38, 24, 'contacteur|heure creuse', rx('Legrand 412501')),
  elT('Délesteur 2 voies', 'u', 129, 84, 'delesteur', rx('Legrand 412601')),
  elD('Prise 2P+T Céliane blanc', 'u', 24.5, 12.8, 'prise|prise courant', rx('Legrand 067111')),
  elD('Prise 2P+T Mosaic', 'u', 16.9, 8.4, 'prise mosaic', rx('Legrand 077111')),
  elD('Prise double 2P+T Céliane', 'u', 32, 17, 'prise double', rx('Legrand 067128')),
  elD('Prise 32 A cuisson', 'u', 42, 22, 'prise 32a|prise cuisson', rx('Legrand 067131')),
  elD('Prise étanche IP55 extérieure', 'u', 36, 19, 'prise etanche|prise exterieure', rx('Legrand 069730')),
  elD('Prise USB type A + C', 'u', 58, 34, 'prise usb|usb', rx('Legrand 067462')),
  elD('Interrupteur va-et-vient Céliane', 'u', 19.5, 9.8, 'interrupteur|va vient', rx('Legrand 067001')),
  elD('Bouton poussoir', 'u', 18, 9, 'poussoir|bouton poussoir', rx('Legrand 067031')),
  elD('Variateur LED 300 W', 'u', 64, 39, 'variateur', rx('Legrand 067084')),
  elD('Câble R2V 3G1,5 mm²', 'm', 1.75, 1.05, 'cable 1.5mm', { supplier: 'Cédéo', ref: 'Nexans 3G1.5', priceChange: CUIVRE }),
  elD('Câble R2V 3G2,5 mm²', 'm', 2.35, 1.42, 'cable|cable 2.5mm', { supplier: 'Cédéo', ref: 'Nexans 3G2.5', priceChange: CUIVRE }),
  elD('Câble R2V 3G6 mm²', 'm', 6.4, 3.9, 'cable 6mm', { supplier: 'Cédéo', ref: 'Nexans 3G6', priceChange: CUIVRE }),
  elD('Câble U1000 R2V 5G10 mm²', 'm', 18.5, 11.2, 'cable 10mm', { supplier: 'Cédéo', ref: 'Nexans 5G10', priceChange: CUIVRE }),
  elD('Gaine ICTA 20 mm', 'm', 0.95, 0.48, 'gaine|icta', { supplier: 'Rexel' }),
  elD("Boîte d'encastrement Batibox", 'u', 2.9, 1.2, 'boite|boite encastrement', rx('Legrand 080041')),
  elD('Saignées et rebouchage', 'ml', 18, 6, 'saignee'),
  elE('Spot LED encastré 7 W IP65', 'u', 38.9, 26.4, 'spot|spot led', { supplier: 'Rexel', ref: 'Aric 50381' }),
  elE('Plafonnier LED 18 W', 'u', 54, 32, 'plafonnier', { supplier: 'Rexel', ref: 'Aric 51240' }),
  elE('Hublot LED à détection 15 W', 'u', 78, 46, 'hublot', { supplier: 'Rexel', ref: 'Sarlam 30512' }),
  elE('Dalle LED 60x60 UGR<19', 'u', 92, 58, 'dalle led|dalle', { supplier: 'Rexel' }),
  elE('Ruban LED avec alimentation', 'm', 24, 13, 'ruban|ruban led', { supplier: 'Rexel' }),
  elE('Détecteur de mouvement 360°', 'u', 68, 39, 'detecteur mouvement|detecteur presence', rx('Legrand 048944')),
  elE('Minuterie modulaire', 'u', 48, 28, 'minuterie', rx('Legrand 412630')),
  elE('Point lumineux (DCL et raccordement)', 'u', 42, 9, 'point lumineux|dcl'),
  elC('Prise RJ45 cat. 6A', 'u', 46, 21, 'rj45|prise rj45|prise reseau', rx('Legrand 067346')),
  elC('Coffret de communication grade 2TV', 'u', 245, 160, 'coffret communication|grade', rx('Legrand 413253')),
  elC('Prise TV', 'u', 22, 11, 'prise tv|tv', rx('Legrand 067321')),
  elC('Interphone vidéo 2 fils', 'u', 320, 205, 'interphone|visiophone', { supplier: 'Rexel' }),
  elC('Détecteur de fumée NF', 'u', 29, 14, 'detecteur fumee|fumee', { supplier: 'Rexel' }),
  elH('Radiateur à inertie 1 500 W', 'u', 690, 455, 'radiateur|radiateur inertie', { supplier: 'Rexel', ref: 'Atlantic Galapagos' }),
  elH('Sèche-serviettes 750 W', 'u', 420, 270, 'seche serviette', { supplier: 'Rexel', ref: 'Atlantic Doris' }),
  elH('Thermostat connecté', 'u', 190, 120, 'thermostat', { supplier: 'Rexel', ref: 'Netatmo NTH01' }),
  elH('VMC simple flux hygro B', 'u', 480, 260, 'vmc|vmc simple flux|ventilation', { supplier: 'Rexel', ref: 'Aldes EasyHome' }),
  elH('VMC double flux haut rendement', 'u', 2650, 1780, 'vmc double flux|double flux', { supplier: 'Rexel', ref: 'Aldes Dee Fly' }),
  elB("Borne de recharge Green'up 7,4 kW", 'u', 1180, 790, 'borne|borne recharge|irve|wallbox', rx("Legrand Green'up")),
  elB('Protection différentielle borne type A 40 A', 'u', 96, 58, 'protection borne', rx('Legrand 411650')),
  elS('Mise à la terre : piquet et câble 25 mm²', 'forfait', 185, 72, 'terre|piquet|mise terre'),
  elS('Liaison équipotentielle salle de bain', 'forfait', 240, 90, 'liaison equipotentielle|equipotentielle'),
  elS('Attestation de conformité Consuel', 'forfait', 180, 120, 'consuel|attestation consuel'),
  elS('Essais, repérage et mise en service', 'h', 55, 31.5, 'mise service|essai|reperage'),
  elS('Diagnostic électrique et rapport', 'forfait', 180, 40, 'diagnostic'),
  elS("Main d'œuvre électricien", 'h', 55, 31.5, 'main oeuvre electricien'),
];

// Plomberie
const plA = mk('plomberie', 'Alimentation et évacuation');
const plS = mk('plomberie', 'Sanitaires');
const plE = mk('plomberie', "Production d'eau chaude");
const plC = mk('plomberie', 'Chauffage');
const PLOMB: LibItem[] = [
  plA('Tube PER nu 16 mm', 'm', 1.6, 0.8, 'per|tube per', { supplier: 'Cédéo' }),
  plA('Tube multicouche 16 mm', 'm', 4.2, 2.4, 'multicouche', { supplier: 'Cédéo' }),
  plA('Tube cuivre 14/16', 'm', 9.8, 6.4, 'tube cuivre|cuivre', { supplier: 'Cédéo', priceChange: { pct: 6, since: 'le 1er du mois', reason: 'hausse du cuivre chez Cédéo' } }),
  plA('Tube PVC évacuation Ø40', 'm', 6.5, 3.1, 'pvc|pvc 40|evacuation 40', { supplier: 'Cédéo' }),
  plA('Tube PVC évacuation Ø100', 'm', 12, 6, 'pvc 100|evacuation 100', { supplier: 'Cédéo' }),
  plA('Raccords et fixations', 'forfait', 85, 35, 'raccord|fixation'),
  plA('Collecteur 4 départs', 'u', 118, 72, 'collecteur', { supplier: 'Cédéo' }),
  plA("Vanne d'arrêt quart de tour", 'u', 24, 12, 'vanne|robinet arret', { supplier: 'Cédéo' }),
  plA('Réducteur de pression', 'u', 145, 88, 'reducteur pression|reducteur', { supplier: 'Cédéo' }),
  plA('Siphon et raccordement évacuation', 'u', 18, 8, 'siphon'),
  plA('Recherche de fuite', 'forfait', 190, 50, 'fuite|recherche fuite'),
  plS('WC suspendu complet (bâti et cuvette)', 'u', 690, 420, 'wc suspendu|suspendu', { supplier: 'Cédéo', ref: 'Geberit Duofix' }),
  plS('WC à poser sortie horizontale', 'u', 320, 190, 'wc|toilette', { supplier: 'Cédéo' }),
  plS('Lavabo et mitigeur', 'u', 290, 170, 'lavabo', { supplier: 'Cédéo' }),
  plS('Meuble vasque 80 cm', 'u', 640, 410, 'meuble vasque|vasque', { supplier: 'Cédéo' }),
  plS('Receveur extra-plat 90x120', 'u', 340, 210, 'receveur', { supplier: 'Cédéo' }),
  plS('Paroi de douche fixe 120 cm', 'u', 420, 260, 'paroi|paroi douche', { supplier: 'Cédéo' }),
  plS('Colonne de douche thermostatique', 'u', 290, 175, 'colonne douche|colonne', { supplier: 'Cédéo', ref: 'Grohe Euphoria' }),
  plS('Mitigeur évier', 'u', 120, 68, 'mitigeur|mitigeur evier', { supplier: 'Cédéo' }),
  plS('Baignoire acrylique 170x70', 'u', 380, 230, 'baignoire', { supplier: 'Cédéo' }),
  plS('Dépose des anciens sanitaires', 'forfait', 180, 40, 'depose sanitaire'),
  plE('Chauffe-eau électrique 200 L', 'u', 690, 450, 'chauffe eau|ballon|cumulus', { supplier: 'Cédéo', ref: 'Atlantic Chaufféo' }),
  plE('Chauffe-eau thermodynamique 200 L', 'u', 2350, 1650, 'thermodynamique|chauffe eau thermodynamique', { supplier: 'Cédéo', ref: 'Atlantic Explorer' }),
  plE('Groupe de sécurité', 'u', 48, 26, 'groupe securite', { supplier: 'Cédéo' }),
  plE('Adoucisseur 20 L', 'u', 1290, 820, 'adoucisseur', { supplier: 'Cédéo' }),
  plC('Radiateur eau chaude acier', 'u', 420, 260, 'radiateur eau', { supplier: 'Cédéo' }),
  plC('Pompe à chaleur air/eau 8 kW', 'u', 9800, 6900, 'pompe chaleur|pac', { supplier: 'Cédéo', ref: 'Daikin Altherma' }),
  plC('Chaudière gaz à condensation', 'u', 3400, 2300, 'chaudiere', { supplier: 'Cédéo' }),
  plC('Mise en eau et essais', 'forfait', 120, 40, 'mise eau'),
  plC("Main d'œuvre plombier", 'h', 58, 32, 'main oeuvre plombier'),
];

// Peinture
const peP = mk('peinture', 'Préparation');
const peM = mk('peinture', 'Peinture murs et plafonds');
const peB = mk('peinture', 'Boiseries et finitions');
const PEINT: LibItem[] = [
  peP('Protection des sols et du mobilier', 'm²', 3.5, 0.9, 'protection|bache'),
  peP('Lessivage des supports', 'm²', 4, 0.6, 'lessivage'),
  peP('Rebouchage et ponçage', 'm²', 6.5, 1.4, 'rebouchage|poncage'),
  peP('Enduit de lissage 2 passes', 'm²', 14, 3.8, 'enduit|enduit lissage|lissage'),
  peP('Décollage de papier peint', 'm²', 8, 0.5, 'decollage'),
  peP('Traitement anti-humidité', 'm²', 28, 8, 'humidite|anti humidite'),
  peP('Impression (sous-couche)', 'm²', 7.5, 2.1, 'sous couche|impression'),
  peM('Peinture plafond acrylique mate 2 couches', 'm²', 18, 4.2, 'peinture plafond|plafond peinture'),
  peM('Peinture murs velours 2 couches', 'm²', 19.5, 4.6, 'peinture|peinture mur|mur'),
  peM('Peinture satinée pièces humides', 'm²', 22, 5.1, 'peinture satinee|satinee'),
  peM('Toile de verre posée et peinte', 'm²', 16, 4.5, 'toile verre'),
  peM('Papier peint intissé posé', 'm²', 24, 9, 'papier peint'),
  peM('Ravalement de façade (peinture pliolite)', 'm²', 48, 16, 'facade|ravalement'),
  peM('Peinture de sol époxy', 'm²', 38, 14, 'epoxy|peinture sol'),
  peB('Peinture de porte 2 faces', 'u', 95, 18, 'peinture porte'),
  peB('Laque de radiateur', 'u', 85, 15, 'peinture radiateur|laque'),
  peB('Peinture de plinthes', 'ml', 6, 1, 'peinture plinthe'),
  peB("Main d'œuvre peintre", 'h', 45, 27, 'main oeuvre peintre'),
];

// Carrelage
const caP = mk('carrelage', 'Préparation des supports');
const caS = mk('carrelage', 'Sols');
const caM = mk('carrelage', 'Murs et faïence');
const CARRE: LibItem[] = [
  caP('Dépose de l’ancien carrelage', 'm²', 22, 2, 'depose carrelage'),
  caP('Ragréage autolissant', 'm²', 18, 5.5, 'ragreage'),
  caP("Primaire d'accroche", 'm²', 4.5, 1.2, 'primaire|accroche'),
  caP('Étanchéité sous carrelage (SPEC)', 'm²', 32, 11, 'etancheite|spec'),
  caP('Mortier-colle C2S1 (sac 25 kg)', 'u', 24, 14, 'colle|mortier colle', { supplier: 'Point P' }),
  caS('Carrelage grès cérame 60x60 fourni', 'm²', 42, 24, 'carrelage|gres|carreau', { supplier: 'Point P' }),
  caS('Carrelage grand format 120x60 fourni', 'm²', 68, 38, 'grand format', { supplier: 'Point P' }),
  caS('Pose de carrelage au sol', 'm²', 38, 6, 'pose carrelage|pose sol'),
  caS('Plinthes carrelage posées', 'ml', 14, 5, 'plinthe'),
  caS('Joints époxy', 'm²', 9, 3, 'joint|joint epoxy'),
  caS('Profilé de finition aluminium', 'ml', 12, 5, 'profile|baguette'),
  caS('Barre de seuil', 'u', 28, 12, 'seuil'),
  caM('Faïence murale 30x60 fournie', 'm²', 34, 18, 'faience', { supplier: 'Point P' }),
  caM('Pose de faïence murale', 'm²', 42, 7, 'pose faience'),
  caM('Mosaïque posée', 'm²', 85, 40, 'mosaique'),
  caM("Douche à l'italienne (forme de pente et siphon)", 'forfait', 890, 340, 'italienne|douche italienne'),
  caM("Main d'œuvre carreleur", 'h', 48, 29, 'main oeuvre carreleur'),
];

// Plâtrerie
const pqC = mk('platrerie', 'Cloisons');
const pqD = mk('platrerie', 'Doublages et isolation');
const pqP = mk('platrerie', 'Plafonds');
const PLAT: LibItem[] = [
  pqC('Cloison 72/48 BA13 avec isolant', 'm²', 46, 18, 'cloison|placo'),
  pqC('Cloison hydrofuge BA13 H1', 'm²', 52, 21, 'cloison hydro|hydro|hydrofuge'),
  pqC('Plaque BA13 standard', 'u', 9.5, 5.8, 'ba13|plaque', { supplier: 'Point P' }),
  pqC('Rails et montants 48 mm', 'm', 3.2, 1.8, 'rail|montant', { supplier: 'Point P' }),
  pqC('Bandes et enduit de jointoiement', 'm²', 9, 1.8, 'bande|joint placo'),
  pqC('Coffrage de gaine (soffite)', 'ml', 42, 14, 'coffrage|soffite'),
  pqD('Doublage collé PSE 10+80', 'm²', 38, 16, 'doublage|doublage colle'),
  pqD('Doublage sur ossature et laine 100 mm', 'm²', 56, 24, 'doublage ossature|isolation mur'),
  pqD('Isolation des combles laine soufflée 300 mm', 'm²', 32, 12, 'comble|laine soufflee|isolation comble'),
  pqD('Isolation sous rampants 200 mm', 'm²', 62, 27, 'rampant'),
  pqD('Laine de verre 45 mm', 'm²', 6.5, 3.4, 'laine verre|laine', { supplier: 'Point P' }),
  pqP('Plafond suspendu BA13', 'm²', 48, 19, 'plafond|faux plafond'),
  pqP('Faux plafond acoustique', 'm²', 58, 26, 'plafond acoustique|acoustique'),
  pqP('Trappe de visite 60x60', 'u', 65, 28, 'trappe'),
  pqP("Main d'œuvre plaquiste", 'h', 46, 28, 'main oeuvre plaquiste'),
];

// Menuiserie
const meX = mk('menuiserie', 'Menuiseries extérieures');
const meI = mk('menuiserie', 'Menuiseries intérieures');
const meA = mk('menuiserie', 'Sols et agencement');
const MENU: LibItem[] = [
  meX('Fenêtre PVC 2 vantaux 120x135 Uw 1,3', 'u', 640, 410, 'fenetre|fenetre pvc', { supplier: 'Lapeyre Pro' }),
  meX('Fenêtre aluminium 2 vantaux 120x135', 'u', 980, 650, 'fenetre alu|fenetre aluminium', { supplier: 'Lapeyre Pro' }),
  meX('Porte-fenêtre PVC 2 vantaux', 'u', 890, 580, 'porte fenetre', { supplier: 'Lapeyre Pro' }),
  meX('Baie coulissante aluminium 240 cm', 'u', 2450, 1680, 'baie|baie coulissante', { supplier: 'Lapeyre Pro' }),
  meX('Volet roulant électrique', 'u', 590, 380, 'volet|volet roulant', { supplier: 'Lapeyre Pro', ref: 'Somfy io' }),
  meX("Porte d'entrée acier isolante", 'u', 1890, 1290, 'porte entree', { supplier: 'Lapeyre Pro' }),
  meX('Dépose et évacuation des anciennes menuiseries', 'u', 65, 12, 'depose menuiserie|depose fenetre'),
  meX('Habillage et bavette aluminium', 'u', 45, 18, 'habillage|bavette'),
  meI('Bloc-porte intérieur 83 cm', 'u', 290, 165, 'porte|bloc porte|porte interieure'),
  meI('Porte de placard coulissante', 'u', 420, 260, 'placard'),
  meI('Escalier quart tournant chêne', 'u', 3800, 2500, 'escalier'),
  meA('Parquet contrecollé chêne fourni', 'm²', 58, 32, 'parquet', { supplier: 'Point P' }),
  meA('Pose de parquet flottant', 'm²', 24, 4, 'pose parquet'),
  meA('Sous-couche parquet', 'm²', 4, 1.6, 'sous couche parquet'),
  meA('Plinthes bois posées', 'ml', 9, 3.5, 'plinthe bois'),
  meA('Meubles de cuisine posés', 'ml', 650, 420, 'cuisine|meuble cuisine'),
  meA('Plan de travail stratifié', 'ml', 180, 110, 'plan travail'),
  meA("Main d'œuvre menuisier", 'h', 52, 30, 'main oeuvre menuisier'),
];

// Maçonnerie
const maG = mk('maconnerie', 'Gros œuvre');
const maO = mk('maconnerie', 'Ouvertures et démolition');
const maE = mk('maconnerie', 'Installation et évacuation');
const MACO: LibItem[] = [
  maG('Mur en parpaing 20 cm', 'm²', 62, 26, 'parpaing|mur parpaing'),
  maG('Dalle béton armé 12 cm', 'm²', 68, 32, 'dalle beton|beton'),
  maG('Chape ciment 5 cm', 'm²', 24, 8, 'chape'),
  maG('Enduit de façade monocouche', 'm²', 42, 14, 'enduit facade|monocouche'),
  maG('Fondations en semelle filante', 'ml', 140, 62, 'fondation|semelle'),
  maG('Linteau béton armé', 'ml', 85, 30, 'linteau'),
  maG('Muret de clôture', 'ml', 120, 48, 'muret|cloture'),
  maG('Terrasse béton balayé', 'm²', 75, 33, 'terrasse'),
  maG('Tranchée et remblai', 'ml', 35, 9, 'tranchee'),
  maO('Ouverture dans mur porteur (IPN et étaiement)', 'forfait', 2900, 1300, 'ouverture|mur porteur|ipn'),
  maO('Démolition de cloison', 'm²', 28, 4, 'demolition|abattre cloison'),
  maE('Évacuation des gravats et benne', 'forfait', 450, 280, 'gravat|benne|evacuation gravat'),
  maE('Échafaudage (pose, location, dépose)', 'forfait', 380, 190, 'echafaudage'),
  maE('Location mini-pelle avec chauffeur', 'jour', 380, 260, 'pelle|mini pelle', { kind: 'ouvrage' }),
  maE("Main d'œuvre maçon", 'h', 48, 29, 'main oeuvre macon'),
];

// Général
const ge = mk('general', 'Installation de chantier');
const GEN: LibItem[] = [
  ge('Déplacement et installation de chantier', 'forfait', 45, 10, 'deplacement'),
  ge('Nettoyage de fin de chantier', 'forfait', 150, 40, 'nettoyage'),
  ge('Protection et bâchage', 'forfait', 90, 25, 'bachage'),
];

export const LIBRARY: LibItem[] = [...ELEC, ...PLOMB, ...PEINT, ...CARRE, ...PLAT, ...MENU, ...MACO, ...GEN];
export const LIB_BY_ID = Object.fromEntries(LIBRARY.map((i) => [i.id, i])) as Record<string, LibItem>;

/** Taux de main d'œuvre par métier (bibliothèque), utilisé quand on dicte « x heures ». */
export const LABOUR_BY_TRADE: Record<LibTrade, string> = {
  electricite: LIBRARY.find((i) => i.designation === "Main d'œuvre électricien")!.id,
  plomberie: LIBRARY.find((i) => i.designation === "Main d'œuvre plombier")!.id,
  peinture: LIBRARY.find((i) => i.designation === "Main d'œuvre peintre")!.id,
  carrelage: LIBRARY.find((i) => i.designation === "Main d'œuvre carreleur")!.id,
  platrerie: LIBRARY.find((i) => i.designation === "Main d'œuvre plaquiste")!.id,
  menuiserie: LIBRARY.find((i) => i.designation === "Main d'œuvre menuisier")!.id,
  maconnerie: LIBRARY.find((i) => i.designation === "Main d'œuvre maçon")!.id,
  general: LIBRARY.find((i) => i.designation === "Main d'œuvre électricien")!.id,
};

/** Retire les accents et met en minuscules, caractère par caractère (même longueur). */
export const foldChar = (c: string) => {
  if (c === 'œ' || c === 'Œ') return 'o';
  if (c === 'æ' || c === 'Æ') return 'a';
  const f = c.normalize('NFD')[0].toLowerCase();
  return f.length === 1 ? f : c;
};
export const fold = (s: string) => Array.from(s).map(foldChar).join('');

/** Recherche plein texte dans la bibliothèque (désignation, référence, fournisseur, mots clés). */
export function searchLibrary(query: string, limit = 8): LibItem[] {
  const words = fold(query).split(/[^a-z0-9.]+/).filter((w) => w.length > 0);
  if (!words.length) return [];
  const scored: { item: LibItem; score: number }[] = [];
  for (const item of LIBRARY) {
    const hay = fold(`${item.designation} ${item.ref ?? ''} ${item.supplier ?? ''} ${item.match.join(' ')} ${TRADE_LABEL[item.trade]}`);
    let score = 0;
    let ok = true;
    for (const w of words) {
      const stem = w.length > 4 ? w.replace(/(s|x)$/, '') : w;
      const idx = hay.indexOf(stem);
      if (idx === -1) {
        ok = false;
        break;
      }
      score += idx === 0 || hay[idx - 1] === ' ' ? 3 : 1;
    }
    if (ok) scored.push({ item, score: score - item.designation.length / 200 });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.item);
}

/** Retrouve l'élément de bibliothèque d'une ligne (par référence ou désignation). */
export function findLibItemForLine(line: { designation: string; supplierRef?: string }): LibItem | undefined {
  if (line.supplierRef) {
    const byRef = LIBRARY.find((i) => i.ref && i.ref === line.supplierRef);
    if (byRef) return byRef;
  }
  const d = fold(line.designation);
  return LIBRARY.find((i) => fold(i.designation) === d);
}
