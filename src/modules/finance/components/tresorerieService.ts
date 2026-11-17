// Banque reliée et rapprochement. En démo tout est simulé ici.
// Vraie version : agrégateur agréé DSP2 (Bridge, Powens ou GoCardless Bank Account Data) via le worker :
//   POST /api/tresorerie/connect   → URL de connexion de la banque
//   GET  /api/tresorerie/sync      → nouvelles opérations
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dayOffset, todayISO, totals, uid } from '@/lib/format';
import type { BankTx, Facture } from '@/lib/types';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const BANKS = ['Qonto', 'Shine', 'Crédit Agricole', 'BNP Paribas', 'Société Générale', 'LCL', "Caisse d'Épargne", 'Banque Populaire', 'Crédit Mutuel', 'CIC', 'La Banque Postale', 'Revolut Business'];
export const BANK_COLOR: Record<string, string> = { Qonto: '#17171f', Shine: '#ff7a5c', 'Crédit Agricole': '#006a4e', 'BNP Paribas': '#00915a', 'Société Générale': '#e60028', LCL: '#003da5', "Caisse d'Épargne": '#d6001c', 'Banque Populaire': '#0055a4', 'Crédit Mutuel': '#0067ad', CIC: '#00467f', 'La Banque Postale': '#003b8f', 'Revolut Business': '#191c1f' };

export interface BankAccount { id: string; bank: string; label: string; iban: string; balance?: number; main?: boolean; syncedAt: string }

interface TresoState {
  accounts: BankAccount[];
  synced: string[];
  withProbable: boolean;
  addAccount: (a: BankAccount) => void;
  removeAccount: (id: string) => void;
  markSynced: (id: string) => void;
  setWithProbable: (v: boolean) => void;
}

export const useTreso = create<TresoState>()(
  persist(
    (set) => ({
      accounts: [{ id: 'acc_qonto', bank: 'Qonto', label: 'Compte pro', iban: 'FR76 •••• 0143', main: true, syncedAt: new Date().toISOString() }],
      synced: [],
      withProbable: false,
      addAccount: (a) => set((s) => ({ accounts: [...s.accounts, a] })),
      removeAccount: (id) => set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) })),
      markSynced: (id) => set((s) => ({ synced: [...s.synced, id], accounts: s.accounts.map((a) => ({ ...a, syncedAt: new Date().toISOString() })) })),
      setWithProbable: (withProbable) => set({ withProbable }),
    }),
    { name: 'brix-v2-tresorerie', version: 1 },
  ),
);

export async function connectBank(bank: string): Promise<BankAccount> {
  await wait(1800);
  const n = Math.floor(1000 + Math.random() * 8999);
  return { id: uid('acc'), bank, label: bank === 'Shine' || bank === 'Qonto' ? 'Compte pro' : 'Compte courant pro', iban: `FR76 •••• ${n}`, balance: Math.round(2000 + Math.random() * 6000), syncedAt: new Date().toISOString() };
}

/** Nouvelles opérations depuis la banque (démo : un virement attendu et une carte). */
export async function syncBank(already: string[]): Promise<BankTx[]> {
  await wait(1300);
  const fresh: BankTx[] = [
    { id: 'sync_roux', date: todayISO(), label: 'VIR M MICHEL ROUX FACTURE F-2026-199', amount: 704 },
    { id: 'sync_cedeo', date: todayISO(), label: 'CB CEDEO LYON 7', amount: -184.2, category: 'Achats matériel' },
    { id: 'sync_parking', date: dayOffset(-1), label: 'CB INDIGO PARKING', amount: -6.8, category: 'Stationnement' },
  ];
  return fresh.filter((t) => !already.includes(t.id));
}

export const openAmount = (f: Facture) => totals(f.lines).ttc - f.paidAmount;

/** Rapprochement automatique : montant identique, ou numéro de facture dans le libellé. */
export function autoMatch(tx: BankTx, factures: Facture[]): Facture | undefined {
  if (tx.amount <= 0 || tx.matchedFactureId) return undefined;
  const open = factures.filter((f) => !['payee', 'annulee', 'brouillon'].includes(f.status));
  return open.find((f) => tx.label.includes(f.number)) ?? open.find((f) => Math.abs(openAmount(f) - tx.amount) < 0.01);
}

export function applyPayment(f: Facture, amount: number): Facture {
  const paid = f.paidAmount + amount;
  const ttc = totals(f.lines).ttc;
  return { ...f, paidAmount: paid, status: paid >= ttc - 0.01 ? 'payee' : 'partielle', einvoice: f.einvoice.status !== 'non_transmise' ? { ...f.einvoice, status: 'encaissee', history: [...f.einvoice.history, { at: todayISO(), status: 'encaissee' }] } : f.einvoice };
}
