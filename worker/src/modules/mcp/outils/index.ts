/**
 * Registre des outils Brix AI MCP. Lecture : document de l'entreprise (lib/etat.ts) et tables
 * fournisseurs. Écriture (brix.ecriture) : brouillons et notes, jamais d'envoi ni d'argent.
 */
import type { Env } from '../../../env';
import { HttpError } from '../../../lib/http';
import type { McpCtx } from '../jetons';
import { peutEcrire } from '../jetons';
import { journaliser } from '../reglages';
import { OUTILS_CHANTIERS } from './chantiers';
import { ErreurOutil, annotations, nouveauContexte, type Args, type Outil } from './commun';
import { OUTILS_DEVIS } from './devis';
import { OUTILS_ECRITURE } from './ecriture';
import { OUTILS_ENTREPRISE } from './entreprise';
import { OUTILS_FACTURES } from './factures';
import { OUTILS_FOURNISSEURS } from './fournisseurs';
import { OUTILS_RECHERCHE } from './recherche';

export { ErreurOutil, type Outil } from './commun';

export const OUTILS: Outil[] = [
  ...OUTILS_ENTREPRISE.slice(0, 1),
  ...OUTILS_DEVIS,
  ...OUTILS_FACTURES,
  ...OUTILS_CHANTIERS,
  ...OUTILS_ENTREPRISE.slice(1),
  ...OUTILS_FOURNISSEURS,
  ...OUTILS_RECHERCHE,
  ...OUTILS_ECRITURE,
];

export const trouverOutil = (name: string) => OUTILS.find((o) => o.name === name);

/** Description publique d'un outil (tools/list). */
export const descripteur = (o: Outil) => ({
  name: o.name,
  title: o.title,
  description: o.description,
  inputSchema: o.inputSchema,
  outputSchema: o.outputSchema,
  annotations: annotations(o),
});

/** Outils visibles pour un accès : les outils d'écriture seulement avec brix.ecriture. */
export const outilsVisibles = (ctx: Pick<McpCtx, 'scope'>) => OUTILS.filter((o) => !o.ecriture || peutEcrire(ctx));

export type ResultatOutil = { ok: true; data: Record<string, unknown> } | { ok: false; message: string };

export async function executerOutil(env: Env, ctx: McpCtx, outil: Outil, args: Args): Promise<ResultatOutil> {
  const c = nouveauContexte(env, ctx);
  try {
    const data = await outil.run(c, args ?? {});
    if (outil.brut) return { ok: true, data };
    return { ok: true, data: { donnees_du: (!outil.ecriture && c.majLe()) || new Date().toISOString(), monnaie: 'EUR', ...data } };
  } catch (e) {
    if (e instanceof ErreurOutil) {
      if (outil.ecriture) await journaliser(env, ctx.organizationId, ctx.clientLabel, outil.name, `Refusé : ${e.message}`, false);
      return { ok: false, message: e.message };
    }
    if (e instanceof HttpError && e.status < 500) return { ok: false, message: e.message };
    console.error('[mcp]', outil.name, e);
    return { ok: false, message: 'Les données Brix sont momentanément indisponibles. Réessayez dans un instant.' };
  }
}
