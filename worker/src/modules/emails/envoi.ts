// Envoi d'un e-mail transactionnel depuis le worker.
// Fournisseur choisi par l'environnement : BREVO_API_KEY → Brevo, sinon RESEND_API_KEY → Resend,
// sinon simulation (rien ne part, l'envoi est journalisé). Le rendu vient de src/emails (mêmes modèles que l'app).

import type { Env } from '../../env';
import type { DonneesEmail, ModeleEmail, RenduEmail } from '../../../../src/emails/types';
import { PUBLIC_MODELE, rendreEmail } from '../../../../src/emails/index';
import { asEnv, expediteur, fournisseurActif, type Fournisseur } from './config';
import { signerDesinscription } from './securite';

export interface EnvoiEmail<M extends ModeleEmail = ModeleEmail> {
  modele: M;
  donnees: DonneesEmail[M];
  a: string; // adresse du destinataire
  nomA?: string;
  repondreA?: string; // adresse de l'artisan, pour que le client réponde directement (par défaut : emetteur.email)
  deNom?: string; // « Karim Benali · Benali Électricité »
  reference?: string; // document lié (D-2026-121), repris dans les tags et le journal
}

export interface ResultatEnvoi {
  id: string; // id du fournisseur (ou sim_… en simulation)
  simule: boolean;
  envoye: boolean;
  fournisseur: Fournisseur;
  erreur?: string;
}

const RELANCES: ModeleEmail[] = ['devis_relance', 'facture_relance'];
const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

