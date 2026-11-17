// Contrat des e-mails transactionnels Brix. Fichiers de src/emails/ : TypeScript pur, sans DOM ni alias « @/ »,
// pour être rendus à l'identique dans l'app (aperçu, boîte de démo) et dans le worker (envoi réel).

export type ModeleEmail =
  | 'devis_envoye' // au client : votre devis est prêt, consulter et signer
  | 'devis_relance' // au client : rappel doux
  | 'code_signature' // au client : code à 6 chiffres pour signer
  | 'devis_signe_client' // au client : confirmation + copie signée + suite (acompte)
  | 'devis_signe_artisan' // à l'artisan : votre client a signé
  | 'facture_envoyee' // au client : facture / acompte / situation à régler
  | 'facture_relance' // au client : relance (ton selon le rang 1, 2, 3)
  | 'paiement_recu_client' // au client : reçu de paiement
  | 'paiement_recu_artisan' // à l'artisan : vous avez été payé
  | 'demande_prix' // au fournisseur : demande de prix (lien portail)
  | 'commande_fournisseur' // au fournisseur : bon de commande (lien portail)
  | 'reponse_fournisseur' // à l'artisan : un fournisseur a répondu
  | 'bienvenue'; // à l'artisan : bienvenue après inscription

/** Qui envoie (l'artisan, ou Brix pour les e-mails système). */
export interface Emetteur {
  entreprise: string;
  prenom: string;
  nom: string;
  telephone: string;
  email: string;
  ville: string;
  initiales: string;
  siret?: string;
}

export interface LigneResume {
  libelle: string;
  montant: number; // TTC
}

export interface DonneesDocument {
  emetteur: Emetteur;
  destinataire: string; // « Claire Lefèvre » ou « Boulangerie Martin »
  civilite: string; // ce qui suit « Bonjour » : « Claire », « Madame Martin »
  numero: string; // D-2026-118 / F-2026-206
  titre: string; // objet des travaux
  montantTtc: number;
  lien: string; // URL publique (consulter, signer, payer)
  message?: string; // mot personnel de l'artisan (texte brut, sauts de ligne conservés)
  lignes?: LigneResume[]; // 3 à 5 postes principaux pour l'aperçu
  echeance?: string; // ISO (validité du devis ou échéance de facture)
  acomptePourcent?: number;
  acompteMontant?: number;
}

export interface DonneesEmail {
  devis_envoye: DonneesDocument;
  devis_relance: DonneesDocument & { rang: number };
  code_signature: { emetteur: Emetteur; civilite: string; code: string; numero: string; minutes: number };
  devis_signe_client: DonneesDocument & { signeLe: string; signataire: string; formule?: string; empreinte: string };
  devis_signe_artisan: DonneesDocument & { signeLe: string; signataire: string; formule?: string; lienApp: string };
  facture_envoyee: DonneesDocument & { type: 'facture' | 'acompte' | 'situation' | 'solde' };
  facture_relance: DonneesDocument & { rang: 1 | 2 | 3; joursRetard: number };
  paiement_recu_client: DonneesDocument & { payeLe: string; moyen: string; reste: number };
  paiement_recu_artisan: DonneesDocument & { payeLe: string; moyen: string; client: string; lienApp: string };
  demande_prix: {
    emetteur: Emetteur;
    fournisseur: string;
    contact?: string;
    reference: string;
    chantier?: string;
    articles: { designation: string; quantite: number; unite: string }[];
    reponseAvant: string; // ISO
    livraison?: string;
    lien: string;
    message?: string;
  };
  commande_fournisseur: {
    emetteur: Emetteur;
    fournisseur: string;
    contact?: string;
    numero: string;
    chantier?: string;
    montantHt: number;
    articles: { designation: string; quantite: number; unite: string; prixHt: number }[];
    livraison: string; // ISO
    adresse: string;
    lien: string;
  };
  reponse_fournisseur: { emetteur: Emetteur; fournisseur: string; reference: string; montantHt: number; delai: string; lienApp: string; meilleur: boolean };
  bienvenue: { prenom: string; entreprise: string; metier: string; lienApp: string; etapes: string[] };
}

export interface RenduEmail {
  sujet: string;
  preheader: string; // texte d'aperçu dans la boîte de réception
  html: string; // HTML e-mail (tables, styles en ligne, 600 px)
  texte: string; // version texte brut
}
