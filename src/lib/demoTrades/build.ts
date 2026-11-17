// Démo par métier : la base commune (src/lib/demo.ts, électricien) est transformée
// avec le pack du métier choisi. Les identifiants restent les mêmes partout, pour que
// les données de démo des autres modules (photos, journal, relances…) restent reliées.

import * as base from '../demo';
import { dayOffset, money, totals } from '../format';
import type { TradeKey } from '../types';
import type { BankTx, BobAction, Chantier, Client, Company, Devis, DevisLigne, Employee, Expense, Facture, Lead, PlanningEvent, User } from '../types';
import { PACKS, packFor } from './packs';
import type { Block, JobSlot, QuoteSlot, SiteSlot, TradePack } from './types';

export interface DemoData {
  company: Company;
  user: User;
  employees: Employee[];
  clients: Client[];
  devis: Devis[];
  chantiers: Chantier[];
  factures: Facture[];
  events: PlanningEvent[];
  leads: Lead[];
  bob: BobAction[];
  expenses: Expense[];
  bank: BankTx[];
  cashBalance: number;
}

const QUOTE_ID: Record<string, QuoteSlot> = { q_121: 'renov', q_118: 'conform', q_115: 'pro', q_119: 'aide', q_122: 'draft', q_110: 'copro', q_112: 'cabinet', q_104: 'refuse' };
const SITE_ID: Record<string, SiteSlot> = { ch_lefevre: 'lefevre', ch_martin: 'martin', ch_tilleuls: 'tilleuls', ch_nguyen: 'nguyen', ch_dupuis: 'dupuis', ch_morel: 'morel' };
const JOB_ID: Record<string, JobSlot> = { f_199: 'roux', f_204: 'tilleuls', f_205: 'benoit', f_196: 'martin', f_195: 'nguyen' };
const PRO = new Set<QuoteSlot>(['pro', 'cabinet']);

const r2 = (n: number) => Math.round(n * 100) / 100;
const supplierShort = (p: TradePack) => p.supplier.split(' ')[0];

function toLines(block: Block, vat: number, p: TradePack, prefix: string): DevisLigne[] {
  let i = 0;
  return block.map((x) => {
    const id = `${prefix}_${++i}`;
    if (typeof x === 'string') return { id, kind: 'section', designation: x, quantity: 0, unit: '', unitPriceHt: 0, unitCostHt: 0, vatRate: 0 };
    const [designation, quantity, unit, unitPriceHt, rawCost, ref] = x;
    // Les prix au m² ou au forfait incluent la pose : le coût compte aussi la main d'œuvre.
    const unitCostHt = unit === 'h' ? rawCost : Math.max(rawCost, r2(unitPriceHt * 0.52));
    const kind: DevisLigne['kind'] = unit === 'h' ? 'main_oeuvre' : unit === 'forfait' ? 'ouvrage' : 'fourniture';
    return {
      id,
      kind,
      designation,
      quantity,
      unit,
      unitPriceHt,
      unitCostHt,
      vatRate: vat,
      source: kind === 'main_oeuvre' ? 'taux' : 'bibliotheque',
      ...(kind === 'main_oeuvre' ? { detail: "Main d'œuvre · taux compagnon" } : {}),
      ...(kind === 'fourniture' ? { supplier: supplierShort(p), ...(ref ? { supplierRef: ref } : {}) } : {}),
    };
  });
}

