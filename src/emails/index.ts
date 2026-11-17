// Point d'entrée des e-mails : rendreEmail(modele, donnees) → { sujet, preheader, html, texte }.
// TypeScript pur, sans DOM ni alias « @/ » : importé tel quel par l'app (boîte de démo) et par le worker (envoi réel).
import type { DonneesEmail, ModeleEmail, RenduEmail } from './types';
import { MODELES } from './modeles/index';
export type * from './types';
export { MODELES, NOM_MODELE, PUBLIC_MODELE, esc, euros } from './modeles/index';

export function rendreEmail<M extends ModeleEmail>(modele: M, donnees: DonneesEmail[M]): RenduEmail {
  const rendu = MODELES[modele] as ((d: DonneesEmail[M]) => RenduEmail) | undefined;
  if (!rendu) throw new Error(`Modèle d'e-mail inconnu : ${String(modele)}`);
  return rendu(donnees);
}
