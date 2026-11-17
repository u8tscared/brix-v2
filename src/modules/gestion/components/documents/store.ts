// Coffre de l'entreprise. Stockage simulé en démo (persisté dans le navigateur).
// Vraie version : fichiers dans R2, métadonnées dans D1 (table documents), récupération
// automatique des attestations URSSAF et fiscale via les API publiques (net-entreprises, impots.gouv).
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dateFull, daysBetween, dayOffset, todayISO } from '@/lib/format';

export interface Doc { id: string; label: string; issuer: string; group: 'societe' | 'assurances' | 'attestations' | 'qualifications'; expires?: string; file: string; auto?: boolean; renewMonths: number; updatedAt?: string }

const seed = (): Doc[] => [
  { id: 'kbis', label: 'Extrait Kbis', issuer: 'Greffe du tribunal de commerce de Lyon', group: 'societe', expires: dayOffset(52), file: 'kbis-benali-electricite.pdf', auto: true, renewMonths: 3 },
  { id: 'statuts', label: 'Statuts de la société', issuer: 'BENALI ELECTRICITE SARL', group: 'societe', file: 'statuts.pdf', renewMonths: 0 },
  { id: 'rib', label: 'RIB du compte pro', issuer: 'Qonto', group: 'societe', file: 'rib-qonto.pdf', renewMonths: 0 },
  { id: 'decennale', label: 'Attestation décennale', issuer: 'AXA · contrat n° 7845120', group: 'assurances', expires: `${new Date().getFullYear()}-12-31`, file: 'attestation-decennale-2026.pdf', renewMonths: 12 },
  { id: 'rcpro', label: 'Responsabilité civile pro', issuer: 'AXA', group: 'assurances', expires: dayOffset(196), file: 'rc-pro.pdf', renewMonths: 12 },
  { id: 'urssaf', label: 'Attestation de vigilance URSSAF', issuer: 'URSSAF Rhône-Alpes', group: 'attestations', expires: dayOffset(12), file: 'vigilance-urssaf.pdf', auto: true, renewMonths: 6 },
  { id: 'fiscale', label: 'Attestation de régularité fiscale', issuer: 'impots.gouv.fr', group: 'attestations', expires: dayOffset(143), file: 'regularite-fiscale.pdf', auto: true, renewMonths: 12 },
  { id: 'rge', label: 'Certificat RGE', issuer: 'Qualifelec', group: 'qualifications', expires: dayOffset(38), file: 'rge-qualifelec.pdf', renewMonths: 12 },
  { id: 'qualifelec', label: 'Qualification Qualifelec E2', issuer: 'Qualifelec', group: 'qualifications', expires: dayOffset(310), file: 'qualifelec-e2.pdf', renewMonths: 48 },
  { id: 'irve', label: 'Qualification IRVE P1', issuer: 'Qualifelec', group: 'qualifications', expires: dayOffset(-4), file: 'irve-p1.pdf', renewMonths: 48 },
];

export const useDocs = create<{ docs: Doc[]; renew: (id: string, file?: string) => void }>()(
  persist(
    (set) => ({
      docs: seed(),
      renew: (id, file) =>
        set((s) => ({ docs: s.docs.map((d) => (d.id === id ? { ...d, file: file ?? d.file, updatedAt: todayISO(), expires: d.renewMonths ? dayOffset(Math.round(d.renewMonths * 30.4)) : d.expires } : d)) })),
    }),
    { name: 'brix-v2-documents', version: 1 },
  ),
);

export const GROUPS: Record<Doc['group'], string> = { societe: 'Société', assurances: 'Assurances', attestations: 'Attestations sociales et fiscales', qualifications: 'Qualifications et labels' };
export const TENDER = ['kbis', 'urssaf', 'fiscale', 'decennale', 'rcpro'];
export const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export type DocTone = 'ok' | 'warn' | 'bad' | 'neutral';
export function docState(d: Doc): { tone: DocTone; label: string; short: string; days: number; pct: number } {
  if (!d.expires) return { tone: 'neutral', label: 'Sans date limite', short: 'Permanent', days: Infinity, pct: 100 };
  const days = daysBetween(todayISO(), d.expires);
  const span = Math.max(30, (d.renewMonths || 12) * 30.4);
  const pct = Math.max(0, Math.min(100, (days / span) * 100));
  if (days < 0) return { tone: 'bad', label: `Expiré depuis ${-days} jour${days < -1 ? 's' : ''}`, short: 'Expiré', days, pct: 0 };
  if (days <= 45) return { tone: 'warn', label: `Expire dans ${days} jour${days > 1 ? 's' : ''}`, short: `${days} j`, days, pct };
  return { tone: 'ok', label: `Valable jusqu’au ${dateFull(d.expires)}`, short: days > 99 ? `${Math.round(days / 30)} mois` : `${days} j`, days, pct };
}

/** Devine quel document un fichier déposé remplace, d'après son nom. */
export function guessDoc(name: string, docs: Doc[]): Doc | undefined {
  const n = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const rules: [RegExp, string][] = [[/kbis/, 'kbis'], [/urssaf|vigilance/, 'urssaf'], [/fiscal|impot/, 'fiscale'], [/decennal/, 'decennale'], [/rc.?pro|responsabilite/, 'rcpro'], [/irve/, 'irve'], [/rge/, 'rge'], [/qualifelec/, 'qualifelec'], [/statut/, 'statuts'], [/rib|iban/, 'rib']];
  const hit = rules.find(([r]) => r.test(n));
  return hit ? docs.find((d) => d.id === hit[1]) : undefined;
}
