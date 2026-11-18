// Fusion à trois de l'état synchronisé (base = dernière copie commune, local = cet appareil, serveur).
// Mêmes clés que worker/src/lib/etat.ts (COLLECTIONS, CHAMPS) : les deux listes doivent rester alignées.

export const COLLECTIONS = ['clients', 'chantiers', 'devis', 'factures', 'employees', 'events', 'leads', 'expenses', 'bank'] as const;
export const CHAMPS = ['company', 'user', 'plan', 'priorities', 'enabled', 'cashBalance', 'setupTasks', 'onboarded'] as const;

export type Donnees = Record<string, unknown>;
type Item = { id: string } & Record<string, unknown>;

const egal = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);
const estObjet = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Ne garde que les clés synchronisées (même règle que nettoyer() côté worker). */
export function extraire(s: Record<string, unknown>): Donnees {
  const out: Donnees = {};
  for (const k of COLLECTIONS) if (Array.isArray(s[k])) out[k] = s[k];
  for (const k of CHAMPS) if (s[k] !== undefined && s[k] !== null) out[k] = s[k];
  return out;
}

const parId = (l: unknown) => new Map(((Array.isArray(l) ? l : []) as Item[]).filter((x) => x && x.id != null).map((x) => [String(x.id), x]));

/**
 * Collection : union par id. Un élément modifié ou ajouté ici depuis la base gagne ; un élément supprimé
 * ici disparaît si le serveur ne l'a pas touché ; sinon la version du serveur s'applique.
 */
export function fusionnerListe(base: unknown, local: unknown, serveur: unknown): Item[] {
  const b = parId(base);
  const l = parId(local);
  const s = parId(serveur);
  const changeIci = (id: string) => l.has(id) && (!b.has(id) || !egal(b.get(id), l.get(id)));
  const out: Item[] = [];
  // Nouveaux éléments de cet appareil, en tête (le store ajoute en tête).
  for (const [id, x] of l) if (!s.has(id) && !b.has(id)) out.push(x);
  for (const [id, x] of s) {
    if (changeIci(id)) out.push(l.get(id)!);
    else if (!l.has(id) && b.has(id) && egal(b.get(id), x)) continue; // supprimé ici, inchangé là-bas
    else out.push(x);
  }
  // Modifié ici mais supprimé sur le serveur : la modification l'emporte (on ne perd pas de saisie).
  for (const [id, x] of l) if (!s.has(id) && b.has(id) && changeIci(id)) out.push(x);
  return out;
}

/** Champ simple : la valeur locale si elle a changé ici, sinon celle du serveur. Objets : clé par clé. */
export function fusionnerChamp(base: unknown, local: unknown, serveur: unknown): unknown {
  if (egal(base, local)) return serveur === undefined ? local : serveur;
  if (serveur === undefined || egal(base, serveur)) return local;
  if (estObjet(local) && estObjet(serveur)) {
    const b = estObjet(base) ? base : {};
    const out: Record<string, unknown> = {};
    for (const k of new Set([...Object.keys(serveur), ...Object.keys(local)])) {
      const v = fusionnerChamp(b[k], local[k], serveur[k]);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  return local;
}

/** Fusion complète. Sans base (premier tirage sur cet appareil), le serveur fait foi. */
export function fusionner(base: Donnees | null, local: Donnees, serveur: Donnees): Donnees {
  if (!base) return { ...serveur };
  const out: Donnees = {};
  for (const k of COLLECTIONS) out[k] = fusionnerListe(base[k], local[k], serveur[k]);
  for (const k of CHAMPS) {
    const v = fusionnerChamp(base[k], local[k], serveur[k]);
    if (v !== undefined) out[k] = v;
  }
  return out;
}

export const memes = egal;
