// E-mails du compte Brix (envoyés par Brix à l'artisan) : nouveau mot de passe.

import type { DonneesEmail, RenduEmail } from '../types';
import { bouton, lienSecours, para, titre } from './blocs';
import { composer } from './commun';

export function motDePasse(d: DonneesEmail['mot_de_passe']): RenduEmail {
  const bonjour = d.prenom ? `Bonjour ${d.prenom},` : 'Bonjour,';
  const corps = [
    titre('Choisissez un nouveau mot de passe.'),
    para(`${bonjour} vous avez demandé à changer le mot de passe de votre compte Brix. Le lien ci-dessous est valable ${d.minutes} minutes et ne sert qu'une fois.`),
    bouton('Choisir mon mot de passe', d.lien),
    lienSecours(d.lien),
    para(`Vous n'êtes pas à l'origine de cette demande ? Ignorez cet e-mail : votre mot de passe actuel reste valable.`, { taille: 13, haut: 18, bas: 0 }),
  ].join('');
  return composer({
    sujet: 'Votre nouveau mot de passe Brix',
    preheader: `Lien valable ${d.minutes} minutes. Si vous n'avez rien demandé, ignorez cet e-mail.`,
    corps,
    marque: { type: 'brix' },
    aide: `Une question ? Répondez simplement à cet e-mail.`,
    texte: [bonjour, `Vous avez demandé à changer le mot de passe de votre compte Brix. Ce lien est valable ${d.minutes} minutes et ne sert qu'une fois :`, d.lien, `Vous n'êtes pas à l'origine de cette demande ? Ignorez cet e-mail : votre mot de passe actuel reste valable.`],
  });
}
