/**
 * Variables d'environnement des parcours externes (documents, signature, paiements, notifications).
 * Elles sont aussi à ajouter dans worker/src/env.ts (voir docs/parcours/README.md) ; en attendant,
 * les modules lisent l'Env commun via ce type élargi. Toutes sont optionnelles : sans clé, le module
 * concerné passe en mode simulation.
 */
import type { Env } from '../../env';

export interface EnvParcours extends Env {
  /** Secret HMAC des liens publics /d/, /f/, /p/ (32 octets aléatoires ou plus). */
  PUBLIC_LINK_SECRET?: string;
  /** Base des liens envoyés aux clients (ex. https://brix-app.fr). Défaut : APP_ORIGIN. */
  PUBLIC_BASE_URL?: string;
  /** '1' : renvoie le code de signature dans la réponse quand l'envoi est simulé (démo uniquement). */
  PARCOURS_DEMO?: string;

  // Signature
  SIGNATURE_PROVIDER?: string; // 'brix' (défaut) | 'yousign'
  YOUSIGN_API_KEY?: string;
  YOUSIGN_BASE_URL?: string; // https://api-sandbox.yousign.app/v3 (test) ou https://api.yousign.app/v3
  YOUSIGN_WEBHOOK_SECRET?: string;
  YOUSIGN_SIGNATURE_LEVEL?: string; // electronic_signature | advanced_electronic_signature | qualified_electronic_signature

  // SMS (code de signature)
  SMS_PROVIDER?: string; // 'brevo' | 'twilio'
  SMS_SENDER?: string; // nom d'expéditeur (11 caractères max) ou numéro
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_FROM?: string;

  // Paiements
  STRIPE_WEBHOOK_SECRET?: string; // point de terminaison « Votre compte » (paiements)
  STRIPE_CONNECT_WEBHOOK_SECRET?: string; // point de terminaison « Comptes connectés » (account.updated)
  STRIPE_PLATFORM_FEE_BPS?: string; // commission Brix en points de base (100 = 1 %)
  ALMA_API_KEY?: string;
  ALMA_BASE_URL?: string; // https://api.sandbox.getalma.eu ou https://api.getalma.eu

  // Notifications
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string; // mailto:contact@brix-app.fr
  APNS_KEY_ID?: string;
  APNS_TEAM_ID?: string;
  APNS_PRIVATE_KEY?: string; // contenu du fichier .p8
  APNS_BUNDLE_ID?: string;
  APNS_SANDBOX?: string; // '1' en développement
  FCM_SERVICE_ACCOUNT_JSON?: string;
}

export const asParcours = (env: Env) => env as EnvParcours;