/** Données de démo complètes pour un métier (électricien par défaut). */
export function demoFor(trade?: TradeKey | string | null): DemoData {
  const p = packFor(trade);
  if (!p) {
    return {
      company: base.demoCompany, user: base.demoUser, employees: base.demoEmployees, clients: base.demoClients, devis: base.demoDevis, chantiers: base.demoChantiers,
      factures: base.demoFactures, events: base.demoEvents, leads: base.demoLeads, bob: base.demoBob, expenses: base.demoExpenses, bank: base.demoBank, cashBalance: base.DEMO_CASH_BALANCE,
    };
  }
  const key = (trade && PACKS[trade as TradeKey] ? trade : 'renovation') as TradeKey;
  const vatOf = (slot: QuoteSlot) => (PRO.has(slot) ? 20 : p.company.vat ?? 10);

  const company: Company = {
    ...base.demoCompany,
    name: p.company.name,
    legalName: p.company.legal,
    email: `contact@${p.company.domain}`,
    trade: key,
    rge: p.company.rge,
    hourlyRate: p.company.hourly,
    defaultVat: p.company.vat ?? 10,
    logoInitials: p.company.initials,
  };
  const bossEmail = `${p.boss.first.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}@${p.company.domain}`;
  const user: User = { ...base.demoUser, firstName: p.boss.first, lastName: p.boss.last, email: bossEmail };
  const habs = (h: [string, number][]) => h.map(([label, days]) => ({ label, expires: dayOffset(days) }));
  const employees: Employee[] = base.demoEmployees.map((e) => {
    if (e.id === 'e_karim') return { ...e, firstName: p.boss.first, lastName: p.boss.last, initials: `${p.boss.first[0]}${p.boss.last[0]}`.toUpperCase(), email: bossEmail, habilitations: habs(p.boss.habs) };
    const k = e.id.slice(2) as 'yanis' | 'mehdi' | 'lucas';
    return { ...e, email: `${k}@${p.company.domain}`, habilitations: habs(p.team[k] ?? []) };
  });

  const clients: Client[] = base.demoClients.map((c) => {
    const t = p.tags?.[c.id as keyof NonNullable<TradePack['tags']>];
    return t ? { ...c, tags: t } : c;
  });

  const devis: Devis[] = base.demoDevis.map((d) => {
    const slot = QUOTE_ID[d.id];
    if (!slot) return d;
    const q = p.quotes[slot];
    return { ...d, title: q.title, lines: toLines(q.lines, vatOf(slot), p, d.id), aides: slot === 'aide' && p.aide ? [p.aide] : undefined };
  });
  const ht = (id: string) => totals(devis.find((d) => d.id === id)!.lines).ht;

  const chantiers: Chantier[] = base.demoChantiers.map((c) => {
    const slot = SITE_ID[c.id];
    if (!slot) return c;
    const s = p.sites[slot];
    const budgetHt = r2(c.devisId ? ht(c.devisId) : p.jobs.roux.ht);
    return { ...c, name: s.name, nextStep: s.next, budgetHt, costHt: Math.round(budgetHt * (c.costHt / Math.max(1, c.budgetHt))) };
  });

  const factureHt: Record<string, { ht: number; title: string; line: string }> = {
    f_201: { ht: r2(ht('q_121') * 0.3), title: `Acompte 30 % · ${p.quotes.renov.title}`, line: 'Acompte 30 % sur devis D-2026-121' },
    f_202: { ht: r2(ht('q_112') * 0.3), title: `Acompte 30 % · ${p.sites.nguyen.short}`, line: 'Acompte 30 % sur devis D-2026-112' },
    f_198: { ht: r2(ht('q_110') * 0.32), title: `Situation n°2 · ${cap(p.sites.tilleuls.short)}`, line: 'Situation n°2 · 45 % cumulés' },
    f_203: { ht: r2(ht('q_115') * 0.6), title: `Situation n°1 · ${cap(p.sites.martin.short)}`, line: 'Situation n°1 · 60 %' },
  };
  for (const [id, slot] of Object.entries(JOB_ID)) factureHt[id] = { ht: p.jobs[slot].ht, title: p.jobs[slot].title, line: p.jobs[slot].line };

  const factures: Facture[] = base.demoFactures.map((f) => {
    const x = factureHt[f.id];
    if (!x) return f;
    const l0 = f.lines[0];
    const ratio = l0.unitPriceHt ? l0.unitCostHt / l0.unitPriceHt : 0;
    const line: DevisLigne = { ...l0, designation: x.line, unitPriceHt: x.ht, unitCostHt: r2(x.ht * ratio) };
    const ttc = r2(x.ht * (1 + l0.vatRate / 100));
    return { ...f, title: x.title, lines: [line], paidAmount: f.paidAmount > 0 ? ttc : 0 };
  });
  const ttcOf = (id: string) => {
    const f = factures.find((x) => x.id === id)!;
    return r2(f.lines[0].unitPriceHt * (1 + f.lines[0].vatRate / 100));
  };

  const short = (id: SiteSlot) => p.sites[id].short;
  const events: PlanningEvent[] = base.demoEvents.map((e) => {
    let title = e.title;
    if (title.startsWith('Lefèvre ·') && e.id !== 'pe_k1') title = `Lefèvre · ${short('lefevre')}`;
    else if (title.startsWith('Tilleuls ·')) title = `Tilleuls · ${short('tilleuls')}`;
    else if (title.startsWith('Dr Nguyen')) title = `Dr Nguyen · ${short('nguyen')}`;
    else if (e.id === 'pe_k2') title = p.rdv.benoit;
    else if (e.id === 'pe_k3') title = p.rdv.tilleuls;
    else if (e.id === 'pe_k4') title = `Dupuis · ${short('dupuis')}`;
    return title === e.title ? e : { ...e, title };
  });

  const leads: Lead[] = base.demoLeads.map((l, i) => {
    const [request, estimate] = p.leads[i] ?? [l.request, l.estimate ?? 0];
    return { ...l, request, estimate, ...(l.id === 'ld_2' ? { name: p.urgent.name } : {}) };
  });

  const bob: BobAction[] = base.demoBob.map((b) => {
    if (b.id === 'b1') return { ...b, detail: `M. Roux (${money(ttcOf('f_199'), true)}) et SCI Les Tilleuls (${money(ttcOf('f_198'), true)})` };
    if (b.id === 'b2') return { ...b, detail: `depuis ta note vocale de 18 h 42 · ${money(ht('q_122'), true)} HT` };
    if (b.id === 'b4') return { ...b, text: `Commande ${supplierShort(p)} prête pour lundi`, detail: `${p.order.items} articles · ${money(p.order.ht).replace(/\s€/, ' €')} HT pour le chantier Lefèvre` };
    return b;
  });

  const expenses: Expense[] = base.demoExpenses.map((x) => (x.id === 'x2' ? { ...x, supplier: p.supplier } : x));
  const bank: BankTx[] = base.demoBank.map((t) => {
    if (t.matchedFactureId) return { ...t, amount: ttcOf(t.matchedFactureId) };
    if (t.id === 't4') return { ...t, label: p.bankLabel, amount: -p.order.ht };
    return t;
  });

  return { company, user, employees, clients, devis, chantiers, factures, events, leads, bob, expenses, bank, cashBalance: base.DEMO_CASH_BALANCE };
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

