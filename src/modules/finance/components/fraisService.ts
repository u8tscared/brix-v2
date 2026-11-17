// Lecture des tickets et export des notes de frais.
// En démo la lecture est simulée. Vraie version : POST /api/frais/ocr (image → Bob vision côté worker).
import { todayISO } from '@/lib/format';
import type { Expense } from '@/lib/types';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const FRAIS_CATEGORIES = ['Carburant', 'Petites fournitures', 'Repas', 'Stationnement', 'Péage', 'Outillage', 'Hôtel', 'Autre'];

const SAMPLES: Omit<Expense, 'id' | 'status' | 'date'>[] = [
  { supplier: 'Leroy Merlin Vaulx-en-Velin', category: 'Petites fournitures', amountTtc: 57.8, vat: 9.63 },
  { supplier: 'Esso Express Villeurbanne', category: 'Carburant', amountTtc: 92.15, vat: 15.36 },
  { supplier: 'Brico Dépôt Saint-Priest', category: 'Outillage', amountTtc: 149.0, vat: 24.83 },
  { supplier: 'Le Petit Bouchon', category: 'Repas', amountTtc: 18.5, vat: 1.68 },
  { supplier: 'APRR Péage Villefranche', category: 'Péage', amountTtc: 7.4, vat: 1.23 },
];

/** Lit un ticket photographié et renvoie fournisseur, montant, TVA et catégorie. */
export async function readReceipt(_file: File): Promise<Omit<Expense, 'id' | 'status'> & { confidence: number }> {
  await wait(1700);
  const s = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
  return { ...s, date: todayISO(), confidence: 0.94 };
}

export function exportCsv(rows: Expense[], name: (e: Expense) => { employee: string; chantier: string }) {
  const head = ['Date', 'Fournisseur', 'Catégorie', 'Montant TTC', 'TVA', 'Montant HT', 'Salarié', 'Chantier', 'Statut'];
  const st = { a_valider: 'À valider', validee: 'Validée', remboursee: 'Remboursée' };
  const fmt = (n: number) => n.toFixed(2).replace('.', ',');
  const lines = rows.map((e) => {
    const n = name(e);
    return [e.date, e.supplier, e.category, fmt(e.amountTtc), fmt(e.vat), fmt(e.amountTtc - e.vat), n.employee, n.chantier, st[e.status]].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';');
  });
  download(`notes-de-frais-${todayISO()}.csv`, '﻿' + [head.join(';'), ...lines].join('\r\n'), 'text/csv;charset=utf-8');
}

export function download(filename: string, content: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
