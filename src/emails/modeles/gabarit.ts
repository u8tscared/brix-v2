// Gabarit HTML des e-mails Brix : squelette 600 px en tables, styles en ligne, mode sombre, preheader caché.
// Compatible Gmail (web, iOS, Android), Outlook (bureau, web), Apple Mail. Aucune image obligatoire :
// la pastille de l'artisan et la tuile « B » sont dessinées en cellules colorées, donc visibles même
// quand le client mail bloque les images (Outlook et Gmail le font souvent pour un premier expéditeur).

import type { Emetteur } from '../types';
import { esc, initiales, urlSure } from './outils';

export const C = {
  page: '#f4f3fa',
  carte: '#ffffff',
  doux: '#f8f7fc',
  ink: '#130f26',
  ink2: '#5f5f70',
  ink3: '#9898a8',
  filet: '#ececf1',
  ok: '#16a34a',
  okFond: '#ecfdf3',
  alerte: '#b45309',
  alerteFond: '#fff7e8',
  danger: '#dc2626',
  dangerFond: '#fef2f2',
  repli: '#c026d3', // couleur pleine du bouton quand le dégradé n'est pas pris en charge (Outlook bureau)
  aube: 'linear-gradient(110deg,#6d28d9 0%,#c026d3 55%,#f97316 100%)',
};

export const POLICE = "'Geist','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
export const MONO = "'Geist Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,'Courier New',monospace";

export type Marque = { type: 'artisan'; emetteur: Emetteur } | { type: 'brix' };

export interface Mise {
  titre: string; // <title>
  preheader: string;
  marque: Marque;
  corps: string; // HTML de la carte principale
  aide?: string; // HTML sous la carte (contact, réponse)
  mentions?: string; // HTML légal discret
}

// Classes reprises en mode sombre (Apple Mail, Outlook.com via [data-ogsc]/[data-ogsb], Gmail ignore et inverse lui-même).
const STYLE = `
:root{color-scheme:light dark;supported-color-schemes:light dark}
body{margin:0!important;padding:0!important;width:100%!important;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0}
img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic}
a{color:#6d28d9}
a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important}
.bx-num{font-variant-numeric:tabular-nums}
@media only screen and (max-width:620px){
  .bx-w{width:100%!important;max-width:100%!important}
  .bx-pad{padding:28px 22px!important}
  .bx-padx{padding-left:22px!important;padding-right:22px!important}
  .bx-montant{font-size:34px!important}
  .bx-h1{font-size:23px!important}
  .bx-code{font-size:34px!important;letter-spacing:6px!important}
  .bx-cache-mobile{display:none!important}
}
@media (prefers-color-scheme:dark){
  .bx-page{background-color:#0d0b18!important}
  .bx-carte{background-color:#17142a!important;border-color:#2a2640!important}
  .bx-doux{background-color:#1f1b35!important;border-color:#2e2a47!important}
  .bx-ink{color:#f4f3fa!important}
  .bx-ink2{color:#b9b7c8!important}
  .bx-ink3{color:#8a879c!important}
  .bx-filet{border-color:#2a2640!important}
  .bx-pastille{background-color:#f4f3fa!important;color:#130f26!important}
  .bx-ok{background-color:#10291b!important;color:#4ade80!important}
  .bx-alerte{background-color:#2e2110!important;color:#fbbf24!important}
  .bx-danger{background-color:#2e1214!important;color:#f87171!important}
  .bx-lien{color:#c4b5fd!important}
}
[data-ogsb] .bx-page{background-color:#0d0b18!important}
[data-ogsb] .bx-carte{background-color:#17142a!important}
[data-ogsb] .bx-doux{background-color:#1f1b35!important}
[data-ogsc] .bx-ink{color:#f4f3fa!important}
[data-ogsc] .bx-ink2{color:#b9b7c8!important}
[data-ogsc] .bx-ink3{color:#8a879c!important}
`;

/** Remplissage invisible après le preheader : empêche Gmail d'y coller le début du corps. */
const BOURRE = '&#8199;&#65279;&#847; '.repeat(60);

