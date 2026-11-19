// Moteur d'intentions local de Brix AI (sans réseau). Il comprend le français courant et AGIT
// sur le store. C'est le secours hors ligne de Brix AI en ligne (agent.ts, API Claude via le
// worker) : les deux partagent la même logique métier (outils/*.ts).

import { useBrix } from '@/lib/store';
import { findLesson } from './nlu/knowledge';
import { addToLastDraft, createClient, createDevis } from './nlu/create';
import { cash, cashIn, late, margin, pendingQuotes, remind } from './nlu/money';
import { agenda, assign, chantierStatus } from './nlu/planning';
import { norm } from './nlu/text';
import { devisExample, normExample } from './tradeExamples';
import type { BobReply, EngineContext } from './nlu/types';

export type { BobReply, BobCard, BobCardAction, BobCardRow, EngineContext } from './nlu/types';

const NAV: [RegExp, string, string][] = [
  [/factures?/, '/app/factures', 'les factures'],
  [/devis/, '/app/devis', 'les devis'],
  [/chantiers?/, '/app/chantiers', 'les chantiers'],
  [/planning|agenda/, '/app/planning', 'le planning'],
  [/clients?/, '/app/clients', 'les clients'],
  [/tresorerie|banque/, '/app/tresorerie', 'la trésorerie'],
  [/reglages|parametres/, '/app/reglages', 'les réglages'],
  [/outils|calcul/, '/app/outils', 'les outils métier'],
  [/brief/, '/app/bob/brief', 'le brief du matin'],
];

const trade = () => useBrix.getState().company.trade;

/** Ce que Brix AI sait faire, avec des exemples dans les mots du métier. */
export const capabilities = () => [
  { icon: 'FileText', title: 'Faire un devis', example: devisExample(trade()) },
  { icon: 'Wallet', title: 'Suivre l’argent', example: 'Combien j’ai encaissé ce mois ?' },
  { icon: 'BellRing', title: 'Relancer les retards', example: 'Qui est en retard de paiement ?' },
  { icon: 'CalendarRange', title: 'Lire ton planning', example: 'Qu’est-ce que j’ai demain ?' },
  { icon: 'HardHat', title: 'Faire le point chantier', example: 'Où en est le chantier Lefèvre ?' },
  { icon: 'Users', title: 'Placer l’équipe', example: 'Ajoute Yanis sur le chantier Dupuis jeudi' },
  { icon: 'Contact', title: 'Créer un client', example: 'Crée un client Sarah Kaci, 06 51 23 98 70' },
  { icon: 'Calculator', title: 'Calculer ta marge', example: 'Quelle est ma marge sur les devis signés ?' },
  { icon: 'Landmark', title: 'Voir ta trésorerie', example: 'Combien j’ai en banque ?' },
  { icon: 'ShieldCheck', title: 'Expliquer les règles', example: normExample(trade()) },
];

/** Suggestions selon la page ouverte. */
export function contextualSuggestions(pathname: string): string[] {
  const p = pathname.replace(/^\/app\/?/, '');
  const dv = devisExample(trade());
  const nm = normExample(trade());
  if (p.startsWith('devis')) return [dv, 'Quels devis attendent une signature ?', 'Quelle est ma marge sur les devis signés ?'];
  if (p.startsWith('factures') || p.startsWith('relances') || p.startsWith('paiements')) return ['Qui est en retard de paiement ?', 'Combien j’ai encaissé ce mois ?', 'Explique-moi la facture électronique'];
  if (p.startsWith('tresorerie') || p.startsWith('compta')) return ['Combien j’ai en banque ?', 'Combien j’ai encaissé ce mois ?', 'Qui est en retard de paiement ?'];
  if (p.startsWith('chantiers')) return ['Où en est le chantier Lefèvre ?', 'Quelle marge sur les chantiers en cours ?', 'Ajoute Yanis sur le chantier Dupuis jeudi'];
  if (p.startsWith('planning') || p.startsWith('equipe') || p.startsWith('pointage')) return ['Qu’est-ce que j’ai demain ?', 'Qui fait quoi aujourd’hui ?', 'Ajoute Yanis sur le chantier Dupuis jeudi'];
  if (p.startsWith('clients') || p.startsWith('demandes')) return ['Crée un client', dv.replace('Mme Martin', 'Sarah Kaci'), 'Qui est en retard de paiement ?'];
  if (p.startsWith('outils')) return trade() === 'electricien' || !trade() ? [nm, 'Quelles règles pour une borne IRVE ?', 'Quel taux de TVA pour une rénovation ?'] : [nm, 'Explique-moi la facture électronique', 'Combien j’ai en banque ?'];
  return ['Qu’est-ce que j’ai demain ?', 'Combien j’ai encaissé ce mois ?', dv];
}

function help(): BobReply {
  return {
    text: 'Je peux faire tout ça pour toi. Parle normalement, comme à un collègue.',
    cards: [{ kind: 'info', icon: 'AudioLines', title: 'Ce que je sais faire', rows: capabilities().map((c) => ({ label: c.title, sub: `« ${c.example} »` })) }],
    suggestions: capabilities().slice(0, 3).map((c) => c.example),
  };
}

