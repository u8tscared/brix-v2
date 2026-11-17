// Assemblage commun : un modèle décrit son contenu une fois, on en tire le HTML et le texte brut.

import type { DonneesDocument, Emetteur, RenduEmail } from '../types';
import { aideArtisan, documentHtml, mentionsArtisan, type Marque } from './gabarit';
import type { Ligne } from './blocs';
import { court, euros } from './outils';

export interface Composition {
  sujet: string;
  preheader: string;
  marque: Marque;
  corps: string;
  texte: (string | false | undefined | null)[]; // paragraphes du texte brut, vides ignorés
  aide?: string;
  mentions?: string;
}

/** Ne garde que les sauts de ligne utiles et évite tout « undefined » dans le texte brut. */
function texteBrut(parts: Composition['texte'], pied: string): string {
  const corps = parts.filter((p): p is string => typeof p === 'string' && p.trim() !== '').join('\n\n');
  return `${corps}\n\n--\n${pied}\n`.replace(/\u202F/g, ' ').replace(/\n{3,}/g, '\n\n');
}

export function composer(c: Composition): RenduEmail {
  const sujet = c.sujet.replace(/\s+/g, ' ').trim();
  const html = documentHtml({ titre: sujet, preheader: c.preheader, marque: c.marque, corps: c.corps, aide: c.aide, mentions: c.mentions });
  const pied = c.marque.type === 'artisan' ? `${c.marque.emetteur.entreprise} · ${c.marque.emetteur.telephone}\nEnvoyé avec Brix, le logiciel des artisans. https://brix-app.fr` : 'Brix, le logiciel des artisans. https://brix-app.fr';
  return { sujet, preheader: c.preheader, html, texte: texteBrut(c.texte, pied) };
}

/** Marque + pied d'un e-mail envoyé au nom de l'artisan. */
export function auNomDe(e: Emetteur): Pick<Composition, 'marque' | 'aide' | 'mentions'> {
  return { marque: { type: 'artisan', emetteur: e }, aide: aideArtisan(e), mentions: mentionsArtisan(e) };
}

export const nomComplet = (e: Emetteur) => `${e.prenom} ${e.nom}`.trim();

/** 3 à 5 postes principaux, en lignes de carte (le reste est regroupé). */
export function lignesResume(d: DonneesDocument, max = 5): Ligne[] {
  const ls = (d.lignes ?? []).filter((l) => l && l.libelle);
  if (ls.length <= max) return ls.map((l) => ({ libelle: l.libelle, valeur: euros(l.montant) }));
  const tete = ls.slice(0, max - 1);
  const reste = ls.slice(max - 1);
  return [
    ...tete.map((l) => ({ libelle: l.libelle, valeur: euros(l.montant) })),
    { libelle: `${reste.length} autres postes`, valeur: euros(reste.reduce((a, l) => a + (l.montant || 0), 0)) },
  ];
}

/** Version texte des lignes : « - Tableau électrique ........ 910,69 € ». */
export function lignesTexte(ls: Ligne[]): string {
  return ls.map((l) => `- ${l.libelle} : ${l.valeur}`).join('\n');
}

/** Titre de travaux raccourci pour un sujet. */
export const titreCourt = (t: string, max = 38) => court(t, max);
