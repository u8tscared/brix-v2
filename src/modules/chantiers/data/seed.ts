// Données de démo du département Chantiers (Benali Électricité).
// Dates relatives à aujourd'hui pour que la démo reste vivante.

import { dayOffset as d } from '@/lib/format';
import type { ArtKind, ChantierPhoto, Contract, Intervention, JournalEntry, Phase, Pv, SavVisit } from '../store';

const at = (offset: number, time: string) => `${d(offset)}T${time}:00`;

type P = [room: string, phase: Phase, art: ArtKind, caption: string, day: number, time: string, by: string, tag?: string];

const PHOTOS: Record<string, P[]> = {
  ch_lefevre: [
    ['Entrée', 'avant', 'tableau', 'Ancien tableau à fusibles, sans différentiel', -6, '08:12', 'e_karim', 'tableau-avant'],
    ['Séjour', 'avant', 'prise', 'Prises sans terre côté fenêtre', -6, '08:20', 'e_karim'],
    ['Cuisine', 'avant', 'mur', 'Mur plan de travail avant saignées', -6, '08:26', 'e_yanis'],
    ['Séjour', 'pendant', 'saignee', 'Saignées faites, gaines ICTA 20 posées', -2, '16:40', 'e_yanis', 'saignees'],
    ['Chambre', 'pendant', 'saignee', 'Descentes de prises chambre 1', -1, '11:05', 'e_lucas', 'saignees'],
    ['Cuisine', 'pendant', 'prise', 'Boîtes d’encastrement plan de travail', -1, '15:22', 'e_yanis'],
    ['Entrée', 'pendant', 'tableau', 'Nouveau coffret Drivia fixé, en attente de câblage', 0, '09:02', 'e_yanis'],
    ['Salle de bain', 'avant', 'spots', 'Plafonnier hors volume à remplacer', -6, '08:40', 'e_karim'],
  ],
  ch_martin: [
    ['Local technique', 'avant', 'tableau', 'Tableau monophasé saturé', -14, '07:40', 'e_mehdi', 'tableau-avant'],
    ['Fournil', 'avant', 'four', 'Four à raccorder en triphasé', -14, '07:52', 'e_mehdi'],
    ['Local technique', 'pendant', 'tableau', 'Tableau triphasé ouvert, avant fermeture', -3, '16:10', 'e_mehdi', 'tableau-ouvert'],
    ['Fournil', 'pendant', 'saignee', 'Chemin de câbles 5G10 vers le four', -5, '10:30', 'e_mehdi', 'saignees'],
    ['Boutique', 'pendant', 'spots', 'Rails LED vitrine posés', -2, '14:15', 'e_mehdi'],
    ['Fournil', 'apres', 'four', 'Four raccordé, essais à vide OK', -1, '17:05', 'e_mehdi'],
  ],
  ch_tilleuls: [
    ['Cage A', 'avant', 'hublot', 'Hublots fluo d’origine, 2 hors service', -20, '09:00', 'e_yanis'],
    ['Cage A', 'apres', 'hublot', 'Hublots LED à détection posés, cage A', -9, '16:30', 'e_yanis'],
    ['Cage B', 'pendant', 'hublot', 'Cage B : 6 hublots sur 12', -1, '15:45', 'e_lucas'],
    ['Cage B', 'pendant', 'tableau', 'Minuterie remplacée, coffret ouvert', -2, '11:20', 'e_yanis', 'tableau-ouvert'],
    ['Cage C', 'avant', 'hublot', 'Cage C : accès par la cour', -20, '09:15', 'e_yanis'],
  ],
  ch_nguyen: [
    ['Local technique', 'avant', 'mur', 'Emplacement de la baie, prise dédiée à créer', -10, '08:05', 'e_mehdi'],
    ['Salle d’attente', 'pendant', 'spots', 'Dalles LED 60x60 posées', -4, '15:00', 'e_mehdi'],
    ['Cabinet 1', 'pendant', 'prise', 'Prises RJ45 et 2P+T bureau', -3, '10:40', 'e_mehdi'],
    ['Local technique', 'pendant', 'baie', 'Baie 12U fixée, brassage à faire', -1, '16:20', 'e_mehdi'],
  ],
  ch_dupuis: [
    ['Garage', 'avant', 'mur', 'Mur du garage, tableau à 9 m', -4, '18:10', 'e_karim'],
    ['Allée', 'avant', 'borne', 'Emplacement souhaité de la borne', -4, '18:14', 'e_karim'],
  ],
  ch_morel: [
    ['Entrée', 'avant', 'tableau', 'Disjoncteur de branchement qui chauffe', -40, '10:00', 'e_karim', 'tableau-avant'],
    ['Entrée', 'pendant', 'tableau', 'Tableau ouvert, avant fermeture', -39, '15:30', 'e_karim', 'tableau-ouvert'],
    ['Entrée', 'apres', 'tableau', 'Tableau refait et repéré', -38, '16:45', 'e_karim', 'tableau-fini'],
  ],
};

