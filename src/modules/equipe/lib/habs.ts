// Référentiel des habilitations et formations obligatoires suivies par Brix.

import { daysBetween, todayISO } from '@/lib/format';
import type { Tone } from '@/components/ui';

export interface HabType {
  key: string;
  family: 'Électrique' | 'Engins (CACES)' | 'Hauteur' | 'Secours' | 'Amiante';
  label: string;
  short: string;
  /** Durée de validité conseillée, en années. */
  years: number;
  rule: string;
}

export const HAB_TYPES: HabType[] = [
  { key: 'elec_b0', family: 'Électrique', label: 'B0 / H0 · non-électricien', short: 'B0', years: 3, rule: 'Recyclage conseillé tous les 3 ans (NF C 18-510).' },
  { key: 'elec_b1v', family: 'Électrique', label: 'B1V · exécutant au voisinage', short: 'B1V', years: 3, rule: 'Recyclage conseillé tous les 3 ans (NF C 18-510).' },
  { key: 'elec_b2v', family: 'Électrique', label: 'B2V · chargé de travaux', short: 'B2V', years: 3, rule: 'Recyclage conseillé tous les 3 ans (NF C 18-510).' },
  { key: 'elec_br', family: 'Électrique', label: 'BR · intervention générale', short: 'BR', years: 3, rule: 'Recyclage conseillé tous les 3 ans (NF C 18-510).' },
  { key: 'elec_bc', family: 'Électrique', label: 'BC · consignation', short: 'BC', years: 3, rule: 'Recyclage conseillé tous les 3 ans (NF C 18-510).' },
  { key: 'caces_r482', family: 'Engins (CACES)', label: 'CACES R482 · engins de chantier', short: 'R482', years: 10, rule: 'Valable 10 ans, autorisation de conduite à renouveler.' },
  { key: 'caces_r486', family: 'Engins (CACES)', label: 'CACES R486 · nacelle (PEMP)', short: 'R486', years: 5, rule: 'Valable 5 ans. Sans CACES valide, pas de nacelle.' },
  { key: 'hauteur', family: 'Hauteur', label: 'Travail en hauteur et port du harnais', short: 'Hauteur', years: 3, rule: 'Recyclage conseillé tous les 3 ans.' },
  { key: 'sst', family: 'Secours', label: 'Sauveteur secouriste du travail (SST)', short: 'SST', years: 2, rule: 'Maintien des compétences tous les 24 mois.' },
  { key: 'amiante_ss4', family: 'Amiante', label: 'Amiante sous-section 4', short: 'SS4', years: 3, rule: 'Recyclage obligatoire tous les 3 ans.' },
];

export const habType = (k: string) => HAB_TYPES.find((h) => h.key === k);

export const ALERT_DAYS = 60;

export function habState(expires: string): { tone: Tone; label: string; days: number; level: 'expired' | 'soon' | 'ok' } {
  const days = daysBetween(todayISO(), expires);
  if (days < 0) return { tone: 'bad', label: `Expirée depuis ${-days} j`, days, level: 'expired' };
  if (days <= ALERT_DAYS) return { tone: 'warn', label: `Expire dans ${days} j`, days, level: 'soon' };
  return { tone: 'ok', label: 'Valide', days, level: 'ok' };
}
