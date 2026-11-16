// Parseur local de dictée : transforme une phrase d'artisan en lignes de devis.
// « trois prises, deux différentiels 30 mA type A, huit disjoncteurs 16 A et six heures de pose »
// Fonctionne sans réseau. Plus tard, la version serveur (Bob) pourra prendre le relais
// via service.parseDictation(), avec ce parseur en secours hors ligne.

import type { DevisLigne } from '@/lib/types';
import { uid } from '@/lib/format';
import { LABOUR_BY_TRADE, LIB_BY_ID, LIBRARY, foldChar, type LibItem, type LibTrade } from './library';

const UNITS: Record<string, number> = {
  zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
  onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16,
};
const TENS: Record<string, number> = { vingt: 20, vingts: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60 };

const ATTR_UNITS: Record<string, string> = {
  a: 'a', amp: 'a', ampere: 'a', amperes: 'a',
  ma: 'ma', milliampere: 'ma', milliamperes: 'ma',
  mm: 'mm', mm2: 'mm', millimetre: 'mm', millimetres: 'mm', carre: 'mm',
  rangee: 'rangee', rangees: 'rangee', range: 'rangee',
  kw: 'kw', kilowatt: 'kw', kilowatts: 'kw', w: 'w', watt: 'w', watts: 'w',
  module: 'module', modules: 'module',
};

const QTY_UNITS: Record<string, string> = {
  metre: 'm', metres: 'm', m: 'm', ml: 'ml', lineaire: 'ml', lineaires: 'ml',
  m2: 'm²', heure: 'h', heures: 'h', h: 'h', jour: 'jour', jours: 'jour', forfait: 'forfait',
};

const STOP = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'pour', 'en', 'a', 'au', 'aux', 'sur', 'dans', 'avec', 'mets', 'met', 'mettre', 'ajoute', 'rajoute', 'compte', 'comptes', 'prevois', 'prevoir', 'alors', 'il', 'faut', 'y', 'aussi', 'encore', 'puis', 'chez', 'je', 'veux', 'on', 'va', 'me', 'moi', 'donc', 'ensuite', 'legrand', 'schneider', 'hager', 'environ', 'type', 'courbe', 'c', 'blanc', 'blanche']);
const SEP = /\s*(?:,(?!\d)|\.(?!\d)|[;:!?\n]|\bet\b|\bpuis\b|\bplus\b|\bainsi que\b|\bensuite\b)\s*/g;

interface Tok { t: string; start: number; end: number; num?: number }

export interface VoiceChunk {
  start: number; // index dans la phrase d'origine
  end: number;
  text: string;
  quantity: number;
  unit?: string;
  item?: LibItem;
  labour?: boolean;
  score: number;
}

const singular = (w: string) => (w.length > 3 && /[sx]$/.test(w) && !w.endsWith('ss') ? w.slice(0, -1) : w);

function wordNumber(w: string): number | undefined {
  if (w in UNITS) return UNITS[w];
  if (w in TENS) return TENS[w];
  if (w === 'cent' || w === 'cents') return 100;
  if (w === 'mille') return 1000;
  return undefined;
}

/** Regroupe les nombres écrits en lettres (« dix huit », « quatre vingt », « vingt deux ») et les chiffres. */
function numberize(toks: Tok[]): Tok[] {
  const out: Tok[] = [];
  for (let i = 0; i < toks.length; i++) {
    const tk = toks[i];
    const digit = /^\d+(?:[.,]\d+)?$/.test(tk.t) ? Number(tk.t.replace(',', '.')) : undefined;
    if (digit !== undefined) {
      out.push({ ...tk, num: digit });
      continue;
    }
    let v = wordNumber(tk.t);
    if (v === undefined) {
      out.push(tk);
      continue;
    }
    let end = tk.end;
    let j = i + 1;
    while (j < toks.length) {
      const n = wordNumber(toks[j].t);
      if (n === undefined) break;
      if (n === 100 || n === 1000) v = (v || 1) * n;
      else if (n === 20 && v === 4) v = 80;
      else if ((v >= 20 && v % 10 === 0 && n < 10) || (v === 10 && n < 10) || (v >= 60 && v % 20 === 0 && n < 20) || (v >= 100 && n < 100)) v += n;
      else break;
      end = toks[j].end;
      j++;
    }
    out.push({ t: String(v), start: tk.start, end, num: v });
    i = j - 1;
  }
  return out;
}

function tokenize(folded: string, offset: number): Tok[] {
  const toks: Tok[] = [];
  const re = /[a-z0-9]+(?:[.,]\d+)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(folded))) toks.push({ t: m[0], start: offset + m.index, end: offset + m.index + m[0].length });
  return toks;
}

