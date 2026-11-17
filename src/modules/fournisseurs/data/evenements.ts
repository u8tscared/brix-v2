// Événements de démo de l'espace Achats : e-mails rangés dans la boîte de démo (/#/boite) et notifications
// de l'artisan. En réel, ces envois partent du worker (Brevo) et les notifications de la table notifications.

import { useBoite } from '@/emails/boite';
import type { Emetteur } from '@/emails/types';
import { useBrix } from '@/lib/store';
import { useNotifs } from '@/modules/notifications/store';
import { baseApp, lienPublic } from '@/parcours/liens';
import type { Commande, Demande, Destinataire, Fournisseur } from './types';

/** L'artisan qui envoie (entreprise et gérant de l'app). */
export function emetteurArtisan(): Emetteur {
  const { company, user } = useBrix.getState();
  return {
    entreprise: company.name || 'Votre client',
    prenom: user?.firstName ?? '',
    nom: user?.lastName ?? '',
    telephone: company.phone ?? '',
    email: user?.email || company.email || '',
    ville: (company.city ?? '').replace(/^\d{5}\s*/, ''),
    initiales: company.logoInitials || (company.name || 'B').slice(0, 2).toUpperCase(),
    siret: company.siret || undefined,
  };
}

const signature = (e: Emetteur) => [`${e.prenom} ${e.nom}`.trim(), e.entreprise].filter(Boolean).join(' · ');
const chantierDe = (id?: string) => (id ? useBrix.getState().chantiers.find((c) => c.id === id)?.name : undefined);
const lienApp = (chemin: string) => `${baseApp()}#${chemin}`;
const finDeJournee = (d?: string) => (d ? (d.length === 10 ? `${d}T18:00:00` : d) : new Date(Date.now() + 86400000).toISOString());

/** Un e-mail « demande de prix » par fournisseur consulté. */
export function mailsDemande(d: Demande, fournisseurs: Fournisseur[], destinataires: Destinataire[] = d.destinataires) {
  const e = emetteurArtisan();
  for (const dest of destinataires) {
    const f = fournisseurs.find((x) => x.id === dest.fournisseurId);
    useBoite.getState().ajouter({
      modele: 'demande_prix',
      pour: 'fournisseur',
      a: f?.email ?? 'comptoir@exemple.fr',
      de: signature(e),
      donnees: {
        emetteur: e,
        fournisseur: f?.nom ?? 'Fournisseur',
        contact: f?.contact,
        reference: d.numero,
        chantier: chantierDe(d.chantierId) ?? d.titre,
        articles: d.lignes.map((l) => ({ designation: l.designation, quantite: l.quantite, unite: l.unite })),
        reponseAvant: finDeJournee(d.dateLimite),
        livraison: d.livraisonSouhaitee,
        lien: lienPublic('fournisseur', dest.token),
        message: d.message,
      },
    });
  }
}

/** Le bon de commande envoyé au fournisseur. */
export function mailCommande(c: Commande, f: Fournisseur | undefined) {
  if (!c.token) return;
  const e = emetteurArtisan();
  useBoite.getState().ajouter({
    modele: 'commande_fournisseur',
    pour: 'fournisseur',
    a: f?.email ?? 'comptoir@exemple.fr',
    de: signature(e),
    donnees: {
      emetteur: e,
      fournisseur: f?.nom ?? 'Fournisseur',
      contact: f?.contact,
      numero: c.numero,
      chantier: chantierDe(c.chantierId),
      montantHt: Math.round((c.lignes.reduce((s, l) => s + l.prix * l.quantite, 0) + c.port) * 100) / 100,
      articles: c.lignes.map((l) => ({ designation: l.designation, quantite: l.quantite, unite: l.unite, prixHt: l.prix })),
      livraison: c.livraisonPrevue ?? new Date().toISOString().slice(0, 10),
      adresse: c.mode === 'retrait_agence' ? 'Retrait au comptoir' : c.adresse ?? 'Adresse à confirmer',
      lien: lienPublic('fournisseur', c.token),
    },
  });
}

/** Le fournisseur a répondu : notification + e-mail à l'artisan. */
export function signalerReponse(d: Demande, dest: Destinataire, f: Fournisseur | undefined, montantHt: number, meilleur: boolean) {
  const e = emetteurArtisan();
  const nom = f?.nom ?? 'Un fournisseur';
  const vers = `/app/fournisseurs/demandes/${d.id}`;
  const delai = dest.delaiJours == null ? 'à confirmer' : dest.delaiJours === 0 ? 'aujourd’hui' : `${dest.delaiJours} jour${dest.delaiJours > 1 ? 's' : ''}`;
  useNotifs.getState().ajouter({
    type: 'fournisseur_reponse',
    titre: `${nom} a envoyé ses prix`,
    texte: `${d.numero} · livraison ${delai}${meilleur ? ' · meilleure offre pour l’instant' : ''}`,
    qui: nom,
    montant: montantHt,
    vers,
  });
  useBoite.getState().ajouter({
    modele: 'reponse_fournisseur',
    pour: 'artisan',
    a: e.email || 'artisan@exemple.fr',
    de: 'Brix',
    donnees: { emetteur: e, fournisseur: nom, reference: d.numero, montantHt, delai, lienApp: lienApp(vers), meilleur },
  });
}

/** Le fournisseur fait avancer une commande depuis son lien. */
export function signalerCommande(c: Commande, f: Fournisseur | undefined, quoi: 'confirmee' | 'modification' | 'preparee' | 'expediee' | 'livree') {
  const nom = f?.nom ?? 'Le fournisseur';
  const montant = Math.round((c.lignes.reduce((s, l) => s + l.prix * l.quantite, 0) + c.port) * 100) / 100;
  const textes = {
    confirmee: [`${nom} a confirmé votre commande`, `${c.numero}${c.livraisonPrevue ? ` · livraison prévue le ${new Date(c.livraisonPrevue + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` : ''}`],
    modification: [`${nom} propose une modification`, `${c.numero} · à valider avant préparation`],
    preparee: [`Commande prête chez ${nom}`, `${c.numero} · préparée, en attente d’enlèvement`],
    expediee: [`Votre matériel est en route`, `${c.numero} · ${c.suivi ?? nom}`],
    livree: [`${nom} indique la commande livrée`, `${c.numero} · pensez à pointer la livraison`],
  } as const;
  useNotifs.getState().ajouter({
    type: quoi === 'confirmee' ? 'commande_confirmee' : 'systeme',
    titre: textes[quoi][0],
    texte: textes[quoi][1],
    qui: nom,
    montant: quoi === 'confirmee' ? montant : undefined,
    vers: `/app/fournisseurs/commandes/${c.id}`,
  });
}