/** Nom d'expéditeur sans caractères qui casseraient l'en-tête From. */
const nomPropre = (s: string | undefined) => (s ?? '').replace(/[\r\n"<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 70);

/** Tag compatible Resend (ASCII, chiffres, _ et -). */
const tag = (s: string) => s.normalize('NFD').replace(/[^\w-]/g, '_').slice(0, 256);

function emetteurDe(d: unknown): { email?: string; nom?: string } {
  const e = (d as { emetteur?: { email?: string; prenom?: string; nom?: string; entreprise?: string } }).emetteur;
  if (!e) return {};
  return { email: e.email, nom: [`${e.prenom ?? ''} ${e.nom ?? ''}`.trim(), e.entreprise].filter(Boolean).join(' · ') };
}

/** En-têtes List-Unsubscribe (désinscription en un clic, RFC 8058) pour les relances seulement. */
async function entetesRelance(env: Env, e: EnvoiEmail): Promise<Record<string, string>> {
  if (!RELANCES.includes(e.modele)) return {};
  const ref = e.reference ?? (e.donnees as { numero?: string }).numero ?? '';
  const base = (env.APP_ORIGIN || 'https://app.brix-app.fr').replace(/\/$/, '');
  const sig = await signerDesinscription(env.JWT_SECRET || 'brix', e.a, ref);
  const url = `${base}/api/emails/desinscription?a=${encodeURIComponent(e.a)}&r=${encodeURIComponent(ref)}&s=${sig}`;
  return {
    'List-Unsubscribe': `<${url}>, <mailto:${expediteur(env)}?subject=${encodeURIComponent(`Stop relances ${ref}`)}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

async function viaBrevo(env: Env, e: EnvoiEmail, r: RenduEmail, deNom: string, repondreA: string | undefined, entetes: Record<string, string>, tags: string[]): Promise<ResultatEnvoi> {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': asEnv(env).BREVO_API_KEY!, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: deNom, email: expediteur(env) },
      to: [{ email: e.a, ...(e.nomA ? { name: nomPropre(e.nomA) } : {}) }],
      ...(repondreA ? { replyTo: { email: repondreA } } : {}),
      subject: r.sujet,
      htmlContent: r.html,
      textContent: r.texte,
      headers: { ...entetes, 'X-Brix-Modele': e.modele },
      tags,
    }),
  });
  if (!res.ok) return { id: '', simule: false, envoye: false, fournisseur: 'brevo', erreur: `Brevo ${res.status} ${(await res.text()).slice(0, 200)}` };
  const body = (await res.json()) as { messageId?: string };
  return { id: body.messageId ?? '', simule: false, envoye: true, fournisseur: 'brevo' };
}

async function viaResend(env: Env, e: EnvoiEmail, r: RenduEmail, deNom: string, repondreA: string | undefined, entetes: Record<string, string>, tags: string[]): Promise<ResultatEnvoi> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${asEnv(env).RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: `${deNom} <${expediteur(env)}>`,
      to: [e.nomA ? `${nomPropre(e.nomA)} <${e.a}>` : e.a],
      ...(repondreA ? { reply_to: repondreA } : {}),
      subject: r.sujet,
      html: r.html,
      text: r.texte,
      headers: { ...entetes, 'X-Brix-Modele': e.modele },
      tags: tags.map((t) => {
        const [name, ...v] = t.split(':');
        return { name: tag(name), value: tag(v.join(':') || 'oui') };
      }),
    }),
  });
  if (!res.ok) return { id: '', simule: false, envoye: false, fournisseur: 'resend', erreur: `Resend ${res.status} ${(await res.text()).slice(0, 200)}` };
  const body = (await res.json()) as { id?: string };
  return { id: body.id ?? '', simule: false, envoye: true, fournisseur: 'resend' };
}

/** Journal D1 (best effort : un échec de journal ne bloque jamais l'envoi). */
async function journaliser(env: Env, e: EnvoiEmail, r: RenduEmail, res: ResultatEnvoi): Promise<void> {
  if (!env.DB) return;
  try {
    await env.DB.prepare(
      'INSERT INTO email_envois (id, message_id, fournisseur, modele, destinataire, sujet, reference, statut, erreur) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(`env_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`, res.simule ? null : res.id || null, res.fournisseur, e.modele, e.a, r.sujet, e.reference ?? null, res.simule ? 'simule' : res.envoye ? 'envoye' : 'echec', res.erreur ?? null)
      .run();
  } catch (err) {
    console.warn('[emails] journal indisponible', err instanceof Error ? err.message : err);
  }
}

export async function envoyerEmail<M extends ModeleEmail>(env: Env, e: EnvoiEmail<M>): Promise<ResultatEnvoi> {
  const fournisseur = fournisseurActif(env);
  if (!EMAIL_RE.test(e.a)) return { id: '', simule: false, envoye: false, fournisseur, erreur: 'Adresse du destinataire invalide' };
  const r = rendreEmail(e.modele, e.donnees);
  const em = emetteurDe(e.donnees);
  const deNom = nomPropre(e.deNom || em.nom || asEnv(env).EMAIL_FROM_NAME || 'Brix') || 'Brix';
  const repondreA = [e.repondreA, em.email].find((x) => x && EMAIL_RE.test(x));
  const ref = e.reference ?? (e.donnees as { numero?: string; reference?: string }).numero ?? (e.donnees as { reference?: string }).reference;
  const tags = [`modele:${e.modele}`, `public:${PUBLIC_MODELE[e.modele]}`, ...(ref ? [`doc:${tag(ref)}`] : [])];
  const entetes = await entetesRelance(env, { ...e, reference: ref } as EnvoiEmail);

  let res: ResultatEnvoi;
  try {
    if (fournisseur === 'brevo') res = await viaBrevo(env, e as EnvoiEmail, r, deNom, repondreA, entetes, tags);
    else if (fournisseur === 'resend') res = await viaResend(env, e as EnvoiEmail, r, deNom, repondreA, entetes, tags);
    else {
      console.log('[email simulé]', JSON.stringify({ a: e.a, modele: e.modele, sujet: r.sujet, repondreA, tags }));
      res = { id: `sim_${Date.now().toString(36)}`, simule: true, envoye: false, fournisseur };
    }
  } catch (err) {
    res = { id: '', simule: false, envoye: false, fournisseur, erreur: err instanceof Error ? err.message : 'Erreur réseau' };
  }
  if (res.erreur) console.error('[emails] échec', e.modele, res.erreur);
  await journaliser(env, { ...e, reference: ref } as EnvoiEmail, r, res);
  return res;
}
