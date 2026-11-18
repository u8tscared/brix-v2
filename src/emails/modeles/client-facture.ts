// E-mails au client autour de la facture : envoi, relances (ton qui monte), reçu de paiement.

import type { DonneesEmail, RenduEmail } from '../types';
import { bouton, carteDocument, confiance, encart, lienSecours, motPerso, para, signature, titre, type Ligne } from './blocs';
import { auNomDe, composer, lignesResume, lignesTexte, nomComplet, titreCourt } from './commun';
import { dateLongue, euros, pluriel } from './outils';

const TYPES: Record<DonneesEmail['facture_envoyee']['type'], { nom: string; article: string }> = {
  facture: { nom: 'Facture', article: 'votre facture' },
  acompte: { nom: "Facture d'acompte", article: "votre facture d'acompte" },
  situation: { nom: 'Situation de travaux', article: 'votre situation de travaux' },
  solde: { nom: 'Facture de solde', article: 'votre facture de solde' },
};

const CONFIANCE_PAIEMENT = ['Paiement sécurisé par carte bancaire', 'Virement possible : les coordonnées bancaires sont sur la facture', 'Facture téléchargeable en PDF depuis le même lien'];

/** « Facture F-2026-206 : Dépannage tableau (704,00 €) », sans le titre s'il rend le sujet trop long. */
function sujetFacture(nom: string, numero: string, titreTravaux: string, montant: string): string {
  const long = `${nom} ${numero} : ${titreCourt(titreTravaux, 34)} (${montant})`;
  return long.length <= 72 ? long : `${nom} ${numero} (${montant})`;
}

export function factureEnvoyee(d: DonneesEmail['facture_envoyee']): RenduEmail {
  const e = d.emetteur;
  const t = TYPES[d.type] ?? TYPES.facture;
  const echeance = d.echeance ? dateLongue(d.echeance) : '';
  const resume = lignesResume(d, 4);
  const intro =
    d.type === 'acompte'
      ? `Merci encore pour votre confiance. Voici la facture d'acompte qui permet de lancer les travaux : commande du matériel et réservation des dates.`
      : d.type === 'situation'
        ? `Voici la situation de travaux qui correspond à l'avancement du chantier. Elle ne reprend que ce qui a été réalisé à ce jour.`
        : d.type === 'solde'
          ? `Les travaux sont terminés, merci pour votre accueil. Voici la facture de solde, déduction faite des sommes déjà réglées.`
          : `Voici ${t.article} pour les travaux réalisés. Vous pouvez la consulter, la télécharger et la régler en ligne.`;
  const corps = [
    titre(`Bonjour ${d.civilite}, ${t.article} est prête.`),
    para(intro),
    motPerso(d.message, nomComplet(e)),
    carteDocument({
      etiquette: `${t.nom} ${d.numero}`,
      titre: d.titre,
      montant: euros(d.montantTtc),
      sousMontant: echeance ? `TTC · à régler avant le ${echeance}` : 'TTC · à régler à réception',
      lignes: resume,
    }),
    bouton('Consulter et payer', d.lien),
    lienSecours(d.lien),
    confiance(CONFIANCE_PAIEMENT),
    signature(nomComplet(e), e.entreprise),
  ].join('');
  return composer({
    sujet: sujetFacture(t.nom, d.numero, d.titre, euros(d.montantTtc)),
    preheader: `${euros(d.montantTtc)} ${echeance ? `à régler avant le ${echeance}` : 'à régler à réception'}. Paiement par carte ou virement, en deux minutes.`,
    corps,
    ...auNomDe(e),
    texte: [
      `Bonjour ${d.civilite},`,
      intro,
      d.message,
      `${t.nom} ${d.numero} : ${d.titre}`,
      resume.length ? lignesTexte(resume) : '',
      `Montant TTC : ${euros(d.montantTtc)}${echeance ? `\nÀ régler avant le ${echeance}` : ''}`,
      `Consulter et payer : ${d.lien}`,
      `Bien cordialement,\n${nomComplet(e)}\n${e.entreprise}`,
    ],
  });
}

