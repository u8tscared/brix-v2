// Blocs réutilisables du corps des e-mails (HTML en tables, styles en ligne).
// Toute donnée passe par esc() ; seuls les fragments HTML produits ici sont insérés tels quels.

import { C, MONO, POLICE } from './gabarit';
import { esc, escMultiligne, urlSure } from './outils';

export type Ton = 'ok' | 'alerte' | 'danger' | 'neutre';

const TONS: Record<Ton, { fond: string; texte: string; classe: string }> = {
  ok: { fond: C.okFond, texte: '#15803d', classe: 'bx-ok' },
  alerte: { fond: C.alerteFond, texte: C.alerte, classe: 'bx-alerte' },
  danger: { fond: C.dangerFond, texte: '#b91c1c', classe: 'bx-danger' },
  neutre: { fond: C.doux, texte: C.ink2, classe: 'bx-doux bx-ink2' },
};

export const surtitre = (t: string) =>
  `<div class="bx-ink3" style="font-size:12px;line-height:16px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:${C.ink3};padding-bottom:10px">${esc(t)}</div>`;

export const titre = (t: string) =>
  `<h1 class="bx-ink bx-h1" style="margin:0 0 14px;font-family:${POLICE};font-size:26px;line-height:1.25;font-weight:600;letter-spacing:-0.6px;color:${C.ink}">${esc(t)}</h1>`;

/** Paragraphe : le texte est échappé ; `html` permet d'y insérer des fragments déjà sûrs (strong, liens). */
export const para = (t: string, opts: { html?: boolean; bas?: number; haut?: number; taille?: number } = {}) =>
  `<p class="bx-ink2" style="margin:${opts.haut ?? 0}px 0 ${opts.bas ?? 16}px;font-size:${opts.taille ?? 15}px;line-height:1.6;color:${C.ink2}">${opts.html ? t : esc(t)}</p>`;

export const fort = (t: string) => `<strong class="bx-ink" style="color:${C.ink};font-weight:600">${esc(t)}</strong>`;

export const espace = (h: number) => `<div style="height:${h}px;line-height:${h}px;font-size:1px">&nbsp;</div>`;

/** Mot personnel de l'artisan, en citation. */
export function motPerso(texte: string | undefined, auteur: string): string {
  if (!texte || !texte.trim()) return '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 22px"><tr>
<td width="3" bgcolor="#e4def5" style="width:3px;background-color:#e4def5;border-radius:3px">&nbsp;</td>
<td style="padding:2px 0 2px 16px">
<div class="bx-ink" style="font-size:15px;line-height:1.6;color:${C.ink}">${escMultiligne(texte)}</div>
<div class="bx-ink3" style="font-size:13px;line-height:18px;color:${C.ink3};padding-top:6px">${esc(auteur)}</div>
</td></tr></table>`;
}

/** Pastille de statut (« En retard de 12 jours », « Meilleur prix reçu »). */
export function badge(t: string, ton: Ton = 'neutre'): string {
  const s = TONS[ton];
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table"><tr><td class="${s.classe}" bgcolor="${s.fond}" style="background-color:${s.fond};color:${s.texte};border-radius:999px;padding:5px 11px;font-size:12px;line-height:14px;font-weight:600;white-space:nowrap">${esc(t)}</td></tr></table>`;
}

export interface Ligne {
  libelle: string;
  valeur: string; // déjà mise en forme (montant, quantité)
  detail?: string;
  fort?: boolean;
  mono?: boolean;
}

