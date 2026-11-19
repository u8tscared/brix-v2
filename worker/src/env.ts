/// <reference types="@cloudflare/workers-types" />

export interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  ASSETS?: Fetcher;
  JWT_SECRET: string;
  APP_ORIGIN: string;
  // Clés à fournir plus tard (wrangler secret put …)
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  BREVO_API_KEY?: string;
  PDP_API_KEY?: string; // plateforme agréée (facture électronique)
  PDP_BASE_URL?: string;
  BRIDGE_CLIENT_ID?: string; // agrégation bancaire
  BRIDGE_CLIENT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  // Parcours externes (liens publics, signature, paiements, notifications) : voir docs/parcours/README.md
  PUBLIC_LINK_SECRET?: string;
  PUBLIC_BASE_URL?: string;
  PARCOURS_DEMO?: string;
  SIGNATURE_PROVIDER?: string;
  YOUSIGN_API_KEY?: string;
  YOUSIGN_BASE_URL?: string;
  YOUSIGN_WEBHOOK_SECRET?: string;
  YOUSIGN_SIGNATURE_LEVEL?: string;
  SMS_PROVIDER?: string;
  SMS_SENDER?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_FROM?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_CONNECT_WEBHOOK_SECRET?: string;
  STRIPE_PLATFORM_FEE_BPS?: string;
  ALMA_API_KEY?: string;
  ALMA_BASE_URL?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  APNS_KEY_ID?: string;
  APNS_TEAM_ID?: string;
  APNS_PRIVATE_KEY?: string;
  APNS_BUNDLE_ID?: string;
  APNS_SANDBOX?: string;
  FCM_SERVICE_ACCOUNT_JSON?: string;
  // E-mails (Brevo ou Resend)
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_FROM_NAME?: string;
  EMAIL_WEBHOOK_SECRET?: string;
  ENVIRONMENT?: string;
  // Brix AI MCP : jeton de vérification de domaine OpenAI (/.well-known/openai-apps-challenge)
  OPENAI_APPS_CHALLENGE?: string;
}