function entete(m: Marque): string {
  if (m.type === 'brix') {
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td>${tuileB(30, 9)}</td>
<td style="padding-left:10px;font-family:${POLICE};font-size:20px;line-height:20px;font-weight:600;letter-spacing:-0.5px;color:${C.ink}" class="bx-ink">Brix</td>
</tr></table>`;
  }
  const e = m.emetteur;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="42" height="42" align="center" valign="middle" bgcolor="${C.ink}" class="bx-pastille" style="width:42px;height:42px;border-radius:12px;background-color:${C.ink};color:#ffffff;font-family:${POLICE};font-size:14px;font-weight:600;letter-spacing:0.5px;mso-line-height-rule:exactly;line-height:42px">${esc(initiales(e.initiales))}</td>
<td style="padding-left:12px;font-family:${POLICE}">
<div class="bx-ink" style="font-size:15px;line-height:20px;font-weight:600;color:${C.ink}">${esc(e.entreprise)}</div>
<div class="bx-ink2" style="font-size:13px;line-height:18px;color:${C.ink2}">${esc(e.prenom)} ${esc(e.nom)}${e.ville ? ` · ${esc(e.ville)}` : ''}</div>
</td></tr></table>`;
}

/** Tuile « B » dessinée en cellule : couleur pleine + dégradé quand le client le prend en charge. */
export function tuileB(taille: number, rayon: number): string {
  const fs = Math.round(taille * 0.6);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="${taille}" height="${taille}" align="center" valign="middle" bgcolor="${C.repli}" style="width:${taille}px;height:${taille}px;border-radius:${rayon}px;background-color:${C.repli};background-image:linear-gradient(135deg,#6d28d9 0%,#d946ef 62%,#fb923c 100%);color:#ffffff;font-family:${POLICE};font-size:${fs}px;font-weight:700;mso-line-height-rule:exactly;line-height:${taille}px;letter-spacing:-0.5px">B</td></tr></table>`;
}

function pied(m: Mise): string {
  return `<tr><td class="bx-padx" style="padding:28px 40px 0;font-family:${POLICE}">
${m.aide ? `<div class="bx-ink2" style="font-size:14px;line-height:22px;color:${C.ink2};padding-bottom:22px">${m.aide}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="bx-filet" style="border-top:1px solid ${C.filet};padding-top:20px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle">${tuileB(18, 5)}</td>
<td valign="middle" class="bx-ink3" style="padding-left:8px;font-size:12px;line-height:16px;color:${C.ink3}">Envoyé avec <a href="https://brix-app.fr" class="bx-ink3" style="color:${C.ink3};text-decoration:underline">Brix</a>, le logiciel des artisans</td>
</tr></table>
${m.mentions ? `<div class="bx-ink3" style="font-size:11px;line-height:17px;color:${C.ink3};padding-top:10px">${m.mentions}</div>` : ''}
</td></tr></table>
</td></tr>`;
}

/** Assemble le document HTML complet. */
export function documentHtml(m: Mise): string {
  return `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(m.titre)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>td,a,div,p,span{font-family:Segoe UI,Arial,sans-serif!important}</style><![endif]-->
<style>@import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@500&display=swap');${STYLE}</style>
</head>
<body class="bx-page" style="margin:0;padding:0;background-color:${C.page};word-spacing:normal">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;color:${C.page}">${esc(m.preheader)}${BOURRE}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" class="bx-page" style="background-color:${C.page}">
<tr><td align="center" style="padding:32px 12px 40px">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="bx-w" style="width:600px;max-width:600px">
<tr><td class="bx-padx" style="padding:0 40px 22px">${entete(m.marque)}</td></tr>
<tr><td>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.carte}" class="bx-carte" style="background-color:${C.carte};border:1px solid ${C.filet};border-radius:20px;border-collapse:separate">
<tr><td class="bx-pad" style="padding:40px;font-family:${POLICE};color:${C.ink}">${m.corps}</td></tr>
</table>
</td></tr>
${pied(m)}
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>`;
}

/** Lien de contact (téléphone, e-mail) de l'artisan, pour le bas de l'e-mail client. */
export function aideArtisan(e: Emetteur): string {
  const tel = e.telephone ? `<a href="tel:${esc(e.telephone.replace(/[^\d+]/g, ''))}" class="bx-lien" style="color:#6d28d9;text-decoration:none;font-weight:500;white-space:nowrap">${esc(e.telephone)}</a>` : '';
  return `Une question ? Répondez simplement à cet e-mail, il arrive directement chez ${esc(e.prenom)}${tel ? `, ou appelez le ${tel}` : ''}.`;
}

export function mentionsArtisan(e: Emetteur): string {
  return [e.entreprise, e.ville, e.siret ? `SIRET ${e.siret}` : ''].filter(Boolean).map(esc).join(' · ');
}

export { urlSure };
