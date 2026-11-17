// E-mails au client autour du devis : envoi, relance, code de signature, confirmation de signature.

import type { DonneesEmail, RenduEmail } from '../types';
import { bouton, blocCode, carteDocument, confiance, encart, fort, lienSecours, lignes, motPerso, para, signature, titre, type Ligne } from './blocs';
import { auNomDe, composer, lignesResume, lignesTexte, nomComplet, titreCourt } from './commun';
import { dateHeure, dateLongue, esc, euros, nombre, titreTexte } from './outils';

const CONFIANCE_DEVIS = ['Signature électronique avec un code reçu par e-mail', 'Aucun compte à créer, tout se fait en ligne', 'Une question ? Posez-la avant de signer, depuis la même page'];

function infosDevis(d: DonneesEmail['devis_envoye']): { sous: string; apres: string; texte: string[] } {
  const validite = d.echeance ? `valable jusqu'au ${dateLongue(d.echeance)}` : '';
  const acompte = d.acompteMontant && d.acompteMontant > 0 ? `Acompte à la signature : ${d.acomptePourcent ? `${nombre(d.acomptePourcent)} %, soit ` : ''}${euros(d.acompteMontant)}` : '';
  const total: Ligne[] = [{ libelle: 'Total TTC', valeur: euros(d.montantTtc), fort: true }];
  return {
    sous: ['TTC', validite].filter(Boolean).join(' · '),
    apres: `${lignes(total, { haut: (d.lignes ?? []).length > 0 })}${acompte ? `<div class="bx-ink2" style="font-size:13px;line-height:19px;color:#5f5f70;padding-top:10px">${esc(acompte)}</div>` : ''}`,
    texte: [acompte, validite ? `Ce devis est ${validite}.` : ''].filter(Boolean),
  };
}

export function devisEnvoye(d: DonneesEmail['devis_envoye']): RenduEmail {
  const e = d.emetteur;
  const resume = lignesResume(d);
  const inf = infosDevis(d);
  const corps = [
    titre(`Bonjour ${d.civilite}, voici votre devis.`),
    para(`Comme convenu, je vous envoie le devis pour vos travaux. Vous pouvez le lire en détail, me poser une question ou le signer en ligne, depuis votre téléphone ou votre ordinateur.`),
    motPerso(d.message, `${nomComplet(e)}, ${e.entreprise}`),
    carteDocument({ etiquette: `Devis ${d.numero}`, titre: d.titre, montant: euros(d.montantTtc), sousMontant: inf.sous, lignes: resume, apres: inf.apres }),
    bouton('Consulter et signer', d.lien),
    lienSecours(d.lien),
    confiance(CONFIANCE_DEVIS),
    signature(nomComplet(e), e.entreprise),
  ].join('');
  return composer({
    sujet: `Votre devis « ${titreCourt(d.titre, 44)} » (${euros(d.montantTtc)})`,
    preheader: `${nomComplet(e)} vous a préparé un devis de ${euros(d.montantTtc)}. Consultez-le et signez en ligne, sans créer de compte.`,
    corps,
    ...auNomDe(e),
    texte: [
      `Bonjour ${d.civilite},`,
      `Comme convenu, je vous envoie le devis pour vos travaux. Vous pouvez le lire en détail, me poser une question ou le signer en ligne.`,
      d.message,
      titreTexte(`Devis ${d.numero} : ${d.titre}`),
      resume.length ? lignesTexte(resume) : '',
      `Total TTC : ${euros(d.montantTtc)}`,
      ...inf.texte,
      `Consulter et signer : ${d.lien}`,
      `Bien cordialement,\n${nomComplet(e)}\n${e.entreprise}`,
    ],
  });
}