interface TonRelance {
  sujet: string;
  preheader: string;
  h1: string;
  corps: string[];
  badge: 'alerte' | 'danger';
  bouton: string;
}

function tonRelance(d: DonneesEmail['facture_relance']): TonRelance {
  const e = d.emetteur;
  const montant = euros(d.montantTtc);
  const retard = pluriel(Math.max(0, Math.round(d.joursRetard || 0)), 'jour');
  const echeance = d.echeance ? ` le ${dateLongue(d.echeance)}` : '';
  if (d.rang <= 1) {
    return {
      sujet: `Petit rappel : facture ${d.numero} (${montant})`,
      preheader: `C'est sûrement un simple oubli. Vous pouvez régler en ligne en deux minutes.`,
      h1: `Un petit rappel pour la facture ${d.numero}`,
      corps: [
        `Sauf erreur de ma part, la facture ${d.numero} arrivée à échéance${echeance} n'est pas encore réglée. C'est sûrement un simple oubli.`,
        `Si le paiement est déjà parti, merci de ne pas tenir compte de ce message.`,
      ],
      badge: 'alerte',
      bouton: 'Régler la facture',
    };
  }
  if (d.rang === 2) {
    return {
      sujet: `Facture ${d.numero} impayée depuis ${retard}`,
      preheader: `Merci de régler ${montant} sous 8 jours. Une difficulté ? Appelez-moi, on trouvera une solution.`,
      h1: `La facture ${d.numero} reste impayée`,
      corps: [
        `Malgré mon premier rappel, la facture ${d.numero} de ${montant} est en retard de ${retard}. Je vous remercie de bien vouloir la régler sous 8 jours.`,
        `Si vous rencontrez une difficulté, appelez-moi${e.telephone ? ` au ${e.telephone}` : ''} : nous pouvons convenir d'un paiement en plusieurs fois.`,
      ],
      badge: 'danger',
      bouton: 'Régler la facture',
    };
  }
  const legal = d.clientPro
    ? `Conformément à l'article L441-10 du Code de commerce, des pénalités de retard sont dues depuis le lendemain de l'échéance, au taux indiqué sur la facture, ainsi qu'une indemnité forfaitaire de 40 € pour frais de recouvrement.`
    : `À défaut de paiement, des intérêts de retard au taux légal pourront vous être réclamés (article 1231-6 du Code civil).`;
  return {
    sujet: `Mise en demeure : facture ${d.numero} (${montant})`,
    preheader: `Dernier rappel avant recouvrement. Merci de régler ${montant} sous 8 jours.`,
    h1: 'Mise en demeure de payer',
    corps: [
      `Malgré nos précédents rappels, la facture ${d.numero} de ${montant}, échue${echeance}, reste impayée à ce jour, soit ${retard} de retard.`,
      `Par le présent message, nous vous mettons en demeure de régler cette somme dans un délai de 8 jours. Sans paiement de votre part dans ce délai, nous engagerons une procédure de recouvrement.`,
      legal,
    ],
    badge: 'danger',
    bouton: 'Régler maintenant',
  };
}

