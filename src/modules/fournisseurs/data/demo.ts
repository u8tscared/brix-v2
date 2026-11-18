// Démo de l'espace Achats pour Benali Électricité (Villeurbanne) : ses vrais fournisseurs habituels,
// une demande de prix tirée du devis D-2026-121 (rénovation T3 de Mme Lefèvre), des commandes en cours.
// Adresses e-mail en @exemple.fr : rien ne part chez un vrai fournisseur.

import { dayOffset } from '@/lib/format';
import type { Devis } from '@/lib/types';
import { besoinsDuDevis, jeton } from './helpers';
import type { Article, Commande, Demande, Fournisseur } from './types';

const at = (days: number, h = 9) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(h, 12, 0, 0);
  // Jamais dans le futur : avant 9 h, un événement « d'aujourd'hui à 9 h » n'a pas encore eu lieu.
  if (d.getTime() > Date.now()) d.setTime(Date.now() - (24 - h) * 5 * 60000);
  return d.toISOString();
};

export const DEMO_FOURNISSEURS: Fournisseur[] = [
  { id: 'frn_rexel', nom: 'Rexel Villeurbanne', enseigne: 'rexel', agence: 'Villeurbanne – Croix-Luizet', contact: 'Julie Reynaud', email: 'comptoir.villeurbanne@exemple.fr', telephone: '04 72 00 00 01', numeroCompte: 'RX-448120', metiers: ['electricite'], franco: 150, delaiJours: 1, connecteur: 'rexel', favori: true },
  { id: 'frn_sonepar', nom: 'Sonepar Lyon Est', enseigne: 'sonepar', agence: 'Vaulx-en-Velin', contact: 'Hugo Martel', email: 'lyon-est@exemple.fr', telephone: '04 72 00 00 02', numeroCompte: 'SNP-20931', metiers: ['electricite'], franco: 200, delaiJours: 2, connecteur: 'sonepar', favori: true },
  { id: 'frn_yesss', nom: 'Yesss Électrique Lyon', enseigne: 'yesss', agence: 'Lyon 7', contact: 'Nadia Ferhat', email: 'lyon7@exemple.fr', telephone: '04 72 00 00 03', metiers: ['electricite'], franco: 250, delaiJours: 2, connecteur: 'yesss' },
  { id: 'frn_cedeo', nom: 'Cédéo Villeurbanne', enseigne: 'cedeo', agence: 'Villeurbanne', contact: 'Sophie Marchand', email: 'cedeo.villeurbanne@exemple.fr', telephone: '04 72 00 00 04', metiers: ['plomberie', 'electricite'], franco: 200, delaiJours: 1, connecteur: 'cedeo' },
  { id: 'frn_wurth', nom: 'Würth (Marc, commercial)', enseigne: 'wurth', contact: 'Marc Dubreuil', email: 'marc.dubreuil@exemple.fr', telephone: '06 00 00 00 05', metiers: [], franco: 100, delaiJours: 3, connecteur: 'email' },
];

// [référence, EAN, désignation, unité, prix net Rexel, coef Sonepar, coef Yesss]
const TARIFS: [string, string, string, string, number, number, number][] = [
  ['Legrand 401213', '3245064012133', 'Coffret Drivia 3 rangées 39 modules', 'u', 79.9, 1.04, 0.98],
  ['Legrand 411650', '3245064116503', 'Interrupteur différentiel 40 A 30 mA type A', 'u', 42.6, 0.97, 1.05],
  ['Legrand 411652', '3245064116527', 'Interrupteur différentiel 40 A 30 mA type F', 'u', 76.2, 0.95, 1.02],
  ['Legrand 406774', '3245064067744', 'Disjoncteur DX³ 16 A courbe C', 'u', 6.85, 1.03, 0.94],
  ['Legrand 406775', '3245064067751', 'Disjoncteur DX³ 20 A courbe C', 'u', 7.35, 1.02, 0.95],
  ['Legrand 067111', '3245060671112', 'Prise 2P+T Céliane blanc', 'u', 12.4, 0.96, 1.04],
  ['Nexans 3G2.5', '3700000032251', 'Câble R2V 3G2,5 mm² (au mètre)', 'm', 1.38, 1.05, 0.99],
  ['Aric 50620', '3700000506206', 'Spot LED encastré 7 W IP65', 'u', 25.9, 0.98, 0.92],
  ['Legrand 089101', '3245060891015', 'Gaine ICTA Ø20 couronne 100 m', 'u', 38.5, 1.01, 0.97],
  ['Wago 221-413', '4045454908011', 'Borne de connexion 3 entrées (boîte de 50)', 'u', 19.9, 0.94, 1.0],
];