export function devisRelance(d: DonneesEmail['devis_relance']): RenduEmail {
  const e = d.emetteur;
  const ferme = d.rang >= 2;
  const fin = d.echeance ? dateLongue(d.echeance) : '';
  const h1 = ferme && fin ? `Votre devis reste valable jusqu'au ${fin}.` : `Avez-vous pu regarder le devis ?`;
  const intro = ferme
    ? `Je reviens vers vous une dernière fois au sujet du devis ${d.numero}. ${fin ? `Après le ${fin}, les prix pourront évoluer et je ne pourrai plus garantir les dates d'intervention.` : `Les prix et les dates proposés ne pourront pas être garantis longtemps.`}`
    : `Je me permets de revenir vers vous au sujet du devis ${d.numero}. Si quelque chose n'est pas clair, ou si vous souhaitez changer une option, répondez simplement à ce message : je l'ajuste avec plaisir.`;
  const corps = [
    titre(h1),
    para(`Bonjour ${d.civilite},`, { bas: 10 }),
    para(intro),
    motPerso(d.message, nomComplet(e)),
    carteDocument({ etiquette: `Devis ${d.numero}`, titre: d.titre, montant: euros(d.montantTtc), sousMontant: fin ? `TTC · valable jusqu'au ${fin}` : 'TTC', badge: ferme && fin ? { texte: `Expire le ${dateLongue(d.echeance, false)}`, ton: 'alerte' } : undefined }),
    bouton('Consulter et signer', d.lien),
    lienSecours(d.lien),
    ferme ? para(`Si vous avez choisi une autre solution, dites-le moi simplement, je ne vous relancerai plus.`, { taille: 14, bas: 0, haut: 22 }) : confiance(CONFIANCE_DEVIS.slice(0, 2)),
    signature(nomComplet(e), e.entreprise),
  ].join('');
  return composer({
    sujet: ferme && fin ? `Votre devis ${d.numero} expire le ${dateLongue(d.echeance, false)}` : `Votre devis ${d.numero} vous attend (${euros(d.montantTtc)})`,
    preheader: ferme ? `Dernier rappel avant la fin de validité. Signez en ligne en deux minutes, ou dites-moi ce qui coince.` : `Une question, une option à changer ? Répondez à ce message, ${e.prenom} ajuste le devis.`,
    corps,
    ...auNomDe(e),
    texte: [`Bonjour ${d.civilite},`, intro, d.message, `Devis ${d.numero} : ${d.titre}\nTotal TTC : ${euros(d.montantTtc)}${fin ? `\nValable jusqu'au ${fin}` : ''}`, `Consulter et signer : ${d.lien}`, `Bien cordialement,\n${nomComplet(e)}\n${e.entreprise}`],
  });
}

export function codeSignature(d: DonneesEmail['code_signature']): RenduEmail {
  const e = d.emetteur;
  const minutes = Number.isFinite(d.minutes) && d.minutes > 0 ? d.minutes : 10;
  const code = String(d.code).replace(/\D/g, '');
  const lisible = code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
  const corps = [
    titre('Votre code de signature'),
    para(`Bonjour ${d.civilite}, saisissez ce code sur la page du devis ${d.numero} pour confirmer votre signature.`),
    blocCode(code, `Valable ${minutes} minutes`),
    encart("Vous n'avez rien demandé ?", `Ignorez ce message : rien ne sera signé sans ce code. Ne le communiquez à personne, ${e.prenom} ne vous le demandera jamais par téléphone.`),
    para(`La signature électronique a la même valeur qu'une signature sur papier. Elle est horodatée et la copie signée vous sera envoyée par e-mail.`, { taille: 13, bas: 0 }),
  ].join('');
  return composer({
    sujet: `${lisible} est votre code pour signer le devis ${d.numero}`,
    preheader: `Valable ${minutes} minutes. Ne le partagez avec personne.`,
    corps,
    ...auNomDe(e),
    texte: [`Bonjour ${d.civilite},`, `Votre code pour signer le devis ${d.numero} :`, `    ${lisible}`, `Il est valable ${minutes} minutes. Ne le communiquez à personne.`, `Vous n'avez rien demandé ? Ignorez ce message : rien ne sera signé sans ce code.`],
  });
}

export function devisSigneClient(d: DonneesEmail['devis_signe_client']): RenduEmail {
  const e = d.emetteur;
  const infos: Ligne[] = [
    { libelle: 'Signé le', valeur: dateHeure(d.signeLe) },
    { libelle: 'Par', valeur: d.signataire },
    ...(d.formule ? [{ libelle: 'Formule retenue', valeur: d.formule }] : []),
    { libelle: 'Empreinte', valeur: String(d.empreinte).slice(0, 12), mono: true, detail: 'Prouve que le devis n\'a pas changé' },
  ];
  const acompte = d.acompteMontant && d.acompteMontant > 0;
  const suite = acompte
    ? `L'acompte de ${d.acomptePourcent ? `${nombre(d.acomptePourcent)} %` : 'démarrage'} (${euros(d.acompteMontant)}) vous sera demandé par une facture séparée. ${e.prenom} vous appelle ensuite pour fixer la date de début des travaux.`
    : `${e.prenom} vous appelle dans les prochains jours pour fixer la date de début des travaux.`;
  const corps = [
    titre(`C'est signé. Merci ${d.civilite}.`),
    para(`Votre devis est signé et ${fort(e.entreprise)} a été prévenu. Gardez cet e-mail : il contient la preuve de votre signature et le lien vers votre copie.`, { html: true }),
    carteDocument({ etiquette: `Devis signé ${d.numero}`, titre: d.titre, montant: euros(d.montantTtc), sousMontant: 'TTC', badge: { texte: 'Signé', ton: 'ok' }, lignes: infos }),
    encart('Et maintenant ?', suite),
    bouton('Voir mon devis signé', d.lien),
    lienSecours(d.lien),
    confiance(['Signature électronique horodatée et vérifiable', 'Copie signée disponible à tout moment depuis ce lien']),
  ].join('');
  return composer({
    sujet: `Devis signé : ${titreCourt(d.titre, 40)} (${euros(d.montantTtc)})`,
    preheader: `Merci ${d.civilite}, votre signature est enregistrée. Voici votre copie et la suite des travaux.`,
    corps,
    ...auNomDe(e),
    texte: [
      `Bonjour ${d.civilite},`,
      `Votre devis ${d.numero} (${d.titre}) est signé. ${e.entreprise} a été prévenu.`,
      lignesTexte(infos),
      `Total TTC : ${euros(d.montantTtc)}`,
      `Et maintenant ? ${suite}`,
      `Votre copie signée : ${d.lien}`,
    ],
  });
}
