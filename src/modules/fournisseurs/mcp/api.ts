// Appels du worker pour Brix AI MCP (worker/src/modules/mcp/routes.ts). Session Brix requise.
import { api } from '@/lib/api';

export interface Acces {
  id: string; // g_… (assistant relié par OAuth) ou j_… (jeton personnel)
  type: 'oauth' | 'jeton';
  nom: string;
  hote: string | null;
  prefixe?: string;
  ecriture: boolean;
  cree_le: number;
  derniere_utilisation: number | null;
  nb_appels?: number;
}

export interface LigneJournal {
  id: string;
  client_label: string;
  outil: string;
  resume: string;
  ok: boolean;
  at: number;
}

export interface DemandeAutorisation {
  id: string;
  client: { nom: string; nom_declare: string; hote: string | null; connu: boolean; inscription: 'dcr' | 'cimd'; boucle_locale: boolean };
  redirection: { hote: string; schema: string };
  ecriture_demandee: boolean;
  entreprise: string | null;
  peut_autoriser: boolean;
  relier_actif: boolean;
  expire_le: number;
}

export const lireReglages = () => api<{ actif: boolean; url_serveur: string }>('/api/mcp/reglages');
export const ecrireReglages = (actif: boolean) => api<{ actif: boolean }>('/api/mcp/reglages', { body: { actif } });
export const listerAcces = () => api<{ acces: Acces[] }>('/api/mcp/acces').then((r) => r.acces);
export const couperAcces = (id: string) => api<{ ok: true }>(`/api/mcp/acces/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const lireJournal = () => api<{ journal: LigneJournal[] }>('/api/mcp/journal?limite=30').then((r) => r.journal);
export const creerJetonPersonnel = (nom: string, ecriture: boolean) =>
  api<{ id: string; jeton: string; nom: string; url_serveur: string; url_avec_jeton: string }>('/api/mcp/jetons', { body: { nom, ecriture } });

export const lireDemande = (id: string) => api<DemandeAutorisation>(`/api/mcp/oauth/demande/${encodeURIComponent(id)}`);
export const approuverDemande = (id: string, ecriture: boolean) => api<{ redirect: string }>(`/api/mcp/oauth/demande/${encodeURIComponent(id)}/approuver`, { body: { ecriture } });
export const refuserDemande = (id: string) => api<{ redirect: string }>(`/api/mcp/oauth/demande/${encodeURIComponent(id)}/refuser`, { body: {} });

/** Adresse unique à coller dans l'assistant : la même pour tout le monde, sans secret. */
export const urlServeur = () => `${typeof location !== 'undefined' ? location.origin : 'https://app.brix-app.fr'}/api/mcp`;