/** Analyse un segment (« huit disjoncteurs 16 A ») : quantité, unité et mots significatifs. */
function analyse(toks: Tok[]) {
  const words: string[] = [];
  let quantity: number | undefined;
  let unit: string | undefined;
  const list = numberize(toks);
  for (let i = 0; i < list.length; i++) {
    const tk = list[i];
    const next = list[i + 1]?.t;
    if (tk.t === 'type' && next && ['a', 'f', 'ac', 'b'].includes(next)) {
      words.push(`type${next}`);
      i++;
      continue;
    }
    if (tk.num !== undefined) {
      if (next && next in ATTR_UNITS && !(quantity === undefined && ATTR_UNITS[next] === 'module')) {
        // « 16 A », « 30 mA », « 3 rangées » : caractéristique, pas une quantité
        const after = list[i + 2]?.t;
        if (next === 'm' && after === 'a') {
          words.push(`${tk.num}ma`);
          i += 2;
          continue;
        }
        words.push(`${tk.num}${ATTR_UNITS[next]}`);
        i++;
        if (ATTR_UNITS[next] === 'mm' && list[i + 1]?.t === 'carre') i++;
        continue;
      }
      if (quantity === undefined) {
        quantity = tk.num;
        if (next && next in QTY_UNITS) {
          unit = QTY_UNITS[next];
          if (unit === 'm' && list[i + 2]?.t.startsWith('carre')) {
            unit = 'm²';
            i++;
          }
          i++;
        }
        continue;
      }
      words.push(String(tk.num));
      continue;
    }
    if (STOP.has(tk.t)) continue;
    if (tk.t === 'oeuvre' || tk.t === 'ouvre' || tk.t === 'uvre') {
      words.push('oeuvre');
      continue;
    }
    words.push(singular(tk.t));
  }
  return { words, quantity, unit };
}

function bestItem(words: string[], preferTrade?: LibTrade): { item?: LibItem; score: number } {
  const set = new Set(words);
  let best: LibItem | undefined;
  let bestScore = 0;
  for (const item of LIBRARY) {
    for (const phrase of item.match) {
      const parts = phrase.split(' ');
      if (!set.has(parts[0])) continue;
      const hit = parts.filter((p) => set.has(p)).length;
      let score = hit === parts.length ? parts.length * 10 : hit * 10 - (parts.length - hit) * 6;
      if (preferTrade && item.trade === preferTrade) score += 1;
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }
  }
  return { item: best, score: bestScore };
}

/** Découpe et analyse toute la dictée. */
export function parseDictation(text: string, preferTrade?: LibTrade): VoiceChunk[] {
  const folded = Array.from(text).map(foldChar).join('');
  // Array.from et l'index de chaîne coïncident tant qu'il n'y a pas d'émoji : on reste sur la chaîne pliée.
  const chunks: VoiceChunk[] = [];
  let last = 0;
  const pieces: [number, number][] = [];
  SEP.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SEP.exec(folded))) {
    if (m.index > last) pieces.push([last, m.index]);
    last = m.index + m[0].length;
    if (m[0].length === 0) SEP.lastIndex++;
  }
  if (last < folded.length) pieces.push([last, folded.length]);

  let trade = preferTrade;
  for (const [a, b] of pieces) {
    const toks = tokenize(folded.slice(a, b), a);
    if (!toks.length) continue;
    const { words, quantity, unit } = analyse(toks);
    const start = toks[0].start;
    const end = toks[toks.length - 1].end;
    const labour = unit === 'h' || words.includes('heure');
    if (labour && quantity) {
      const item = LIB_BY_ID[LABOUR_BY_TRADE[trade ?? 'electricite']];
      chunks.push({ start, end, text: text.slice(start, end), quantity, unit: 'h', item, labour: true, score: 20 });
      continue;
    }
    const { item, score } = bestItem(words, trade);
    if (item && score >= 8) trade = trade ?? item.trade;
    chunks.push({ start, end, text: text.slice(start, end), quantity: quantity ?? 1, unit: unit ?? item?.unit, item: score >= 8 ? item : undefined, score });
  }
  return chunks;
}

/** Convertit les morceaux reconnus en lignes de devis. */
export function chunksToLines(chunks: VoiceChunk[], ctx: { hourlyRate?: number; vatRate: number }): (DevisLigne & { lot: string })[] {
  return chunks
    .filter((c) => c.item)
    .map((c) => {
      const it = c.item!;
      const pose = c.labour && /pose|raccord|install/i.test(c.text);
      return {
        id: uid('l'),
        kind: it.kind,
        designation: c.labour ? (pose ? 'Pose et raccordement' : it.designation) : it.designation,
        detail: c.labour ? "Main d'œuvre · ton taux horaire" : undefined,
        quantity: c.quantity,
        unit: it.unit,
        unitPriceHt: c.labour && ctx.hourlyRate ? ctx.hourlyRate : it.price,
        unitCostHt: it.cost,
        vatRate: it.vat ?? ctx.vatRate,
        supplier: it.supplier,
        supplierRef: it.ref,
        source: c.labour ? 'taux' : 'bibliotheque',
        lot: it.lot,
      };
    });
}

export const DEMO_DICTATION =
  'Alors pour Mme Lefèvre : un coffret trois rangées Legrand, deux différentiels 30 mA type A, un différentiel type F pour la plaque, huit disjoncteurs 16 A, trois prises et compte six heures de pose.';
