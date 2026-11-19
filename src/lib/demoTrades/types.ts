// Forme d'un « pack métier » de démonstration : tout ce qui change d'un métier à l'autre.
// La structure (clients, dates, statuts, montants dérivés) reste commune : voir build.ts.

/** Ligne de devis compacte : désignation, quantité, unité, prix unitaire HT, coût HT, référence. */
export type Ln = [designation: string, qty: number, unit: string, pu: number, cost: number, ref?: string];
/** Un bloc de devis : une chaîne = titre de section, un tableau = ligne. */
export type Block = (string | Ln)[];

export type QuoteSlot = 'renov' | 'conform' | 'pro' | 'aide' | 'draft' | 'copro' | 'cabinet' | 'refuse';
export type SiteSlot = 'lefevre' | 'martin' | 'tilleuls' | 'nguyen' | 'dupuis' | 'morel';
export type JobSlot = 'roux' | 'tilleuls' | 'benoit' | 'martin' | 'nguyen';
export type Hab = [label: string, expiresInDays: number];

/** Ce que Brix AI dit et retient pour ce métier (secrétaire, mémoire). */
export interface TradeVoice {
  /** Trois éléments appris : [type, libellé, valeur]. */
  memory: ['prix' | 'habitude', string, string][];
  /** Appel urgent pris par la secrétaire. */
  urgent: { name: string; say: string; ask: string; answer: string; summary: string; request: string; estimate: number };
  /** Appel qui débouche sur une visite. */
  visit: { say: string; summary: string; request: string; estimate: number };
}

export interface TradePack extends TradeVoice {
  company: { name: string; legal: string; domain: string; initials: string; hourly: number; rge: boolean; vat?: number };
  boss: { first: string; last: string; habs: Hab[] };
  /** Habilitations des trois compagnons (chef d'équipe, ouvrier, apprenti). */
  team: { yanis: Hab[]; mehdi: Hab[]; lucas: Hab[] };
  /** Fournisseur principal, et son libellé sur le relevé bancaire. */
  supplier: string;
  bankLabel: string;
  quotes: Record<QuoteSlot, { title: string; lines: Block }>;
  /** Aide financière sur le devis « aide » (crédit d'impôt, MaPrimeRénov'…). */
  aide?: { label: string; amount: number };
  sites: Record<SiteSlot, { name: string; short: string; next: string }>;
  jobs: Record<JobSlot, { title: string; line: string; ht: number }>;
  /** Les 6 demandes entrantes : [demande, estimation HT]. */
  leads: [string, number][];
  rdv: { benoit: string; tilleuls: string };
  order: { items: number; ht: number };
  tags?: Partial<Record<'c_lefevre' | 'c_garnier' | 'c_martin' | 'c_dupuis' | 'c_benoit', string[]>>;
}
