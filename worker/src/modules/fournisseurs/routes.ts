/**
 * Routes /api/fournisseurs/* (artisan connecté) et /api/fournisseurs/portail/* (fournisseur, sans compte).
 * Retourne null si la route ne correspond pas (convention du projet).
 */

import type { Env } from '../../env';
import { requireAuth } from '../../lib/auth';
import { HttpError as CoreHttpError, json } from '../../lib/http';
import { FournisseursService } from './handlers';
import { declinerPortail, lirePortail, repondrePortail, statutPortail } from './portail';
import { HttpError } from './util';

type Handler = (p: Record<string, string>, body: any, url: URL) => Promise<unknown>;

function route(method: string, pattern: string, handler: Handler) {
  const keys: string[] = [];
  const re = new RegExp(
    '^' + pattern.replace(/:([a-z_]+)/g, (_, k) => (keys.push(k), '([A-Za-z0-9_-]+)')) + '$',
  );
  return { method, re, keys, handler };
}

export function erreurEnReponse(err: unknown): Response {
  if (err instanceof Response) return err;
  if (err instanceof HttpError) return json({ error: err.code, message: err.message }, err.status);
  if (err instanceof CoreHttpError) return json({ error: err.message, message: err.message }, err.status);
  if (err instanceof SyntaxError) return json({ error: 'json_invalide', message: 'Corps de requête JSON invalide' }, 400);
  console.error('[fournisseurs]', err);
  return json({ error: 'erreur_interne', message: 'Une erreur est survenue, réessayez dans un instant' }, 500);
}

async function lireCorps(request: Request): Promise<any> {
  if (request.method === 'GET' || request.method === 'DELETE') return {};
  const text = await request.text();
  if (text.length > 5_000_000) throw new HttpError(413, 'trop_gros', 'Requête trop volumineuse (5 Mo max)');
  return text ? JSON.parse(text) : {};
}

export async function handleFournisseursRoutes(request: Request, env: Env, pathname: string): Promise<Response | null> {
  if (!pathname.startsWith('/api/fournisseurs')) return null;
  const url = new URL(request.url);

  try {
    // ---------- Portail fournisseur (public, protégé par jeton) ----------
    const mPortail = pathname.match(/^\/api\/fournisseurs\/portail\/([A-Za-z0-9_-]+)(?:\/(reponse|decliner|statut))?$/);
    if (mPortail) {
      const [, token, action] = mPortail;
      const body = await lireCorps(request);
      if (!action && request.method === 'GET') return json(await lirePortail(env, token));
      if (action === 'reponse' && request.method === 'POST') return json(await repondrePortail(env, token, body));
      if (action === 'decliner' && request.method === 'POST') return json(await declinerPortail(env, token, body?.motif ?? null));
      if (action === 'statut' && request.method === 'POST') return json(await statutPortail(env, token, body));
      return null;
    }

    // ---------- Espace artisan ----------
    const auth = await requireAuth(request, env);
    const s = new FournisseursService(env, { organizationId: auth.organizationId, userId: auth.userId });
    const q = (u: URL, k: string) => u.searchParams.get(k) ?? undefined;

    const ROUTES = [
      route('GET', '/api/fournisseurs/tableau-de-bord', () => s.tableauDeBord()),
      route('GET', '/api/fournisseurs/connecteurs', async () => s.connecteurs()),
      route('POST', '/api/fournisseurs/demo', () => s.demo()),

      route('GET', '/api/fournisseurs/annuaire', (_p, _b, u) => s.listerFournisseurs({ metier: q(u, 'metier'), q: q(u, 'q') })),
      route('POST', '/api/fournisseurs/annuaire', (_p, b) => s.creerFournisseur(b)),
      route('PATCH', '/api/fournisseurs/annuaire/:id', (p, b) => s.modifierFournisseur(p.id, b)),
      route('DELETE', '/api/fournisseurs/annuaire/:id', async (p) => (await s.archiverFournisseur(p.id), { ok: true })),
      route('POST', '/api/fournisseurs/annuaire/:id/tarif', (p, b) => s.importerTarif(p.id, b)),

      route('GET', '/api/fournisseurs/demandes', (_p, _b, u) => s.listerDemandes({ statut: q(u, 'statut'), chantier_id: q(u, 'chantier_id'), devis_id: q(u, 'devis_id') })),
      route('POST', '/api/fournisseurs/demandes', async (_p, b) => {
        const d = await s.creerDemande(b);
        const envoi = b?.envoyer ? await s.envoyerDemande(d.id) : null;
        return { demande: d, envoi };
      }),
      route('GET', '/api/fournisseurs/demandes/:id', (p) => s.detailDemande(p.id)),
      route('POST', '/api/fournisseurs/demandes/:id/envoyer', (p) => s.envoyerDemande(p.id)),
      route('POST', '/api/fournisseurs/demandes/:id/relancer', (p) => s.envoyerDemande(p.id, true)),
      route('POST', '/api/fournisseurs/demandes/:id/annuler', async (p) => (await s.annulerDemande(p.id), { ok: true })),
      route('POST', '/api/fournisseurs/demandes/:id/commander', (p, b) => s.commanderDemande(p.id, b)),
      route('POST', '/api/fournisseurs/destinataires/:id/reponse', async (p, b) => (await s.saisirReponse(p.id, b), { ok: true })),

      route('GET', '/api/fournisseurs/commandes', (_p, _b, u) =>
        s.listerCommandes({ statut: q(u, 'statut'), chantier_id: q(u, 'chantier_id'), fournisseur_id: q(u, 'fournisseur_id'), en_cours: u.searchParams.get('en_cours') === '1' }),
      ),
      route('POST', '/api/fournisseurs/commandes', (_p, b) => (b?.devis_id && !b?.lignes ? s.commandeDepuisDevis(b.devis_id, b.fournisseur_id) : s.creerCommande(b))),
      route('GET', '/api/fournisseurs/commandes/:id', (p) => s.detailCommande(p.id)),
      route('POST', '/api/fournisseurs/commandes/:id/envoyer', (p) => s.envoyerCommande(p.id)),
      route('POST', '/api/fournisseurs/commandes/:id/statut', (p, b) => s.majStatutCommande(p.id, b)),
      route('POST', '/api/fournisseurs/commandes/:id/livraison', (p, b) => s.enregistrerLivraison(p.id, b?.lignes ?? [])),
      route('POST', '/api/fournisseurs/commandes/:id/facture', (p, b) => s.lierFacture(p.id, b)),

      route('GET', '/api/fournisseurs/catalogue', (_p, _b, u) => s.rechercherCatalogue(q(u, 'q') ?? '', q(u, 'fournisseur_id'))),
      route('GET', '/api/fournisseurs/catalogue/hausses', (_p, _b, u) => s.hausses(Number(q(u, 'jours')) || 90)),
    ];

    for (const r of ROUTES) {
      if (r.method !== request.method) continue;
      const m = pathname.match(r.re);
      if (!m) continue;
      const params = Object.fromEntries(r.keys.map((k, i) => [k, m[i + 1]]));
      const body = await lireCorps(request);
      const result = await r.handler(params, body, url);
      return json(result, request.method === 'POST' && /\/(annuaire|demandes|commandes)$/.test(pathname) ? 201 : 200);
    }
    return null;
  } catch (err) {
    return erreurEnReponse(err);
  }
}
