// Variables d'environnement du module e-mails (en plus de worker/src/env.ts, à y reporter).
import type { Env } from '../../env';

export interface EnvEmails extends Env {
  BREVO_API_KEY?: string; // déjà dans Env
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string; // « devis@brix-app.fr » (domaine authentifié SPF/DKIM/DMARC chez le fournisseur)
  EMAIL_FROM_NAME?: string; // nom par défaut si l'envoi n'en donne pas : « Brix »
  EMAIL_WEBHOOK_SECRET?: string; // Brevo : secret partagé (en-tête ou Basic) ; Resend : « whsec_… » (Svix)
  ENVIRONMENT?: string; // « production » en prod
}

export type Fournisseur = 'brevo' | 'resend' | 'simulation';

export const asEnv = (env: Env) => env as EnvEmails;

/** Brevo d'abord (déjà prévu dans Env), sinon Resend, sinon simulation journalisée. */
export function fournisseurActif(env: Env): Fournisseur {
  const e = asEnv(env);
  if (e.BREVO_API_KEY) return 'brevo';
  if (e.RESEND_API_KEY) return 'resend';
  return 'simulation';
}

export const expediteur = (env: Env) => asEnv(env).EMAIL_FROM || 'devis@brix-app.fr';

/** Aperçu des modèles : seulement en local ou hors production. */
export function apercuAutorise(env: Env): boolean {
  const e = asEnv(env);
  return (e.APP_ORIGIN ?? '').startsWith('http://localhost') || e.ENVIRONMENT !== 'production';
}
