// Logique pure du module Devis : lots, opérations sur les lignes, score de signature, dates.

import type { Client, Devis, DevisLigne } from '@/lib/types';
import { daysBetween, todayISO, totals, uid } from '@/lib/format';
import type { LibItem } from './library';

export interface Lot {
  section?: DevisLigne;
  items: DevisLigne[];
  ht: number;
  cost: number;
  marginRate: number;
}

export const isPriced = (l: DevisLigne) => l.kind !== 'section' && l.kind !== 'texte';

/** Regroupe la liste plate en lots (une ligne « section » ouvre un lot). */
export function groupLots(lines: DevisLigne[]): Lot[] {
  const lots: Lot[] = [];
  let cur: Lot | null = null;
  for (const l of lines) {
    if (l.kind === 'section') {
      cur = { section: l, items: [], ht: 0, cost: 0, marginRate: 0 };
      lots.push(cur);
      continue;
    }
    if (!cur) {
      cur = { items: [], ht: 0, cost: 0, marginRate: 0 };
      lots.push(cur);
    }
    cur.items.push(l);
  }
  for (const lot of lots) {
    const t = totals(lot.items);
    lot.ht = t.ht;
    lot.cost = t.cost;
    lot.marginRate = t.marginRate;
  }
  return lots;
}

/** Retire le préfixe « Lot 2 · » d'un titre de lot. */
export const lotName = (s?: string) => (s ?? '').replace(/^lot\s*\d*\s*[·:.-]\s*/i, '');

/** Renumérote les sections « Lot n · … ». */
export function renumber(lines: DevisLigne[]): DevisLigne[] {
  let n = 0;
  return lines.map((l) => {
    if (l.kind !== 'section') return l;
    n++;
    const name = lotName(l.designation) || 'Sans titre';
    const designation = `Lot ${n} · ${name}`;
    return designation === l.designation ? l : { ...l, designation };
  });
}

export const newSection = (name: string): DevisLigne => ({ id: uid('l'), kind: 'section', designation: `Lot · ${name}`, quantity: 0, unit: '', unitPriceHt: 0, unitCostHt: 0, vatRate: 0 });

export function lineFromLib(it: LibItem, vatRate: number, quantity = 1, source: DevisLigne['source'] = 'bibliotheque'): DevisLigne {
  return {
    id: uid('l'),
    kind: it.kind,
    designation: it.designation,
    quantity,
    unit: it.unit,
    unitPriceHt: it.price,
    unitCostHt: it.cost,
    vatRate: it.vat ?? vatRate,
    supplier: it.supplier,
    supplierRef: it.ref,
    source,
  };
}

/** Index de fin (exclu) du lot qui commence à la section `sectionId` (null = lignes sans lot en tête). */
function lotEnd(lines: DevisLigne[], sectionId: string | null): number {
  let i = sectionId ? lines.findIndex((l) => l.id === sectionId) + 1 : 0;
  if (sectionId && i === 0) return lines.length;
  while (i < lines.length && lines[i].kind !== 'section') i++;
  return i;
}

export function insertInLot(lines: DevisLigne[], sectionId: string | null, add: DevisLigne[]): DevisLigne[] {
  const at = lotEnd(lines, sectionId);
  return [...lines.slice(0, at), ...add, ...lines.slice(at)];
}

/** Ajoute des lignes groupées par nom de lot : dans le lot du même nom s'il existe, sinon dans un nouveau lot. */
export function insertGrouped(lines: DevisLigne[], add: (DevisLigne & { lot: string })[]): DevisLigne[] {
  let out = lines.slice();
  const groups = new Map<string, DevisLigne[]>();
  for (const { lot, ...l } of add) groups.set(lot, [...(groups.get(lot) ?? []), l]);
  for (const [name, ls] of groups) {
    const sec = out.find((l) => l.kind === 'section' && lotName(l.designation).toLowerCase() === name.toLowerCase());
    if (sec) out = insertInLot(out, sec.id, ls);
    else {
      // Un lot vide au nom générique est réutilisé
      const lots = groupLots(out);
      const empty = lots.find((x) => x.section && x.items.length === 0 && /^(sans titre|nouveau lot|lot|travaux)$/i.test(lotName(x.section.designation).trim() || 'lot'));
      if (empty?.section) {
        out = out.map((l) => (l.id === empty.section!.id ? { ...l, designation: `Lot · ${name}` } : l));
        out = insertInLot(out, empty.section.id, ls);
      } else out = [...out, newSection(name), ...ls];
    }
  }
  return renumber(out);
}

export function moveLine(lines: DevisLigne[], id: string, dir: -1 | 1): DevisLigne[] {
  const i = lines.findIndex((l) => l.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= lines.length) return lines;
  const copy = lines.slice();
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return renumber(copy);
}

/** Déplace la ligne `id` juste avant `beforeId` (glisser-déposer). */
export function moveBefore(lines: DevisLigne[], id: string, beforeId: string): DevisLigne[] {
  if (id === beforeId) return lines;
  const item = lines.find((l) => l.id === id);
  if (!item) return lines;
  const rest = lines.filter((l) => l.id !== id);
  const at = rest.findIndex((l) => l.id === beforeId);
  rest.splice(at < 0 ? rest.length : at, 0, item);
  return renumber(rest);
}

export function duplicateLine(lines: DevisLigne[], id: string): DevisLigne[] {
  const i = lines.findIndex((l) => l.id === id);
  if (i < 0) return lines;
  const copy = lines.slice();
  copy.splice(i + 1, 0, { ...lines[i], id: uid('l') });
  return copy;
}

export const removeLine = (lines: DevisLigne[], id: string) => lines.filter((l) => l.id !== id);

