// Export comptable et connecteurs. Les fichiers CSV et FEC sont réellement générés dans le navigateur.
// Connecteurs (Pennylane, Tiime…) simulés en démo. Vraie version : OAuth du logiciel puis
// POST /api/compta/sync côté worker, qui pousse factures, avoirs, achats et paiements.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { totals } from '@/lib/format';
import type { BrixState } from '@/lib/store';
import { download } from './fraisService';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const CONNECTORS = [
  { key: 'pennylane', name: 'Pennylane', sub: 'Synchro en temps réel', color: '#00b386' },
  { key: 'tiime', name: 'Tiime', sub: 'Gratuit avec votre cabinet', color: '#2563eb' },
  { key: 'indy', name: 'Indy', sub: 'Indépendants et micro', color: '#14b8a6' },
  { key: 'sage', name: 'Sage', sub: 'Export ou connecteur', color: '#00a651' },
  { key: 'cegid', name: 'Cegid Loop', sub: 'Pour les cabinets', color: '#0046ad' },
  { key: 'ebp', name: 'EBP', sub: 'Import automatique', color: '#e30613' },
  { key: 'quadra', name: 'Quadra', sub: 'Cegid Quadra Expert', color: '#7c3aed' },
];

export interface Guest { email: string; name: string; since: string; access: 'lecture' | 'complet' }

interface ComptaState {
  connected: string | null;
  lastSync: string | null;
  guests: Guest[];
  setConnected: (k: string | null) => void;
  addGuest: (g: Guest) => void;
  removeGuest: (email: string) => void;
}

export const useCompta = create<ComptaState>()(
  persist(
    (set) => ({
      connected: null,
      lastSync: null,
      guests: [{ email: 'c.morel@cabinet-morel-expertise.fr', name: 'Cabinet Morel Expertise', since: '2025-01-12', access: 'lecture' }],
      setConnected: (connected) => set({ connected, lastSync: connected ? new Date().toISOString() : null }),
      addGuest: (g) => set((s) => ({ guests: [...s.guests.filter((x) => x.email !== g.email), g] })),
      removeGuest: (email) => set((s) => ({ guests: s.guests.filter((g) => g.email !== email) })),
    }),
    { name: 'brix-v2-compta', version: 1 },
  ),
);

export async function connectSoftware(_key: string) {
  await wait(1600);
  return { ok: true, demo: true };
}

export type Period = { from: string; to: string; label: string };

const fr = (n: number) => n.toFixed(2).replace('.', ',');
const ymd = (iso: string) => iso.replace(/-/g, '');

type Src = Pick<BrixState, 'factures' | 'expenses' | 'bank' | 'clients' | 'company'>;