function catalogue(): Article[] {
  const out: Article[] = [];
  const four: [string, number][] = [['frn_rexel', 0], ['frn_sonepar', 5], ['frn_yesss', 6]];
  for (const [fid, idx] of four) {
    for (const t of TARIFS) {
      const coef = idx === 0 ? 1 : (t[idx] as number);
      const prix = Math.round(t[4] * coef * 100) / 100;
      // Hausse récente chez Rexel sur le type F et le câble, pour l'alerte
      const hausse = fid === 'frn_rexel' && (t[0] === 'Legrand 411652' || t[0] === 'Nexans 3G2.5');
      const ancien = hausse ? Math.round(prix * 0.91 * 100) / 100 : prix;
      out.push({
        id: `art_${fid}_${t[0].replace(/\W/g, '')}`,
        fournisseurId: fid,
        reference: t[0],
        ean: t[1],
        marque: t[0].split(' ')[0],
        designation: t[2],
        unite: t[3],
        prixPublic: Math.round(t[4] * 1.6 * 100) / 100,
        prixNet: prix,
        source: 'import',
        majLe: hausse ? at(-12) : at(-40),
        historique: hausse ? [{ le: at(-120), prix: ancien }, { le: at(-12), prix }] : [{ le: at(-40), prix }],
      });
    }
  }
  return out;
}

