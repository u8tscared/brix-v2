/**
 * Dossier de preuve de la signature : contenu, scellement, certificat HTML, stockage R2.
 * Le contenu juridique est expliqué dans docs/parcours/dossier-de-preuve.md.
 */
import { egalTempsConstant, hmacHex, isoMs, jsonCanonique, sha256Hex } from '../documents/commun';
import type { EnvParcours } from '../documents/env';
import type { Mentions } from './mentions';

export interface DonneesPreuve {
  preuveId: string;
  devisId: string;
  organizationId: string;
  document: unknown; // document canonique
  documentJson: string;
  empreinte: string;
  signataire: { nom: string; contact: string | null };
  formule: string;
  authentification: { methode: string; canal: string | null; destinataire: string | null; codeEnvoyeLe: number | null; codeVerifieLe: number | null; essais: number | null };
  consentements: { bonPourAccord: boolean; cgv: boolean; demarrageAnticipe: boolean };
  textesAffiches: Mentions;
  contexte: { ip: string; userAgent: string; lienId: string };
  signeLe: number;
  retractation: { applicable: boolean; fin: number | null };
  image: { cle: string | null; sha256: string | null };
  fournisseur: { nom: string; reference: string | null };
  ouvertures: { le: number; ip: string | null }[];
}

const echapper = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const secretSceau = (env: EnvParcours) => env.PUBLIC_LINK_SECRET ?? `derive-sceau|${env.JWT_SECRET}`;

export function construireDossier(p: DonneesPreuve) {
  return {
    schema: 'brix-dossier-preuve-v1',
    preuve: p.preuveId,
    typeSignature: p.fournisseur.nom === 'brix' ? 'Signature électronique simple (règlement eIDAS, art. 25-1)' : `Signature déléguée au prestataire ${p.fournisseur.nom}`,
    horodatageServeur: isoMs(p.signeLe),
    document: { empreinte: { algorithme: 'SHA-256', valeur: p.empreinte }, contenu: p.document },
    signataire: p.signataire,
    formule: p.formule,
    authentification: {
      ...p.authentification,
      codeEnvoyeLe: p.authentification.codeEnvoyeLe ? isoMs(p.authentification.codeEnvoyeLe) : null,
      codeVerifieLe: p.authentification.codeVerifieLe ? isoMs(p.authentification.codeVerifieLe) : null,
    },
    consentements: p.consentements,
    textesAffiches: p.textesAffiches,
    contexte: p.contexte,
    retractation: { applicable: p.retractation.applicable, finDuDelai: p.retractation.fin ? isoMs(p.retractation.fin) : null, demarrageAnticipeDemande: p.consentements.demarrageAnticipe },
    imageSignature: p.image,
    fournisseur: p.fournisseur,
    journalOuvertures: p.ouvertures.map((o) => ({ le: isoMs(o.le), ip: o.ip })),
  };
}

/** Empreinte du dossier entier + sceau HMAC du serveur : toute modification ultérieure est détectable. */
export async function sceller(env: EnvParcours, dossier: unknown) {
  const sha = await sha256Hex(jsonCanonique(dossier));
  return { dossierSha256: sha, sceau: await hmacHex(secretSceau(env), `brix-sceau-v1|${sha}`) };
}

export async function verifierSceau(env: EnvParcours, dossier: unknown, sceau: string) {
  const s = await sceller(env, dossier);
  return egalTempsConstant(s.sceau, sceau);
}

const euros = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
const dateFr = (ms: number) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'medium', timeZone: 'Europe/Paris' }).format(new Date(ms));