export function respond(input: string, ctx: EngineContext): BobReply {
  const text = input.trim();
  const n = norm(text);
  const s = useBrix.getState();
  if (!n) return { text: 'Je t’écoute.' };

  // Réponses en attente (nom du client demandé juste avant)
  if (ctx.memo.pendingDevis && /^(pour|chez)?\s*\S/.test(n) && !/devis|retard|encaiss|chantier|planning/.test(n)) {
    const prev = String(ctx.memo.pendingDevis);
    delete ctx.memo.pendingDevis;
    const who = text.replace(/^(pour|chez)\s+/i, '');
    return createDevis(`${prev} pour ${who}`, ctx);
  }
  if (ctx.memo.pending === 'client' && !/devis|retard|encaiss|chantier/.test(n)) return createClient(text, ctx);

  if (/^(bonjour|salut|hello|coucou|bonsoir|yo)\b/.test(n) && n.split(' ').length < 4)
    return { text: `Salut ${s.user.firstName || ''} ! Qu’est-ce que je fais pour toi ?`.replace(' !', ' !'), suggestions: contextualSuggestions(ctx.pathname) };
  if (/^(merci|super|top|parfait|nickel|genial|ok merci)\b/.test(n)) return { text: 'Avec plaisir. Je suis là si besoin.' };
  if (/(que sais[- ]tu faire|tu sais faire quoi|aide|qu'est-ce que tu (peux|sais) faire|comment (ca|tu) marche)/.test(n)) return help();

  // Formation (avant le reste : « explique… devis » ne doit pas créer de devis)
  if (/(explique|c'est quoi|qu'est-ce que la|regles?|norme|nf ?c|obligatoire|quel taux|combien de prises|comment fonctionne|rappelle[- ]moi)/.test(n)) {
    const lesson = findLesson(n);
    if (lesson) return { text: lesson.intro, cards: [lesson.card], suggestions: ['Explique-moi la salle de bain', 'Quel taux de TVA pour une rénovation ?'] };
  }

  // Relances
  if (/^relance|relance[- ]les|relance[- ]le|relance tout|envoie (les|une) relance/.test(n)) return remind(ctx);
  if (/(en retard|retards? de paiement|pas paye|impaye|me doit|me doivent|qui doit)/.test(n)) return late(ctx);

  // Devis
  if (/\bdevis\b/.test(n) && /(fai[st]|faire|cree|creer|prepare|redige|nouveau|nouvel|monte|chiffre)|^devis\b/.test(n)) return createDevis(text, ctx);
  if (/^(ajoute|rajoute|mets?)\s/.test(n) && !/\bsur\b|chantier/.test(n)) {
    const r = addToLastDraft(text);
    if (r) return r;
  }
  if (/devis.*(attente|signer|signature|en cours)|(attente|signer).*devis/.test(n)) return pendingQuotes();

  // Équipe et planning
  if (/^(ajoute|mets?|place|envoie|planifie|affecte|positionne)\s/.test(n) && /(chantier|\bsur\b|\bchez\b)/.test(n)) {
    const r = assign(n);
    if (r) return r;
  }
  if (/(ou en est|avancement|point sur|etat du|comment va|comment avance|ca avance).*|chantier\s+\w+\s*\?$/.test(n) && (/chantier/.test(n) || /ou en est|avance/.test(n))) return chantierStatus(n);

  // Argent
  if (/marge/.test(n)) return margin(n);
  if (/(encaisse|rentre|touche|recu|chiffre d'affaires|\bca\b)/.test(n)) return cashIn(n);
  if (/(banque|tresorerie|solde|compte)/.test(n) && !/client/.test(n)) return cash();

  // Clients
  if (/(cree|creer|ajoute|nouveau|nouvelle|enregistre).*client/.test(n)) return createClient(text, ctx);

  if (/(demain|aujourd'hui|cette semaine|planning|agenda|qu'est-ce que j'ai|j'ai quoi|rendez-vous|rdv|qui fait quoi|lundi|mardi|mercredi|jeudi|vendredi|et pour l'equipe)/.test(n)) return agenda(n);

  // Navigation simple
  const nav = /^(ouvre|montre|affiche|va (sur|dans)|emmene)/.test(n) ? NAV.find(([re]) => re.test(n)) : undefined;
  if (nav) return { text: `J’ouvre ${nav[2]}.`, cards: [{ kind: 'info', title: `Aller sur ${nav[2]}`, actions: [{ label: 'Ouvrir', to: nav[1], variant: 'primary' }] }] };

  const lesson = findLesson(n);
  if (lesson && n.split(' ').length > 2) return { text: lesson.intro, cards: [lesson.card] };

  return {
    text: 'Je n’ai pas encore appris à faire ça dans cette version de démo. Voilà ce que je peux faire tout de suite :',
    suggestions: contextualSuggestions(ctx.pathname),
  };
}
