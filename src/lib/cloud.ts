// Synchronisation cloud du store (un document JSON par entreprise, voir worker/src/lib/etat.ts).
// Le store reste la copie de travail : chaque modification est enregistrée ici, envoyée 1,5 s plus tard.
// Conflit (autre appareil, Brix AI MCP, Bob) : fusion à trois avec la dernière copie commune, puis renvoi.
// Hors ligne : rien n'est perdu (le store est persisté), on réessaie avec un délai croissant.

import { create } from 'zustand';
import { ApiError, api, cloudDisponible, deconnecterServeur, ecrireSession, lireSession, quandSessionExpire, type Session } from './api';
import { CHAMPS, COLLECTIONS, extraire, fusionner, memes, type Donnees } from './cloud-fusion';
import { useBrix } from './store';

export type EtatSync = 'idle' | 'syncing' | 'offline' | 'error';

interface Statut {
  /** null : pas encore vérifié ; false : preview statique, tout reste local. */
  dispo: boolean | null;
  session: Session | null;
  etat: EtatSync;
  derniereSync: string | null;
}

export const useCloud = create<Statut>(() => ({ dispo: null, session: lireSession(), etat: 'idle', derniereSync: null }));

// ── Dernière copie commune (base de la fusion) ──────────────────────────────────────

interface Meta {
  orgId: string;
  version: number;
  majLe: string | null;
  base: Donnees;
}
const CLE_META = 'brix-sync';
let meta: Meta | null = lireMeta();

function lireMeta(): Meta | null {
  try {
    const raw = localStorage.getItem(CLE_META);
    return raw ? (JSON.parse(raw) as Meta) : null;
  } catch {
    return null;
  }
}
function ecrireMeta(m: Meta | null) {
  meta = m;
  try {
    if (m) localStorage.setItem(CLE_META, JSON.stringify(m));
    else localStorage.removeItem(CLE_META);
  } catch {
    /* quota ou navigation privée : la base reste en mémoire */
  }
  if (m?.majLe) useCloud.setState({ derniereSync: m.majLe });
}

const local = () => extraire(useBrix.getState() as unknown as Record<string, unknown>);
const actif = () => {
  const s = lireSession();
  return !!s && useCloud.getState().dispo === true && useBrix.getState().compte === s.orgId && meta?.orgId === s.orgId;
};
export const aDesModifsEnAttente = () => !!meta && actif() && !memes(local(), meta.base);

/** Remplace les clés synchronisées du store (les préférences et Bob restent). */
function appliquer(d: Donnees, extra: Record<string, unknown> = {}) {
  const patch: Record<string, unknown> = { ...extra };
  for (const k of COLLECTIONS) patch[k] = Array.isArray(d[k]) ? d[k] : [];
  for (const k of CHAMPS) if (d[k] !== undefined) patch[k] = d[k];
  useBrix.setState(patch as never);
}

// ── Envoi ───────────────────────────────────────────────────────────────────────────

let minuteur: ReturnType<typeof setTimeout> | undefined;
let enCours = false;
let encore = false;
let delai = 2000;

function planifier(ms = 1500) {
  clearTimeout(minuteur);
  minuteur = setTimeout(() => void pousser(), ms);
}

function echec(e: unknown) {
  if (e instanceof ApiError && e.status === 401) return; // géré par quandSessionExpire
  useCloud.setState({ etat: e instanceof ApiError && e.horsLigne ? 'offline' : 'error' });
  planifier(delai);
  delai = Math.min(delai * 2, 60_000);
}

export async function pousser(essais = 0): Promise<void> {
  if (!actif() || !meta) return;
  if (enCours) {
    encore = true;
    return;
  }
  const donnees = local();
  if (memes(donnees, meta.base)) {
    useCloud.setState({ etat: 'idle' });
    return;
  }
  enCours = true;
  useCloud.setState({ etat: 'syncing' });
  try {
    const r = await api<{ version: number; majLe: string }>('/api/sync', { method: 'PUT', body: { baseVersion: meta.version, donnees } });
    ecrireMeta({ orgId: meta.orgId, version: r.version, majLe: r.majLe, base: donnees });
    useCloud.setState({ etat: 'idle' });
    delai = 2000;
  } catch (e) {
    if (e instanceof ApiError && e.status === 409 && e.data?.donnees && essais < 3) {
      const srv = e.data as unknown as { version: number; majLe: string | null; donnees: Donnees };
      const base = meta.base;
      ecrireMeta({ orgId: meta.orgId, version: srv.version, majLe: srv.majLe, base: srv.donnees });
      appliquer(fusionner(base, local(), srv.donnees));
      enCours = false;
      return pousser(essais + 1);
    }
    echec(e);
  } finally {
    enCours = false;
  }
  if (encore) {
    encore = false;
    planifier(300);
  }
}

