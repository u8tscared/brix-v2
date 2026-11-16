/**
 * Envoi des e-mails aux fournisseurs.
 *
 * Réel : si BREVO_API_KEY est configurée (wrangler secret put BREVO_API_KEY), l'e-mail part via
 * l'API Brevo depuis achats@brix-app.fr (domaine à authentifier chez Brevo). Sinon (préproduction, démo)
 * l'e-mail est « simulé » : il n'est pas
 * envoyé, son contenu est conservé dans le journal pour être affiché dans l'app.
 * Pour brancher le relais SMTP/IMAP de la V1 à la place, il suffit de remplacer `envoyer`.
 */

import type { Env } from '../../env';
import { escapeHtml } from './util';

export interface EmailSortant {
  to: string;
  replyTo?: string | null;
  subject: string;
  html: string;
  text: string;
  attachments?: { filename: string; content: string; contentType: string }[]; // content en texte brut
}

export interface ResultatEnvoi {
  envoye: boolean;
  simule: boolean;
  id?: string;
  erreur?: string;
}

/** Brevo (ex-Sendinblue) : la clé BREVO_API_KEY est prévue dans worker/src/env.ts. */
export async function envoyerEmail(env: Env, mail: EmailSortant): Promise<ResultatEnvoi> {
  if (!env.BREVO_API_KEY) return { envoye: false, simule: true };
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Brix', email: 'achats@brix-app.fr' },
        to: [{ email: mail.to }],
        replyTo: mail.replyTo ? { email: mail.replyTo } : undefined,
        subject: mail.subject,
        htmlContent: mail.html,
        textContent: mail.text,
        attachment: mail.attachments?.map((a) => ({ name: a.filename, content: btoa(unescape(encodeURIComponent(a.content))) })),
      }),
    });
    if (!res.ok) return { envoye: false, simule: false, erreur: `Brevo ${res.status}` };
    const body = (await res.json()) as { messageId?: string };
    return { envoye: true, simule: false, id: body.messageId };
  } catch (err) {
    return { envoye: false, simule: false, erreur: err instanceof Error ? err.message : 'Erreur réseau' };
  }
}

/** Gabarit e-mail sobre (clair, lisible sur téléphone, compatible clients mail). */
export function gabaritEmail(opts: {
  titre: string;
  intro: string;
  lignes?: { designation: string; quantite: string }[];
  bouton: { libelle: string; url: string };
  pied: string;
}): { html: string; text: string } {
  const rows = (opts.lignes ?? [])
    .map(
      (l) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #e9e5f4;color:#130f26">${escapeHtml(l.designation)}</td><td style="padding:8px 0;border-bottom:1px solid #e9e5f4;text-align:right;color:#5f5a7a;white-space:nowrap">${escapeHtml(l.quantite)}</td></tr>`,
    )
    .join('');
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#f7f5fc;font-family:Inter,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:16px;border:1px solid #e9e5f4" cellpadding="0" cellspacing="0">
<tr><td style="padding:28px 28px 8px"><div style="font-weight:700;font-size:20px;color:#6d28d9">Brix</div></td></tr>
<tr><td style="padding:8px 28px"><h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#130f26">${escapeHtml(opts.titre)}</h1>
<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#2a2450">${escapeHtml(opts.intro).replace(/\n/g, '<br>')}</p>
${rows ? `<table role="presentation" width="100%" style="font-size:14px;margin:0 0 20px" cellpadding="0" cellspacing="0">${rows}</table>` : ''}
<a href="${escapeHtml(opts.bouton.url)}" style="display:inline-block;background:#6d28d9;color:#fff;text-decoration:none;font-weight:600;padding:14px 22px;border-radius:12px;font-size:15px">${escapeHtml(opts.bouton.libelle)}</a>
<p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#9a95b3">${escapeHtml(opts.pied)}</p></td></tr>
<tr><td style="padding:20px 28px 28px;font-size:12px;color:#9a95b3">Envoyé avec Brix, le logiciel des artisans. Pas besoin de compte pour répondre.</td></tr>
</table></td></tr></table></body></html>`;
  const text = [
    opts.titre,
    '',
    opts.intro,
    '',
    ...(opts.lignes ?? []).map((l) => `- ${l.designation} : ${l.quantite}`),
    '',
    `${opts.bouton.libelle} : ${opts.bouton.url}`,
    '',
    opts.pied,
  ].join('\n');
  return { html, text };
}
