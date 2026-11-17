// Liens publics des parcours externes.
// Démo (preview statique) : le jeton est l'identifiant du document, lisible par le même navigateur.
// Réel : le worker émet un jeton signé, opaque et révocable (worker/src/modules/documents/jetons.ts),
// et l'URL devient https://brix-app.fr/d/<jeton> (servie par le worker, même SPA).

export type TypeLien = 'devis' | 'facture' | 'chantier' | 'fournisseur' | 'boite';

const PREFIX: Record<TypeLien, string> = { devis: 'd', facture: 'f', chantier: 'p', fournisseur: 'portail-fournisseur', boite: 'boite' };

/** Base de l'app (fonctionne en preview artifact, en local et en prod, HashRouter). */
export function baseApp(): string {
  if (typeof window === 'undefined') return 'https://app.brix-app.fr/';
  return window.location.href.split('#')[0];
}

export function lienPublic(type: TypeLien, jeton = ''): string {
  return `${baseApp()}#/${PREFIX[type]}${jeton ? `/${encodeURIComponent(jeton)}` : ''}`;
}

/** Chemin interne (pour <Link> / navigate). */
export function cheminPublic(type: TypeLien, jeton = ''): string {
  return `/${PREFIX[type]}${jeton ? `/${encodeURIComponent(jeton)}` : ''}`;
}