// ── Tirage ──────────────────────────────────────────────────────────────────────────

export async function tirer(): Promise<void> {
  if (!actif() || !meta || enCours) return;
  try {
    const r = await api<{ version: number; majLe: string | null; donnees?: Donnees; inchange?: boolean }>(`/api/sync?version=${meta.version}`);
    if (!r.inchange && r.donnees && r.version !== meta.version) {
      const base = meta.base;
      ecrireMeta({ orgId: meta.orgId, version: r.version, majLe: r.majLe, base: r.donnees });
      const fusion = fusionner(base, local(), r.donnees);
      if (!memes(fusion, local())) appliquer(fusion);
    } else if (r.majLe) useCloud.setState({ derniereSync: r.majLe });
    useCloud.setState({ etat: 'idle' });
    delai = 2000;
    if (!memes(local(), meta.base)) planifier(300);
  } catch (e) {
    echec(e);
  }
}

// ── Liaison d'un compte ─────────────────────────────────────────────────────────────

/** Juste après l'inscription : le serveur a déjà la copie envoyée (version 1). */
export function lierApresInscription(s: Session, envoye: Record<string, unknown>) {
  useBrix.setState({ compte: s.orgId });
  ecrireMeta({ orgId: s.orgId, version: 1, majLe: new Date().toISOString(), base: extraire(envoye) });
  useCloud.setState({ session: s, etat: 'idle' });
  void demarrerCloud();
}

/**
 * Après une connexion : si ce navigateur a déjà la copie de ce compte (session expirée), on fusionne
 * avec ses modifications ; sinon les données du compte remplacent celles du navigateur.
 */
export async function ouvrirCompte(s: Session): Promise<void> {
  useCloud.setState({ session: s });
  if (useBrix.getState().compte === s.orgId && meta?.orgId === s.orgId) {
    await demarrerCloud();
    return tirer();
  }
  const r = await api<{ version: number; majLe: string | null; donnees: Donnees }>('/api/sync');
  appliquer(r.donnees, { compte: s.orgId, isDemo: false, onboarded: r.donnees.onboarded ?? true });
  ecrireMeta({ orgId: s.orgId, version: r.version, majLe: r.majLe ?? new Date().toISOString(), base: r.donnees });
  useCloud.setState({ etat: 'idle' });
  await demarrerCloud();
  if (!memes(local(), r.donnees)) planifier(300);
}

/** Se déconnecter : envoie d'abord ce qui reste, puis efface les données du compte de ce navigateur. */
export async function seDeconnecter(partout = false): Promise<void> {
  clearTimeout(minuteur);
  await pousser().catch(() => undefined);
  if (partout) await deconnecterServeur(true);
  else void deconnecterServeur(false).catch(() => undefined);
  ecrireSession(null);
  ecrireMeta(null);
  useCloud.setState({ session: null, etat: 'idle', derniereSync: null });
  useBrix.getState().reset();
}

// ── Démarrage ───────────────────────────────────────────────────────────────────────

let demarre = false;
let surExpire: () => void = () => undefined;
export const quandExpire = (f: () => void) => {
  surExpire = f;
};

quandSessionExpire(() => {
  // On garde les données locales : elles repartiront à la prochaine connexion.
  clearTimeout(minuteur);
  ecrireSession(null);
  useCloud.setState({ session: null, etat: 'idle' });
  surExpire();
});

/** À appeler une fois au lancement de l'app. Sans worker (preview statique), ne fait rien. */
export async function demarrerCloud(): Promise<void> {
  const dispo = await cloudDisponible();
  useCloud.setState({ dispo, session: lireSession() });
  if (!dispo || demarre) {
    if (demarre) void tirer();
    return;
  }
  demarre = true;
  useBrix.subscribe((st, avant) => {
    const a = st as unknown as Record<string, unknown>;
    const b = avant as unknown as Record<string, unknown>;
    if ([...COLLECTIONS, ...CHAMPS].some((k) => a[k] !== b[k])) {
      if (actif()) useCloud.setState({ etat: 'syncing' });
      planifier();
    }
  });
  const auRetour = () => {
    if (document.visibilityState === 'visible') void tirer();
  };
  // Autre onglet : il a peut-être déjà envoyé, on relit la base commune qu'il a écrite.
  window.addEventListener('storage', (e) => {
    if (e.key === CLE_META) meta = lireMeta();
  });
  window.addEventListener('focus', auRetour);
  document.addEventListener('visibilitychange', auRetour);
  window.addEventListener('online', () => {
    delai = 2000;
    void pousser().then(tirer);
  });
  setInterval(() => document.visibilityState === 'visible' && void tirer(), 60_000);
  void tirer();
}
