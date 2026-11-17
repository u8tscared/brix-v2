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
}