export function seedChantiers() {
  const photos: ChantierPhoto[] = Object.entries(PHOTOS).flatMap(([chantierId, list]) =>
    list.map(([room, phase, art, caption, day, time, by, tag], i) => ({ id: `ph_${chantierId}_${i}`, chantierId, room, phase, art, caption, at: at(day, time), by, tag })),
  );

  const journal: JournalEntry[] = [
    { id: 'j1', chantierId: 'ch_lefevre', at: at(0, '07:58'), kind: 'evenement', author: 'e_yanis', text: 'Yanis a pointé à son arrivée sur le chantier.' },
    { id: 'j2', chantierId: 'ch_lefevre', at: at(-1, '17:42'), kind: 'vocal', author: 'e_yanis', duration: 38, text: 'Saignées du séjour et de la chambre 1 terminées. Il manque trois boîtes d’encastrement pour la cuisine, je passe chez Rexel demain à 7 h 30.' },
    { id: 'j3', chantierId: 'ch_lefevre', at: at(-2, '12:10'), kind: 'note', author: 'client', text: 'Mme Lefèvre demande une prise de plus derrière le canapé. À chiffrer dans un avenant.' },
    { id: 'j4', chantierId: 'ch_lefevre', at: at(-3, '18:30'), kind: 'rapport', author: 'e_karim', text: 'Rapport d’intervention envoyé à Mme Lefèvre (6 photos). Lu le soir même.' },
    { id: 'j5', chantierId: 'ch_lefevre', at: at(-6, '08:00'), kind: 'evenement', author: 'bob', text: 'Chantier démarré. Acompte de 1 659,37 € encaissé.' },
    { id: 'j6', chantierId: 'ch_tilleuls', at: at(-1, '16:55'), kind: 'vocal', author: 'e_yanis', duration: 52, text: 'Cage B à moitié faite. Les plafonds sont plus hauts que prévu, il faut la nacelle pour la cage C. Je compte six heures de plus.' },
    { id: 'j7', chantierId: 'ch_tilleuls', at: at(-1, '17:20'), kind: 'evenement', author: 'bob', text: 'Brix AI a détecté un dépassement d’heures : avenant conseillé.' },
    { id: 'j8', chantierId: 'ch_tilleuls', at: at(-9, '16:40'), kind: 'rapport', author: 'e_karim', text: 'Rapport de fin de cage A envoyé à M. Roche (SCI Les Tilleuls).' },
    { id: 'j9', chantierId: 'ch_martin', at: at(-1, '17:10'), kind: 'vocal', author: 'e_mehdi', duration: 24, text: 'Four raccordé et testé à vide. Reste la chambre froide lundi matin, avant l’ouverture.' },
    { id: 'j10', chantierId: 'ch_martin', at: at(-3, '09:00'), kind: 'achat', author: 'bob', text: 'Commande Rexel livrée : tableau triphasé 4 rangées et 35 m de 5G10.' },
    { id: 'j11', chantierId: 'ch_nguyen', at: at(-1, '16:30'), kind: 'note', author: 'e_mehdi', text: 'Baie fixée. Le brassage attend les cordons RJ45, livraison mercredi.' },
    { id: 'j12', chantierId: 'ch_dupuis', at: at(-2, '10:00'), kind: 'evenement', author: 'bob', text: 'Demande de raccordement envoyée à Enedis. Réponse sous 10 jours ouvrés.' },
  ];

  const pvs: Pv[] = [
    { id: 'pv_morel', chantierId: 'ch_morel', date: d(-38), withReserves: false, reserves: [], clientName: 'Michel Roux', signatures: {}, signedAt: d(-38), sentAt: d(-38) },
  ];

  const contracts: Contract[] = [
    { id: 'ct1', clientId: 'c_tilleuls', equipment: 'tableau', label: 'Tableau des parties communes (3 cages)', brand: 'Legrand', installedAt: '2019-04-12', lastVisit: d(-352), frequencyMonths: 12, priceHt: 420, reminder: true },
    { id: 'ct2', clientId: 'c_martin', equipment: 'clim', label: 'Climatisation de la boutique', brand: 'Daikin', installedAt: '2022-06-01', lastVisit: d(-380), frequencyMonths: 12, priceHt: 190, reminder: true },
    { id: 'ct3', clientId: 'c_nguyen', equipment: 'vmc', label: 'VMC double flux du cabinet', brand: 'Atlantic', installedAt: '2023-02-20', lastVisit: d(-170), frequencyMonths: 6, priceHt: 140, reminder: true },
    { id: 'ct4', clientId: 'c_lefevre', equipment: 'chauffe_eau', label: 'Chauffe-eau thermodynamique', brand: 'Thermor', installedAt: '2021-10-05', lastVisit: d(-300), frequencyMonths: 12, priceHt: 160, reminder: false },
    { id: 'ct5', clientId: 'c_dupuis', equipment: 'irve', label: 'Borne de recharge 7 kW (à venir)', brand: 'Legrand', installedAt: d(6), lastVisit: d(6), frequencyMonths: 12, priceHt: 120, reminder: true },
    { id: 'ct6', clientId: 'c_roux', equipment: 'chaudiere', label: 'Chaudière gaz à condensation', brand: 'Saunier Duval', installedAt: '2018-11-15', lastVisit: d(-395), frequencyMonths: 12, priceHt: 135, reminder: true },
  ];

  const visits: SavVisit[] = [
    { id: 'v1', clientId: 'c_tilleuls', contractId: 'ct1', date: d(-352), kind: 'entretien', employeeId: 'e_karim', notes: 'Serrage des borniers, test des différentiels : conforme.' },
    { id: 'v2', clientId: 'c_tilleuls', date: d(-18), kind: 'depannage', employeeId: 'e_yanis', notes: 'Remplacement des minuteries cage A et B.' },
    { id: 'v3', clientId: 'c_martin', contractId: 'ct2', date: d(-380), kind: 'entretien', employeeId: 'e_mehdi', notes: 'Nettoyage des filtres, contrôle de pression, 2 kg de fluide OK.' },
    { id: 'v4', clientId: 'c_martin', date: d(-12), kind: 'depannage', employeeId: 'e_mehdi', notes: 'Chambre froide : contacteur remplacé en urgence.' },
    { id: 'v5', clientId: 'c_nguyen', contractId: 'ct3', date: d(-170), kind: 'entretien', employeeId: 'e_mehdi', notes: 'Filtres F7 changés, débits contrôlés.' },
    { id: 'v6', clientId: 'c_roux', contractId: 'ct6', date: d(-395), kind: 'entretien', employeeId: 'e_karim', notes: 'Attestation d’entretien remise. Vase d’expansion à surveiller.' },
    { id: 'v7', clientId: 'c_lefevre', contractId: 'ct4', date: d(-300), kind: 'entretien', employeeId: 'e_yanis', notes: 'Anode vérifiée, détartrage léger.' },
  ];

  const interventions: Intervention[] = [
    { id: 'it1', clientId: 'c_martin', title: 'Disjoncteur du fournil qui saute', description: 'Le différentiel du fournil saute quand le pétrin et le four tournent ensemble.', priority: 'urgente', status: 'nouvelle', createdAt: d(0) },
    { id: 'it2', clientId: 'c_roux', title: 'Prise de la cuisine qui chauffe', description: 'Prise du plan de travail tiède au toucher, odeur de chaud.', priority: 'normale', status: 'planifiee', createdAt: d(-2), plannedAt: d(2), employeeId: 'e_karim', underWarranty: true },
    { id: 'it3', clientId: 'c_tilleuls', title: 'Hublot cage A qui clignote', description: 'Signalé par la gardienne, 2e étage.', priority: 'faible', status: 'nouvelle', createdAt: d(-1), underWarranty: true },
    { id: 'it4', clientId: 'c_nguyen', title: 'Prise RJ45 bureau 2 sans réseau', description: 'Le poste du secrétariat ne capte plus le réseau.', priority: 'normale', status: 'terminee', createdAt: d(-8), plannedAt: d(-6), employeeId: 'e_mehdi' },
  ];

  return { photos, journal, pvs, contracts, visits, interventions };
}
