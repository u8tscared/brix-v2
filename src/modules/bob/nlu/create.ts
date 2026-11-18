// Intentions « créer » du moteur local : devis dicté et nouveau client.
// Ce fichier lit la phrase ; le chiffrage et l'enregistrement vivent dans outils/creation.ts
// (partagés avec l'agent).

import { useBrix } from '@/lib/store';
import { money, totals } from '@/lib/format';
import {
  ajouterLignes, annulerDevis, carteClient, carteDevis, carteLignesAjoutees, chiffrer, dernierBrouillon, enregistrerClient,
  enregistrerDevis, envoyerDevis, ligneDepuisArticle, nouveauClient, resoudreClient, type ArticleDemande,
} from '../outils/creation';
import { findItem } from './library';
import { EMAIL_RE, PHONE_RE, leadingQuantity, norm } from './text';
import type { BobReply, EngineContext } from './types';

const S = () => useBrix.getState();

const QTY_WORD = '(?:\\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|quinze|vingt|trente|quelques|plusieurs)';

/** Découpe la phrase dictée en client + articles (quantité, libellé), surfaces comprises. */
function lireDemande(text: string): { clientRaw: string; articles: ArticleDemande[] } {
  const low = text.replace(/[’]/g, "'");
  const after = low.slice(low.toLowerCase().search(/devis/) + 5);
  const segments = after.split(/[,;:]|\s-\s|\savec\s/i).map((x) => x.trim()).filter(Boolean);
  let clientRaw = '';
  const itemParts: string[] = [];
  for (let seg of segments) {
    const m = seg.match(/(?:^|\s)(pour|chez)\s+(.+)$/i);
    if (m && !clientRaw) {
      let who = m[2];
      seg = seg.slice(0, m.index).trim();
      // « pour Mme Martin 3 prises » : la quantité coupe le nom
      const cut = who.match(new RegExp(`\\s${QTY_WORD}\\s`, 'i'));
      if (cut && cut.index !== undefined) {
        itemParts.push(who.slice(cut.index).trim());
        who = who.slice(0, cut.index);
      }
      clientRaw = who;
    }
    if (seg && !/^(un|une|le|la|d'|de)$/i.test(seg)) itemParts.push(seg.replace(/^(de|d'|pour)\s+/i, ''));
  }
  const pieces = itemParts.flatMap((p) => p.split(/\s(?:et|plus|\+)\s|\+/i)).map((p) => p.trim()).filter(Boolean);
  const articles: ArticleDemande[] = [];
  // Surface citée plus tôt (« salon de 25 m², murs et plafond ») : reprise pour les ouvrages au m².
  let area = 0;
  for (const p of pieces) {
    const lead = leadingQuantity(norm(p));
    let { qty, rest } = lead;
    rest = rest.replace(/^(m²|m2|metres? carres?)\s+(de |d')?/, '');
    const inner = rest.match(/(\d+(?:[.,]\d+)?)\s*(m²|m2)(?![a-z0-9])/);
    let ownArea = /^\d/.test(norm(p)) && /^(m²|m2)/.test(lead.rest) ? qty : 0;
    if (inner) {
      ownArea = Number(inner[1].replace(',', '.'));
      rest = rest.replace(inner[0], '').replace(/\s+de\s*$/, '').replace(/\s+/g, ' ').trim();
    }
    if (ownArea) area = ownArea;
    if (!rest || /^(devis|nouveau|un devis)$/.test(rest)) continue;
    const it = findItem(rest);
    if (!it && ownArea) continue; // juste la pièce et sa surface
    if (it?.unit === 'm²' && area) qty = area;
    if (it || (rest.length > 2 && rest.length < 60)) articles.push({ libelle: rest, quantite: qty });
  }
  return { clientRaw, articles };
}

export function createDevis(text: string, ctx: EngineContext): BobReply {
  const s = S();
  const { clientRaw, articles } = lireDemande(text);
  const resolved = clientRaw ? resoudreClient(s, clientRaw) : null;
  if (!resolved) {
    ctx.memo.pendingDevis = text;
    return { text: 'Pour quel client ? Dis-moi juste son nom, je m’occupe du reste.', suggestions: s.clients.slice(0, 3).map((c) => `Pour ${c.name}`) };
  }
  const { client, created } = resolved;
  const { lines, nouns } = chiffrer(s, articles);
  const devis = enregistrerDevis(s, client, created, lines, nouns);
  const t = totals(devis.lines);
  const unknown = lines.filter((l) => l.unitPriceHt === 0).length;
  return {
    text: `${created ? `J’ai créé la fiche de ${client.name}, et ` : ''}${created ? 'j’ai' : 'J’ai'} préparé le devis${lines.length ? ` : ${money(t.ht, true)} HT` : ''}. Il est en brouillon, rien n’est parti.${unknown ? ` ${unknown} prix à compléter.` : ''}`,
    cards: [carteDevis(s, devis, client, () => envoyerDevis(useBrix.getState(), devis.id, client), () => annulerDevis(useBrix.getState(), devis.id, client.id, created))],
    suggestions: [s.company.trade === 'electricien' ? 'Ajoute 2 spots' : 'Quels devis attendent une signature ?', 'Quelle est ma marge sur les devis signés ?'],
  };
}

/** « ajoute 2 spots » juste après un devis : complète le dernier brouillon. */
export function addToLastDraft(text: string): BobReply | null {
  const s = S();
  const draft = dernierBrouillon(s);
  if (!draft) return null;
  const body = norm(text).replace(/^(ajoute|rajoute|mets|met)\s+(aussi\s+)?/, '');
  const pieces = body.split(/\s(?:et|plus)\s|,/).map((x) => x.trim()).filter(Boolean);
  const vat = s.company.defaultVat || 10;
  const added = pieces.flatMap((p) => {
    const { qty, rest } = leadingQuantity(p);
    return findItem(rest) ? [ligneDepuisArticle({ libelle: rest, quantite: qty }, vat).line] : [];
  });
  if (!added.length) return null;
  const { before, next } = ajouterLignes(s, draft, added);
  const t = totals(next.lines);
  return {
    text: `Ajouté au devis ${draft.number}. Nouveau total : ${money(t.ht, true)} HT.`,
    cards: [carteLignesAjoutees(draft, added, () => { useBrix.getState().upsertDevis(before); return 'Lignes retirées.'; })],
  };
}

export function createClient(text: string, ctx: EngineContext): BobReply {
  const s = S();
  const phone = text.match(PHONE_RE)?.[0] ?? '';
  const email = text.match(EMAIL_RE)?.[0] ?? '';
  let rest = text.replace(PHONE_RE, '').replace(EMAIL_RE, '');
  const m = rest.match(/client\s*(?:qui s'appelle|nomme|:)?\s*(.*)$/i);
  rest = m ? m[1] : ctx.memo.pending === 'client' ? rest : '';
  let city = '';
  const cm = rest.match(/\s(?:à|a)\s+([A-ZÀ-Ü][\wÀ-ü' -]+)$/);
  if (cm) { city = cm[1].trim(); rest = rest.slice(0, cm.index); }
  const name = rest.replace(/[,.;]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!name) {
    ctx.memo.pending = 'client';
    return { text: 'D’accord. Comment s’appelle ton client ? Tu peux ajouter son téléphone et sa ville.', suggestions: ['Sarah Kaci, 06 51 23 98 70, à Villeurbanne'] };
  }
  delete ctx.memo.pending;
  const client = enregistrerClient(s, nouveauClient(name, { phone, email, city }));
  return {
    text: `${client.name} est dans tes clients.${!phone ? ' Il me manque son téléphone.' : ''}`,
    cards: [carteClient(client, () => { useBrix.getState().removeClient(client.id); return 'Client retiré.'; })],
  };
}