export function demoState(devis: Devis[]) {
  const cat = catalogue();
  const fournisseurs = DEMO_FOURNISSEURS;
  const lefevre = devis.find((d) => d.id === 'q_121');
  const demandes: Demande[] = [];
  const commandes: Commande[] = [];

  if (lefevre) {
    const lignes = besoinsDuDevis(lefevre).map((l, i) => ({ ...l, id: `dpl_demo_${i}` }));
    const prixDe = (fid: string, sousDelai: number[] = []) =>
      lignes.map((l, i) => {
        const a = cat.find((x) => x.fournisseurId === fid && (x.reference === l.reference || x.designation.startsWith(l.designation.slice(0, 18))));
        return { ligneId: l.id, prix: a ? a.prixNet : null, ...(sousDelai.includes(i) ? { dispo: 'delai' as const, dispoJours: 2 } : { dispo: 'stock' as const }) };
      });
    demandes.push({
      id: 'dp_demo_1',
      numero: `DP-${new Date().getFullYear()}-0001`,
      titre: 'Matériel tableau et prises · Rénovation T3 Mme Lefèvre',
      devisId: lefevre.id,
      chantierId: lefevre.chantierId,
      statut: 'reponses_partielles',
      dateLimite: dayOffset(1),
      livraisonSouhaitee: dayOffset(3),
      adresse: '18 rue Paul Bert, 69003 Lyon',
      createdAt: at(-1, 8),
      lignes,
      destinataires: [
        { id: 'dpd_demo_rexel', fournisseurId: 'frn_rexel', token: jeton(), statut: 'repondue', envoyeLe: at(-1, 8), vuLe: at(-1, 9), reponduLe: at(-1, 11), delaiJours: 1, port: 0, conditions: '30 jours fin de mois', validiteJours: 30, prix: prixDe('frn_rexel', [6]) },
        { id: 'dpd_demo_sonepar', fournisseurId: 'frn_sonepar', token: jeton(), statut: 'repondue', envoyeLe: at(-1, 8), vuLe: at(-1, 10), reponduLe: at(0, 8), delaiJours: 2, port: 18, commentaire: 'Différentiels type F en stock à Vaulx, le reste sous 48 h.', remise: 3, conditions: '45 jours fin de mois', validiteJours: 15, pieceJointe: { nom: 'Offre Sonepar DP-0001.pdf', taille: 184320 }, prix: prixDe('frn_sonepar', [0, 4, 7]) },
        { id: 'dpd_demo_yesss', fournisseurId: 'frn_yesss', token: jeton(), statut: 'vue', envoyeLe: at(-1, 8), vuLe: at(0, 7), prix: [] },
      ],
      journal: [
        { at: at(0, 8), texte: 'Sonepar Lyon Est a répondu (8/8 articles)', acteur: 'fournisseur' },
        { at: at(0, 7), texte: 'Yesss Électrique Lyon a ouvert la demande', acteur: 'fournisseur' },
        { at: at(-1, 11), texte: 'Rexel Villeurbanne a répondu (8/8 articles)', acteur: 'fournisseur' },
        { at: at(-1, 8), texte: 'Envoyée à Rexel Villeurbanne, Sonepar Lyon Est, Yesss Électrique Lyon', acteur: 'systeme' },
        { at: at(-1, 8), texte: 'Demande créée depuis le devis D-2026-121', acteur: 'artisan' },
      ],
    });
  }

  commandes.push({
    id: 'bc_demo_1',
    numero: `BC-${new Date().getFullYear()}-0002`,
    fournisseurId: 'frn_cedeo',
    chantierId: 'ch_lefevre',
    devisId: 'q_121',
    statut: 'expediee',
    token: jeton(),
    port: 0,
    livraisonPrevue: dayOffset(1),
    adresse: '18 rue Paul Bert, 69003 Lyon',
    mode: 'livraison_chantier',
    referenceFournisseur: 'ARC-558120',
    suivi: 'Camion Cédéo, créneau 7 h 30 – 9 h',
    createdAt: at(-2, 17),
    lignes: [
      { id: 'bcl_d1', designation: 'Câble R2V 3G2,5 mm² (au mètre)', reference: 'Nexans 3G2.5', quantite: 100, quantiteLivree: 0, unite: 'm', prix: 1.36 },
      { id: 'bcl_d2', designation: 'Gaine ICTA Ø20 couronne 100 m', reference: 'Legrand 089101', quantite: 2, quantiteLivree: 0, unite: 'u', prix: 37.9 },
      { id: 'bcl_d3', designation: 'Borne de connexion 3 entrées (boîte de 50)', reference: 'Wago 221-413', quantite: 2, quantiteLivree: 0, unite: 'u', prix: 18.9 },
    ],
    journal: [
      { at: at(-1, 15), texte: 'Expédiée : camion Cédéo, créneau 7 h 30 – 9 h', acteur: 'fournisseur' },
      { at: at(-2, 18), texte: 'Confirmée par Cédéo Villeurbanne (réf. ARC-558120)', acteur: 'fournisseur' },
      { at: at(-2, 17), texte: 'Envoyée à Cédéo Villeurbanne (e-mail + bon de commande joint)', acteur: 'systeme' },
      { at: at(-2, 17), texte: 'Bon de commande créé', acteur: 'artisan' },
    ],
  });
  commandes.push({
    id: 'bc_demo_0',
    numero: `BC-${new Date().getFullYear()}-0001`,
    fournisseurId: 'frn_rexel',
    chantierId: 'ch_martin',
    statut: 'facturee',
    port: 0,
    livraisonPrevue: dayOffset(-12),
    adresse: '27 cours Émile Zola, 69100 Villeurbanne',
    mode: 'retrait_agence',
    referenceFournisseur: 'RX-CMD-99812',
    factureId: 'ff_demo_0',
    ecartFacture: 0,
    createdAt: at(-14, 10),
    lignes: [
      { id: 'bcl_o1', designation: 'Disjoncteur DX³ 16 A courbe C', reference: 'Legrand 406774', quantite: 12, quantiteLivree: 12, unite: 'u', prix: 6.85 },
      { id: 'bcl_o2', designation: 'Coffret Drivia 3 rangées 39 modules', reference: 'Legrand 401213', quantite: 1, quantiteLivree: 1, unite: 'u', prix: 79.9 },
    ],
    journal: [
      { at: at(-10, 9), texte: 'Facture rapprochée : montant conforme', acteur: 'artisan' },
      { at: at(-12, 8), texte: 'Retirée en agence', acteur: 'artisan' },
      { at: at(-14, 10), texte: 'Envoyée à Rexel Villeurbanne', acteur: 'systeme' },
    ],
  });

  return { fournisseurs, demandes, commandes, catalogue: cat, jetons: [] };
}
