// Types métier partagés par toute l'app Brix V2.
// Les mêmes noms de colonnes existent côté worker (schema.sql), en snake_case.

export type ID = string;

export type TradeKey =
  | 'electricien'
  | 'plombier'
  | 'peintre'
  | 'carreleur'
  | 'plaquiste'
  | 'menuisier'
  | 'couvreur'
  | 'macon'
  | 'paysagiste'
  | 'climaticien'
  | 'serrurier'
  | 'cuisiniste'
  | 'renovation'
  | 'autre';

export type CompanySize = 'solo' | 'petite' | 'pme' | 'grande';

export type Role = 'patron' | 'conducteur' | 'chef_equipe' | 'ouvrier' | 'secretaire' | 'comptable' | 'apprenti';

export interface Company {
  name: string;
  legalName: string;
  siret: string;
  vatNumber: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  trade: TradeKey;
  secondaryTrades: TradeKey[];
  size: CompanySize;
  employees: number;
  rge: boolean;
  decennale: string;
  iban: string;
  hourlyRate: number;
  defaultVat: number;
  logoInitials: string;
}

export interface User {
  id: ID;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
}

export interface Client {
  id: ID;
  kind: 'particulier' | 'pro';
  name: string;
  contact?: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  siret?: string;
  tags: string[];
  createdAt: string;
  source?: 'site' | 'telephone' | 'bouche-a-oreille' | 'google' | 'plateforme' | 'parrainage';
  notes?: string;
}

export type ChantierStatus = 'a_planifier' | 'en_cours' | 'en_pause' | 'termine' | 'reception';

export interface Chantier {
  id: ID;
  clientId: ID;
  name: string;
  address: string;
  city: string;
  status: ChantierStatus;
  startDate: string;
  endDate: string;
  progress: number; // 0..100
  budgetHt: number;
  costHt: number; // coûts engagés
  team: ID[]; // employés
  nextStep: string;
  devisId?: ID;
  photos: number;
  pinned?: boolean;
}

export type DevisStatus = 'brouillon' | 'envoye' | 'vu' | 'signe' | 'refuse' | 'expire';

export type LineKind = 'section' | 'ouvrage' | 'fourniture' | 'main_oeuvre' | 'texte';

export interface DevisLigne {
  id: ID;
  kind: LineKind;
  designation: string;
  detail?: string;
  quantity: number;
  unit: string;
  unitPriceHt: number;
  unitCostHt: number;
  vatRate: number;
  supplierRef?: string;
  supplier?: string;
  source?: 'bibliotheque' | 'bob' | 'manuel' | 'taux';
}

export interface Devis {
  id: ID;
  number: string;
  clientId: ID;
  chantierId?: ID;
  title: string;
  status: DevisStatus;
  createdAt: string;
  sentAt?: string;
  viewedAt?: string;
  views?: number;
  signedAt?: string;
  validityDays: number;
  depositPercent: number;
  lines: DevisLigne[];
  notes?: string;
  aides?: { label: string; amount: number }[];
}

export type FactureStatus = 'brouillon' | 'emise' | 'envoyee' | 'payee' | 'partielle' | 'en_retard' | 'annulee';
export type FactureKind = 'facture' | 'acompte' | 'situation' | 'solde' | 'avoir';

/** Cycle de vie e-facturation (réforme 2026-2027, statuts du CDAR / annuaire PPF). */
export type EInvoiceStatus =
  | 'non_transmise'
  | 'deposee'
  | 'emise'
  | 'recue'
  | 'mise_a_disposition'
  | 'prise_en_charge'
  | 'approuvee'
  | 'refusee'
  | 'litige'
  | 'paiement_transmis'
  | 'encaissee';

export interface Facture {
  id: ID;
  number: string;
  kind: FactureKind;
  clientId: ID;
  chantierId?: ID;
  devisId?: ID;
  title: string;
  status: FactureStatus;
  issueDate: string;
  dueDate: string;
  lines: DevisLigne[];
  paidAmount: number;
  retenueGarantie?: number; // pourcentage
  einvoice: { status: EInvoiceStatus; platform?: string; format?: 'factur-x' | 'ubl' | 'cii'; history: { at: string; status: EInvoiceStatus; note?: string }[] };
  remindersSent: number;
}

export interface Employee {
  id: ID;
  firstName: string;
  lastName: string;
  initials: string;
  role: Role;
  color: string;
  phone: string;
  email: string;
  hourlyCost: number;
  contract: 'CDI' | 'CDD' | 'Apprenti' | 'Intérim' | 'Gérant';
  grossMonthly: number;
  hireDate: string;
  habilitations: { label: string; expires: string }[];
  leaveBalance: number;
  clockedInAt?: string;
}

export interface PlanningEvent {
  id: ID;
  employeeId: ID;
  chantierId?: ID;
  title: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:mm
  end: string;
  kind: 'chantier' | 'rdv' | 'sav' | 'absence' | 'formation' | 'interne';
}

export interface Lead {
  id: ID;
  name: string;
  phone: string;
  email?: string;
  city: string;
  request: string;
  source: 'site' | 'telephone' | 'whatsapp' | 'plateforme' | 'google' | 'parrainage';
  receivedAt: string;
  status: 'nouveau' | 'qualifie' | 'rdv' | 'devis' | 'perdu' | 'gagne';
  estimate?: number;
  score?: number;
}

export interface BobAction {
  id: ID;
  at: string;
  icon: string; // nom d'icône Lucide
  text: string;
  detail?: string;
  cta?: string;
  to?: string;
  done?: boolean;
}

export interface Expense {
  id: ID;
  date: string;
  supplier: string;
  category: string;
  amountTtc: number;
  vat: number;
  chantierId?: ID;
  employeeId?: ID;
  status: 'a_valider' | 'validee' | 'remboursee';
}

export interface BankTx {
  id: ID;
  date: string;
  label: string;
  amount: number;
  matchedFactureId?: ID;
  category?: string;
}