/** Tableau libellé / valeur avec filets fins. */
export function lignes(ls: Ligne[], opts: { haut?: boolean } = {}): string {
  if (!ls.length) return '';
  const rows = ls
    .map((l, i) => {
      const bord = i === 0 && !opts.haut ? '' : `border-top:1px solid ${C.filet};`;
      const poids = l.fort ? 'font-weight:600;' : '';
      const couleur = l.fort ? C.ink : C.ink2;
      return `<tr>
<td class="bx-filet ${l.fort ? 'bx-ink' : 'bx-ink2'}" style="${bord}padding:11px 12px 11px 0;font-size:14px;line-height:20px;color:${couleur};${poids}">${esc(l.libelle)}${l.detail ? `<div class="bx-ink3" style="font-size:12px;line-height:17px;color:${C.ink3};font-weight:400">${esc(l.detail)}</div>` : ''}</td>
<td class="bx-filet bx-ink bx-num" align="right" valign="top" style="${bord}padding:11px 0;font-size:14px;line-height:20px;color:${C.ink};white-space:nowrap;${poids}${l.mono ? `font-family:${MONO};font-size:13px;` : ''}">${esc(l.valeur)}</td>
</tr>`;
    })
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>`;
}

/** Bouton « bulletproof » : cellule colorée (repli Outlook) + dégradé Aube ailleurs. Une seule action principale. */
export function bouton(libelle: string, url: string): string {
  const href = urlSure(url);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0"><tr>
<td align="center" bgcolor="${C.repli}" style="border-radius:12px;background-color:${C.repli};background-image:${C.aube};mso-padding-alt:16px 24px">
<!--[if mso]><a href="${href}" target="_blank" style="color:#ffffff;font-family:Segoe UI,Arial,sans-serif;font-size:16px;font-weight:600;text-decoration:none">${esc(libelle)}</a><![endif]-->
<!--[if !mso]><!--><a href="${href}" target="_blank" rel="noopener" style="display:block;padding:16px 24px;border-radius:12px;color:#ffffff;font-family:${POLICE};font-size:16px;line-height:20px;font-weight:600;text-decoration:none;letter-spacing:-0.1px">${esc(libelle)}&nbsp;&nbsp;&rarr;</a><!--<![endif]-->
</td></tr></table>`;
}

/** Lien de secours sous le bouton, pour les clients qui ne l'affichent pas. */
export function lienSecours(url: string): string {
  return `<div class="bx-ink3" style="font-size:12px;line-height:18px;color:${C.ink3};padding-top:12px;text-align:center">Le bouton ne s'affiche pas ? <a href="${urlSure(url)}" class="bx-lien" style="color:#6d28d9;word-break:break-all">Ouvrez ce lien</a></div>`;
}

