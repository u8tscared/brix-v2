/**
 * Service métier du module Fournisseurs (Achats). Regroupe les fonctions des sous-fichiers
 * pour respecter la convention « handlers.ts = service » du projet.
 */

import type { Env } from '../../env';
import * as annuaire from './annuaire';
import * as catalogue from './catalogue';
import * as commandes from './commandes';
import { CONNECTEURS } from './connecteurs/registre';
import * as demandes from './demandes';
import type { Ctx } from './demandes';
import { demoActive, chargerDemo } from './demo';
import { relierPartenaire } from '../api-publique/handlers';

export class FournisseursService {
  constructor(
    private env: Env,
    private ctx: Ctx,
  ) {}

  // Tableau de bord
  tableauDeBord() {
    return annuaire.tableauDeBord(this.env, this.ctx);
  }

  // Annuaire
  listerFournisseurs(opts?: { metier?: string; q?: string }) {
    return annuaire.listerFournisseurs(this.env, this.ctx, opts);
  }
  creerFournisseur(input: annuaire.FournisseurInput) {
    return annuaire.creerFournisseur(this.env, this.ctx, input);
  }
  modifierFournisseur(id: string, input: annuaire.FournisseurInput) {
    return annuaire.modifierFournisseur(this.env, this.ctx, id, input);
  }
  archiverFournisseur(id: string) {
    return annuaire.archiverFournisseur(this.env, this.ctx, id);
  }
  /** Relie la fiche à un fournisseur connecté par API (code partenaire donné par le fournisseur). */
  relierPartenaire(id: string, code: string) {
    return relierPartenaire(this.env, this.ctx.organizationId, id, code);
  }
  connecteurs() {
    return CONNECTEURS;
  }

  // Demandes de prix
  listerDemandes(f?: { statut?: string; chantier_id?: string; devis_id?: string }) {
    return demandes.listerDemandes(this.env, this.ctx, f);
  }
  creerDemande(input: demandes.CreerDemandeInput) {
    return demandes.creerDemande(this.env, this.ctx, input);
  }
  detailDemande(id: string) {
    return demandes.detailDemande(this.env, this.ctx, id);
  }
  envoyerDemande(id: string, relance = false) {
    return demandes.envoyerDemande(this.env, this.ctx, id, relance);
  }
  annulerDemande(id: string) {
    return demandes.annulerDemande(this.env, this.ctx, id);
  }
  /** Saisie par l'artisan d'un devis reçu par téléphone ou en PDF. */
  saisirReponse(destinataireId: string, input: demandes.ReponseInput) {
    return demandes.enregistrerReponse(this.env, this.ctx.organizationId, destinataireId, input, 'artisan');
  }
  commanderDemande(id: string, choix: Parameters<typeof commandes.commandesDepuisDemande>[3]) {
    return commandes.commandesDepuisDemande(this.env, this.ctx, id, choix);
  }

  // Commandes
  listerCommandes(f?: Parameters<typeof commandes.listerCommandes>[2]) {
    return commandes.listerCommandes(this.env, this.ctx, f);
  }
  creerCommande(input: commandes.CreerCommandeInput) {
    return commandes.creerCommande(this.env, this.ctx, input);
  }
  commandeDepuisDevis(devisId: string, fournisseurId: string) {
    return commandes.commandeDepuisDevis(this.env, this.ctx, devisId, fournisseurId);
  }
  detailCommande(id: string) {
    return commandes.detailCommande(this.env, this.ctx, id);
  }
  envoyerCommande(id: string) {
    return commandes.envoyerCommande(this.env, this.ctx, id);
  }
  majStatutCommande(id: string, input: commandes.MajStatutInput) {
    return commandes.majStatutCommande(this.env, this.ctx.organizationId, id, input, 'artisan');
  }
  enregistrerLivraison(id: string, recu: { ligne_id: string; quantite_recue: number }[]) {
    return commandes.enregistrerLivraison(this.env, this.ctx.organizationId, id, recu, 'artisan');
  }
  lierFacture(id: string, facture: { facture_id: string; montant_ht_cents?: number | null }) {
    return commandes.lierFacture(this.env, this.ctx, id, facture);
  }

  // Catalogue
  rechercherCatalogue(q: string, fournisseurId?: string) {
    return catalogue.rechercherCatalogue(this.env, this.ctx.organizationId, q, { fournisseur_id: fournisseurId });
  }
  importerTarif(fournisseurId: string, input: Parameters<typeof catalogue.importerTarif>[3]) {
    return catalogue.importerTarif(this.env, this.ctx.organizationId, fournisseurId, input);
  }
  hausses(jours?: number) {
    return catalogue.haussesRecentes(this.env, this.ctx.organizationId, jours);
  }

  // Démo
  async demo() {
    if (await demoActive(this.env, this.ctx.organizationId)) return { deja: true };
    return chargerDemo(this.env, this.ctx);
  }
}
