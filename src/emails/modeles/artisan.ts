// E-mails envoyés par Brix à l'artisan : devis signé, paiement reçu, réponse fournisseur, bienvenue.

import type { DonneesEmail, RenduEmail } from '../types';
import { bouton, carteDocument, encart, etapes, fort, lienSecours, para, titre, type Ligne } from './blocs';
import { composer, lignesTexte, titreCourt } from './commun';
import { dateHeure, dateLongue, esc, euros } from './outils';

const BRIX = { marque: { type: 'brix' as const } };
const AIDE_BRIX = `Une question sur Brix ? Répondez à cet e-mail, nous lisons tout.`;
const MENTIONS_BRIX = `Vous recevez cet e-mail parce que les notifications sont activées dans Brix. Réglages, puis Notifications, pour les choisir.`;

export function devisSigneArtisan(d: DonneesEmail['devis_signe_artisan']): RenduEmail {
  const infos: Ligne[] = [
    { libelle: 'Signé le', valeur: dateHeure(d.signeLe) },
    { libelle: 'Signataire', valeur: d.signataire },
    ...(d.formule ? [{ libelle: 'Formule retenue', valeur: d.formule }] : []),
    ...(d.acompteMontant && d.acompteMontant > 0 ? [{ libelle: `Acompte prévu${d.acomptePourcent ? ` (${d.acomptePourcent} %)` : ''}`, valeur: euros(d.acompteMontant) }] : []),
  ];
  const suite = d.acompteMontant && d.acompteMontant > 0 ? `Envoyez la facture d'acompte de ${euros(d.acompteMontant)}. Brix la remplit à partir du devis, il ne reste qu'à la vérifier.` : `Planifiez le chantier et prévenez votre équipe.`;
  const corps = [
    titre(`${d.destinataire} a signé votre devis.`),
    para(`Le devis ${fort(d.numero)} est signé électroniquement. La copie signée est rangée dans Brix et ${esc(d.destinataire)} a reçu la sienne.`, { html: true }),
    carteDocument({ etiquette: `Devis ${d.numero}`, titre: d.titre, montant: euros(d.montantTtc), sousMontant: 'TTC signés', badge: { texte: 'Signé', ton: 'ok' }, lignes: infos }),
    encart('Prochaine étape', suite),
    bouton("Ouvrir dans Brix", d.lienApp),
    lienSecours(d.lienApp),
  ].join('');
  return composer({
    sujet: `${d.destinataire} a signé votre devis (${euros(d.montantTtc)})`,
    preheader: `${d.numero} · ${titreCourt(d.titre, 50)}. ${suite}`,
    corps,
    ...BRIX,
    aide: AIDE_BRIX,
    mentions: MENTIONS_BRIX,
    texte: [`Bonne nouvelle : ${d.destinataire} a signé le devis ${d.numero} (${d.titre}).`, `Montant : ${euros(d.montantTtc)} TTC`, lignesTexte(infos), `Prochaine étape : ${suite}`, `Ouvrir dans Brix : ${d.lienApp}`],
  });
}

export function paiementRecuArtisan(d: DonneesEmail['paiement_recu_artisan']): RenduEmail {
  const infos: Ligne[] = [
    { libelle: 'Client', valeur: d.client },
    { libelle: 'Facture', valeur: d.numero, mono: true },
    { libelle: 'Reçu le', valeur: dateLongue(d.payeLe) },
    { libelle: 'Moyen', valeur: d.moyen },
  ];
  const corps = [
    titre(`Vous avez reçu ${euros(d.montantTtc)}.`),
    para(`${esc(d.client)} a réglé la facture ${fort(d.numero)}. Brix l'a marquée comme payée et l'a rapprochée de votre compte.`, { html: true }),
    carteDocument({ etiquette: 'Paiement reçu', titre: d.titre, montant: euros(d.montantTtc), sousMontant: 'TTC', badge: { texte: 'Payée', ton: 'ok' }, lignes: infos }),
    bouton('Voir dans Brix', d.lienApp),
    lienSecours(d.lienApp),
  ].join('');
  return composer({
    sujet: `Vous avez reçu ${euros(d.montantTtc)} de ${d.client}`,
    preheader: `Facture ${d.numero} réglée par ${d.moyen.toLowerCase()}. Rien à faire de votre côté.`,
    corps,
    ...BRIX,
    aide: AIDE_BRIX,
    mentions: MENTIONS_BRIX,
    texte: [`${d.client} a réglé la facture ${d.numero} : ${euros(d.montantTtc)}.`, lignesTexte(infos), `Voir dans Brix : ${d.lienApp}`],
  });
}