/** Certificat de signature lisible (HTML autonome, imprimable). */
export function certificatHtml(p: DonneesPreuve, scelle: { dossierSha256: string; sceau: string }, imageDataUrl: string | null) {
  const d = p.document as { numero: string; titre: string; entreprise: { nom: string; siret: string | null }; varianteChoisie: { titre: string; totaux: { ht: number; tva: number; ttc: number } } };
  const ligne = (k: string, v: string) => `<tr><th>${echapper(k)}</th><td>${v}</td></tr>`;
  const textes = Object.values(p.textesAffiches).filter(Boolean).map((t) => `<li>${echapper(t)}</li>`).join('');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Certificat de signature · devis ${echapper(d.numero)}</title>
<style>body{font-family:Geist,Inter,Arial,sans-serif;color:#15122a;background:#f6f5fb;margin:0;padding:24px}main{max-width:760px;margin:auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 1px 0 #ececf1,0 8px 24px rgba(21,18,42,.06)}
h1{font-size:22px;margin:0 0 4px;letter-spacing:-.03em}p.sub{color:#5d5a72;margin:0 0 24px}table{width:100%;border-collapse:collapse;font-size:14px}th{text-align:left;color:#5d5a72;font-weight:500;width:40%;padding:8px 0;border-bottom:1px solid #ececf1;vertical-align:top}td{padding:8px 0;border-bottom:1px solid #ececf1;word-break:break-all}
code{font-family:'Geist Mono',ui-monospace,monospace;font-size:12px}img{max-width:280px;border:1px solid #ececf1;border-radius:8px;background:#fff}ul{padding-left:18px;color:#5d5a72;font-size:13px}footer{margin-top:24px;font-size:12px;color:#9794aa}@media print{body{background:#fff;padding:0}main{box-shadow:none}}</style></head>
<body><main><h1>Certificat de signature électronique</h1><p class="sub">Devis ${echapper(d.numero)} · ${echapper(d.titre)} · ${echapper(d.entreprise.nom)}</p>
<table>
${ligne('Signataire', echapper(p.signataire.nom))}
${ligne('Mention manuscrite', echapper(p.formule))}
${ligne('Signé le (heure de Paris)', echapper(dateFr(p.signeLe)))}
${ligne('Proposition acceptée', `${echapper(d.varianteChoisie.titre)} · ${echapper(euros(d.varianteChoisie.totaux.ttc))} TTC`)}
${ligne('Authentification', echapper(p.authentification.methode === 'code_sms' ? 'Code à usage unique envoyé par SMS' : p.authentification.methode === 'code_email' ? 'Code à usage unique envoyé par e-mail' : 'Prestataire de signature'))}
${ligne('Envoyé à', echapper(p.authentification.destinataire ?? 'non renseigné'))}
${ligne('Adresse IP', `<code>${echapper(p.contexte.ip)}</code>`)}
${ligne('Navigateur', `<code>${echapper(p.contexte.userAgent)}</code>`)}
${ligne('Empreinte du document (SHA-256)', `<code>${echapper(p.empreinte)}</code>`)}
${ligne('Empreinte du dossier de preuve', `<code>${echapper(scelle.dossierSha256)}</code>`)}
${ligne('Sceau Brix', `<code>${echapper(scelle.sceau)}</code>`)}
${p.retractation.applicable ? ligne('Fin du délai de rétractation', echapper(p.retractation.fin ? dateFr(p.retractation.fin) : 'non renseigné')) : ''}
${p.retractation.applicable ? ligne('Démarrage avant la fin du délai', p.consentements.demarrageAnticipe ? 'Demandé expressément par le client' : 'Non demandé') : ''}
${imageDataUrl ? ligne('Signature', `<img alt="Signature de ${echapper(p.signataire.nom)}" src="${imageDataUrl}">`) : ''}
</table>
<p class="sub" style="margin-top:20px">Textes acceptés par le signataire :</p><ul>${textes}</ul>
<footer>Référence de preuve ${echapper(p.preuveId)}. Pour vérifier qu'un devis n'a pas été modifié, recalculez l'empreinte SHA-256 de son contenu canonique (dossier.json) et comparez-la à celle ci-dessus. Document généré par Brix.</footer>
</main></body></html>`;
}

export const clesR2 = (orgId: string, devisId: string, preuveId: string) => {
  const base = `preuves/${orgId}/${devisId}/${preuveId}`;
  return { dossier: `${base}/dossier.json`, certificat: `${base}/certificat.html`, image: `${base}/signature.png`, pdf: `${base}/signe.pdf` };
};
