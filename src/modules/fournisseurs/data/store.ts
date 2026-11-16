// Store de l'espace Achats (zustand persisté). En preview tout vit ici, comme le reste de l'app ;
// les noms d'actions suivent les routes du worker (/api/fournisseurs/*) pour un branchement direct.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { uid } from '@/lib/format';
import type { Devis } from '@/lib/types';
import { transitionAutorisee } from '../../../../worker/src/modules/fournisseurs/cycle-commande';
import type { LigneImportee } from '../../../../worker/src/modules/fournisseurs/catalogue-import';
import { demoState } from './demo';
import { besoinsDuDevis, iso, jeton, prochainNumero } from './helpers';
import type { Article, Commande, Demande, Destinataire, Evenement, Fournisseur, JetonIA, LigneDemande, ModeLivraison, StatutCommande } from './types';

export interface AchatsState {
  init: boolean;
  fournisseurs: Fournisseur[];
  demandes: Demande[];
  commandes: Commande[];
  catalogue: Article[];
  jetons: JetonIA[];

  initDemo: (devis: Devis[]) => void;
  vider: () => void;

  ajouterFournisseur: (f: Omit<Fournisseur, 'id'>) => string;
  modifierFournisseur: (id: string, patch: Partial<Fournisseur>) => void;
  supprimerFournisseur: (id: string) => void;
  relierPartenaire: (id: string, code: string) => { ok: boolean; message: string };

  creerDemande: (p: { titre: string; devisId?: string; chantierId?: string; lignes: Omit<LigneDemande, 'id'>[]; fournisseurIds: string[]; dateLimite?: string; livraisonSouhaitee?: string; adresse?: string; message?: string }) => string;
  relancer: (demandeId: string) => number;
  annulerDemande: (demandeId: string) => void;
  simulerReponses: (demandeId: string) => number;
  marquerVu: (token: string) => void;
  repondre: (token: string, r: { prix: Destinataire['prix']; port?: number; delaiJours?: number; commentaire?: string }, acteur?: Evenement['acteur']) => void;
  decliner: (token: string, motif?: string) => void;
  commanderDepuisDemande: (demandeId: string, repartition: { destinataireId: string; ligneIds: string[]; port: number }[]) => string[];

  creerCommande: (p: { fournisseurId: string; lignes: Omit<Commande['lignes'][number], 'id' | 'quantiteLivree'>[]; devisId?: string; chantierId?: string; adresse?: string; livraisonPrevue?: string; mode?: ModeLivraison; port?: number; message?: string }) => string;
  envoyerCommande: (id: string) => void;
  majStatutCommande: (idOuToken: string, statut: StatutCommande, extra?: { referenceFournisseur?: string; livraisonPrevue?: string; suivi?: string }, acteur?: Evenement['acteur']) => { ok: boolean; message?: string };
  reception: (id: string, recu: { ligneId: string; quantite: number }[]) => void;
  lierFacture: (id: string, montantHt: number) => { ecart: number; alerte: boolean };

  importerTarif: (fournisseurId: string, lignes: LigneImportee[]) => { crees: number; maj: number; hausses: number };

  creerJeton: (nom: string) => string;
  revoquerJeton: (id: string) => void;
}

const evt = (texte: string, acteur: Evenement['acteur'] = 'systeme'): Evenement => ({ at: new Date().toISOString(), texte, acteur });
const totalCommande = (c: Pick<Commande, 'lignes'>) => c.lignes.reduce((s, l) => s + l.prix * l.quantite, 0);
export { totalCommande };

