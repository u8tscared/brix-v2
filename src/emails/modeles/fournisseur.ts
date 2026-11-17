// E-mails de l'artisan à ses fournisseurs : demande de prix et bon de commande (lien vers le portail).

import type { DonneesEmail, RenduEmail } from '../types';
import { bouton, carteDocument, confiance, lienSecours, lignes, motPerso, para, signature, titre, type Ligne } from './blocs';
import { auNomDe, composer, lignesTexte, nomComplet } from './commun';
import { dateLongue, euros, nombre, pluriel } from './outils';

const qte = (q: number, u: string) => `${nombre(q)} ${u}`.trim();

export function demandePrix(d: DonneesEmail['demande_prix']): RenduEmail {
  const e = d.emetteur;
  const arts = d.articles.slice(0, 8);
  const reste = d.articles.length - arts.length;
  const ls: Ligne[] = [...arts.map((a) => ({ libelle: a.designation, valeur: qte(a.quantite, a.unite) })), ...(reste > 0 ? [{ libelle: `Et ${pluriel(reste, 'autre article', 'autres articles')}`, valeur: '' }] : [])];
  const avant = dateLongue(d.reponseAvant);
  const infos: Ligne[] = [
    ...(d.livraison ? [{ libelle: 'Livraison souhaitée', valeur: dateLongue(d.livraison) || d.livraison }] : []),
    { libelle: 'Réponse avant le', valeur: avant, fort: true },
  ];
  const bonjour = d.contact ? `Bonjour ${d.contact},` : 'Bonjour,';
  const corps = [
    titre('Pouvez-vous me faire un prix ?'),
    para(bonjour, { bas: 10 }),
    para(`Je prépare un chantier et j'ai besoin de vos meilleurs prix et délais pour les articles ci-dessous. Vous pouvez répondre en ligne en quelques minutes, article par article, sans créer de compte.`),
    motPerso(d.message, nomComplet(e)),
    carteDocument({ etiquette: `Demande de prix ${d.reference}`, montant: pluriel(d.articles.length, 'article'), sousMontant: d.chantier ? `Pour le chantier ${d.chantier}` : undefined, lignes: ls, apres: lignes(infos, { haut: true }) }),
    bouton('Répondre à la demande', d.lien),
    lienSecours(d.lien),
    confiance(['Pas de compte à créer : le lien suffit', 'Prix, remises et délais sur une seule page', `Votre réponse arrive directement chez ${e.prenom}`]),
    signature(nomComplet(e), e.entreprise),
  ].join('');
  return composer({
    sujet: `Demande de prix ${d.reference} : ${pluriel(d.articles.length, 'article')} (${e.entreprise})`,
    preheader: `Réponse souhaitée avant le ${avant}. Répondez en ligne en quelques minutes, sans compte.`,
    corps,
    ...auNomDe(e),
    texte: [bonjour, `Je prépare un chantier et j'ai besoin de vos meilleurs prix et délais pour les articles ci-dessous.`, d.message, `Demande de prix ${d.reference}`, d.articles.map((a) => `- ${a.designation} : ${qte(a.quantite, a.unite)}`).join('\n'), lignesTexte(infos), `Répondre en ligne : ${d.lien}`, `Bien cordialement,\n${nomComplet(e)}\n${e.entreprise}`],
  });
}

export function commandeFournisseur(d: DonneesEmail['commande_fournisseur']): RenduEmail {
  const e = d.emetteur;
  const arts = d.articles.slice(0, 6);
  const reste = d.articles.slice(arts.length);
  const ls: Ligne[] = [
    ...arts.map((a) => ({ libelle: a.designation, detail: `${qte(a.quantite, a.unite)} × ${euros(a.prixHt)}`, valeur: euros(a.quantite * a.prixHt) })),
    ...(reste.length ? [{ libelle: `Et ${pluriel(reste.length, 'autre article', 'autres articles')}`, valeur: euros(reste.reduce((s, a) => s + a.quantite * a.prixHt, 0)) }] : []),
  ];
  const livraison = dateLongue(d.livraison);
  const infos: Ligne[] = [
    { libelle: 'Livraison le', valeur: livraison, fort: true },
    { libelle: 'Adresse', valeur: d.adresse },
    ...(d.chantier ? [{ libelle: 'Chantier', valeur: d.chantier }] : []),
  ];
  const bonjour = d.contact ? `Bonjour ${d.contact},` : 'Bonjour,';
  const corps = [
    titre('Voici ma commande.'),
    para(bonjour, { bas: 10 }),
    para(`Merci de préparer la commande ci-dessous pour une livraison le ${livraison}. Un clic suffit pour la confirmer ou signaler un article manquant.`),
    carteDocument({ etiquette: `Bon de commande ${d.numero}`, montant: euros(d.montantHt), sousMontant: `HT · ${pluriel(d.articles.length, 'article')}`, lignes: ls, apres: lignes(infos, { haut: true }) }),
    bouton('Confirmer la commande', d.lien),
    lienSecours(d.lien),
    confiance(['Bon de commande PDF disponible depuis le lien', 'Signalez un retard ou une rupture en un clic']),
    signature(nomComplet(e), e.entreprise),
  ].join('');
  return composer({
    sujet: `Bon de commande ${d.numero} : ${euros(d.montantHt)} HT (${e.entreprise})`,
    preheader: `Livraison souhaitée le ${livraison}. Confirmez en un clic ou signalez un article manquant.`,
    corps,
    ...auNomDe(e),
    texte: [bonjour, `Merci de préparer la commande ci-dessous pour une livraison le ${livraison}.`, `Bon de commande ${d.numero}`, d.articles.map((a) => `- ${a.designation} : ${qte(a.quantite, a.unite)} × ${euros(a.prixHt)} = ${euros(a.quantite * a.prixHt)}`).join('\n'), `Total HT : ${euros(d.montantHt)}`, lignesTexte(infos), `Confirmer la commande : ${d.lien}`, `Bien cordialement,\n${nomComplet(e)}\n${e.entreprise}`],
  });
}
