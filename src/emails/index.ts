// Point d'entrée des e-mails : rendreEmail(modele, donnees) → { sujet, preheader, html, texte }.
// PROVISOIRE : rendu minimal, remplacé par les vrais modèles (src/emails/modeles/).
import type { DonneesEmail, ModeleEmail, RenduEmail } from './types';
export type * from './types';

export function rendreEmail<M extends ModeleEmail>(modele: M, donnees: DonneesEmail[M]): RenduEmail {
  const sujet = `Brix · ${modele}`;
  return { sujet, preheader: sujet, html: `<pre>${JSON.stringify(donnees, null, 2).replace(/</g, '&lt;')}</pre>`, texte: JSON.stringify(donnees) };
}