/** Points de confiance (signature électronique, paiement sécurisé…), avec une coche dessinée. */
export function confiance(points: string[]): string {
  if (!points.length) return '';
  const rows = points
    .map(
      (p) => `<tr>
<td width="18" valign="top" style="padding:3px 0"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="16" height="16" align="center" valign="middle" class="bx-ok" bgcolor="${C.okFond}" style="width:16px;height:16px;border-radius:8px;background-color:${C.okFond};color:${C.ok};font-size:10px;line-height:16px;font-weight:700;mso-line-height-rule:exactly">&#10003;</td></tr></table></td>
<td class="bx-ink2" style="padding:3px 0 3px 10px;font-size:13px;line-height:20px;color:${C.ink2}">${esc(p)}</td>
</tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px">${rows}</table>`;
}

export interface Carte {
  etiquette: string; // « Devis D-2026-121 »
  titre?: string;
  montant: string; // « 4 374,81 € »
  sousMontant?: string; // « TTC · valable jusqu'au 17 décembre 2026 »
  badge?: { texte: string; ton: Ton };
  lignes?: Ligne[];
  apres?: string; // HTML sûr sous les lignes
}

/** Carte « document » : étiquette, titre, montant en grand, résumé. */
export function carteDocument(c: Carte): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.doux}" class="bx-doux" style="background-color:${C.doux};border:1px solid ${C.filet};border-radius:16px;border-collapse:separate;margin:6px 0 24px">
<tr><td style="padding:22px 22px 8px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td class="bx-ink3" style="font-size:12px;line-height:16px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:${C.ink3}">${esc(c.etiquette)}</td>
${c.badge ? `<td align="right">${badge(c.badge.texte, c.badge.ton)}</td>` : ''}
</tr></table>
${c.titre ? `<div class="bx-ink" style="font-size:16px;line-height:22px;font-weight:600;color:${C.ink};padding-top:8px">${esc(c.titre)}</div>` : ''}
<div class="bx-ink bx-montant bx-num" style="font-size:40px;line-height:46px;font-weight:600;letter-spacing:-1.4px;color:${C.ink};padding-top:14px">${esc(c.montant)}</div>
${c.sousMontant ? `<div class="bx-ink2" style="font-size:13px;line-height:18px;color:${C.ink2};padding-top:2px">${esc(c.sousMontant)}</div>` : ''}
</td></tr>
${c.lignes?.length ? `<tr><td style="padding:10px 22px 6px">${lignes(c.lignes, { haut: true })}</td></tr>` : ''}
${c.apres ? `<tr><td style="padding:4px 22px 18px">${c.apres}</td></tr>` : '<tr><td style="height:14px;line-height:14px;font-size:1px">&nbsp;</td></tr>'}
</table>`;
}

/** Encart d'information (prochaine étape, avertissement). */
export function encart(titreEncart: string, texte: string, ton: Ton = 'neutre'): string {
  const s = TONS[ton];
  const couleurTitre = ton === 'neutre' ? C.ink : s.texte;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px"><tr>
<td class="${ton === 'neutre' ? 'bx-doux' : s.classe}" bgcolor="${s.fond}" style="background-color:${s.fond};border-radius:14px;padding:16px 18px">
<div class="${ton === 'neutre' ? 'bx-ink' : ''}" style="font-size:14px;line-height:20px;font-weight:600;color:${couleurTitre}">${esc(titreEncart)}</div>
<div class="${ton === 'neutre' ? 'bx-ink2' : ''}" style="font-size:14px;line-height:21px;color:${ton === 'neutre' ? C.ink2 : s.texte};padding-top:3px">${esc(texte)}</div>
</td></tr></table>`;
}

/** Code à 6 chiffres, très lisible (groupes de 3, chasse fixe). */
export function blocCode(code: string, validite: string): string {
  const chiffres = String(code).replace(/\D/g, '').slice(0, 8);
  const groupe = chiffres.length === 6 ? `${chiffres.slice(0, 3)}&nbsp;${chiffres.slice(3)}` : esc(chiffres);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 22px;border-collapse:separate"><tr>
<td align="center" bgcolor="${C.doux}" class="bx-doux" style="background-color:${C.doux};border:1px solid ${C.filet};border-radius:16px;padding:26px 16px 22px">
<div class="bx-ink bx-code bx-num" style="font-family:${MONO};font-size:42px;line-height:48px;font-weight:500;letter-spacing:10px;color:${C.ink};padding-left:10px">${groupe}</div>
<div class="bx-ink3" style="font-size:13px;line-height:18px;color:${C.ink3};padding-top:10px">${esc(validite)}</div>
</td></tr></table>`;
}

/** Étapes numérotées (bienvenue, suite du chantier). */
export function etapes(liste: string[]): string {
  const rows = liste
    .map(
      (t, i) => `<tr>
<td width="28" valign="top" style="padding:8px 0"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="26" height="26" align="center" valign="middle" class="bx-pastille" bgcolor="${C.ink}" style="width:26px;height:26px;border-radius:13px;background-color:${C.ink};color:#ffffff;font-size:12px;font-weight:600;line-height:26px;mso-line-height-rule:exactly">${i + 1}</td></tr></table></td>
<td class="bx-ink" style="padding:10px 0 8px 12px;font-size:15px;line-height:22px;color:${C.ink}">${esc(t)}</td>
</tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:2px 0 24px">${rows}</table>`;
}

/** Signature de l'artisan en fin de message. */
export function signature(nom: string, entreprise: string): string {
  return `<div class="bx-ink2" style="font-size:15px;line-height:1.6;color:${C.ink2};padding-top:24px">Bien cordialement,<br><span class="bx-ink" style="color:${C.ink};font-weight:600">${esc(nom)}</span><br>${esc(entreprise)}</div>`;
}
