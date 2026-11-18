// Intentions « argent » du moteur local : la logique vit dans outils/argent.ts
// (partagée avec l'agent), ce fichier ne fait que la mise en phrases.

import { useBrix } from '@/lib/store';
import { money, pct } from '@/lib/format';
import {
  aRelancer, annulerRelances, carteImpayes, carteRelancesEnvoyees, devisEnAttente, encaissements, envoyerRelances,
  impayes, margeChantiers, margeDevisSignes, nomClient, resteDu, tresorerie, type Periode,
} from '../outils/argent';
import type { BobReply, EngineContext } from './types';

const S = () => useBrix.getState();

export const due = resteDu;
export const lateInvoices = () => impayes(S());

export function cashIn(n: string): BobReply {
  const periode: Periode = /semaine|7 jours|sept jours/.test(n) ? 'semaine' : /annee|an\b/.test(n) ? 'annee' : 'mois';
  const r = encaissements(S(), periode);
  return {
    text: r.total
      ? `Tu as encaissé ${money(r.total, true)} ${r.label}. Il reste ${money(r.aEncaisser, true)} à rentrer.`
      : `Rien d'encaissé ${r.label} pour l'instant. Il reste ${money(r.aEncaisser, true)} à rentrer.`,
    cards: [r.card],
    suggestions: ['Qui est en retard de paiement ?', 'Quelle est ma marge sur les devis signés ?'],
  };
}

export function late(ctx: EngineContext): BobReply {
  const s = S();
  const list = impayes(s);
  ctx.memo.late = list.map((f) => f.id);
  if (!list.length) return { text: 'Personne n’est en retard. Tout le monde a payé à temps.', suggestions: ['Combien j’ai encaissé ce mois ?'] };
  const total = list.reduce((x, f) => x + resteDu(f), 0);
  return { text: `${list.length} client${list.length > 1 ? 's sont' : ' est'} en retard, pour ${money(total, true)} au total.`, cards: [carteImpayes(s, list)] };
}

export function remind(ctx: EngineContext): BobReply {
  const s = S();
  const list = aRelancer(s, ctx.memo.late as string[] | undefined);
  if (!list.length) return { text: 'Il n’y a personne à relancer pour le moment.' };
  const before = envoyerRelances(s, list);
  const names = list.map((f) => nomClient(s, f.clientId));
  return {
    text: `C’est fait. J’ai envoyé une relance polie à ${names.join(' et ')}.`,
    cards: [carteRelancesEnvoyees(s, list, () => { annulerRelances(useBrix.getState(), before); return 'Relances annulées, rien n’est parti.'; })],
    suggestions: ['Combien j’ai encaissé ce mois ?'],
  };
}

export function margin(n: string): BobReply {
  const s = S();
  if (/chantier/.test(n)) {
    const r = margeChantiers(s);
    return { text: `Sur tes chantiers en cours, la marge prévue à la fin est de ${pct(r.taux)} si le rythme actuel continue.`, cards: [r.card] };
  }
  const r = margeDevisSignes(s);
  if (!r.nombre) return { text: 'Tu n’as pas encore de devis signé. Dès le premier, je calcule ta marge.' };
  return {
    text: `Sur tes ${r.nombre} devis signés, tu gagnes ${money(r.marge, true)} pour ${money(r.ht, true)} HT, soit ${pct(r.taux)} de marge.`,
    cards: [r.card],
    suggestions: ['Et sur les chantiers en cours ?'],
  };
}

export function cash(): BobReply {
  const r = tresorerie(S());
  return { text: `Tu as ${money(r.solde, true)} sur le compte, et ${money(r.aEncaisser, true)} de factures à encaisser.`, cards: [r.card] };
}

export function pendingQuotes(): BobReply {
  const r = devisEnAttente(S());
  return {
    text: r.list.length ? `${r.list.length} devis attendent une signature, pour ${money(r.total, true)} HT.` : 'Aucun devis en attente de signature.',
    cards: r.card ? [r.card] : undefined,
  };
}
