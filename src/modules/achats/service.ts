// Services du département Achats. Simulés en preview : remplacer le corps de chaque
// fonction par l'appel au worker (`/api/achats/...`) sans changer la signature.

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Lecture d'un code-barres. À brancher : BarcodeDetector du navigateur ou plugin
 * Capacitor (ML Kit) sur l'app mobile. En démo, on « lit » le prochain article.
 */
export async function scanBarcode(candidates: string[], index: number): Promise<string> {
  await wait(850);
  return candidates[index % candidates.length];
}

/** Demande des documents à jour au sous-traitant. À brancher : e-mail avec lien de dépôt. */
export async function requestSubDocuments(_subId: string, _docs: string[]) {
  await wait(900);
  return { ok: true, demo: true };
}

/**
 * Vérification de l'attestation URSSAF. À brancher : service de vérification
 * en ligne de l'URSSAF (code de sécurité figurant sur l'attestation).
 */
export async function verifyUrssaf(_siret: string) {
  await wait(1200);
  return { ok: true, demo: true };
}

/** Accès limité du sous-traitant à un chantier. À brancher : invitation `/api/equipe/invitations` rôle sous_traitant. */
export async function grantChantierAccess(_subId: string, _chantierId: string | undefined) {
  await wait(500);
  return { ok: true, demo: true };
}