export function lotRange(lines: DevisLigne[], sectionId: string): [number, number] {
  const a = lines.findIndex((l) => l.id === sectionId);
  return [a, lotEnd(lines, sectionId)];
}

export function moveLot(lines: DevisLigne[], sectionId: string, dir: -1 | 1): DevisLigne[] {
  const lots = groupLots(lines);
  const i = lots.findIndex((l) => l.section?.id === sectionId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= lots.length || !lots[j].section) return lines;
  [lots[i], lots[j]] = [lots[j], lots[i]];
  return renumber(lots.flatMap((l) => (l.section ? [l.section, ...l.items] : l.items)));
}

export function duplicateLot(lines: DevisLigne[], sectionId: string): DevisLigne[] {
  const [a, b] = lotRange(lines, sectionId);
  const block = lines.slice(a, b).map((l) => ({ ...l, id: uid('l') }));
  block[0] = { ...block[0], designation: `${block[0].designation} (copie)` };
  return renumber([...lines.slice(0, b), ...block, ...lines.slice(b)]);
}

export function removeLot(lines: DevisLigne[], sectionId: string): DevisLigne[] {
  const [a, b] = lotRange(lines, sectionId);
  return renumber([...lines.slice(0, a), ...lines.slice(b)]);
}

/** Taux de TVA majoritaire du devis (en montant). */
export function mainVat(lines: DevisLigne[], fallback = 10): number {
  const t = totals(lines);
  if (!t.byVat.length) return fallback;
  return t.byVat.slice().sort((a, b) => b.base - a.base)[0].rate;
}

/** Remonte les prix des lignes sous `target` % de marge (prix = coût / (1 - cible)). */
export function raiseMargin(lines: DevisLigne[], target: number, ids?: Set<string>): DevisLigne[] {
  return lines.map((l) => {
    if (!isPriced(l) || !l.unitCostHt || (ids && !ids.has(l.id))) return l;
    const rate = l.unitPriceHt ? (l.unitPriceHt - l.unitCostHt) / l.unitPriceHt : 0;
    if (rate * 100 >= target) return l;
    return { ...l, unitPriceHt: Math.round((l.unitCostHt / (1 - target / 100)) * 100) / 100, source: 'bob' };
  });
}

// ---------------------------------------------------------------------------
// Dates et activité

/** « il y a 2 h », « hier », « il y a 3 jours » : accepte une date ISO courte ou complète. */
export function ago(iso?: string): string {
  if (!iso) return '';
  if (iso.length > 10) {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return "à l'instant";
    if (mins < 60) return `il y a ${mins} min`;
    const h = Math.round(mins / 60);
    if (h < 24) return `il y a ${h} h`;
  }
  const d = daysBetween(iso.slice(0, 10), todayISO());
  if (d <= 0) return "aujourd'hui";
  if (d === 1) return 'hier';
  if (d < 30) return `il y a ${d} jours`;
  return `il y a ${Math.round(d / 30)} mois`;
}

export const nowISO = () => new Date().toISOString();

export const expiryDate = (d: Devis) => {
  const base = new Date((d.sentAt ?? d.createdAt).slice(0, 10) + 'T12:00:00');
  base.setDate(base.getDate() + d.validityDays);
  return base.toISOString().slice(0, 10);
};

// ---------------------------------------------------------------------------
// Score de probabilité de signature

export interface Score {
  value: number;
  label: string;
  reasons: string[];
}

/**
 * Probabilité de signature (0-100), calculée localement à partir de :
 * statut, ouvertures, fraîcheur de la dernière ouverture, délai depuis l'envoi, montant et profil client.
 */
export function signatureScore(d: Devis, client?: Client): Score {
  if (d.status === 'signe') return { value: 100, label: 'Signé', reasons: [] };
  if (d.status === 'refuse') return { value: 0, label: 'Refusé', reasons: [] };
  if (d.status === 'expire') return { value: 4, label: 'Expiré', reasons: ['Validité dépassée'] };
  const reasons: string[] = [];
  let v = d.status === 'brouillon' ? 40 : 45;
  const views = d.views ?? 0;
  if (views > 0) {
    v += Math.min(24, views * 8);
    reasons.push(`ouvert ${views} fois`);
  }
  if (d.viewedAt) {
    const since = daysBetween(d.viewedAt.slice(0, 10), todayISO());
    if (since <= 1) {
      v += 10;
      reasons.push('consulté récemment');
    } else if (since > 7) v -= 6;
  }
  if (d.sentAt) {
    const since = daysBetween(d.sentAt.slice(0, 10), todayISO());
    if (since > 7) {
      v -= Math.min(24, (since - 7) * 3);
      reasons.push(`envoyé il y a ${since} jours`);
    }
    if (!views && since >= 3) {
      v -= 10;
      reasons.push('jamais ouvert');
    }
  }
  const ttc = totals(d.lines).ttc;
  if (ttc > 10000) {
    v -= 14;
    reasons.push('gros montant');
  } else if (ttc > 5000) v -= 6;
  else if (ttc < 1500) {
    v += 8;
    reasons.push('petit montant');
  }
  if (client?.tags.some((t) => /récurrent|syndic/i.test(t))) {
    v += 10;
    reasons.push('client fidèle');
  }
  if (client?.source === 'parrainage' || client?.source === 'bouche-a-oreille') v += 6;
  if (client?.source === 'plateforme') v -= 6;
  const value = Math.max(5, Math.min(95, Math.round(v)));
  const label = value >= 70 ? 'Très probable' : value >= 45 ? 'Probable' : 'Incertain';
  return { value, label, reasons };
}

export const scoreTone = (v: number) => (v >= 70 ? 'ok' : v >= 45 ? 'warn' : 'bad');
