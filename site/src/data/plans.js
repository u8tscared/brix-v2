/* Offres Brix V2, fixées avec le fil app le 16/11/2026. Prix HT. Annuel : 2 mois offerts. */
export const PLAN_LIST = [
  {
    id: 'start', name: 'Start', monthly: 0, for: 'Pour démarrer seul, sans rien payer.',
    cta: 'Commencer gratuitement', ctaHref: 'demarrer.html?offre=start',
    lead: 'Gratuit pour toujours',
    items: ['5 devis et 5 factures par mois', 'Facture électronique conforme', 'Signature électronique', 'Clients et chantiers illimités', 'Photos, rapports et documents', 'Export vers votre comptable'],
  },
  {
    id: 'pro', name: 'Pro', monthly: 29.99, for: "Pour l’artisan seul qui veut tout.",
    cta: 'Essayer Pro', ctaHref: 'demarrer.html?offre=pro',
    lead: 'Tout Start, sans limite, plus :',
    items: ['Bob inclus (quota mensuel), devis photo et vidéo', 'Relances, paiement en ligne et Tap to Pay', 'Demandes de prix et commandes fournisseurs', 'Rentabilité par chantier en direct', 'Prise de cotes, stock et outils de votre métier', 'Site vitrine et avis Google'],
    note: '1 utilisateur · Brix AI MCP en option à 9 € par mois',
  },
  {
    id: 'equipe', name: 'Équipe', monthly: 69, for: 'Pour les entreprises avec des compagnons.', tag: 'Le plus complet',
    cta: 'Essayer Équipe', ctaHref: 'demarrer.html?offre=equipe', hi: true,
    lead: 'Tout Pro, plus :',
    items: ['5 utilisateurs inclus, puis 9 € par personne et par mois', 'Planning, pointage, congés et habilitations', 'Variables de paie pour votre cabinet', 'Stocks, véhicules et sous-traitants', 'Bob illimité, agent de nuit et secrétaire téléphonique', 'Brix AI MCP inclus'],
  },
  {
    id: 'entreprise', name: 'Entreprise', monthly: null, for: 'Pour les agences et les groupes.',
    cta: 'Parler à un conseiller', ctaHref: 'mailto:contact@brix-app.fr?subject=Brix%20Entreprise',
    lead: 'Tout Équipe, plus :',
    items: ['Plusieurs agences et sociétés', 'Circuits de validation des achats et devis', 'Connexion unique (SSO) et droits fins', 'API et intégrations sur mesure', 'Interlocuteur dédié et formation sur site'],
  },
];

export const EXTRA_USER = 9;
export const TEAM_INCLUDED = 5;
export const MCP_ADDON = 9;
export const annualMonthly = (m) => Math.round(((m * 10) / 12) * 100) / 100;

/* Recommandation selon le nombre d'utilisateurs (simulateur) */
export function simulate(n) {
  if (n <= 1) return { plan: 'Pro', total: 29.99 };
  if (n >= 50) return { plan: "Entreprise", total: null };
  return { plan: 'Équipe', total: 69 + Math.max(0, n - TEAM_INCLUDED) * EXTRA_USER };
}