export function factureRelance(d: DonneesEmail['facture_relance']): RenduEmail {
  const e = d.emetteur;
  const ton = tonRelance(d);
  const retard = pluriel(Math.max(0, Math.round(d.joursRetard || 0)), 'jour');
  const infos: Ligne[] = [
    ...(d.echeance ? [{ libelle: 'Échéance', valeur: dateLongue(d.echeance) }] : []),
    { libelle: 'Montant dû', valeur: euros(d.montantTtc), fort: true },
    ...(d.rang >= 3 && d.clientPro ? [{ libelle: 'Indemnité forfaitaire de recouvrement', valeur: euros(40) }] : []),
  ];
  // Mise en demeure : la demande formelle est lue avant la carte ; seule la mention légale passe dessous.
  const nAvant = d.rang >= 3 ? 2 : 1;
  const avant = ton.corps.slice(0, nAvant);
  const reste = ton.corps.slice(nAvant);
  const corps = [
    titre(ton.h1),
    para(`Bonjour ${d.civilite},`, { bas: 10 }),
    avant.map((p) => para(p)).join(''),
    d.rang < 3 ? motPerso(d.message, nomComplet(e)) : '',
    carteDocument({ etiquette: `Facture ${d.numero}`, titre: d.titre, montant: euros(d.montantTtc), sousMontant: 'TTC', badge: { texte: `En retard de ${retard}`, ton: ton.badge }, lignes: infos }),
    bouton(ton.bouton, d.lien),
    lienSecours(d.lien),
    reste.map((p, i) => para(p, { taille: i === reste.length - 1 && d.rang >= 3 ? 13 : 15, haut: i === 0 ? 24 : 0 })).join(''),
    d.rang >= 3 ? '' : confiance(CONFIANCE_PAIEMENT.slice(0, 2)),
    signature(nomComplet(e), e.entreprise),
  ].join('');
  return composer({
    sujet: ton.sujet,
    preheader: ton.preheader,
    corps,
    ...auNomDe(e),
    texte: [`Bonjour ${d.civilite},`, ...ton.corps, d.rang < 3 ? d.message : '', `Facture ${d.numero} : ${d.titre}`, lignesTexte(infos), `${ton.bouton} : ${d.lien}`, `Bien cordialement,\n${nomComplet(e)}\n${e.entreprise}`],
  });
}

export function paiementRecuClient(d: DonneesEmail['paiement_recu_client']): RenduEmail {
  const e = d.emetteur;
  const infos: Ligne[] = [
    { libelle: 'Facture', valeur: d.numero, mono: true },
    { libelle: 'Payé le', valeur: dateLongue(d.payeLe) },
    { libelle: 'Moyen de paiement', valeur: d.moyen },
    ...(d.reste > 0 ? [{ libelle: 'Reste à régler sur le chantier', valeur: euros(d.reste) }] : [{ libelle: 'Reste à régler', valeur: 'Rien, tout est réglé' }]),
  ];
  const corps = [
    titre(`Merci ${d.civilite}, votre paiement est bien reçu.`),
    para(`${e.entreprise} a bien reçu votre règlement. Ce message vous sert de reçu : vous pouvez le conserver ou télécharger le justificatif.`),
    carteDocument({ etiquette: 'Reçu de paiement', titre: d.titre, montant: euros(d.montantTtc), sousMontant: 'TTC réglés', badge: { texte: 'Payé', ton: 'ok' }, lignes: infos }),
    d.reste > 0 ? encart('La suite', `Le reste, soit ${euros(d.reste)}, vous sera facturé au fil de l'avancement du chantier. Vous n'avez rien à faire d'ici là.`) : '',
    bouton('Voir mon reçu', d.lien),
    lienSecours(d.lien),
    signature(nomComplet(e), e.entreprise),
  ].join('');
  return composer({
    sujet: `Paiement reçu : ${euros(d.montantTtc)} pour la facture ${d.numero}`,
    preheader: `Merci ! Votre reçu est disponible.${d.reste > 0 ? ` Reste à régler sur le chantier : ${euros(d.reste)}.` : ' Tout est réglé.'}`,
    corps,
    ...auNomDe(e),
    texte: [`Bonjour ${d.civilite},`, `${e.entreprise} a bien reçu votre paiement de ${euros(d.montantTtc)}. Merci !`, lignesTexte(infos), `Votre reçu : ${d.lien}`, `Bien cordialement,\n${nomComplet(e)}\n${e.entreprise}`],
  });
}
