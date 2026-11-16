/**
 * Comparatif des réponses à une demande de prix.
 *
 * Calcule, pour chaque fournisseur, le total de son offre (avec frais de port et franco),
 * la meilleure offre ligne par ligne, et deux recommandations :
 *  - « un seul fournisseur » : le moins cher parmi ceux qui couvrent toutes les lignes ;
 *  - « panier optimisé » : chaque ligne chez le moins cher, si l'économie dépasse les ports en plus.
 * Fonction pure, testée dans comparateur.test.ts.
 */

export interface CompLigne {
  id: string;
  designation: string;
  quantite: number;
  prix_cible_cents: number | null;
}

export interface CompOffre {
  destinataire_id: string;
  fournisseur_id: string;
  fournisseur_nom: string;
  repondu: boolean;
  frais_port_cents: number | null;
  franco_cents: number | null;
  delai_livraison_jours: number | null;
  prix: Record<string, number | null>; // ligne_id → prix unitaire (centimes) ; null = indisponible
}

export interface TotalFournisseur {
  destinataire_id: string;
  fournisseur_id: string;
  fournisseur_nom: string;
  lignes_couvertes: number;
  lignes_manquantes: number;
  sous_total_cents: number;
  port_cents: number;
  total_cents: number;
  delai_livraison_jours: number | null;
  complet: boolean;
}

export interface MeilleureLigne {
  ligne_id: string;
  designation: string;
  meilleur_destinataire_id: string | null;
  meilleur_prix_cents: number | null;
  ecart_max_pct: number | null; // écart entre l'offre la plus chère et la moins chère
  vs_cible_cents: number | null; // économie (positive) ou dépassement (négatif) vs prix prévu au devis
}

export interface Recommandation {
  type: 'unique' | 'optimise';
  total_cents: number;
  repartition: { destinataire_id: string; fournisseur_nom: string; ligne_ids: string[]; total_cents: number }[];
  economie_vs_cible_cents: number | null;
  explication: string;
}

export interface Comparatif {
  totaux: TotalFournisseur[];
  lignes: MeilleureLigne[];
  recommandation: Recommandation | null;
  alternative: Recommandation | null;
  reponses: number;
  consultes: number;
}

function portPour(offre: CompOffre, sousTotal: number): number {
  if (offre.franco_cents != null && sousTotal >= offre.franco_cents) return 0;
  return offre.frais_port_cents ?? 0;
}