export const useAchats = create<AchatsState>()(
  persist(
    (set, get) => {
      const majDemande = (id: string, fn: (d: Demande) => Demande) => set((s) => ({ demandes: s.demandes.map((d) => (d.id === id ? fn(d) : d)) }));
      const majCommande = (id: string, fn: (c: Commande) => Commande) => set((s) => ({ commandes: s.commandes.map((c) => (c.id === id ? fn(c) : c)) }));
      const nom = (fid: string) => get().fournisseurs.find((f) => f.id === fid)?.nom ?? 'Fournisseur';
      const parToken = (token: string) => {
        for (const d of get().demandes) {
          const dest = d.destinataires.find((x) => x.token === token);
          if (dest) return { d, dest };
        }
        return null;
      };
      const statutDemande = (d: Demande): Demande['statut'] => {
        if (['brouillon', 'commandee', 'annulee'].includes(d.statut)) return d.statut;
        const fini = d.destinataires.filter((x) => x.statut === 'repondue' || x.statut === 'declinee').length;
        const rep = d.destinataires.filter((x) => x.statut === 'repondue').length;
        return fini === d.destinataires.length && rep > 0 ? 'complete' : rep > 0 ? 'reponses_partielles' : 'envoyee';
      };
      const enrichirCatalogue = (fournisseurId: string, lignes: LigneDemande[], prix: Destinataire['prix']) => {
        const now = iso();
        set((s) => {
          const cat = [...s.catalogue];
          for (const p of prix) {
            const l = lignes.find((x) => x.id === p.ligneId);
            if (!l || p.prix == null) continue;
            const ref = p.referenceProposee || l.reference || `DP-${l.id}`;
            const i = cat.findIndex((a) => a.fournisseurId === fournisseurId && a.reference === ref);
            if (i >= 0) {
              if (cat[i].prixNet !== p.prix) cat[i] = { ...cat[i], prixNet: p.prix, majLe: now, source: 'reponse', historique: [...cat[i].historique, { le: now, prix: p.prix }] };
            } else {
              cat.push({ id: uid('art'), fournisseurId, reference: ref, designation: p.designationProposee || l.designation, unite: l.unite, prixNet: p.prix, source: 'reponse', majLe: now, historique: [{ le: now, prix: p.prix }] });
            }
          }
          return { catalogue: cat };
        });
      };

      return {
        init: false,
        fournisseurs: [],
        demandes: [],
        commandes: [],
        catalogue: [],
        jetons: [],

        initDemo: (devis) => set({ ...demoState(devis), init: true }),
        vider: () => set({ init: true, fournisseurs: [], demandes: [], commandes: [], catalogue: [], jetons: [] }),

        ajouterFournisseur: (f) => {
          const id = uid('frn');
          set((s) => ({ fournisseurs: [...s.fournisseurs, { ...f, id }] }));
          return id;
        },
        modifierFournisseur: (id, patch) => set((s) => ({ fournisseurs: s.fournisseurs.map((f) => (f.id === id ? { ...f, ...patch } : f)) })),
        supprimerFournisseur: (id) => set((s) => ({ fournisseurs: s.fournisseurs.filter((f) => f.id !== id) })),
        relierPartenaire: (id, code) => {
          const c = code.trim().toUpperCase();
          if (!/^BRX-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(c)) return { ok: false, message: 'Le code ressemble à BRX-7KQ2-M9XA. Demandez-le à votre fournisseur.' };
          get().modifierFournisseur(id, { connecteur: 'api_brix', partenaire: c });
          return { ok: true, message: 'Fournisseur relié : vos demandes et commandes arrivent directement dans son logiciel.' };
        },

        creerDemande: (p) => {
          const id = uid('dp');
          const now = iso();
          const d: Demande = {
            id,
            numero: prochainNumero('DP', get().demandes.map((x) => x.numero)),
            titre: p.titre || 'Demande de prix',
            devisId: p.devisId,
            chantierId: p.chantierId,
            statut: 'envoyee',
            dateLimite: p.dateLimite,
            livraisonSouhaitee: p.livraisonSouhaitee,
            adresse: p.adresse,
            message: p.message,
            createdAt: now,
            lignes: p.lignes.map((l) => ({ ...l, id: uid('dpl') })),
            destinataires: p.fournisseurIds.map((fid) => ({ id: uid('dpd'), fournisseurId: fid, token: jeton(), statut: 'envoyee', envoyeLe: now, prix: [] })),
            journal: [evt('Demande créée', 'artisan'), ...p.fournisseurIds.map((fid) => evt(`Envoyée à ${nom(fid)}`))],
          };
          set((s) => ({ demandes: [d, ...s.demandes] }));
          return id;
        },
        relancer: (id) => {
          const d = get().demandes.find((x) => x.id === id);
          const cibles = d?.destinataires.filter((x) => x.statut === 'envoyee' || x.statut === 'vue') ?? [];
          if (cibles.length) majDemande(id, (dd) => ({ ...dd, journal: [...cibles.map((c) => evt(`Relance envoyée à ${nom(c.fournisseurId)}`)), ...dd.journal] }));
          return cibles.length;
        },
        annulerDemande: (id) => majDemande(id, (d) => ({ ...d, statut: 'annulee', journal: [evt('Demande annulée', 'artisan'), ...d.journal] })),
        simulerReponses: (id) => {
          const d = get().demandes.find((x) => x.id === id);
          if (!d) return 0;
          const cat = get().catalogue;
          let n = 0;
          d.destinataires.forEach((dest, i) => {
            if (dest.statut === 'repondue' || dest.statut === 'declinee') return;
            const coef = [0.97, 1.03, 0.99, 1.06][i % 4];
            const prix = d.lignes.map((l) => {
              const connu = cat.find((a) => a.fournisseurId === dest.fournisseurId && (a.reference === l.reference || a.designation === l.designation));
              const base = connu?.prixNet ?? (l.prixCible ? l.prixCible * coef : 10);
              return { ligneId: l.id, prix: Math.round(base * (connu ? 1 : 1) * 100) / 100 };
            });
            get().repondre(dest.token, { prix, port: i === 0 ? 0 : 15 + i * 5, delaiJours: 1 + i }, 'fournisseur');
            n++;
          });
          return n;
        },
        marquerVu: (token) => {
          const r = parToken(token);
          if (!r || r.dest.vuLe) return;
          majDemande(r.d.id, (d) => ({
            ...d,
            destinataires: d.destinataires.map((x) => (x.id === r.dest.id ? { ...x, vuLe: iso(), statut: x.statut === 'envoyee' ? 'vue' : x.statut } : x)),
            journal: [evt(`${nom(r.dest.fournisseurId)} a ouvert la demande`, 'fournisseur'), ...d.journal],
          }));
        },
        repondre: (token, rep, acteur = 'fournisseur') => {
          const r = parToken(token);
          if (!r) return;
          majDemande(r.d.id, (d) => {
            const next: Demande = {
              ...d,
              destinataires: d.destinataires.map((x) => (x.id === r.dest.id ? { ...x, statut: 'repondue', reponduLe: iso(), prix: rep.prix, port: rep.port, delaiJours: rep.delaiJours, commentaire: rep.commentaire } : x)),
              journal: [evt(`${nom(r.dest.fournisseurId)} a répondu (${rep.prix.filter((p) => p.prix != null).length}/${d.lignes.length} articles)`, acteur), ...d.journal],
            };
            return { ...next, statut: statutDemande(next) };
          });
          enrichirCatalogue(r.dest.fournisseurId, r.d.lignes, rep.prix);
        },
        decliner: (token, motif) => {
          const r = parToken(token);
          if (!r) return;
          majDemande(r.d.id, (d) => {
            const next: Demande = {
              ...d,
              destinataires: d.destinataires.map((x) => (x.id === r.dest.id ? { ...x, statut: 'declinee', reponduLe: iso(), commentaire: motif } : x)),
              journal: [evt(`${nom(r.dest.fournisseurId)} ne peut pas répondre${motif ? ` : ${motif}` : ''}`, 'fournisseur'), ...d.journal],
            };
            return { ...next, statut: statutDemande(next) };
          });
        },
        commanderDepuisDemande: (id, repartition) => {
          const d = get().demandes.find((x) => x.id === id);
          if (!d || d.statut === 'commandee') return [];
          const ids: string[] = [];
          for (const r of repartition) {
            const dest = d.destinataires.find((x) => x.id === r.destinataireId);
            if (!dest) continue;
            const lignes = r.ligneIds
              .map((lid) => {
                const l = d.lignes.find((x) => x.id === lid)!;
                const p = dest.prix.find((x) => x.ligneId === lid);
                if (!p || p.prix == null) return null;
                return { designation: p.designationProposee || l.designation, reference: p.referenceProposee || l.reference, quantite: l.quantite, unite: l.unite, prix: p.prix };
              })
              .filter((x): x is NonNullable<typeof x> => x !== null);
            if (!lignes.length) continue;
            const cid = get().creerCommande({ fournisseurId: dest.fournisseurId, lignes, devisId: d.devisId, chantierId: d.chantierId, adresse: d.adresse, livraisonPrevue: d.livraisonSouhaitee, port: r.port });
            get().envoyerCommande(cid);
            majCommande(cid, (c) => ({ ...c, demandeId: d.id }));
            ids.push(cid);
          }
          if (ids.length) majDemande(id, (dd) => ({ ...dd, statut: 'commandee', journal: [evt(`Commandé : ${ids.map((cid) => get().commandes.find((c) => c.id === cid)?.numero).join(', ')}`, 'artisan'), ...dd.journal] }));
          return ids;
        },

        creerCommande: (p) => {
          const id = uid('bc');
          const c: Commande = {
            id,
            numero: prochainNumero('BC', get().commandes.map((x) => x.numero)),
            fournisseurId: p.fournisseurId,
            devisId: p.devisId,
            chantierId: p.chantierId,
            statut: 'brouillon',
            port: p.port ?? 0,
            livraisonPrevue: p.livraisonPrevue,
            adresse: p.adresse,
            mode: p.mode ?? 'livraison_chantier',
            message: p.message,
            createdAt: iso(),
            lignes: p.lignes.map((l) => ({ ...l, id: uid('bcl'), quantiteLivree: 0 })),
            journal: [evt('Bon de commande créé', 'artisan')],
          };
          set((s) => ({ commandes: [c, ...s.commandes] }));
          return id;
        },
        envoyerCommande: (id) =>
          majCommande(id, (c) => (c.statut !== 'brouillon' ? c : { ...c, statut: 'envoyee', token: jeton(), journal: [evt(`Envoyée à ${nom(c.fournisseurId)} (e-mail + bon EDI joint)`), ...c.journal] })),
        majStatutCommande: (idOuToken, statut, extra = {}, acteur = 'artisan') => {
          const c = get().commandes.find((x) => x.id === idOuToken || x.token === idOuToken);
          if (!c) return { ok: false, message: 'Commande introuvable' };
          if (c.statut !== statut && !transitionAutorisee(c.statut, statut, acteur)) return { ok: false, message: 'Ce changement de statut n’est pas possible.' };
          const textes: Partial<Record<StatutCommande, string>> = {
            confirmee: `Confirmée par ${nom(c.fournisseurId)}${extra.referenceFournisseur ? ` (réf. ${extra.referenceFournisseur})` : ''}`,
            expediee: `Expédiée${extra.suivi ? ` : ${extra.suivi}` : ''}`,
            livree: 'Livrée en totalité',
            annulee: 'Commande annulée',
            facturee: 'Facture rapprochée',
          };
          majCommande(c.id, (cc) => ({
            ...cc,
            statut,
            referenceFournisseur: extra.referenceFournisseur ?? cc.referenceFournisseur,
            livraisonPrevue: extra.livraisonPrevue ?? cc.livraisonPrevue,
            suivi: extra.suivi ?? cc.suivi,
            lignes: statut === 'livree' ? cc.lignes.map((l) => ({ ...l, quantiteLivree: Math.max(l.quantiteLivree, l.quantite) })) : cc.lignes,
            journal: [evt(textes[statut] ?? statut, acteur), ...cc.journal],
          }));
          return { ok: true };
        },
        reception: (id, recu) =>
          majCommande(id, (c) => {
            const lignes = c.lignes.map((l) => {
              const r = recu.find((x) => x.ligneId === l.id);
              return r ? { ...l, quantiteLivree: Math.max(0, r.quantite) } : l;
            });
            const toutes = lignes.every((l) => l.quantiteLivree >= l.quantite);
            const aucune = lignes.every((l) => l.quantiteLivree <= 0);
            const statut: StatutCommande = toutes ? 'livree' : aucune ? c.statut : 'livree_partiel';
            const manque = lignes.filter((l) => l.quantiteLivree < l.quantite).length;
            return { ...c, lignes, statut, journal: [evt(toutes ? 'Livraison reçue en totalité' : `Livraison reçue, ${manque} article${manque > 1 ? 's' : ''} manquant${manque > 1 ? 's' : ''}`, 'artisan'), ...c.journal] };
          }),
        lierFacture: (id, montant) => {
          const c = get().commandes.find((x) => x.id === id)!;
          const attendu = totalCommande(c) + c.port;
          const ecart = Math.round((montant - attendu) * 100) / 100;
          const alerte = Math.abs(ecart) > Math.max(1, attendu * 0.01);
          majCommande(id, (cc) => ({
            ...cc,
            factureId: uid('ff'),
            ecartFacture: ecart,
            statut: cc.statut === 'livree' ? 'facturee' : cc.statut,
            journal: [evt(alerte ? `Facture rapprochée : écart de ${ecart.toFixed(2).replace('.', ',')} € à vérifier` : 'Facture rapprochée : montant conforme', 'artisan'), ...cc.journal],
          }));
          return { ecart, alerte };
        },

        importerTarif: (fournisseurId, lignes) => {
          const now = iso();
          let crees = 0;
          let maj = 0;
          let hausses = 0;
          set((s) => {
            const cat = [...s.catalogue];
            for (const l of lignes) {
              const prix = (l.prix_net_cents ?? l.prix_public_cents ?? 0) / 100;
              const i = cat.findIndex((a) => a.fournisseurId === fournisseurId && a.reference === l.reference);
              if (i >= 0) {
                if (cat[i].prixNet !== prix) {
                  if (prix > cat[i].prixNet) hausses++;
                  cat[i] = { ...cat[i], prixNet: prix, majLe: now, source: 'import', historique: [...cat[i].historique, { le: now, prix }] };
                  maj++;
                }
              } else {
                cat.push({ id: uid('art'), fournisseurId, reference: l.reference, ean: l.ean ?? undefined, marque: l.marque ?? undefined, designation: l.designation, famille: l.famille ?? undefined, unite: l.unite, prixPublic: l.prix_public_cents != null ? l.prix_public_cents / 100 : undefined, prixNet: prix, source: 'import', majLe: now, historique: [{ le: now, prix }] });
                crees++;
              }
            }
            return { catalogue: cat };
          });
          return { crees, maj, hausses };
        },

        creerJeton: (nomJeton) => {
          const t = `brx_mcp_${jeton()}`;
          set((s) => ({ jetons: [{ id: uid('mcp'), nom: nomJeton || 'Assistant IA', prefixe: t.slice(0, 14), createdAt: iso(), appels: 0 }, ...s.jetons] }));
          return t;
        },
        revoquerJeton: (id) => set((s) => ({ jetons: s.jetons.filter((j) => j.id !== id) })),
      };
    },
    { name: 'brix-achats-v1', storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);

/** Lignes de fourniture d'un devis, prêtes pour une demande de prix. */
export { besoinsDuDevis };
