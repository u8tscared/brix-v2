// Phrases d'exemple dans les mots de chaque métier (Bob, visite guidée, palette).

export const DEVIS_EXAMPLE: Record<string, string> = {
  electricien: 'Fais un devis pour Mme Martin, 3 prises et un radiateur',
  plombier: 'Fais un devis pour Mme Martin, remplacement du ballon de 200 litres',
  peintre: 'Fais un devis pour Mme Martin, salon de 25 m², murs et plafond en deux couches',
  carreleur: 'Fais un devis pour Mme Martin, 12 m² de carrelage dans la salle de bain',
  plaquiste: 'Fais un devis pour Mme Martin, une cloison de 15 m² avec isolation',
  menuisier: 'Fais un devis pour Mme Martin, deux fenêtres PVC double vitrage',
  couvreur: 'Fais un devis pour Mme Martin, reprise de 20 m² de tuiles',
  macon: 'Fais un devis pour Mme Martin, une dalle béton de 20 m²',
  paysagiste: 'Fais un devis pour Mme Martin, 80 m² de gazon et une haie',
  climaticien: 'Fais un devis pour Mme Martin, une clim réversible dans le séjour',
  serrurier: 'Fais un devis pour Mme Martin, une serrure 3 points sur la porte d’entrée',
  cuisiniste: 'Fais un devis pour Mme Martin, une douche à l’italienne',
  renovation: 'Fais un devis pour Mme Martin, rafraîchir une chambre de 12 m²',
  autre: 'Fais un devis pour Mme Martin, rafraîchir une chambre de 12 m²',
};

export const NORM_EXAMPLE: Record<string, string> = {
  electricien: 'Explique-moi la NF C 15-100 pour une cuisine',
};

export const devisExample = (trade?: string) => DEVIS_EXAMPLE[trade ?? ''] ?? DEVIS_EXAMPLE.electricien;
export const normExample = (trade?: string) => NORM_EXAMPLE[trade ?? ''] ?? 'Quel taux de TVA pour une rénovation ?';