const euros = (c: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(c / 100);

export function comparer(lignes: CompLigne[], offres: CompOffre[]): Comparatif {
  const repondues = offres.filter((o) => o.repondu);

  const totaux: TotalFournisseur[] = repondues.map((o) => {
    let sous = 0;
    let couvertes = 0;
    for (const l of lignes) {
      const p = o.prix[l.id];
      if (p != null) {
        sous += Math.round(p * l.quantite);
        couvertes++;
      }
    }
    const port = couvertes > 0 ? portPour(o, sous) : 0;
    return {
      destinataire_id: o.destinataire_id,
      fournisseur_id: o.fournisseur_id,
      fournisseur_nom: o.fournisseur_nom,
      lignes_couvertes: couvertes,
      lignes_manquantes: lignes.length - couvertes,
      sous_total_cents: sous,
      port_cents: port,
      total_cents: sous + port,
      delai_livraison_jours: o.delai_livraison_jours,
      complet: couvertes === lignes.length && lignes.length > 0,
    };
  });
  totaux.sort((a, b) => Number(b.complet) - Number(a.complet) || a.total_cents - b.total_cents);

  const meilleures: MeilleureLigne[] = lignes.map((l) => {
    const prix = repondues
      .map((o) => ({ d: o.destinataire_id, p: o.prix[l.id] }))
      .filter((x): x is { d: string; p: number } => x.p != null);
    if (prix.length === 0) {
      return {
        ligne_id: l.id,
        designation: l.designation,
        meilleur_destinataire_id: null,
        meilleur_prix_cents: null,
        ecart_max_pct: null,
        vs_cible_cents: null,
      };
    }
    prix.sort((a, b) => a.p - b.p);
    const min = prix[0].p;
    const max = prix[prix.length - 1].p;
    return {
      ligne_id: l.id,
      designation: l.designation,
      meilleur_destinataire_id: prix[0].d,
      meilleur_prix_cents: min,
      ecart_max_pct: min > 0 ? Math.round(((max - min) / min) * 1000) / 10 : null,
      vs_cible_cents: l.prix_cible_cents != null ? Math.round((l.prix_cible_cents - min) * l.quantite) : null,
    };
  });

  const cibleTotale = lignes.every((l) => l.prix_cible_cents != null)
    ? lignes.reduce((s, l) => s + Math.round((l.prix_cible_cents ?? 0) * l.quantite), 0)
    : null;

  // Recommandation « un seul fournisseur »
  const completes = totaux.filter((t) => t.complet);
  let unique: Recommandation | null = null;
  if (completes.length > 0) {
    const best = completes[0];
    unique = {
      type: 'unique',
      total_cents: best.total_cents,
      repartition: [
        {
          destinataire_id: best.destinataire_id,
          fournisseur_nom: best.fournisseur_nom,
          ligne_ids: lignes.map((l) => l.id),
          total_cents: best.total_cents,
        },
      ],
      economie_vs_cible_cents: cibleTotale != null ? cibleTotale - best.total_cents : null,
      explication:
        completes.length > 1
          ? `${best.fournisseur_nom} est le moins cher pour toute la liste : ${euros(best.total_cents)} port compris, soit ${euros(completes[1].total_cents - best.total_cents)} de moins que ${completes[1].fournisseur_nom}.`
          : `${best.fournisseur_nom} est le seul à couvrir toute la liste : ${euros(best.total_cents)} port compris.`,
    };
  }

  // Panier optimisé : chaque ligne chez le moins cher
  let optimise: Recommandation | null = null;
  if (meilleures.every((m) => m.meilleur_destinataire_id != null) && lignes.length > 0) {
    const groupes = new Map<string, string[]>();
    for (const m of meilleures) {
      const arr = groupes.get(m.meilleur_destinataire_id!) ?? [];
      arr.push(m.ligne_id);
      groupes.set(m.meilleur_destinataire_id!, arr);
    }
    const repartition = [...groupes.entries()].map(([d, ids]) => {
      const o = repondues.find((x) => x.destinataire_id === d)!;
      const sous = ids.reduce((s, id) => {
        const l = lignes.find((x) => x.id === id)!;
        return s + Math.round((o.prix[id] ?? 0) * l.quantite);
      }, 0);
      return { destinataire_id: d, fournisseur_nom: o.fournisseur_nom, ligne_ids: ids, total_cents: sous + portPour(o, sous) };
    });
    const total = repartition.reduce((s, r) => s + r.total_cents, 0);
    optimise = {
      type: 'optimise',
      total_cents: total,
      repartition,
      economie_vs_cible_cents: cibleTotale != null ? cibleTotale - total : null,
      explication:
        repartition.length === 1
          ? `Toutes les meilleures offres sont chez ${repartition[0].fournisseur_nom}.`
          : `En répartissant entre ${repartition.map((r) => r.fournisseur_nom).join(' et ')}, le total tombe à ${euros(total)} port compris.`,
    };
  }

  let recommandation: Recommandation | null = null;
  let alternative: Recommandation | null = null;
  if (unique && optimise) {
    // On ne conseille de répartir que si l'économie vaut la peine (≥ 3 % et ≥ 20 €)
    const gain = unique.total_cents - optimise.total_cents;
    if (optimise.repartition.length > 1 && gain >= 2000 && gain >= unique.total_cents * 0.03) {
      recommandation = optimise;
      alternative = unique;
    } else {
      recommandation = unique;
      alternative = optimise.repartition.length > 1 ? optimise : null;
    }
  } else {
    recommandation = unique ?? optimise;
  }

  return {
    totaux,
    lignes: meilleures,
    recommandation,
    alternative,
    reponses: repondues.length,
    consultes: offres.length,
  };
}