export function reponseFournisseur(d: DonneesEmail['reponse_fournisseur']): RenduEmail {
  const infos: Ligne[] = [
    { libelle: 'Demande', valeur: d.reference, mono: true },
    { libelle: 'Délai annoncé', valeur: d.delai },
  ];
  const corps = [
    titre(`${d.fournisseur} a répondu à votre demande de prix.`),
    para(d.meilleur ? `C'est le meilleur prix reçu pour l'instant. Vous pouvez comparer les réponses et commander en un clic.` : `Ce n'est pas le prix le plus bas reçu pour l'instant. Comparez les réponses avant de commander.`),
    carteDocument({ etiquette: `Offre ${d.fournisseur}`, montant: euros(d.montantHt), sousMontant: 'HT', badge: d.meilleur ? { texte: 'Meilleur prix', ton: 'ok' } : undefined, lignes: infos }),
    bouton('Comparer les réponses', d.lienApp),
    lienSecours(d.lienApp),
  ].join('');
  return composer({
    sujet: `${d.fournisseur} a répondu : ${euros(d.montantHt)} HT`,
    preheader: `${d.meilleur ? 'Meilleur prix reçu' : 'Nouvelle offre'} pour la demande ${d.reference}, délai ${d.delai}.`,
    corps,
    ...BRIX,
    aide: AIDE_BRIX,
    mentions: MENTIONS_BRIX,
    texte: [`${d.fournisseur} a répondu à la demande ${d.reference}.`, `Montant : ${euros(d.montantHt)} HT${d.meilleur ? ' (meilleur prix reçu)' : ''}\nDélai : ${d.delai}`, `Comparer les réponses : ${d.lienApp}`],
  });
}

export function bienvenue(d: DonneesEmail['bienvenue']): RenduEmail {
  const liste = d.etapes.filter(Boolean).slice(0, 5);
  const corps = [
    titre(`Bienvenue sur Brix, ${d.prenom}.`),
    para(`L'espace de ${fort(d.entreprise)} est prêt. Il est réglé pour votre métier (${esc(d.metier.toLowerCase())}) : bibliothèque d'ouvrages, taux horaires et mentions obligatoires sont déjà en place.`, { html: true }),
    para('Pour bien démarrer :', { bas: 4 }),
    etapes(liste),
    bouton('Ouvrir Brix', d.lienApp),
    para(`Vous pouvez tout faire depuis votre téléphone, même sur un chantier.`, { taille: 13, haut: 18, bas: 0 }),
  ].join('');
  return composer({
    sujet: `Bienvenue sur Brix, ${d.prenom}`,
    preheader: `L'espace ${d.entreprise} est prêt. Votre premier devis peut partir aujourd'hui.`,
    corps,
    ...BRIX,
    aide: `Une question, un doute ? Répondez simplement à cet e-mail : une vraie personne vous répond.`,
    texte: [`Bienvenue sur Brix, ${d.prenom}.`, `L'espace de ${d.entreprise} est prêt.`, `Pour bien démarrer :\n${liste.map((t, i) => `${i + 1}. ${t}`).join('\n')}`, `Ouvrir Brix : ${d.lienApp}`],
  });
}