/** Fichier des écritures comptables (format FEC, article A47 A-1 du LPF), en texte tabulé. */
export function exportFec(s: Src, p: Period) {
  const head = ['JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate', 'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib', 'PieceRef', 'PieceDate', 'EcritureLib', 'Debit', 'Credit', 'EcritureLet', 'DateLet', 'ValidDate', 'Montantdevise', 'Idevise'];
  const rows: string[][] = [];
  let n = 0;
  const inP = (d: string) => d >= p.from && d <= p.to;
  for (const f of s.factures.filter((x) => inP(x.issueDate) && x.status !== 'brouillon')) {
    n++;
    const t = totals(f.lines);
    const c = s.clients.find((x) => x.id === f.clientId);
    const aux = 'C' + (c?.id.replace(/\W/g, '').slice(2, 10).toUpperCase() ?? 'DIVERS');
    const lib = `${f.number} ${c?.name ?? ''}`.trim();
    const sign = f.kind === 'avoir' ? -1 : 1;
    const line = (compte: string, cl: string, d: number, cr: number, a = '', al = '') => rows.push(['VE', 'Ventes', `VE${String(n).padStart(5, '0')}`, ymd(f.issueDate), compte, cl, a, al, f.number, ymd(f.issueDate), lib, fr(d), fr(cr), '', '', ymd(f.issueDate), '', '']);
    line('411000', 'Clients', sign > 0 ? t.ttc : 0, sign < 0 ? t.ttc : 0, aux, c?.name ?? '');
    line('706000', 'Prestations de services', sign < 0 ? t.ht : 0, sign > 0 ? t.ht : 0);
    t.byVat.forEach((v) => line(`445710${v.rate === 20 ? '' : v.rate}`.slice(0, 8), `TVA collectée ${v.rate} %`, sign < 0 ? v.tva : 0, sign > 0 ? v.tva : 0));
  }
  for (const e of s.expenses.filter((x) => inP(x.date))) {
    n++;
    const line = (compte: string, cl: string, d: number, cr: number) => rows.push(['NDF', 'Notes de frais', `NDF${String(n).padStart(5, '0')}`, ymd(e.date), compte, cl, '', '', e.id, ymd(e.date), e.supplier, fr(d), fr(cr), '', '', ymd(e.date), '', '']);
    const acc = /carburant/i.test(e.category) ? ['606100', 'Carburant'] : /repas/i.test(e.category) ? ['625700', 'Réceptions'] : /station|péage/i.test(e.category) ? ['625100', 'Voyages et déplacements'] : ['606300', 'Petit équipement'];
    line(acc[0], acc[1], e.amountTtc - e.vat, 0);
    line('445660', 'TVA déductible', e.vat, 0);
    line('421000', 'Personnel, rémunérations dues', 0, e.amountTtc);
  }
  for (const b of s.bank.filter((x) => inP(x.date))) {
    n++;
    const line = (compte: string, cl: string, d: number, cr: number) => rows.push(['BQ', 'Banque', `BQ${String(n).padStart(5, '0')}`, ymd(b.date), compte, cl, '', '', b.id, ymd(b.date), b.label, fr(d), fr(cr), '', '', ymd(b.date), '', '']);
    const a = Math.abs(b.amount);
    line('512000', 'Banque', b.amount > 0 ? a : 0, b.amount < 0 ? a : 0);
    line(b.amount > 0 ? '411000' : '401000', b.amount > 0 ? 'Clients' : 'Fournisseurs', b.amount < 0 ? a : 0, b.amount > 0 ? a : 0);
  }
  const siren = s.company.siret.replace(/\D/g, '').slice(0, 9) || '000000000';
  download(`${siren}FEC${ymd(p.to)}.txt`, [head, ...rows].map((r) => r.join('\t')).join('\r\n'), 'text/plain;charset=utf-8');
  return rows.length;
}

/** Journal des ventes en CSV (ouvrable dans Excel). */
export function exportSalesCsv(s: Src, p: Period) {
  const head = ['Date', 'Numéro', 'Type', 'Client', 'SIRET client', 'Montant HT', 'TVA', 'Montant TTC', 'Payé', 'Statut'];
  const rows = s.factures
    .filter((f) => f.issueDate >= p.from && f.issueDate <= p.to && f.status !== 'brouillon')
    .sort((a, b) => a.issueDate.localeCompare(b.issueDate))
    .map((f) => {
      const t = totals(f.lines);
      const c = s.clients.find((x) => x.id === f.clientId);
      return [f.issueDate, f.number, f.kind, c?.name ?? '', c?.siret ?? '', fr(t.ht), fr(t.tva), fr(t.ttc), fr(f.paidAmount), f.status];
    });
  download(`ventes-${p.from}-${p.to}.csv`, '﻿' + [head, ...rows].map((r) => r.map((x) => `"${x}"`).join(';')).join('\r\n'), 'text/csv;charset=utf-8');
  return rows.length;
}

/** Archive des PDF (factures, tickets). Vraie version : GET /api/compta/archive?from&to (zip généré par le worker). */
export async function exportPdfZip(_p: Period) {
  await wait(1500);
  return { ok: true, demo: true };
}

/** TVA du mois : collectée sur les encaissements (travaux), déductible sur achats et frais. */
export function vatOfMonth(s: Pick<BrixState, 'factures' | 'expenses' | 'bank'>, month: string) {
  const collected = s.factures
    .filter((f) => f.status !== 'annulee')
    .reduce((a, f) => {
      const t = totals(f.lines);
      const paidThisMonth = f.einvoice.history.some((h) => h.status === 'encaissee' && h.at.slice(0, 7) === month) || (f.paidAmount > 0 && f.issueDate.slice(0, 7) === month);
      return a + (paidThisMonth && t.ttc ? (f.paidAmount * t.tva) / t.ttc : 0);
    }, 0);
  const fromExpenses = s.expenses.filter((e) => e.date.slice(0, 7) === month).reduce((a, e) => a + e.vat, 0);
  const fromPurchases = s.bank.filter((b) => b.date.slice(0, 7) === month && b.amount < 0 && /achats|carburant/i.test(b.category ?? '')).reduce((a, b) => a + (-b.amount / 1.2) * 0.2, 0);
  const deductible = fromExpenses + fromPurchases;
  return { collected, deductible, due: collected - deductible };
}
